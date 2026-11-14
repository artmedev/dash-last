import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { LANGS, useI18n } from './i18n.jsx';

const LANG_NAMES = { en: 'English', ru: 'Русский' };

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

/** A round icon button with a tooltip; when it has children they open as a small menu on click. */
function IconMenu({ label, icon, onClick, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="icon-menu" ref={ref}>
      <button
        className="top-icon"
        title={label}
        aria-label={label}
        aria-expanded={children ? open : undefined}
        onClick={() => (children ? setOpen(!open) : onClick?.())}
      >
        {icon}
      </button>
      {open && <div className="menu card" onClick={() => setOpen(false)}>{children}</div>}
    </div>
  );
}

/** Top right corner: agent status, language, profile. Explanations on hover, actions on click. */
export default function TopIcons({ me, onAgent, onLogout }) {
  const { t, lang, setLang } = useI18n();

  const chooseLang = (l) => {
    if (l === lang) return;
    setLang(l);
    api('/me', { method: 'PATCH', body: { lang: l } }).catch(() => {});
  };

  return (
    <div className="top-icons">
      <IconMenu
        label={t(me.agent_online ? 'menu.agentOnline' : 'menu.agentOffline')}
        onClick={onAgent}
        icon={(
          <span className="with-dot">
            <Icon>
              <rect x="4" y="7" width="16" height="12" rx="3" />
              <path d="M12 3v4M9 12h.01M15 12h.01M9.5 16h5" />
            </Icon>
            <span className={`dot ${me.agent_online ? 'on' : ''}`} />
          </span>
        )}
      />
      <IconMenu
        label={t('menu.language', { lang: LANG_NAMES[lang] })}
        icon={(
          <span className="lang-icon">
            <Icon>
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
            </Icon>
            <span className="lang-code">{lang.toUpperCase()}</span>
          </span>
        )}
      >
        {LANGS.map((l) => (
          <button key={l} className={`menu-item ${l === lang ? 'active' : ''}`} onClick={() => chooseLang(l)}>
            {LANG_NAMES[l]}
          </button>
        ))}
      </IconMenu>
      <IconMenu
        label={me.email}
        icon={me.picture
          ? <img className="avatar" src={me.picture} alt="" referrerPolicy="no-referrer" />
          : <Icon><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></Icon>}
      >
        <div className="menu-head">
          {me.name && <strong>{me.name}</strong>}
          <span className="muted small">{me.email}</span>
          {me.is_superadmin && <span className="badge small">{t('menu.superadmin')}</span>}
        </div>
        {me.is_superadmin && (
          <>
            <a className="menu-item" href="https://artme.dev/tools" target="_blank" rel="noreferrer">Tools ↗</a>
            <a className="menu-item" href="https://jobs.artme.dev" target="_blank" rel="noreferrer">Jobs ↗</a>
          </>
        )}
        <button className="menu-item" onClick={onAgent}>{t('nav.agent')}</button>
        <button className="menu-item" onClick={onLogout}>{t('nav.logout')}</button>
      </IconMenu>
    </div>
  );
}
