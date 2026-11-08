import crypto from 'node:crypto';
import { config } from './config.js';

function sign(body) {
  return crypto.createHmac('sha256', config.sessionSecret).update(body).digest('base64url');
}

export function signState(payload, ttlMs = 10 * 60_000) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlMs })).toString('base64url');
  return `${body}.${sign(body)}`;
}