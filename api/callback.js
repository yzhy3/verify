export default async function handler(req, res) {
  // Solo permitimos GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const code = req.query.code;
  
  // IMPORTANTE: Esta URL debe ser EXACTAMENTE la misma que pusiste en Discord Developer Portal
  const redirectUri = 'https://verify-discord-sandy.vercel.app/callback'; 

  if (!code) {
    return res.status(400).json({ error: 'No authorization code received' });
  }

  try {
    // Intercambiar código por access_token
    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Discord API Error:', data);
      throw new Error(data.error || 'Failed to exchange code for token');
    }

    // Mostrar el token en una página HTML simple
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tu Token de Discord</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            background-color: #2f3136; 
            color: #ffffff; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0;
          }
          .container { 
            text-align: center; 
            background: #36393f; 
            padding: 2rem; 
            border-radius: 8px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            width: 90%;
            max-width: 600px;
          }
          h1 { margin-top: 0; color: #7289da; }
          input { 
            width: 100%; 
            padding: 12px; 
            margin-bottom: 1rem; 
            box-sizing: border-box; 
            background: #202225; 
            border: 1px solid #4f4f4f; 
            color: white; 
            font-family: monospace;
            font-size: 14px;
          }
          button { 
            background-color: #7289da; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            cursor: pointer; 
            font-size: 16px; 
            border-radius: 4px;
          }
          button:hover { background-color: #5b6eae; }
          .error { color: #ed4245; margin-top: 1rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>¡Éxito! Tu Token es:</h1>
          <input type="text" id="token" value="${data.access_token}" readonly onclick="this.select()">
          <button onclick="navigator.clipboard.writeText(document.getElementById('token').value)">Copiar Token</button>
          ${data.scope ? '<p style="margin-top:1rem; font-size:0.9em; color:#aaa;">Scope: ' + data.scope + '</p>' : ''}
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Error completo:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      details: error.message 
    });
  }
}