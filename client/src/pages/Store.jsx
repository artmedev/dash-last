import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, RECURRENCE_LABELS } from '../api.js';

export default function Store() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api('/automations').then(setList).catch((e) => setError(e.message));
  }, []);

  return (
    <section>
      <div className="section-head">
        <h2>Automation store</h2>
        <Link to="/">← Recurring tasks</Link>
      </div>
      {error && <p className="error">{error}</p>}
      {list === null && !error && <p className="muted">Loading…</p>}
      <div className="store">
        {list?.map((a) => (
          <div key={a.slug} className="card store-item">
            <h3>{a.title}</h3>
            <p>{a.description}</p>
            <p className="muted small">
              Default: {RECURRENCE_LABELS[a.defaultRecurrence]}
              {a.defaultDay ? `, day ${a.defaultDay}` : ''}
            </p>
            <button className="primary" onClick={() => navigate(`/?add=${a.slug}`)}>Add to tasks</button>
          </div>
        ))}
      </div>
    </section>
  );
}
