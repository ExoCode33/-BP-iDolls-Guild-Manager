import logger from '../utils/logger.js';

/**
 * Updates a Discord member's nickname to match their main IGN
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID where to update nickname
 * @param {string} userId - User ID to update
 * @param {string} ign - In-game name to set as nickname
 * @returns {Promise<{success: boolean, reason?: string}>} - Success status and optional reason
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

    // ✅ FIX: Check current nickname (null if not set)
    const currentNickname = member.nickname || member.user.username;
    
    console.log(`[NICKNAME SYNC] User ${userId}: current="${currentNickname}", target="${ign}"`);

    // Check if nickname is already correct
    if (member.nickname === ign) {
      console.log(`[NICKNAME SYNC] User ${userId}: nickname already correct, skipping`);
      return { success: true, skipped: true }; // Already correct, no need to update
    }

    // Check if IGN is valid (not too long)
    if (ign.length > 32) {
      logger.logWarning('Nickname Sync', `IGN too long for Discord nickname: ${ign.substring(0, 32)}...`);
      return { success: false, reason: 'IGN too long (max 32 chars)' };
    }

    // Check if user is server owner (Discord limitation)
    if (member.id === guild.ownerId) {
      return { success: false, reason: 'Server owner (Discord limitation)' };
    }

    // ✅ FIX: Try to update nickname with better error handling
    console.log(`[NICKNAME SYNC] Attempting to update ${userId} from "${currentNickname}" to "${ign}"`);
    
    try {
      await member.setNickname(ign, 'Main character IGN sync');
      console.log(`[NICKNAME SYNC] ✅ Successfully updated ${userId} to "${ign}"`);
      logger.logSuccess(`Updated nickname: ${ign} (${userId})`);
      return { success: true };
    } catch (setError) {
      // Handle specific permission error
      if (setError.code === 50013) {
        console.log(`[NICKNAME SYNC] ❌ Permission denied for ${userId} (user has higher role)`);
        return { success: false, reason: 'Bot lacks permissions (user has higher role)' };
      }
      throw setError; // Re-throw other errors
    }
    
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
      console.error(`[NICKNAME SYNC] ❌ Error updating nickname for ${userId}:`, error.message);
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
    console.log('[NICKNAME SYNC] Starting nickname sync for all users...');
    logger.logInfo('Starting nickname sync for all users...');
    
    // Get all main characters
    const allChars = await db.getAllCharacters();
    const mainChars = allChars.filter(c => c.character_type === 'main');
    
    console.log(`[NICKNAME SYNC] Found ${mainChars.length} main characters to sync`);
    
    let success = 0;
    let failed = 0;
    let skipped = 0;
    const successList = [];
    const failedList = [];
    const skippedList = [];
    
    for (const char of mainChars) {
      const result = await updateDiscordNickname(client, guildId, char.user_id, char.ign);
      
      if (result.success) {
        if (result.skipped) {
          skipped++;
          skippedList.push({ ign: char.ign, userId: char.user_id });
        } else {
          success++;
          successList.push({ ign: char.ign, userId: char.user_id });
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
    
    // Log results with details
    console.log(`[NICKNAME SYNC] ✅ Sync complete: ${success} updated, ${skipped} skipped (already correct), ${failed} failed`);
    
    if (success > 0) {
      console.log(`[NICKNAME SYNC] Updated users:`);
      successList.forEach(user => {
        console.log(`   ✅ ${user.userId} → ${user.ign}`);
      });
    }
    
    if (skipped > 0) {
      console.log(`[NICKNAME SYNC] Skipped users (already correct):`);
      skippedList.forEach(user => {
        console.log(`   ⏭️ ${user.userId} → ${user.ign}`);
      });
    }
    
    if (failed > 0) {
      console.log(`[NICKNAME SYNC] ⚠️ Failed users:`);
      failedList.forEach(user => {
        console.log(`   ❌ ${user.userId} - ${user.reason}`);
      });
      logger.logWarning('Nickname Sync', `Failed to sync ${failed} user${failed > 1 ? 's' : ''}`, failedList.map(u => `${u.userId}: ${u.reason}`).join(', '));
    }
    
    logger.logInfo(`Nickname sync complete: ${success} updated, ${skipped} skipped, ${failed} failed`);
    return { success, failed, skipped };
    
  } catch (error) {
    console.error(`[NICKNAME SYNC] ❌ Nickname sync error:`, error.message);
    logger.logError('Nickname Sync', `Nickname sync error: ${error.message}`);
    return { success: 0, failed: 0, skipped: 0 };
  }
}

export default { updateDiscordNickname, syncAllNicknames };
