import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';

export default function Settings({ me, reload }) {
  const { t, tError, lang } = useI18n();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  // Keep the agent status fresh
  useEffect(() => {
    const id = setInterval(reload, 10000);
    return () => clearInterval(id);
  }, [reload]);

  const generate = async () => {
    if (me.has_agent_token && !confirm(t('settings.confirmReissue'))) return;
    try {
      const { token } = await api('/me/agent-token', { method: 'POST' });
      setToken(token);
      reload();
    } catch (e) {
      setError(tError(e));
    }
  };

  const server = window.location.origin;
  const locale = lang === 'ru' ? 'ru-RU' : 'en-GB';

  return (
    <section>
      <div className="section-head"><h2>{t('settings.title')}</h2></div>
      <div className="card">
        <p>{t('settings.intro')}</p>
        <p>
          {t('settings.status')}{' '}
          {me.agent_online
            ? <strong className="ok">{t('agent.online')}</strong>
            : <strong className="muted">{t('agent.offline')}</strong>}
          {me.agent_last_seen && (
            <span className="muted small">
              {' '}{t('settings.lastSeen', { time: new Date(me.agent_last_seen).toLocaleString(locale) })}
            </span>
          )}
        </p>
        <button onClick={generate}>{t(me.has_agent_token ? 'settings.reissue' : 'settings.issue')}</button>
        {token && (
          <div className="token">
            <p>{t('settings.tokenOnce')}</p>
            <pre>{`npm run agent -- --server ${server} --token ${token}`}</pre>
            <p className="muted small">{t('settings.tokenSaved')}</p>
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </section>
  );
}
