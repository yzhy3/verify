import crypto from 'node:crypto';
import { config } from '../config.js';
import { store } from '../store.js';

const SCOPES = ['identify', 'guilds.join'];

function sign(body) {
  return crypto.createHmac('sha256', config.sessionSecret).update(body).digest('base64url');
}

export function makeState(userId, guildId) {
  const body = Buffer.from(JSON.stringify({ userId, guildId, n: crypto.randomUUID() })).toString('base64url');
  const state = `${body}.${sign(body)}`;
  store.addPending(state, { userId, guildId });
  return state;
}

export function readState(state) {
  const [body, mac] = (state || '').split('.');
  if (!body || !mac) return null;
  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const pending = store.takePending(state);
  if (!pending) return null;
  return pending;
}

export function authorizeUrl(state) {
  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', `${config.publicUrl}/verify/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeCode(code) {
  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${config.publicUrl}/verify/callback`,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange falló: ${res.status}`);
  return res.json();
}

export async function fetchUser(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Fetch user falló: ${res.status}`);
  return res.json();
}

export function accountAgeDays(user) {
  const created = Number((BigInt(user.id) >> 22n) + 1420070400000n);
  return (Date.now() - created) / 86_400_000;
}

export async function verifyTurnstile(token, ip) {
  if (!config.turnstileSecret) return true;
  const body = new URLSearchParams({
    secret: config.turnstileSecret,
    response: token || '',
    remoteip: ip || '',
  });
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const json = await res.json();
  return Boolean(json.success);
}