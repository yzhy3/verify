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
      '• Cuenta de Discord con antigüedad mínima\n' +
      '• Autorizar la app (solo lectura de identidad)\n\n' +
      '**Pasos**\n' +
      '1. Pulsa el botón\n' +
      '2. Autoriza en la web\n' +
      '3. Acceso inmediato\n\n' +
      `> Link para tu bio: ${config.invite}`
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