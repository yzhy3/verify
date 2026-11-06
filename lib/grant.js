import { config } from './config.js';
import { store } from './store.js';

/**
 * Da el rol de verificado y opcionalmente une al usuario al guild.
 * Usa la API REST de Discord directamente (no necesita cliente discord.js).
 */
export async function grant(guildId, userId, accessToken, user) {
  // 1. Intentar unir al usuario si no está en el server
  if (accessToken) {
    const joinRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token: accessToken }),
    });
    // 201 = joined, 204 = already member → ambos OK
    if (!joinRes.ok && joinRes.status !== 204) {
      const t = await joinRes.text();
      console.warn('guilds.join warning:', joinRes.status, t);
    }
  }

  // 2. Añadir rol de verificado
  if (config.verifiedRoleId) {
    const roleRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${config.verifiedRoleId}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bot ${config.token}` },
      }
    );
    if (!roleRes.ok) {
      const t = await roleRes.text();
      throw new Error(`No se pudo dar el rol: ${roleRes.status} ${t}`);
    }
  }

  // 3. Marcar como verificado en Redis
  await store.markVerified(userId, { username: user?.username });

  // 4. Log opcional
  if (config.logChannelId) {
    await fetch(`https://discord.com/api/v10/channels/${config.logChannelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: `✅ <@${userId}> verificado`,
      }),
    }).catch(() => {});
  }
}
