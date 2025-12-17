import logger from '../utils/logger.js';

/**
 * Updates a Discord member's nickname to match their main IGN
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID where to update nickname
 * @param {string} userId - User ID to update
 * @param {string} ign - In-game name to set as nickname
 * @returns {Promise<{success: boolean, reason?: string, skipped?: boolean}>} - Success status and optional reason
 */
export async function updateDiscordNickname(client, guildId, userId, ign) {
  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return { success: false, reason: 'Guild not found' };
    }

    const member = await guild.members.fetch(userId);
    if (!member) {
      return { success: false, reason: 'Member not found in guild' };
    }

    // ✅ CRITICAL FIX: Only skip if nickname is ALREADY SET and matches
    // If member.nickname is null (not set), we should update it
    if (member.nickname !== null && member.nickname === ign) {
      return { success: true, skipped: true };
    }

    // Check if IGN is valid (not too long)
    if (ign.length > 32) {
      logger.logWarning('Nickname Sync', `IGN too long for Discord nickname: ${ign.substring(0, 32)}...`);
      return { success: false, reason: 'IGN too long (max 32 chars)' };
    }

    // Check if user is server owner (Discord limitation - can't change owner nickname)
    if (member.id === guild.ownerId) {
      return { success: false, reason: 'Server owner (Discord limitation)' };
    }

    // Check bot permissions
    const botMember = await guild.members.fetch(client.user.id);
    if (!botMember.permissions.has('ManageNicknames')) {
      return { success: false, reason: 'Bot lacks MANAGE_NICKNAMES permission' };
    }

    // Check role hierarchy - bot's role must be higher than user's role
    if (botMember.roles.highest.position <= member.roles.highest.position) {
      return { success: false, reason: 'Bot lacks permissions (user has higher role)' };
    }

    // ✅ Update nickname
    await member.setNickname(ign, 'Main character IGN sync');
    logger.logSuccess(`Updated nickname: ${member.user.username} → ${ign}`);
    return { success: true };
    
  } catch (error) {
    // Handle specific error codes
    if (error.code === 50013) { // Missing Permissions
      return { success: false, reason: 'Bot lacks permissions (user has higher role)' };
    } else if (error.code === 50035) { // Invalid form body
      logger.logWarning('Nickname Sync', `Invalid IGN format for ${userId}: ${ign}`);
      return { success: false, reason: 'Invalid IGN format' };
    } else if (error.code === 10007) { // Unknown Member
      return { success: false, reason: 'Member not in server' };
    } else {
      logger.logError('Nickname Sync', `Error updating nickname for ${userId}: ${error.message}`);
      return { success: false, reason: error.message };
    }
  }
}

/**
 * Syncs all users' Discord nicknames with their main IGNs
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {Database} db - Database instance
 * @returns {Promise<{success: number, failed: number, skipped: number}>} - Sync results
 */
export async function syncAllNicknames(client, guildId, db) {
  try {
    logger.logInfo('Starting nickname sync for all users...');
    
    // Get all main characters
    const allChars = await db.getAllCharacters();
    const mainChars = allChars.filter(c => c.character_type === 'main');
    
    if (mainChars.length === 0) {
      logger.logWarning('Nickname Sync', 'No main characters found in database');
      return { success: 0, failed: 0, skipped: 0 };
    }
    
    let success = 0;
    let failed = 0;
    let skipped = 0;
    const failedList = [];
    
    for (const char of mainChars) {
      const result = await updateDiscordNickname(client, guildId, char.user_id, char.ign);
      
      if (result.success) {
        if (result.skipped) {
          skipped++;
        } else {
          success++;
        }
      } else {
        failed++;
        failedList.push({ 
          ign: char.ign, 
          userId: char.user_id, 
          reason: result.reason || 'Unknown error' 
        });
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Log summary
    if (failed > 0) {
      logger.logWarning('Nickname Sync', `Failed to sync ${failed} user${failed > 1 ? 's' : ''}`, 
        failedList.map(u => `${u.userId}: ${u.reason}`).join(', '));
    }
    
    logger.logInfo(`Nickname sync complete: ${success} updated, ${skipped} skipped, ${failed} failed`);
    return { success, failed, skipped };
    
  } catch (error) {
    logger.logError('Nickname Sync', `Nickname sync error: ${error.message}`);
    return { success: 0, failed: 0, skipped: 0 };
  }
}

export default { updateDiscordNickname, syncAllNicknames };
