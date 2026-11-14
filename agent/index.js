// Dash local agent.
// Polls the server, claims automation runs and runs Claude Code for each one headless
// (no window), with Claude in Chrome: Claude works in the user's real Chrome with its cookies.
// The conversation happens in the Dash web chat: Claude's messages are posted to the server,
// the user's replies are fetched from the server and passed to Claude.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { loadConfig, call, AGENT_DIR } from './config.js';

const cfg = loadConfig(process.argv.slice(2));
const RUNS_DIR = path.join(AGENT_DIR, 'runs');
const CLAIM_MS = 5000;
const INBOX_MS = 2000;
const LANGUAGE_NAMES = { en: 'English', ru: 'Russian' };
const ACTIVE = ['pending', 'claimed', 'running'];
fs.mkdirSync(RUNS_DIR, { recursive: true });
// Lets `npm run agent:status/uninstall` find and stop the background agent
fs.writeFileSync(path.join(AGENT_DIR, 'agent.pid'), String(process.pid));

const q = (s) => `"${String(s).replace(/"/g, '')}"`;
const log = (...a) => console.log(`[${new Date().toLocaleTimeString()}]`, ...a);

/** @type {Map<number, {proc: import('node:child_process').ChildProcess, finished: boolean}>} */
const sessions = new Map();

/**
 * Short description of a tool call for the chat activity line.
 * Sent as JSON {kind, detail}; the web UI translates `kind`.
 */
function describeTool(block) {
  const name = block.name || '';
  const input = block.input || {};
  if (/navigate$/.test(name)) return { kind: 'browser_open', detail: input.url || '' };
  if (/claude-in-chrome|Claude_Browser/.test(name)) return { kind: 'browser' };
  if (name === 'Read' || name === 'Glob' || name === 'Grep') return { kind: 'read', detail: path.basename(input.file_path || input.path || '') };
  if (name === 'Write' || name === 'Edit') return { kind: 'write', detail: path.basename(input.file_path || '') };
  if (name === 'Bash' || name === 'PowerShell') {
    if (/report\.js/.test(input.command || '')) return { kind: 'report' };
    return { kind: 'command' };
  }
  if (name === 'WebFetch' || name === 'WebSearch') return { kind: 'web', detail: input.url || input.query || '' };
  return { kind: 'other', detail: name };
}

/** Posts chat items in order; a failed post is logged and dropped, the run keeps going. */
function makeOutbox(runId) {
  let chain = Promise.resolve();
  return (items, awaitingUser) => {
    chain = chain
      .then(() => call(cfg, `/runs/${runId}/messages`, { items, awaiting_user: awaitingUser }))
      .catch((e) => log(`run #${runId}: failed to post messages: ${e.message}`));
    return chain;
  };
}

function startSession(run, prompt, lang) {
  const id = run.id;
  const reportCmd = `node ${q(path.join(AGENT_DIR, 'report.js'))} ${id}`;
  const promptFile = path.join(RUNS_DIR, `run-${id}.md`);
  fs.writeFileSync(promptFile, prompt.replaceAll('{{report_command}}', reportCmd), 'utf8');

  const addDirs = [run.params.documents_folder].filter(Boolean);
  for (const d of addDirs) {
    try { fs.mkdirSync(d, { recursive: true }); } catch { /* Claude will create it */ }
  }

  const args = [
    '-p',
    '--input-format', 'stream-json',
    '--output-format', 'stream-json',
    '--verbose',
    '--chrome',
    '--permission-mode', 'auto',
    ...addDirs.flatMap((d) => ['--add-dir', d]),
  ];
  const proc = spawn('claude', args, { cwd: RUNS_DIR, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  const session = { proc, finished: false };
  sessions.set(id, session);
  const post = makeOutbox(id);
  const errLog = fs.createWriteStream(path.join(RUNS_DIR, `run-${id}.log`), { flags: 'a' });
  proc.stderr.pipe(errLog);

  readline.createInterface({ input: proc.stdout }).on('line', (line) => {
    let e;
    try { e = JSON.parse(line); } catch { return; }
    if (e.type === 'assistant') {
      const items = [];
      for (const b of e.message?.content || []) {
        if (b.type === 'text' && b.text.trim()) items.push({ role: 'assistant', text: b.text });
        else if (b.type === 'tool_use') items.push({ role: 'activity', text: JSON.stringify(describeTool(b)) });
      }
      if (items.length) post(items);
    } else if (e.type === 'result') {
      // Claude finished its turn: it now waits for the user's reply
      const items = e.is_error ? [{ role: 'system', text: `Claude error: ${e.result || e.subtype}` }] : [];
      post(items, true);
    }
  });

  proc.on('error', (err) => {
    log(`run #${id}: cannot start claude: ${err.message}`);
    call(cfg, `/runs/${id}/status`, { status: 'failed', message: `Agent could not start Claude: ${err.message}` }).catch(() => {});
  });
  proc.on('exit', (code) => {
    sessions.delete(id);
    errLog.end();
    log(`run #${id}: Claude exited (code ${code})`);
    if (!session.finished) {
      // Claude stopped without reporting a result
      call(cfg, `/runs/${id}/status`, { status: 'failed', message: `Claude stopped unexpectedly (code ${code})` }).catch(() => {});
    }
  });

  const initial =
    `Read the file run-${id}.md in the current directory and follow its instructions exactly, step by step. ` +
    `Talk to the user in ${LANGUAGE_NAMES[lang] || 'English'}.`;
  sendUser(session, initial);
  log(`run #${id}: Claude started (${promptFile})`);
}

function sendUser(session, text) {
  if (session.proc.stdin.writable) {
    session.proc.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content: text } }) + '\n');
  }
}

function stopSession(id, session) {
  session.finished = true;
  try { session.proc.stdin.end(); } catch { /* already closed */ }
  // Closing stdin lets Claude finish its current turn (e.g. the final message); kill only if it hangs
  setTimeout(() => { if (session.proc.exitCode === null) session.proc.kill(); }, 120000);
}

// Pass the user's chat replies to Claude; stop Claude when the run is finished or cancelled
async function pollInboxes() {
  for (const [id, session] of sessions) {
    try {
      const { status, messages } = await call(cfg, `/runs/${id}/inbox`);
      for (const m of messages) sendUser(session, m.text);
      if (!ACTIVE.includes(status)) {
        log(`run #${id}: ${status}, stopping Claude`);
        stopSession(id, session);
      }
    } catch (e) {
      log(`run #${id}: inbox error: ${e.message}`);
    }
  }
  setTimeout(pollInboxes, INBOX_MS);
}

let online = null;
async function claimLoop() {
  try {
    const { run, prompt, lang } = await call(cfg, '/claim');
    if (online !== true) log(`Connected to ${cfg.server}. Waiting for runs...`);
    online = true;
    if (run) {
      await call(cfg, `/runs/${run.id}/status`, { status: 'running' });
      try {
        startSession(run, prompt, lang);
      } catch (e) {
        await call(cfg, `/runs/${run.id}/status`, { status: 'failed', message: `Agent could not start Claude: ${e.message}` });
      }
    }
  } catch (e) {
    if (online !== false) log(`Cannot reach ${cfg.server}: ${e.message}`);
    online = false;
  }
  setTimeout(claimLoop, CLAIM_MS);
}

claimLoop();
pollInboxes();
