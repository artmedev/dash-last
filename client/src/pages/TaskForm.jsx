import { useEffect, useState } from 'react';
import { api, localToday } from '../api.js';
import { useI18n, RECURRENCES } from '../i18n.jsx';

// The given day of the current month, so the task lands in the current period
// (e.g. tax on the 1st: last month's declaration has not been filed yet).
const withDay = (day) => {
  if (!day) return localToday();
  return `${localToday().slice(0, 8)}${String(day).padStart(2, '0')}`;
};

export default function TaskForm({ mode, initialSlug, onClose, onSaved }) {
  const { t, pick, tError } = useI18n();
  const [catalog, setCatalog] = useState(null);
  const [automation, setAutomation] = useState(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(localToday());
  const [recurrence, setRecurrence] = useState('monthly');
  const [config, setConfig] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const choose = (a) => {
    setAutomation(a);
    setTitle(pick(a.defaultTitle || a.title));
    setRecurrence(a.defaultRecurrence || 'monthly');
    setDate(withDay(a.defaultDay));
    setConfig(Object.fromEntries(a.fields.map((f) => [f.key, f.default || ''])));
  };

  useEffect(() => {
    if (mode !== 'auto') return;
    api('/automations').then((list) => {
      setCatalog(list);
      const a = list.find((x) => x.slug === initialSlug);
      if (a) choose(a);
    }).catch((e) => setError(tError(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const field = automation?.fields.find((f) => f.key === err.field);
      setError(tError(err, { field: pick(field?.label) }));
      setSaving(false);
    }
  };

  const choosing = mode === 'auto' && !automation;
  const heading = mode === 'auto' ? (automation ? pick(automation.title) : t('form.chooseAutomation')) : t('form.new');

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card modal">
        <div className="modal-head">
          <h3>{heading}</h3>
          <button className="icon" onClick={onClose}>✕</button>
        </div>

        {choosing ? (
          <div className="catalog">
            {catalog === null && <p className="muted">{t('app.loading')}</p>}
            {catalog?.map((a) => (
              <button key={a.slug} className="catalog-item" onClick={() => choose(a)}>
                <strong>{pick(a.title)}</strong>
                <span className="muted small">{pick(a.description)}</span>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={submit} className="form">
            <label>
              {t('form.title')}
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <div className="row">
              <label>
                {t('form.date')}
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>
              <label>
                {t('form.recurrence')}
                <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                  {RECURRENCES.map((k) => <option key={k} value={k}>{t(`rec.${k}`)}</option>)}
                </select>
              </label>
            </div>
            {automation?.fields.map((f) => (
              <label key={f.key}>
                {pick(f.label)}
                <input
                  value={config[f.key] ?? ''}
                  placeholder={pick(f.placeholder)}
                  required={f.required}
                  onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}
                />
              </label>
            ))}
            {error && <p className="error">{error}</p>}
            <div className="modal-foot">
              {mode === 'auto' && !initialSlug && (
                <button type="button" className="link" onClick={() => setAutomation(null)}>{t('form.back')}</button>
              )}
              <button type="submit" className="primary" disabled={saving}>{t('form.submit')}</button>
            </div>
          </form>
        )}
        {choosing && error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
