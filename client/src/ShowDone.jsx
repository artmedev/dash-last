import { useI18n } from './i18n.jsx';

/** Header icon that shows or hides completed items; the tooltip explains it and gives the count. */
export default function ShowDone({ value, onChange, count }) {
  const { t } = useI18n();
  const label = t(value ? 'done.hide' : 'done.show', { n: count });
  return (
    <button
      className={`add-icon toggle-done ${value ? 'on' : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={value}
      onClick={() => onChange(!value)}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <path d="m8.5 12 2.5 2.5 4.5-5" />
        {!value && <path d="M3 21 21 3" />}
      </svg>
      {count > 0 && <span className="count-badge">{count}</span>}
    </button>
  );
}
