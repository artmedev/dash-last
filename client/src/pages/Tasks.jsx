import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, localToday } from '../api.js';
import { useI18n } from '../i18n.jsx';
import TaskForm from './TaskForm.jsx';

const ACTIVE = ['pending', 'claimed', 'running'];

const readShowDone = () => {
  try { return localStorage.getItem('dash.showDone') !== '0'; } catch { return true; }
};

export default function Tasks() {
  const { t, tError, formatDate } = useI18n();
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState('');
  const [showDone, setShowDone] = useState(readShowDone);
  const [modal, setModal] = useState(null); // {mode:'plain'} | {mode:'auto', slug?}
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const load = useCallback(() => {
    api(`/tasks?today=${localToday()}`).then(setTasks).catch((e) => setError(tError(e)));
  }, [tError]);
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
  const hasActive = tasks?.some((x) => x.last_run && ACTIVE.includes(x.last_run.status));
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
    try { await fn(); load(); } catch (e) { setError(tError(e)); }
  };

  const toggle = (x) => act(() => api(`/tasks/${x.id}/complete`, {
    method: 'POST', body: { done: !x.done, today: localToday() },
  }));
  const remove = (x) => {
    if (confirm(t('tasks.confirmDelete', { title: x.title }))) act(() => api(`/tasks/${x.id}`, { method: 'DELETE' }));
  };
  // Starting a run opens its chat right away
  const run = async (x) => {
    setError('');
    try {
      const r = await api(`/tasks/${x.id}/runs`, { method: 'POST', body: { today: localToday() } });
      navigate(`/runs/${r.id}`);
    } catch (e) {
      setError(tError(e));
    }
  };
  const cancelRun = (x) => act(() => api(`/runs/${x.last_run.id}/cancel`, { method: 'POST' }));

  const visible = tasks?.filter((x) => showDone || !x.done) ?? [];
  const doneCount = tasks?.filter((x) => x.done).length ?? 0;

  return (
    <section>
      <div className="section-head">
        <h2>{t('tasks.title')}</h2>
        <div className="actions">
          <button className="add-icon" title={t('tasks.add')} aria-label={t('tasks.add')} onClick={() => setModal({ mode: 'plain' })}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          <button className="add-icon" title={t('tasks.addAuto')} aria-label={t('tasks.addAuto')} onClick={() => setModal({ mode: 'auto' })}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3 5 13h6l-1 8 8-10h-6z" /></svg>
          </button>
        </div>
      </div>

      <div className="toolbar">
        <label className="switch">
          <input type="checkbox" checked={showDone} onChange={toggleShowDone} />
          {t('tasks.showDone')} {doneCount > 0 && <span className="muted">({doneCount})</span>}
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      {tasks === null && <p className="muted">{t('app.loading')}</p>}
      {tasks?.length === 0 && <p className="muted empty">{t('tasks.empty')}</p>}

      <ul className="tasks">
        {visible.map((x) => {
          const r = x.last_run;
          const active = r && ACTIVE.includes(r.status);
          return (
            <li key={x.id} className={x.done ? 'done' : ''}>
              <label className="check">
                <input type="checkbox" checked={x.done} onChange={() => toggle(x)} />
              </label>
              <div className="body">
                <div className="title">{x.title}</div>
                <div className="meta">
                  <span>{t(`rec.${x.recurrence}`)}</span>
                  <span>{t('tasks.due', { date: formatDate(x.period.due) })}</span>
                  {x.automation_slug && <span className="badge">{t('tasks.automation')}</span>}
                  {r && (
                    <Link to={`/runs/${r.id}`} className={`run run-${r.status}`} title={t('tasks.openChat')}>
                      {t('tasks.run', { id: r.id, status: t(`run.${r.status}`) })}
                    </Link>
                  )}
                  {active && r.awaiting_user && (
                    <Link to={`/runs/${r.id}`} className="badge awaiting">{t('tasks.awaiting')}</Link>
                  )}
                </div>
                {r?.message && !active && <div className="run-msg">{r.message}</div>}
              </div>
              <div className="row-actions">
                {x.automation_slug && !active && !x.done && (
                  <button onClick={() => run(x)}>{t('tasks.start')}</button>
                )}
                {active && <button onClick={() => navigate(`/runs/${r.id}`)}>{t('tasks.openChat')}</button>}
                {active && <button onClick={() => cancelRun(x)}>{t('tasks.cancel')}</button>}
                <button className="icon" title={t('tasks.delete')} onClick={() => remove(x)}>✕</button>
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
