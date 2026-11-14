import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

export default function Login({ onLogin }) {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [devEmail, setDevEmail] = useState('dev@localhost');
  const btn = useRef(null);

  useEffect(() => {
    api('/config').then(setConfig).catch((e) => setError(e.message));
  }, []);

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
            await api('/auth/google', { method: 'POST', body: { credential } });
            onLogin();
          } catch (e) {
            setError(e.message);
          }
        },
      });
      window.google.accounts.id.renderButton(btn.current, { theme: 'outline', size: 'large', locale: 'ru' });
    };
    init();
    return () => { cancelled = true; };
  }, [config, onLogin]);

  const devLogin = async (e) => {
    e.preventDefault();
    try {
      await api('/auth/dev', { method: 'POST', body: { email: devEmail } });
      onLogin();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="center">
      <div className="card login">
        <h1>Dash</h1>
        <p className="muted">Personal dashboard and AI assistant</p>
        {config?.googleClientId ? (
          <div ref={btn} />
        ) : (
          config && <p className="warn">GOOGLE_CLIENT_ID is not set on the server</p>
        )}
        {config?.devAuth && (
          <form onSubmit={devLogin} className="dev-login">
            <div className="muted small">Local sign-in (DEV_AUTH)</div>
            <input value={devEmail} onChange={(e) => setDevEmail(e.target.value)} />
            <button type="submit">Sign in locally</button>
          </form>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
