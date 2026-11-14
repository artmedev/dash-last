import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Settings({ me, reload }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  // Refresh the agent status
  useEffect(() => {
    const id = setInterval(reload, 10000);
    return () => clearInterval(id);
  }, [reload]);

  const generate = async () => {
    if (me.has_agent_token && !confirm('The old token will stop working. Continue?')) return;
    try {
      const { token } = await api('/me/agent-token', { method: 'POST' });
      setToken(token);
      reload();
    } catch (e) {
      setError(e.message);
    }
  };

  const server = window.location.origin;

  return (
    <section>
      <div className="section-head"><h2>Local agent</h2></div>
      <div className="card">
        <p>
          Automations are run by Claude Code on your computer: it works in your Chrome through
          the Claude in Chrome extension. The agent picks up runs from the site and opens a Claude window,
          where you enter SMS codes and answer questions.
        </p>
        <p>
          Status:{' '}
          {me.agent_online
            ? <strong className="ok">online</strong>
            : <strong className="muted">offline</strong>}
          {me.agent_last_seen && (
            <span className="muted small"> (last seen: {new Date(me.agent_last_seen).toLocaleString()})</span>
          )}
        </p>
        <button onClick={generate}>{me.has_agent_token ? 'Issue a new token' : 'Issue agent token'}</button>
        {token && (
          <div className="token">
            <p>The token is shown once. Run on your computer:</p>
            <pre>{`npm run agent -- --server ${server} --token ${token}`}</pre>
            <p className="muted small">The settings are saved to agent/.agent.json; after that "npm run agent" is enough.</p>
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </section>
  );
}
