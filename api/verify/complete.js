import { readState, verifyTurnstile } from '../../lib/oauth.js';
import { grant } from '../../lib/grant.js';
import { config } from '../../lib/config.js';
import { page, errorPage } from '../../lib/html.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  // Parse body (Vercel provides req.body already parsed for application/x-www-form-urlencoded in some runtimes)
  let body = req.body;
  if (typeof body === 'string') {
    body = Object.fromEntries(new URLSearchParams(body));
  }

  const state = body?.state;
  const pending = await readState(state);

  if (!pending) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(errorPage('Sesión expirada'));
  }

  const ok = await verifyTurnstile(body['cf-turnstile-response'], req.headers['x-forwarded-for']);
  if (!ok) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(errorPage('Captcha fallido'));
  }

  try {
    // En complete no tenemos access_token (ya se usó o no se pasó). Solo damos rol.
    await grant(pending.guildId, pending.userId, null, null);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(
      page(
        'Verificado',
        `<h1>✅ Verificado</h1>
         <p>Ya tienes acceso.</p>
         <a class="btn" href="${config.invite}">Abrir servidor</a>`
      )
    );
  } catch (err) {
    console.error(err);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(errorPage(err.message));
  }
}
