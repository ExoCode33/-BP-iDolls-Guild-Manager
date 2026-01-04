import { EphemeralRepo } from '../database/repositories.js';

const cache = new Map();

/**
 * Check if a specific interaction type should be ephemeral
 * @param {string} guildId - Discord guild ID
 * @param {string} type - Interaction type to check
 * @returns {Promise<boolean>} True if should be ephemeral
 * 
 * SIMPLE RULE:
 * - Everything is ephemeral (private) by default
 * - EXCEPT /view-character which can be toggled in admin settings
 */
export async function isEphemeral(guildId, type) {
  if (!guildId) return true;

  // Only /view-character can be toggled
  if (type === 'view_character') {
    let settings = cache.get(guildId);
    if (!settings) {
      settings = await EphemeralRepo.get(guildId);
      cache.set(guildId, settings);
      setTimeout(() => cache.delete(guildId), 60000);
    }
    
    // Return true if 'view_character' is in the settings array
    return settings.includes('view_character');
  }

  // Everything else is always ephemeral (private)
  // - /edit-character → always private
  // - /admin → always private  
  // - Registration flows → always private
  // - Edit/Add/Delete flows → always private
  return true;
}

/**
 * Clear the cache for a specific guild
 * @param {string} guildId - Discord guild ID
 */
export function clearCache(guildId) {
  if (guildId) {
    cache.delete(guildId);
  } else {
    cache.clear();
  }
}
