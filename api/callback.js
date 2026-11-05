export default async function handler(req, res) {
  // Solo permitimos GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const code = req.query.code;
  const redirectUri = 'https://verify-discord-sandy.vercel.app/callback'; // CAMBIA ESTO SI ES DIFERENTE

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

    // OPCIÓN A: Redirigir al usuario con el token en la URL
    // Descomenta la siguiente línea si quieres redirigir a tu página principal
    // return res.redirect(`/?token=${data.access_token}`);

    // OPCIÓN B: Mostrar el token directamente en la respuesta JSON
    // Si prefieres ver el token en la consola o guardarlo, hazlo aquí.
    console.log('Token obtenido:', data.access_token);
    
    // Respuesta final: Devolver el token al frontend o redirigir
    res.setHeader('Content-Type', 'text/html');
    res.end(`
      <html>
        <head><title>Discord Token</title></head>
        <body style="font-family:sans-serif;padding:20px;background:#2f3136;color:white;">
          <h1>Tu Discord Token:</h1>
          <input type="text" value="${data.access_token}" readonly style="width:100%;padding:10px;font-size:16px;" />
          <button onclick="navigator.clipboard.writeText(this.previousElementSibling.value)">Copiar Token</button>
          <br/><br/>
          <a href="/">Volver al inicio</a>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Error en callback:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      details: error.message 
    });
  }
}