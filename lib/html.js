import { config } from './config.js';

export function page(title, body) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
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
    .err{color:#ff7b7b}
  </style>
</head>
<body>
  <div class="card">
    ${body}
  </div>
</body>
</html>`;
}

export function errorPage(msg) {
  return page('Error', `<h1 class="err">Error</h1><p>${msg}</p>`);
}
