import {
  Client, GatewayIntentBits, Partials, Events,
  SlashCommandBuilder, REST, Routes, PermissionFlagsBits,
  EmbedBuilder, MessageFlags,
} from 'discord.js';
import crypto from 'node:crypto';
import { config } from './config.js';
import { store } from './store.js';
import { signState } from './state.js';
import { buildPanel, VERIFY_BUTTON_ID } from './verify/panel.js';
import { startPresence } from './ads/presence.js';
import { startScheduler, runAdCycle } from './ads/scheduler.js';
import { createAdEvent } from './ads/events.js';

process.on('unhandledRejection', (err) => console.error('Unhandled:', err));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

const commands = [
  new SlashCommandBuilder().setName('panel').setDescription('Publica el panel de verificación')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('publicar').setDescription('Envía la publicidad ahora')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('evento').setDescription('Crea un evento con el link del server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addStringOption(o => o.setName('nombre').setDescription('Título').setRequired(true))
    .addStringOption(o => o.setName('descripcion').setDescription('Descripción').setRequired(true))
    .addIntegerOption(o => o.setName('horas').setDescription('Empieza en X horas').setRequired(true)),
  new SlashCommandBuilder().setName('bio').setDescription('Texto listo para pegar en tu bio'),
  new SlashCommandBuilder().setName('partner').setDescription('Gestiona servidores aliados')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('add').setDescription('Añade un aliado')
      .addStringOption(o => o.setName('nombre').setDescription('Etiqueta').setRequired(true))
      .addStringOption(o => o.setName('webhook').setDescription('URL del webhook').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Quita un aliado')
      .addStringOption(o => o.setName('id').setDescription('ID del aliado').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('Lista aliados')),
  new SlashCommandBuilder().setName('estado').setDescription('Activa/desactiva automatizaciones')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o => o.setName('modulo').setDescription('Módulo').setRequired(true)
      .addChoices({ name: 'autopublicidad', value: 'autoAds' }, { name: 'rotacion_estado', value: 'rotatePresence' }))
    .addBooleanOption(o => o.setName('activo').setDescription('On/Off').setRequired(true)),
].map(c => c.toJSON());

client.once(Events.ClientReady, async (c) => {
  console.log(`Conectado como ${c.user.tag}`);

  const rest = new REST().setToken(config.token);
  await rest
    .put(Routes.applicationGuildCommands(c.user.id, config.guildId), { body: commands })
    .then(() => console.log('Comandos desplegados.'))
    .catch((err) => console.error('Deploy de comandos falló:', err.message));

  startPresence(client);
  startScheduler(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isButton() && interaction.customId === VERIFY_BUTTON_ID) {
      const state = signState({ userId: interaction.user.id, guildId: interaction.guildId });
      const url = `${config.verifyBaseUrl}/api/verify/start?state=${encodeURIComponent(state)}`;
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('Último paso')
          .setDescription(`Abre este enlace y autoriza:\n${url}\n\nCaduca en 10 minutos.`)
          .setColor(0x9b5cff)],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'panel') {
      await interaction.channel.send(buildPanel());
      return interaction.reply({ content: 'Panel publicado.', flags: MessageFlags.Ephemeral });
    }

    if (commandName === 'publicar') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const r = await runAdCycle(client);
      const ok = r.partners.filter(p => p.ok).length;
      return interaction.editReply(`Enviado a ${r.sent} canales y ${ok} aliados.`);
    }

    if (commandName === 'evento') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const start = new Date(Date.now() + interaction.options.getInteger('horas') * 3_600_000);
      const ev = await createAdEvent(interaction.guild, {
        name: interaction.options.getString('nombre'),
        description: interaction.options.getString('descripcion'),
        startAt: start,
        endAt: new Date(start.getTime() + 3_600_000),
      });
      return interaction.editReply(`Evento creado: **${ev.name}** · <t:${Math.floor(start / 1000)}:F>`);
    }

    if (commandName === 'bio') {
      return interaction.reply({
        content: `Pega esto en **Ajustes → Perfil → Sobre mí**:\n\n\`\`\`\n${config.bioText}\n\`\`\`\n\nCorto: \`${config.invite}\``,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (commandName === 'partner') {
      const sub = interaction.options.getSubcommand();
      if (sub === 'add') {
        const id = crypto.randomUUID().slice(0, 8);
        store.addPartner({
          id,
          label: interaction.options.getString('nombre'),
          webhook: interaction.options.getString('webhook'),
        });
        return interaction.reply({ content: `Aliado \`${id}\` añadido.`, flags: MessageFlags.Ephemeral });
      }
      if (sub === 'remove') {
        store.removePartner(interaction.options.getString('id'));
        return interaction.reply({ content: 'Eliminado.', flags: MessageFlags.Ephemeral });
      }
      const list = store.partners();
      return interaction.reply({
        content: list.length ? list.map(p => `\`${p.id}\` · ${p.label}`).join('\n') : 'Sin aliados.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (commandName === 'estado') {
      const key = interaction.options.getString('modulo');
      const value = interaction.options.getBoolean('activo');
      store.setSetting(key, value);
      return interaction.reply({ content: `${key} → ${value ? 'ON' : 'OFF'}`, flags: MessageFlags.Ephemeral });
    }
  } catch (err) {
    console.error(err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      interaction.reply({ content: `Error: ${err.message}`, flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
});

client.login(config.token);