import crypto from 'node:crypto';
import { ensureSchema, sql } from './db.js';

const COOKIE_NAME = 'misterio_session';
const EIGHT_HOURS = 60 * 60 * 8;

function secret() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET deve ter pelo menos 32 caracteres.');
  }
  return process.env.SESSION_SECRET;
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header.split(';').map(part => part.trim()).filter(Boolean).map(part => {
      const index = part.indexOf('=');
      return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
    })
  );
}

function tokenFor(user) {
  const payload = Buffer.from(JSON.stringify({
    uid: Number(user.id),
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + EIGHT_HOURS
  })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.uid || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export function setSession(res, user) {
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production';
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(tokenFor(user))}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${EIGHT_HOURS}`
  ];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSession(res) {
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production';
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export async function currentUser(req) {
  await ensureSchema();
  const token = parseCookies(req)[COOKIE_NAME];
  const session = verifyToken(token);
  if (!session) return null;
  const rows = await sql().query(
    `SELECT id, username, role, must_change_password, is_test
     FROM users WHERE id = $1`,
    [session.uid]
  );
  return rows[0] || null;
}

export async function requireUser(req, res, role = null) {
  const user = await currentUser(req);
  if (!user) {
    res.status(401).json({ error: 'Não autenticado.' });
    return null;
  }
  if (role && user.role !== role) {
    res.status(403).json({ error: 'Acesso negado.' });
    return null;
  }
  return user;
}

export function normalizeUsername(value) {
  return String(value || '').trim();
}

export function validUsername(value) {
  return /^[A-Za-z0-9._-]{3,30}$/.test(value);
}
