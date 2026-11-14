import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { api } from './api.js';
import { useI18n } from './i18n.jsx';
import TopIcons from './TopIcons.jsx';
import Login from './pages/Login.jsx';
import Tasks from './pages/Tasks.jsx';
import Todos from './pages/Todos.jsx';
import Settings from './pages/Settings.jsx';
import RunChat from './pages/RunChat.jsx';
import Privacy from './pages/Privacy.jsx';

export default function App() {
  const { t, setLang } = useI18n();
  const location = useLocation();
  const [me, setMe] = useState(undefined); // undefined: loading, null: not logged in
  const [agentOpen, setAgentOpen] = useState(false);

  const loadMe = useCallback(() => {
    api('/me').then(setMe).catch(() => setMe(null));
  }, []);
  useEffect(loadMe, [loadMe]);

  // On every open, re-issue the session cookie for all of *.artme.dev: an old host-only cookie
  // (from before COOKIE_DOMAIN) would otherwise never reach artme.dev/tools.
  // Came from a private page of another artme.dev site: go back after that.
  const next = new URLSearchParams(location.search).get('next');
  const nextOk = (() => { try { const u = new URL(next); return u.protocol === 'https:' && /(^|.)artme.dev$/.test(u.hostname); } catch { return false; } })();
  const loggedIn = !!me;
  useEffect(() => {
    if (!loggedIn) return;
    api('/auth/refresh', { method: 'POST' }).catch(() => {}).finally(() => { if (nextOk) window.location.href = next; });
  }, [loggedIn, nextOk, next]);

  // The language saved in the user's profile wins
  useEffect(() => {
    if (me?.lang) setLang(me.lang);
  }, [me?.lang, setLang]);

  // Public page, required by Google for the OAuth consent screen
  if (location.pathname === '/privacy') return <Privacy />;
  if (me === undefined) return <div className="center muted">{t('app.loading')}</div>;
  if (me === null) return <Login onLogin={loadMe} />;
  if (nextOk) return <div className="center muted">{t('app.loading')}</div>;

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    setMe(null);
  };

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="logo">Dash</Link>
        <TopIcons me={me} onAgent={() => setAgentOpen(true)} onLogout={logout} />
      </header>
      <main>
        <Routes>
          {/* One page: one-off tasks, then recurring tasks; the store and agent settings open as popups */}
          <Route path="/" element={<><Todos /><Tasks /></>} />
          <Route path="/runs/:id" element={<RunChat />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      {agentOpen && <Settings me={me} reload={loadMe} onClose={() => setAgentOpen(false)} />}
    </div>
  );
}
