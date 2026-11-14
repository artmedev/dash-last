import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { q } from './db.js';

const COOKIE = 'dash_session';
const google = new OAuth2Client();

export const devAuthEnabled = () =>
  process.env.DEV_AUTH === '1' && process.env.NODE_ENV !== 'production';

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

async function upsertUser({ sub, email, name, picture }) {
  const { rows } = await q(
    `INSERT INTO users (google_sub, email, name, picture) VALUES ($1,$2,$3,$4)
     ON CONFLICT (google_sub) DO UPDATE SET email=$2, name=$3, picture=$4
     RETURNING id, email, name, picture`,
    [sub, email, name, picture],
  );
  return rows[0];
}

function setSession(res, user) {
  const token = jwt.sign({ uid: user.id }, process.env.SESSION_SECRET, { expiresIn: '30d' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 3600 * 1000,
  });
}

export async function loginWithGoogle(req, res) {
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: 'credential required' });
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'GOOGLE_CLIENT_ID not set' });
  try {
    const ticket = await google.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const p = ticket.getPayload();
    if (!p.email_verified) return res.status(403).json({ error: 'email not verified' });
    const user = await upsertUser({ sub: p.sub, email: p.email, name: p.name, picture: p.picture });
    setSession(res, user);
    res.json(user);
  } catch {
    res.status(401).json({ error: 'invalid google token' });
  }
}

export async function loginDev(req, res) {
  if (!devAuthEnabled()) return res.status(404).end();
  const email = String(req.body?.email || 'dev@localhost').trim();
  const user = await upsertUser({ sub: `dev:${email}`, email, name: email.split('@')[0], picture: null });
  setSession(res, user);
  res.json(user);
}

export function logout(req, res) {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
}

const sessionUserId = (req) => {
  try {
    return jwt.verify(req.cookies[COOKIE] || '', process.env.SESSION_SECRET).uid;
  } catch {
    return null;
  }
};

/** Browser session (cookie) */
export function requireUser(req, res, next) {
  req.userId = sessionUserId(req);
  if (!req.userId) return res.status(401).json({ error: 'unauthorized' });
  next();
}

/** Session if present: a guest is not an error */
export function optionalUser(req, res, next) {
  req.userId = sessionUserId(req);
  next();
}

/** Local agent (Bearer token issued on the Agent page) */
export async function requireAgent(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'agent token required' });
  const { rows } = await q(
    `UPDATE users SET agent_last_seen = now() WHERE agent_token_hash = $1 RETURNING id`,
    [sha256(token)],
  );
  if (!rows[0]) return res.status(401).json({ error: 'invalid agent token' });
  req.userId = rows[0].id;
  next();
}
