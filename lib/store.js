import { Redis } from '@upstash/redis';
import { config } from './config.js';

const redis = new Redis({
  url: config.redisUrl,
  token: config.redisToken,
});

const PENDING_TTL = 10 * 60; // 10 minutes

export const store = {
  async addPending(state, payload) {
    await redis.set(`pending:${state}`, payload, { ex: PENDING_TTL });
  },

  async getPending(state) {
    return redis.get(`pending:${state}`);
  },

  async takePending(state) {
    const key = `pending:${state}`;
    const data = await redis.get(key);
    if (!data) return null;
    await redis.del(key);
    return data;
  },

  async isVerified(id) {
    return Boolean(await redis.get(`verified:${id}`));
  },

  async markVerified(id, meta = {}) {
    await redis.set(`verified:${id}`, { at: Date.now(), ...meta });
  },

  async countVerified() {
    return 0;
  },
};
