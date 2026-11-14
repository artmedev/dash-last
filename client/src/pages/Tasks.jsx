import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, localToday, formatDate, RECURRENCE_LABELS, RUN_LABELS } from '../api.js';
import TaskForm from './TaskForm.jsx';

const ACTIVE = ['pending', 'claimed', 'running'];

const readShowDone = () => {
  try { return localStorage.getItem('dash.showDone') !== '0'; } catch { return true; }
};

export default function Tasks() {
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState('');
  const [showDone, setShowDone] = useState(readShowDone);
  const [modal, setModal] = useState(null); // {mode:'plain'} | {mode:'auto', slug?}
  const [params, setParams] = useSearchParams();

  const load = useCallback(() => {
    api(`/tasks?today=${localToday()}`).then(setTasks).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  // Coming from the store: /?add=<slug>
  useEffect(() => {
    const slug = params.get('add');
    if (slug) {
      setModal({ mode: 'auto', slug });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  // Refresh the list while an automation is running
  const hasActive = tasks?.some((t) => t.last_run && ACTIVE.includes(t.last_run.status));
  useEffect(() => {
    if (!hasActive) return;
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [hasActive, load]);

  const toggleShowDone = () => {
    const v = !showDone;
    setShowDone(v);
    try { localStorage.setItem('dash.showDone', v ? '1' : '0'); } catch { /* ignore */ }
  };

  const act = async (fn) => {
    setError('');
    try { await fn(); load(); } catch (e) { setError(e.message); }
  };

  const toggle = (t) => act(() => api(`/tasks/${t.id}/complete`, {
    method: 'POST', body: { done: !t.done, today: localToday() },
  }));
  const remove = (t) => {
    if (confirm(`Delete "${t.title}"?`)) act(() => api(`/tasks/${t.id}`, { method: 'DELETE' }));
  };
  const run = (t) => act(() => api(`/tasks/${t.id}/runs`, { method: 'POST', body: { today: localToday() } }));
  const cancelRun = (t) => act(() => api(`/runs/${t.last_run.id}/cancel`, { method: 'POST' }));

  const visible = tasks?.filter((t) => showDone || !t.done) ?? [];
  const doneCount = tasks?.filter((t) => t.done).length ?? 0;

  return (
    <section>
      <div className="section-head">
        <h2>Recurring tasks</h2>
        <div className="actions">
          <button className="primary" onClick={() => setModal({ mode: 'plain' })}>＋ Add</button>
          <button onClick={() => setModal({ mode: 'auto' })}>⚙ Add automated</button>
        </div>
      </div>

      <div className="toolbar">
        <label className="switch">
          <input type="checkbox" checked={showDone} onChange={toggleShowDone} />
          Show completed {doneCount > 0 && <span className="muted">({doneCount})</span>}
        </label>
        <Link to="/store">Automation store →</Link>
      </div>

      {error && <p className="error">{error}</p>}
      {tasks === null && <p className="muted">Loading…</p>}
      {tasks?.length === 0 && <p className="muted empty">No tasks yet. Press "＋ Add".</p>}

      <ul className="tasks">
        {visible.map((t) => {
          const r = t.last_run;
          const active = r && ACTIVE.includes(r.status);
          return (
            <li key={t.id} className={t.done ? 'done' : ''}>
              <label className="check">
                <input type="checkbox" checked={t.done} onChange={() => toggle(t)} />
              </label>
              <div className="body">
                <div className="title">{t.title}</div>
                <div className="meta">
                  <span>{RECURRENCE_LABELS[t.recurrence]}</span>
                  <span>due {formatDate(t.period.due)}</span>
                  {t.automation_slug && <span className="badge">automation</span>}
                  {r && (
                    <span className={`run run-${r.status}`} title={r.message || ''}>
                      run #{r.id}: {RUN_LABELS[r.status]}
                    </span>
                  )}
                </div>
                {r?.message && !active && <div className="run-msg">{r.message}</div>}
              </div>
              <div className="row-actions">
                {t.automation_slug && !active && !t.done && (
                  <button onClick={() => run(t)}>▶ Run</button>
                )}
                {active && <button onClick={() => cancelRun(t)}>Cancel</button>}
                <button className="icon" title="Delete" onClick={() => remove(t)}>✕</button>
              </div>
            </li>
          );
        })}
      </ul>

      {modal && (
        <TaskForm
          mode={modal.mode}
          initialSlug={modal.slug}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </section>
  );
}
