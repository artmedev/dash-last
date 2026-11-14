import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';

const ACTIVE = ['pending', 'claimed', 'running'];
const POLL_MS = 2000;

const parseActivity = (text) => {
  try { return JSON.parse(text); } catch { return { kind: 'other', detail: text }; }
};

/** Groups consecutive activity messages into one line so browser clicks don't flood the chat. */
function groupMessages(messages) {
  const out = [];
  for (const m of messages) {
    const prev = out[out.length - 1];
    if (m.role === 'activity' && prev?.role === 'activity') {
      prev.count += 1;
      prev.last = parseActivity(m.text);
    } else if (m.role === 'activity') {
      out.push({ ...m, count: 1, last: parseActivity(m.text) });
    } else {
      out.push(m);
    }
  }
  return out;
}

export default function RunChat() {
  const { id } = useParams();
  const { t, tError } = useI18n();
  const [run, setRun] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const lastId = useRef(0);
  const bottom = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api(`/runs/${id}?after=${lastId.current}`);
      setRun(data.run);
      if (data.messages.length) {
        lastId.current = data.messages[data.messages.length - 1].id;
        setMessages((prev) => [...prev, ...data.messages]);
      }
    } catch (e) {
      setError(tError(e));
    }
  }, [id, tError]);

  useEffect(() => {
    lastId.current = 0;
    setMessages([]);
    load();
  }, [load]);

  const active = run && ACTIVE.includes(run.status);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [active, load]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, run?.awaiting_user]);

  const send = async (e) => {
    e?.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setError('');
    try {
      await api(`/runs/${id}/messages`, { method: 'POST', body: { text: value } });
      setText('');
      await load();
    } catch (err) {
      setError(tError(err));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) send(e);
  };

  const cancel = async () => {
    if (!confirm(t('chat.confirmCancel'))) return;
    try {
      await api(`/runs/${id}/cancel`, { method: 'POST' });
      load();
    } catch (err) {
      setError(tError(err));
    }
  };

  if (!run) return <p className="muted">{error || t('app.loading')}</p>;

  const working = active && !run.awaiting_user;
  const grouped = groupMessages(messages);

  return (
    <section className="chat-page">
      <div className="section-head">
        <div>
          <Link to="/" className="small">{t('store.back')}</Link>
          <h2>{run.task_title}</h2>
        </div>
        <div className="actions">
          <span className={`run run-${run.status}`}>{t(`run.${run.status}`)}</span>
          {active && <button onClick={cancel}>{t('tasks.cancel')}</button>}
        </div>
      </div>

      {active && !run.agent_online && <p className="warn">{t('chat.agentOffline')}</p>}

      <div className="chat">
        {grouped.length === 0 && active && <p className="muted center-text">{t('chat.starting')}</p>}
        {grouped.map((m) => {
          if (m.role === 'activity') {
            const label = t(`tool.${m.last.kind}`, { detail: m.last.detail || '' });
            return (
              <div key={m.id} className="msg activity">
                ⚙ {label}{m.count > 1 ? ` · ${t('chat.steps', { n: m.count })}` : ''}
              </div>
            );
          }
          return <div key={m.id} className={`msg ${m.role}`}>{m.text}</div>;
        })}
        {working && grouped.length > 0 && <div className="msg typing">{t('chat.working')}<span className="dots" /></div>}
        {run.message && !active && <div className="msg system">{run.message}</div>}
        <div ref={bottom} />
      </div>

      {active ? (
        <form className="composer" onSubmit={send}>
          <textarea
            rows={2}
            value={text}
            placeholder={run.awaiting_user ? t('chat.placeholderWaiting') : t('chat.placeholder')}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
          />
          <button type="submit" className="primary" disabled={sending || !text.trim()}>{t('chat.send')}</button>
        </form>
      ) : (
        <p className="muted">{t('chat.finished')}</p>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
