import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
} from 'discord.js';
import { config } from '../config.js';

export const VERIFY_BUTTON_ID = 'verify:start';

export function buildPanel() {
  const embed = new EmbedBuilder()
    .setTitle(`Verificación · ${config.serverName}`)
    .setDescription(
      '**Requisitos**\n' +
      `• Cuenta de Discord con más de **${config.minAgeDays} días**\n` +
      '• Autorizar la app (solo lectura de identidad)\n\n' +
      '**Pasos**\n' +
      '1. Pulsa el botón de abajo\n' +
      '2. Autoriza en la web\n' +
      '3. Recibes el acceso al instante\n\n' +
      `> Al verificar también te unimos a nuestros servidores aliados.\n> Link para tu bio: ${config.invite}`
    )
    .setColor(0x9b5cff)
    .setFooter({ text: 'Tarda menos de 20 segundos' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(VERIFY_BUTTON_ID)
      .setLabel('Verificar')
      .setEmoji('🛡️')
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
}