import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import { q, migrate } from './db.js';
import { currentPeriod, RECURRENCES, isDate } from './periods.js';
import { publicCatalog, findAutomation, renderPrompt } from './automations.js';
import {
  loginWithGoogle, loginDev, logout, requireUser, optionalUser, requireAgent, devAuthEnabled, sha256,
} from './auth.js';

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const todayOf = (req) => {
  const t = req.query.today || req.body?.today;
  return isDate(t) ? t : new Date().toISOString().slice(0, 10);
};
const AGENT_ONLINE_MS = 60_000;

// ---------- auth ----------
app.get('/api/config', (req, res) =>
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null, devAuth: devAuthEnabled() }),
);
app.post('/api/auth/google', wrap(loginWithGoogle));
app.post('/api/auth/dev', wrap(loginDev));
app.post('/api/auth/logout', logout);

const api = express.Router();
api.use(requireUser);

// Current user or null: a guest gets 200, not 401, to keep the console clean
app.get('/api/me', optionalUser, wrap(async (req, res) => {
  if (!req.userId) return res.json(null);
  const { rows } = await q(
    `SELECT id, email, name, picture, agent_token_hash IS NOT NULL AS has_agent_token, agent_last_seen
     FROM users WHERE id = $1`,
    [req.userId],
  );
  if (!rows[0]) return res.json(null);
  const u = rows[0];
  u.agent_online = !!u.agent_last_seen && Date.now() - new Date(u.agent_last_seen) < AGENT_ONLINE_MS;
  res.json(u);
}));

api.post('/me/agent-token', wrap(async (req, res) => {
  const token = crypto.randomBytes(24).toString('base64url');
  await q(`UPDATE users SET agent_token_hash = $1 WHERE id = $2`, [sha256(token), req.userId]);
  res.json({ token });
}));

// ---------- store ----------
api.get('/automations', (req, res) => res.json(publicCatalog()));

// ---------- tasks ----------
async function loadTask(req, res) {
  const { rows } = await q(`SELECT * FROM tasks WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId]);
  if (!rows[0]) res.status(404).json({ error: 'not found' });
  return rows[0];
}

function validateTask(body, partial = false) {
  const out = {};
  if (!partial || body.title !== undefined) {
    if (!body.title || !String(body.title).trim()) return { error: 'Title required' };
    out.title = String(body.title).trim().slice(0, 300);
  }
  if (!partial || body.start_date !== undefined) {
    if (!isDate(body.start_date)) return { error: 'Date required' };
    out.start_date = body.start_date;
  }
  if (!partial || body.recurrence !== undefined) {
    if (!RECURRENCES.includes(body.recurrence)) return { error: 'Unknown recurrence' };
    out.recurrence = body.recurrence;
  }
  if (body.config !== undefined) {
    if (typeof body.config !== 'object' || Array.isArray(body.config)) return { error: 'config' };
    out.config = body.config;
  }
  return { value: out };
}

api.get('/tasks', wrap(async (req, res) => {
  const today = todayOf(req);
  const { rows: tasks } = await q(
    `SELECT t.*,
       (SELECT row_to_json(r) FROM (
          SELECT id, status, message, created_at, updated_at FROM runs
          WHERE task_id = t.id ORDER BY id DESC LIMIT 1) r) AS last_run
     FROM tasks t WHERE user_id = $1 ORDER BY t.id`,
    [req.userId],
  );
  const { rows: comps } = await q(
    `SELECT c.task_id, c.period_key, c.completed_at FROM completions c
     JOIN tasks t ON t.id = c.task_id WHERE t.user_id = $1`,
    [req.userId],
  );
  const done = new Map(comps.map((c) => [`${c.task_id}|${c.period_key}`, c.completed_at]));
  const result = tasks.map((t) => {
    const period = currentPeriod(t.recurrence, t.start_date, today);
    const completedAt = done.get(`${t.id}|${period.key}`) || null;
    return { ...t, period, done: !!completedAt, completed_at: completedAt };
  });
  result.sort((a, b) => a.done - b.done || a.period.due.localeCompare(b.period.due));
  res.json(result);
}));

api.post('/tasks', wrap(async (req, res) => {
  const { error, value } = validateTask(req.body);
  if (error) return res.status(400).json({ error });
  let slug = null;
  if (req.body.automation_slug) {
    const a = findAutomation(req.body.automation_slug);
    if (!a) return res.status(400).json({ error: 'Automation not found' });
    for (const f of a.fields) {
      if (f.required && !String(value.config?.[f.key] ?? '').trim())
        return res.status(400).json({ error: `Fill in "${f.label}"` });
    }
    slug = a.slug;
  }
  const { rows } = await q(
    `INSERT INTO tasks (user_id, title, start_date, recurrence, automation_slug, config)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.userId, value.title, value.start_date, value.recurrence, slug, value.config || {}],
  );
  res.status(201).json(rows[0]);
}));

