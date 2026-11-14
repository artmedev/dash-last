import { useEffect, useState } from 'react';
import { api, localToday, RECURRENCE_LABELS } from '../api.js';

// The given day of the current month, so the task lands in the current period right away
// (for example, a tax due on the 1st: last month's declaration is not filed yet).
const withDay = (day) => {
  if (!day) return localToday();
  const t = localToday();
  return `${t.slice(0, 8)}${String(day).padStart(2, '0')}`;
};

export default function TaskForm({ mode, initialSlug, onClose, onSaved }) {
  const [catalog, setCatalog] = useState(null);
  const [automation, setAutomation] = useState(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(localToday());
  const [recurrence, setRecurrence] = useState('monthly');
  const [config, setConfig] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const pick = (a) => {
    setAutomation(a);
    setTitle(a.defaultTitle || a.title);
    setRecurrence(a.defaultRecurrence || 'monthly');
    setDate(withDay(a.defaultDay));
    setConfig(Object.fromEntries(a.fields.map((f) => [f.key, f.default || ''])));
  };

  useEffect(() => {
    if (mode !== 'auto') return;
    api('/automations').then((list) => {
      setCatalog(list);
      const a = list.find((x) => x.slug === initialSlug);
      if (a) pick(a);
    }).catch((e) => setError(e.message));
  }, [mode, initialSlug]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/tasks', {
        method: 'POST',
        body: {
          title,
          start_date: date,
          recurrence,
          ...(automation ? { automation_slug: automation.slug, config } : {}),
        },
      });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const choosing = mode === 'auto' && !automation;

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card modal">
        <div className="modal-head">
          <h3>{mode === 'auto' ? (automation ? automation.title : 'Choose an automation') : 'New task'}</h3>
          <button className="icon" onClick={onClose}>✕</button>
        </div>

        {choosing ? (
          <div className="catalog">
            {catalog === null && <p className="muted">Loading…</p>}
            {catalog?.map((a) => (
              <button key={a.slug} className="catalog-item" onClick={() => pick(a)}>
                <strong>{a.title}</strong>
                <span className="muted small">{a.description}</span>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={submit} className="form">
            <label>
              Title
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <div className="row">
              <label>
                Date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>
              <label>
                Recurrence
                <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                  {Object.entries(RECURRENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
            </div>
            {automation?.fields.map((f) => (
              <label key={f.key}>
                {f.label}
                <input
                  value={config[f.key] ?? ''}
                  placeholder={f.placeholder}
                  required={f.required}
                  onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}
                />
              </label>
            ))}
            {error && <p className="error">{error}</p>}
            <div className="modal-foot">
              {mode === 'auto' && !initialSlug && (
                <button type="button" className="link" onClick={() => setAutomation(null)}>← Back to list</button>
              )}
              <button type="submit" className="primary" disabled={saving}>Add</button>
            </div>
          </form>
        )}
        {choosing && error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
