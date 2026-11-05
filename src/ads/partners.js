import { WebhookClient } from 'discord.js';
import { store } from '../store.js';

export async function broadcast(embed) {
  const results = [];
  for (const p of store.partners()) {
    try {
      const hook = new WebhookClient({ url: p.webhook });
      await hook.send({ embeds: [embed], username: p.label });
      results.push({ id: p.id, ok: true });
    } catch (err) {
      results.push({ id: p.id, ok: false, error: err.message });
    }
  }
  return results;
}