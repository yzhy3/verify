import 'dotenv/config';

function req(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable ${name} en .env`);
  return v;
}

export const config = {
  token: req('DISCORD_TOKEN'),
  clientId: req('CLIENT_ID'),
  sessionSecret: req('SESSION_SECRET'),
  verifyBaseUrl: req('VERIFY_BASE_URL').replace(/\/$/, ''),
  guildId: req('GUILD_ID'),
  verifiedRoleId: req('VERIFIED_ROLE_ID'),
  verifyChannelId: req('VERIFY_CHANNEL_ID'),
  logChannelId: process.env.LOG_CHANNEL_ID || null,
  adChannelIds: (process.env.AD_CHANNEL_IDS || '').split(',').map(s => s.trim()).filter(Boolean),
  invite: req('SERVER_INVITE'),
  serverName: process.env.SERVER_NAME || 'el server',
  bioText: process.env.BIO_TEXT || `Únete → ${process.env.SERVER_INVITE}`,
  adCron: process.env.AD_INTERVAL_CRON || '0 */3 * * *',
  presenceMs: Number(process.env.PRESENCE_INTERVAL_MS || 45000),
};