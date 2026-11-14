import { LANGS, useI18n } from './i18n.jsx';
import { api } from './api.js';

/** Small EN/RU switcher. For a logged-in user the choice is saved to the profile. */
export default function LangSwitch({ loggedIn }) {
  const { lang, setLang } = useI18n();

  const choose = (l) => {
    if (l === lang) return;
    setLang(l);
    if (loggedIn) api('/me', { method: 'PATCH', body: { lang: l } }).catch(() => {});
  };

  return (
    <div className="lang-switch" role="group" aria-label="Language">
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      {LANGS.map((l) => (
        <button key={l} className={l === lang ? 'active' : ''} onClick={() => choose(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
