import { useCallback, useEffect, useState } from 'react';
import { api, localToday } from '../api.js';
import { useI18n } from '../i18n.jsx';
import ShowDone from '../ShowDone.jsx';
import DatePick, { useDueLabel } from '../DatePick.jsx';

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const store = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};

/** Title (+ optional due date) and Enter: adds a task, inside a goal when goalId is set. */
function QuickAdd({ goalId = null, autoFocus, act, compact }) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(localToday);
  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    act(async () => {
      await api('/todos', { method: 'POST', body: { title, due_date: due || null, goal_id: goalId } });
      setTitle('');
      setDue(localToday());
    });
  };
  return (
    <form className={`quick-add ${compact ? 'compact' : 'card'}`} onSubmit={submit}>
      <input
        autoFocus={autoFocus}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t(goalId ? 'goals.taskPlaceholder' : 'todos.placeholder')}
        aria-label={t('form.title')}
      />
      <DatePick value={due} onChange={setDue} />
      <button type="submit" className="add-icon primary" disabled={!title.trim()} title={t('todos.add')} aria-label={t('todos.add')}>
        <PlusIcon />
      </button>
    </form>
  );
}

/** Task rows: check off, click to edit (title, description, due date, goal), delete. */
function TaskList({ items, goals, act }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(null);
  const today = localToday();
  const dueLabel = useDueLabel();

  const toggle = (x) => act(() => api(`/todos/${x.id}`, { method: 'PATCH', body: { done: !x.done_at } }));
  const remove = (x) => {
    if (confirm(t('tasks.confirmDelete', { title: x.title }))) act(() => api(`/todos/${x.id}`, { method: 'DELETE' }));
  };
  const save = (e) => {
    e.preventDefault();
    const { id, ...body } = editing;
    act(async () => {
      await api(`/todos/${id}`, {
        method: 'PATCH',
        body: { ...body, due_date: body.due_date || null, goal_id: body.goal_id || null },
      });
      setEditing(null);
    });
  };

  return (
    <ul className="tasks">
      {items.map((x) => {
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
                  <DatePick value={editing.due_date} onChange={(v) => setEditing({ ...editing, due_date: v })} />
                  {goals.length > 0 && (
                    <select
                      value={editing.goal_id || ''}
                      onChange={(e) => setEditing({ ...editing, goal_id: e.target.value })}
                      aria-label={t('goals.goal')}
                    >
                      <option value="">{t('goals.none')}</option>
                      {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                    </select>
                  )}
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
              onClick={() => setEditing({ id: x.id, title: x.title, note: x.note, due_date: x.due_date, goal_id: x.goal_id })}
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
  );
}

function Progress({ done, total }) {
  const { t } = useI18n();
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="progress-row" title={t('goals.progress', { done, total, pct })}>
      <div className={`progress ${total && done === total ? 'complete' : ''}`} role="progressbar"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-text">{done}/{total} · {pct}%</span>
    </div>
  );
}

function GoalCard({ goal, tasks, goals, act, showDone }) {
  const { t } = useI18n();
  const key = `dash.goal.${goal.id}.open`;
  const [open, setOpen] = useState(() => store.get(key, true));
  const [renaming, setRenaming] = useState(null);
  const done = tasks.filter((x) => x.done_at).length;
  // Open tasks first, done ones below
  const sorted = [...tasks].filter((x) => showDone || !x.done_at).sort((a, b) => !!a.done_at - !!b.done_at);

  const toggleOpen = () => { setOpen(!open); store.set(key, !open); };
  const rename = (e) => {
    e.preventDefault();
    act(async () => {
      await api(`/goals/${goal.id}`, { method: 'PATCH', body: { title: renaming } });
      setRenaming(null);
    });
  };
  const remove = () => {
    if (confirm(t('goals.confirmDelete', { title: goal.title }))) act(() => api(`/goals/${goal.id}`, { method: 'DELETE' }));
  };

  return (
    <div className="card goal">
      <div className="goal-head">
        <button className="chevron" onClick={toggleOpen} aria-expanded={open} title={t(open ? 'goals.collapse' : 'goals.expand')}>
          {open ? '▾' : '▸'}
        </button>
        {renaming !== null ? (
          <form className="goal-rename" onSubmit={rename}>
            <input autoFocus value={renaming} onChange={(e) => setRenaming(e.target.value)} onBlur={() => setRenaming(null)}
              onKeyDown={(e) => e.key === 'Escape' && setRenaming(null)} aria-label={t('goals.title')} required />
          </form>
        ) : (
          <h3 className="goal-title clickable" title={t('goals.rename')} onClick={() => setRenaming(goal.title)}>{goal.title}</h3>
        )}
        <button className="icon" title={t('goals.delete')} onClick={remove}>✕</button>
      </div>
      <Progress done={done} total={tasks.length} />
      {open && (
        <div className="goal-body">
          {sorted.length > 0 && <TaskList items={sorted} goals={goals} act={act} />}
          <QuickAdd goalId={goal.id} act={act} compact />
        </div>
      )}
    </div>
  );
}

/** Goals (each with its tasks and a progress bar), then tasks that belong to no goal. */
export default function Plan() {
  const { t, tError } = useI18n();
  const [todos, setTodos] = useState(null);
  const [goals, setGoals] = useState(null);
  const [error, setError] = useState('');
  const [showDone, setShowDone] = useState(() => store.get('dash.todos.showDone', false));
  const [goalsShowDone, setGoalsShowDone] = useState(() => store.get('dash.goals.showDone', true));
  const [newGoal, setNewGoal] = useState(null); // null: closed, string: the form is open

  const load = useCallback(() => {
    Promise.all([api('/todos'), api('/goals')])
      .then(([td, gl]) => { setTodos(td); setGoals(gl); })
      .catch((e) => setError(tError(e)));
  }, [tError]);
  useEffect(load, [load]);

  const act = useCallback(async (fn) => {
    setError('');
    try { await fn(); load(); } catch (e) { setError(tError(e)); }
  }, [load, tError]);

  const addGoal = (e) => {
    e.preventDefault();
    if (!newGoal?.trim()) return;
    act(async () => {
      await api('/goals', { method: 'POST', body: { title: newGoal } });
      setNewGoal(null);
    });
  };

  const toggleShowDone = (v) => { setShowDone(v); store.set('dash.todos.showDone', v); };
  const toggleGoalsShowDone = (v) => { setGoalsShowDone(v); store.set('dash.goals.showDone', v); };

  const loose = todos?.filter((x) => !x.goal_id) ?? [];
  const visible = loose.filter((x) => showDone || !x.done_at);
  const doneCount = loose.filter((x) => x.done_at).length;
  const goalsDoneCount = todos?.filter((x) => x.goal_id && x.done_at).length ?? 0;

  return (
    <>
      <section>
        <div className="section-head">
          <h2>{t('goals.heading')}</h2>
          <div className="actions">
            <ShowDone value={goalsShowDone} onChange={toggleGoalsShowDone} count={goalsDoneCount} />
            <button className="add-icon" title={t('goals.add')} aria-label={t('goals.add')} onClick={() => setNewGoal(newGoal === null ? '' : null)}>
              <PlusIcon />
            </button>
          </div>
        </div>
        {newGoal !== null && (
          <form className="quick-add card" onSubmit={addGoal}>
            <input autoFocus value={newGoal} onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setNewGoal(null)}
              placeholder={t('goals.placeholder')} aria-label={t('goals.title')} />
            <button type="submit" className="add-icon primary" disabled={!newGoal.trim()} title={t('goals.add')} aria-label={t('goals.add')}>
              <PlusIcon />
            </button>
          </form>
        )}
        {goals?.length === 0 && newGoal === null && <p className="muted empty small">{t('goals.empty')}</p>}
        <div className="goals">
          {goals?.map((g) => (
            <GoalCard key={g.id} goal={g} goals={goals} act={act} showDone={goalsShowDone}
              tasks={todos?.filter((x) => x.goal_id === g.id) ?? []} />
          ))}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>{t('todos.title')}</h2>
          <div className="actions">
            <ShowDone value={showDone} onChange={toggleShowDone} count={doneCount} />
          </div>
        </div>
        <QuickAdd act={act} autoFocus />
        {error && <p className="error">{error}</p>}
        {todos === null && <p className="muted">{t('app.loading')}</p>}
        {todos && loose.length === 0 && <p className="muted empty">{t('todos.empty')}</p>}
        <TaskList items={visible} goals={goals ?? []} act={act} />
      </section>
    </>
  );
}
