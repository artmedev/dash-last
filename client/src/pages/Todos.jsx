import { useCallback, useEffect, useState } from 'react';
import { api, localToday } from '../api.js';
import { useI18n } from '../i18n.jsx';

const readShowDone = () => {
  try { return localStorage.getItem('dash.todos.showDone') === '1'; } catch { return false; }
};

const addDays = (date, n) => {
  const [y, m, d] = date.split('-').map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + n));
  return x.toISOString().slice(0, 10);
};

/** One-off tasks, Todoist style: quick add, due date, check off once. */
export default function Todos() {
  const { t, tError, formatDate } = useI18n();
  const [todos, setTodos] = useState(null);
  const [error, setError] = useState('');
  const [showDone, setShowDone] = useState(readShowDone);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [editing, setEditing] = useState(null); // {id, title, note, due_date}

  const load = useCallback(() => {
    api('/todos').then(setTodos).catch((e) => setError(tError(e)));
  }, [tError]);
  useEffect(load, [load]);

  const act = async (fn) => {
    setError('');
    try { await fn(); load(); } catch (e) { setError(tError(e)); }
  };

  const add = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    act(async () => {
      await api('/todos', { method: 'POST', body: { title, due_date: due || null } });
      setTitle('');
      setDue('');
    });
  };
  const toggle = (x) => act(() => api(`/todos/${x.id}`, { method: 'PATCH', body: { done: !x.done_at } }));
  const remove = (x) => {
    if (confirm(t('tasks.confirmDelete', { title: x.title }))) act(() => api(`/todos/${x.id}`, { method: 'DELETE' }));
  };
  const save = (e) => {
    e.preventDefault();
    const { id, ...body } = editing;
    act(async () => {
      await api(`/todos/${id}`, { method: 'PATCH', body: { ...body, due_date: body.due_date || null } });
      setEditing(null);
    });
  };

  const toggleShowDone = () => {
    const v = !showDone;
    setShowDone(v);
    try { localStorage.setItem('dash.todos.showDone', v ? '1' : '0'); } catch { /* ignore */ }
  };

  const today = localToday();
  const dueLabel = (d) => {
    if (d === today) return t('todos.today');
    if (d === addDays(today, 1)) return t('todos.tomorrow');
    return formatDate(d);
  };

  const visible = todos?.filter((x) => showDone || !x.done_at) ?? [];
  const doneCount = todos?.filter((x) => x.done_at).length ?? 0;

  return (
    <section>
      <div className="section-head">
        <h2>{t('todos.title')}</h2>
      </div>

      <form className="quick-add card" onSubmit={add}>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('todos.placeholder')}
          aria-label={t('form.title')}
        />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label={t('todos.due')} />
        <button type="submit" className="primary" disabled={!title.trim()}>{t('form.submit')}</button>
      </form>

      <div className="toolbar">
        <label className="switch">
          <input type="checkbox" checked={showDone} onChange={toggleShowDone} />
          {t('tasks.showDone')} {doneCount > 0 && <span className="muted">({doneCount})</span>}
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      {todos === null && <p className="muted">{t('app.loading')}</p>}
      {todos?.length === 0 && <p className="muted empty">{t('todos.empty')}</p>}

      <ul className="tasks">
        {visible.map((x) => {
          const done = !!x.done_at;
          if (editing?.id === x.id) {
            return (
              <li key={x.id}>
                <form className="form todo-edit" onSubmit={save}>
                  <input
                    autoFocus
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    aria-label={t('form.title')}
                    required
                  />
                  <textarea
                    rows={2}
                    value={editing.note}
                    placeholder={t('todos.note')}
                    onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                  />
                  <div className="todo-edit-foot">
                    <input
                      type="date"
                      value={editing.due_date || ''}
                      onChange={(e) => setEditing({ ...editing, due_date: e.target.value })}
                      aria-label={t('todos.due')}
                    />
                    <button type="button" onClick={() => setEditing(null)}>{t('tasks.cancel')}</button>
                    <button type="submit" className="primary">{t('todos.save')}</button>
                  </div>
                </form>
              </li>
            );
          }
          const overdue = !done && x.due_date && x.due_date < today;
          return (
            <li key={x.id} className={done ? 'done' : ''}>
              <label className="check">
                <input type="checkbox" checked={done} onChange={() => toggle(x)} />
              </label>
              <div
                className="body clickable"
                title={t('todos.edit')}
                onClick={() => setEditing({ id: x.id, title: x.title, note: x.note, due_date: x.due_date })}
              >
                <div className="title">{x.title}</div>
                {x.note && <div className="run-msg">{x.note}</div>}
                {x.due_date && (
                  <div className="meta">
                    <span className={overdue ? 'overdue' : x.due_date === today ? 'due-today' : ''}>
                      📅 {dueLabel(x.due_date)}
                    </span>
                  </div>
                )}
              </div>
              <div className="row-actions">
                <button className="icon" title={t('tasks.delete')} onClick={() => remove(x)}>✕</button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
