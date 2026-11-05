import {
  GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel,
} from 'discord.js';
import { config } from '../config.js';

export async function createAdEvent(guild, { name, description, startAt, endAt }) {
  return guild.scheduledEvents.create({
    name,
    description: `${description}\n\n📍 ${config.invite}`,
    scheduledStartTime: startAt,
    scheduledEndTime: endAt || null,
    privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
    entityType: GuildScheduledEventEntityType.External,
    entityMetadata: { location: config.invite },
  });
}