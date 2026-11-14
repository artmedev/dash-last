import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import LangSwitch from '../LangSwitch.jsx';

export default function Login({ onLogin }) {
  const { t, lang } = useI18n();
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [devEmail, setDevEmail] = useState('dev@localhost');
  const btn = useRef(null);

  useEffect(() => {
    api('/config').then(setConfig).catch((e) => setError(e.message));
  }, []);

  // A new user's profile language follows the language chosen on the login page
  const afterLogin = async (user) => {
    if (user?.created && user.lang !== lang) await api('/me', { method: 'PATCH', body: { lang } }).catch(() => {});
    onLogin();
  };

  useEffect(() => {
    if (!config?.googleClientId) return;
    let cancelled = false;
    const init = () => {
      if (cancelled) return;
      if (!window.google?.accounts?.id) return setTimeout(init, 200);
      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: async ({ credential }) => {
          try {
            afterLogin(await api('/auth/google', { method: 'POST', body: { credential } }));
          } catch (e) {
            setError(e.message);
          }
        },
      });
      btn.current.innerHTML = '';
      window.google.accounts.id.renderButton(btn.current, { theme: 'outline', size: 'large', locale: lang });
    };
    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, lang]);

  const devLogin = async (e) => {
    e.preventDefault();
    try {
      afterLogin(await api('/auth/dev', { method: 'POST', body: { email: devEmail } }));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="center">
      <div className="login-lang"><LangSwitch /></div>
      <div className="card login">
        <h1>Dash</h1>
        <p className="muted">{t('app.tagline')}</p>
        {config?.googleClientId ? (
          <div ref={btn} />
        ) : (
          config && <p className="warn">{t('login.noClientId')}</p>
        )}
        {config?.devAuth && (
          <form onSubmit={devLogin} className="dev-login">
            <div className="muted small">{t('login.devTitle')}</div>
            <input value={devEmail} onChange={(e) => setDevEmail(e.target.value)} />
            <button type="submit">{t('login.devButton')}</button>
          </form>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
