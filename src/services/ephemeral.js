import { EphemeralRepo } from '../database/repositories.js';

const cache = new Map();
const CACHE_TTL = 60000;

export async function isEphemeral(guildId, type) {
  const cacheKey = guildId;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.commands.includes(type);
  }

  const commands = await EphemeralRepo.get(guildId);
  cache.set(cacheKey, { commands, time: Date.now() });
  
  return commands.includes(type);
}

export function clearCache(guildId) {
  cache.delete(guildId);
}
