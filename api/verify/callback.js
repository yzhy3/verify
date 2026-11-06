import {
  readState,
  exchangeCode,
  fetchUser,
  accountAgeDays,
} from '../../lib/oauth.js';
import { grant } from '../../lib/grant.js';
import { config } from '../../lib/config.js';
import { page, errorPage } from '../../lib/html.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  const { code, state } = req.query;
  const pending = await readState(state);

  if (!pending || !code) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(errorPage('Sesión expirada. Reinicia la verificación desde Discord.'));
  }

  try {
    const token = await exchangeCode(code);
    const user = await fetchUser(token.access_token);

    if (user.id !== pending.userId) {
      throw new Error('El usuario autorizado no coincide');
    }

    const age = accountAgeDays(user);
    if (age < config.minAgeDays) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(
        page(
          'Cuenta nueva',
          `<h1 class="err">Cuenta demasiado nueva</h1>
           <p>Tu cuenta tiene ${Math.floor(age)} días y se requieren ${config.minAgeDays}.</p>
           <a class="btn" href="${config.invite}">Ir al servidor</a>`
        )
      );
    }

    // Turnstile opcional
    if (config.turnstileSite) {
      // Re-store state for the complete step
      const { store } = await import('../../lib/store.js');
      await store.addPending(state, pending);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(
        page(
          'Captcha',
          `<h1>Último paso</h1>
           <p>Resuelve la verificación anti-bot.</p>
           <form method="POST" action="/verify/complete">
             <input type="hidden" name="state" value="${state}">
             <div class="cf-turnstile" data-sitekey="${config.turnstileSite}"></div>
             <button type="submit" style="margin-top:16px">Completar</button>
           </form>
           <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`
        )
      );
    }

    await grant(pending.guildId, user.id, token.access_token, user);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(
      page(
        'Verificado',
        `<h1>✅ Verificado</h1>
         <p>Ya tienes acceso. Vuelve a Discord.</p>
         <a class="btn" href="${config.invite}">Abrir servidor</a>`
      )
    );
  } catch (err) {
    console.error(err);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(errorPage(err.message));
  }
}
