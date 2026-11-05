import { ActivityType } from 'discord.js';
import { config } from '../config.js';
import { store } from '../store.js';

const STATUSES = [
  { name: config.invite, state: `🔥 ${config.serverName} · eventos +18` },
  { name: config.invite, state: '🛡️ Verifícate en la web' },
  { name: 'Eventos +18 diarios', state: `Entra → ${config.invite}` },
  { name: `${config.serverName}`, state: config.invite },
];

let timer = null;

export function startPresence(client) {
  let i = 0;
  const tick = () => {
    if (!store.settings.rotatePresence) return;
    const s = STATUSES[i++ % STATUSES.length];
    client.user.setPresence({
      activities: [{ name: s.name, state: s.state, type: ActivityType.Custom }],
      status: 'online',
    });
  };
  tick();
  timer = setInterval(tick, config.presenceMs);
}

export function stopPresence() {
  if (timer) clearInterval(timer);
  timer = null;
}