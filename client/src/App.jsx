import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { api } from './api.js';
import Login from './pages/Login.jsx';
import Tasks from './pages/Tasks.jsx';
import Store from './pages/Store.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const [me, setMe] = useState(undefined); // undefined: loading, null: not logged in

  const loadMe = useCallback(() => {
    api('/me').then(setMe).catch(() => setMe(null));
  }, []);
  useEffect(loadMe, [loadMe]);

  if (me === undefined) return <div className="center muted">Loading…</div>;
  if (me === null) return <Login onLogin={loadMe} />;

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    setMe(null);
  };

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo">Dash</span>
        <nav>
          <NavLink to="/" end>Recurring tasks</NavLink>
          <NavLink to="/store">Automation store</NavLink>
          <NavLink to="/settings">
            Agent <span className={`dot ${me.agent_online ? 'on' : ''}`} title={me.agent_online ? 'online' : 'offline'} />
          </NavLink>
        </nav>
        <span className="user">
          {me.picture && <img src={me.picture} alt="" referrerPolicy="no-referrer" />}
          <span className="muted">{me.email}</span>
          <button className="link" onClick={logout}>Sign out</button>
        </span>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Tasks />} />
          <Route path="/store" element={<Store />} />
          <Route path="/settings" element={<Settings me={me} reload={loadMe} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
