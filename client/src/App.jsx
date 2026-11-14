import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { api } from './api.js';
import { useI18n } from './i18n.jsx';
import LangSwitch from './LangSwitch.jsx';
import Login from './pages/Login.jsx';
import Tasks from './pages/Tasks.jsx';
import Todos from './pages/Todos.jsx';
import Store from './pages/Store.jsx';
import Settings from './pages/Settings.jsx';
import RunChat from './pages/RunChat.jsx';
import Privacy from './pages/Privacy.jsx';

export default function App() {
  const { t, setLang } = useI18n();
  const location = useLocation();
  const [me, setMe] = useState(undefined); // undefined: loading, null: not logged in

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
        <span className="logo">Dash</span>
        <nav>
          <NavLink to="/todo">{t('nav.todos')}</NavLink>
          <NavLink to="/" end>{t('nav.tasks')}</NavLink>
          <NavLink to="/store">{t('nav.store')}</NavLink>
          <NavLink to="/settings">
            {t('nav.agent')}{' '}
            <span
              className={`dot ${me.agent_online ? 'on' : ''}`}
              title={t(me.agent_online ? 'agent.online' : 'agent.offline')}
            />
          </NavLink>
        </nav>
        <span className="user">
          {me.picture && <img src={me.picture} alt="" referrerPolicy="no-referrer" />}
          <span className="muted">{me.email}</span>
          <button className="link" onClick={logout}>{t('nav.logout')}</button>
          <LangSwitch loggedIn />
        </span>
      </header>
      <main>
        <Routes>
          <Route path="/todo" element={<Todos />} />
          <Route path="/" element={<Tasks />} />
          <Route path="/store" element={<Store />} />
          <Route path="/runs/:id" element={<RunChat />} />
          <Route path="/settings" element={<Settings me={me} reload={loadMe} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
