import cron from 'node-cron';
import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { store } from '../store.js';
import { broadcast } from './partners.js';

let job = null;

export function buildAdEmbed() {
  return new EmbedBuilder()
    .setTitle(`🔥 ${config.serverName}`)
    .setURL(config.invite)
    .setDescription(
      '**Roleplay +18 · eventos diarios · verificación rápida**\n\n' +
      `👉 ${config.invite}\n\n` +
      '> Entra, verifícate y pasa al contenido.'
    )
    .setColor(0xff3d81)
    .setFooter({ text: 'Publicidad · si quieres partner, escríbenos' })
    .setTimestamp();
}

export async function runAdCycle(client) {
  if (!store.settings.autoAds) return { skipped: true, sent: 0, partners: [] };

  const embed = buildAdEmbed();
  let sent = 0;

  for (const channelId of config.adChannelIds) {
    const ch = await client.channels.fetch(channelId).catch(() => null);
    if (ch?.isTextBased()) {
      await ch.send({ embeds: [embed] }).catch(() => {});
      sent++;
    }
  }

  const partners = await broadcast(embed);
  return { sent, partners };
}

export function startScheduler(client) {
  job = cron.schedule(config.adCron, () => runAdCycle(client));
}