api.patch('/tasks/:id', wrap(async (req, res) => {
  const task = await loadTask(req, res);
  if (!task) return;
  const { error, value } = validateTask(req.body, true);
  if (error) return res.status(400).json({ error });
  const t = { ...task, ...value };
  const { rows } = await q(
    `UPDATE tasks SET title=$1, start_date=$2, recurrence=$3, config=$4 WHERE id=$5 RETURNING *`,
    [t.title, t.start_date, t.recurrence, t.config, t.id],
  );
  res.json(rows[0]);
}));

api.delete('/tasks/:id', wrap(async (req, res) => {
  const task = await loadTask(req, res);
  if (!task) return;
  await q(`DELETE FROM tasks WHERE id = $1`, [task.id]);
  res.json({ ok: true });
}));

api.post('/tasks/:id/complete', wrap(async (req, res) => {
  const task = await loadTask(req, res);
  if (!task) return;
  const period = currentPeriod(task.recurrence, task.start_date, todayOf(req));
  if (req.body?.done === false) {
    await q(`DELETE FROM completions WHERE task_id = $1 AND period_key = $2`, [task.id, period.key]);
  } else {
    await q(
      `INSERT INTO completions (task_id, period_key) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [task.id, period.key],
    );
  }
  res.json({ ok: true });
}));

// ---------- runs ----------
api.post('/tasks/:id/runs', wrap(async (req, res) => {
  const task = await loadTask(req, res);
  if (!task) return;
  const a = findAutomation(task.automation_slug);
  if (!a) return res.status(400).json({ error: 'This task has no automation' });
  const active = await q(
    `SELECT id FROM runs WHERE task_id = $1 AND status IN ('pending','claimed','running')`,
    [task.id],
  );
  if (active.rows[0]) return res.status(409).json({ error: 'The automation is already running' });
  const period = currentPeriod(task.recurrence, task.start_date, todayOf(req));
  const params = {
    ...task.config,
    task_title: task.title,
    period_key: period.key,
    due_date: period.due,
    ...(a.runParams ? a.runParams(period) : {}),
  };
  const { rows } = await q(
    `INSERT INTO runs (task_id, user_id, params) VALUES ($1,$2,$3) RETURNING *`,
    [task.id, req.userId, params],
  );
  res.status(201).json(rows[0]);
}));

api.post('/runs/:id/cancel', wrap(async (req, res) => {
  const { rows } = await q(
    `UPDATE runs SET status='cancelled', updated_at=now()
     WHERE id=$1 AND user_id=$2 AND status IN ('pending','claimed','running') RETURNING id`,
    [req.params.id, req.userId],
  );
  if (!rows[0]) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
}));

// ---------- agent (the user's local computer) ----------
const agent = express.Router();
agent.use(wrap(requireAgent));

agent.post('/claim', wrap(async (req, res) => {
  const { rows } = await q(
    `UPDATE runs SET status='claimed', updated_at=now()
     WHERE id = (SELECT id FROM runs WHERE user_id = $1 AND status='pending'
                 ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED)
     RETURNING runs.*, (SELECT automation_slug FROM tasks WHERE id = runs.task_id) AS slug`,
    [req.userId],
  );
  const run = rows[0];
  if (!run) return res.json({ run: null });
  const prompt = renderPrompt(run.slug, { ...run.params, run_id: run.id });
  res.json({ run, prompt });
}));

const RUN_STATUSES = ['running', 'succeeded', 'failed'];
agent.post('/runs/:id/status', wrap(async (req, res) => {
  const { status, message } = req.body || {};
  if (!RUN_STATUSES.includes(status)) return res.status(400).json({ error: 'bad status' });
  const { rows } = await q(
    `UPDATE runs SET status=$1, message=COALESCE($2, message), updated_at=now()
     WHERE id=$3 AND user_id=$4 AND status IN ('claimed','running') RETURNING *`,
    [status, message ? String(message).slice(0, 4000) : null, req.params.id, req.userId],
  );
  const run = rows[0];
  if (!run) return res.status(404).json({ error: 'run not found or already finished' });
  if (status === 'succeeded') {
    await q(
      `INSERT INTO completions (task_id, period_key) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [run.task_id, run.params.period_key],
    );
  }
  res.json({ ok: true });
}));

// the agent is mounted before /api, otherwise cookie auth would intercept it
app.use('/api/agent', agent);
app.use('/api', api);

// ---------- static files of the built client (production) ----------
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

const port = Number(process.env.PORT || 3001);
await migrate();
app.listen(port, () => console.log(`dash server on http://localhost:${port}`));
