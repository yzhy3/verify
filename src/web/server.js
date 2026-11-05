import express from 'express';
import { config } from '../config.js';
import { store } from '../store.js';
import {
  authorizeUrl, exchangeCode, fetchUser, readState, accountAgeDays, verifyTurnstile,
} from '../verify/oauth.js';

const HTML_HEAD = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${config.serverName}</title>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box;margin:0}
body{font-family:system-ui,sans-serif;background:#0b0b12;color:#eee;display:grid;place-items:center;min-height:100vh;padding:24px}
.card{max-width:440px;width:100%;background:#15151f;border:1px solid #2a2a3a;border-radius:18px;padding:28px}
h1{font-size:1.4rem;margin-bottom:10px}
p{color:#a5a5b8;line-height:1.55;margin-bottom:16px}
a.btn,button{display:block;width:100%;text-align:center;background:linear-gradient(135deg,#9b5cff,#ff3d81);color:#fff;border:0;border-radius:12px;padding:14px;font-size:1rem;font-weight:600;cursor:pointer;text-decoration:none}
code{display:block;background:#0b0b12;border:1px solid #2a2a3a;border-radius:10px;padding:12px;font-size:.85rem;word-break:break-all;margin-bottom:12px;color:#c9b8ff}
.err{color:#ff7b7b}
</style></head><body><div class="card">`;

export function createServer(client) {
  const app = express();
  app.use(express.urlencoded({ extended: false }));

  app.get('/', (_req, res) => {
    res.send(`${HTML_HEAD}
      <h1>🛡️ ${config.serverName}</h1>
      <p>Servidor +18 con verificación. Copia la bio de abajo y pégala en tu perfil de Discord para ayudarnos a crecer.</p>
      <code id="bio">${config.bioText}</code>
      <button onclick="navigator.clipboard.writeText(document.getElementById('bio').textContent);this.textContent='✅ Copiado'">Copiar bio</button>
      <p style="margin-top:16px">Pégala en <b>Ajustes → Perfil → Sobre mí</b>.</p>
      <a class="btn" href="${config.invite}">Entrar al servidor</a>
    </div></body></html>`);
  });

  app.get('/verify/start', (req, res) => {
    const pending = readState(req.query.state);
    if (!pending) return res.status(400).send(`${HTML_HEAD}<h1 class="err">Enlace inválido</h1><p>Vuelve a Discord y pulsa Verificar otra vez.</p></div></body></html>`);
    res.redirect(authorizeUrl(req.query.state));
  });

  app.get('/verify/callback', async (req, res) => {
    const { code, state } = req.query;
    const pending = readState(state);
    if (!pending || !code) {
      return res.status(400).send(`${HTML_HEAD}<h1 class="err">Sesión expirada</h1><p>Reinicia la verificación desde Discord.</p></div></body></html>`);
    }

    try {
      const token = await exchangeCode(code);
      const user = await fetchUser(token.access_token);

      if (user.id !== pending.userId) throw new Error('El usuario autorizado no coincide');

      const age = accountAgeDays(user);
      if (age < config.minAgeDays) {
        return res.send(`${HTML_HEAD}<h1 class="err">Cuenta demasiado nueva</h1>
          <p>Tu cuenta tiene ${Math.floor(age)} días y se requieren ${config.minAgeDays}.</p>
          <a class="btn" href="${config.invite}">Ir al servidor</a></div></body></html>`);
      }

      if (config.turnstileSite) {
        return res.send(`${HTML_HEAD}<h1>Último paso</h1>
          <p>Resuelve la verificación anti-bot.</p>
          <form method="POST" action="/verify/complete">
            <input type="hidden" name="state" value="${state}">
            <div class="cf-turnstile" data-sitekey="${config.turnstileSite}"></div>
            <button type="submit" style="margin-top:16px">Completar</button>
          </form>
          <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
          </div></body></html>`);
      }

      await grant(client, pending.guildId, user.id, token.access_token, user);
      res.send(`${HTML_HEAD}<h1>✅ Verificado</h1><p>Ya tienes acceso. Vuelve a Discord.</p>
        <a class="btn" href="${config.invite}">Abrir servidor</a></div></body></html>`);
    } catch (err) {
      console.error(err);
      res.status(500).send(`${HTML_HEAD}<h1 class="err">Error</h1><p>${err.message}</p></div></body></html>`);
    }
  });

  app.post('/verify/complete', async (req, res) => {
    const pending = readState(req.body.state);
    if (!pending) return res.status(400).send(`${HTML_HEAD}<h1 class="err">Sesión expirada</h1></div></body></html>`);

    const ok = await verifyTurnstile(req.body['cf-turnstile-response'], req.ip);
    if (!ok) return res.status(400).send(`${HTML_HEAD}<h1 class="err">Captcha fallido</h1></div></body></html>`);

    try {
      await grant(client, pending.guildId, pending.userId, null, null);
      res.send(`${HTML_HEAD}<h1>✅ Verificado</h1><p>Ya tienes acceso.</p>
        <a class="btn" href="${config.invite}">Abrir servidor</a></div></body></html>`);
    } catch (err) {
      res.status(500).send(`${HTML_HEAD}<h1 class="err">Error</h1><p>${err.message}</p></div></body></html>`);
    }
  });

  return app;
}

async function grant(client, guildId, userId, accessToken, user) {
  const guild = await client.guilds.fetch(guildId);
  const member = await guild.members.fetch(userId).catch(() => null);

  if (!member) {
    // Usuario no está en el server: lo añadimos con guilds.join
    if (!accessToken) throw new Error('Hace falta OAuth para añadir al usuario');
    await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
      method: 'PUT',
      headers: { Authorization: `Bot ${config.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken }),
    });
  }

  const m = await guild.members.fetch(userId);
  if (config.verifiedRoleId) await m.roles.add(config.verifiedRoleId).catch(() => {});

  store.markVerified(userId, { username: user?.username });

  // Auto-join a servidores aliados (guilds.join)
  if (accessToken) {
    for (const p of store.partners()) {
      if (!p.guildId) continue;
      await fetch(`https://discord.com/api/guilds/${p.guildId}/members/${userId}`, {
        method: 'PUT',
        headers: { Authorization: `Bot ${config.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      }).catch(() => {});
    }
  }

  if (config.logChannelId) {
    const ch = await client.channels.fetch(config.logChannelId).catch(() => null);
    ch?.send(`✅ <@${userId}> verificado (${store.countVerified()} en total)`).catch(() => {});
  }
}