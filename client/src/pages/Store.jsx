import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';

export default function Store() {
  const { t, pick, tError } = useI18n();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api('/automations').then(setList).catch((e) => setError(tError(e)));
  }, [tError]);

  return (
    <section>
      <div className="section-head">
        <h2>{t('store.title')}</h2>
        <Link to="/">{t('store.back')}</Link>
      </div>
      {error && <p className="error">{error}</p>}
      {list === null && !error && <p className="muted">{t('app.loading')}</p>}
      <div className="store">
        {list?.map((a) => (
          <div key={a.slug} className="card store-item">
            <h3>{pick(a.title)}</h3>
            <p>{pick(a.description)}</p>
            <p className="muted small">
              {t('store.defaults', { recurrence: t(`rec.${a.defaultRecurrence}`) })}
              {a.defaultDay ? t('store.defaultDay', { day: a.defaultDay }) : ''}
            </p>
            <button className="primary" onClick={() => navigate(`/?add=${a.slug}`)}>{t('store.add')}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
