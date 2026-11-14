import { useRef } from 'react';
import { localToday } from './api.js';
import { useI18n } from './i18n.jsx';

const addDays = (date, n) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/** Short label for a due date: Today, Tomorrow or the date. */
export function useDueLabel() {
  const { t, formatDate } = useI18n();
  const today = localToday();
  return (d) => {
    if (!d) return '';
    if (d === today) return t('todos.today');
    if (d === addDays(today, 1)) return t('todos.tomorrow');
    return formatDate(d);
  };
}

/**
 * Calendar icon with a short label instead of a full date field.
 * A click opens the browser's date picker; clearing it there leaves the task without a date.
 */
export default function DatePick({ value, onChange }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const dueLabel = useDueLabel();
  const open = () => {
    try { ref.current?.showPicker(); } catch { ref.current?.focus(); }
  };
  const label = value ? t('date.due', { date: dueLabel(value) }) : t('date.none');
  return (
    <span className="date-pick">
      <button type="button" className={`date-btn ${value ? 'set' : ''}`} onClick={open} title={label} aria-label={label}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="5" width="17" height="15" rx="3" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
        {value && <span className="date-text">{dueLabel(value)}</span>}
      </button>
      <input
        ref={ref}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </span>
  );
}
