import crypto from 'node:crypto';
import { config } from '../../lib/config.js';
import { store } from '../../lib/store.js';
import { authorizeUrl } from '../../lib/oauth.js';
import { errorPage } from '../../lib/html.js';

function sign(body) {
  return crypto.createHmac('sha256', config.sessionSecret).update(body).digest('base64url');
}

/** Valida firma del state SIN consumirlo (el consumo ocurre en callback) */
async function peekState(state) {
  const [body, mac] = (state || '').split('.');
  if (!body || !mac) return null;
  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return store.getPending(state);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  const state = req.query.state;
  const pending = await peekState(state);

  if (!pending) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(
      errorPage('Enlace inválido o expirado. Vuelve a Discord y pulsa Verificar otra vez.')
    );
  }

  res.writeHead(302, { Location: authorizeUrl(state) });
  res.end();
}
