import { config } from '../lib/config.js';
import { page } from '../lib/html.js';

export default function handler(req, res) {
  const html = page(
    config.serverName,
    `
    <h1>🛡️ ${config.serverName}</h1>
    <p>Servidor con verificación. Usa el botón de verificación dentro de Discord.</p>
    <a class="btn" href="${config.invite}">Entrar al servidor</a>
  `
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
