import logger from '../utils/logger.js';
import db from '../services/database.js';
import config from '../utils/config.js';

/**
 * Handle guild member updates (including nickname changes)
 * Immediately reverts nickname if it doesn't match their main IGN
 */
export async function handleGuildMemberUpdate(oldMember, newMember) {
  // Only process if nickname sync is enabled
  if (!config.sync.nicknameSyncEnabled) {
    return;
  }

  // Check if nickname actually changed
  if (oldMember.nickname === newMember.nickname) {
    return;
  }

  try {
    // Get user's characters from database
    const characters = await db.getAllCharactersWithSubclasses(newMember.id);
    const mainChar = characters.find(c => c.character_type === 'main');

    // If user has no main character, ignore
    if (!mainChar) {
      return;
    }

    // If new nickname matches their IGN, allow it
    if (newMember.nickname === mainChar.ign) {
      return;
    }

    // Check if user is server owner (can't change owner's nickname)
    if (newMember.id === newMember.guild.ownerId) {
      logger.debug(`Cannot enforce nickname for server owner ${newMember.id}`);
      return;
    }

    // Nickname doesn't match IGN - revert it back
    await newMember.setNickname(mainChar.ign, 'Enforcing IGN nickname sync');
    
    logger.log(`🔄 Nickname auto-corrected: ${newMember.id} tried to change to "${newMember.nickname}", reverted to "${mainChar.ign}"`);

  } catch (error) {
    // Handle permission errors silently (user might have higher role)
    if (error.code === 50013) {
      logger.debug(`Cannot enforce nickname for ${newMember.id}: Missing permissions (user has higher role)`);
    } else {
      logger.error(`Error enforcing nickname for ${newMember.id}: ${error.message}`);
    }
  }
}

export default { handleGuildMemberUpdate };
