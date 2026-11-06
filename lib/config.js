function req(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable ${name}`);
  return v;
}

export const config = {
  clientId: req('CLIENT_ID'),
  clientSecret: req('CLIENT_SECRET'),
  token: req('DISCORD_TOKEN'),
  publicUrl: req('PUBLIC_URL').replace(/\/$/, ''),
  sessionSecret: req('SESSION_SECRET'),
  guildId: req('GUILD_ID'),
  verifiedRoleId: req('VERIFIED_ROLE_ID'),
  logChannelId: process.env.LOG_CHANNEL_ID || null,
  invite: req('SERVER_INVITE'),
  serverName: process.env.SERVER_NAME || 'el server',
  minAgeDays: Number(process.env.MIN_ACCOUNT_AGE_DAYS || 7),
  turnstileSite: process.env.TURNSTILE_SITE_KEY || null,
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY || null,
  redisUrl: req('UPSTASH_REDIS_REST_URL'),
  redisToken: req('UPSTASH_REDIS_REST_TOKEN'),
};
