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
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[NICKNAME SYNC DIAGNOSTIC] Starting sync for user ${userId}`);
    console.log(`[NICKNAME SYNC DIAGNOSTIC] Target IGN: "${ign}"`);
    console.log(`${'='.repeat(80)}`);
    
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      console.log(`[NICKNAME SYNC DIAGNOSTIC] ❌ Guild not found: ${guildId}`);
      return { success: false, reason: 'Guild not found' };
    }
    console.log(`[NICKNAME SYNC DIAGNOSTIC] ✅ Guild found: ${guild.name}`);

    const member = await guild.members.fetch(userId);
    if (!member) {
      console.log(`[NICKNAME SYNC DIAGNOSTIC] ❌ Member not found in guild`);
      return { success: false, reason: 'Member not found in guild' };
    }
    console.log(`[NICKNAME SYNC DIAGNOSTIC] ✅ Member found: ${member.user.username}`);

    // ✅ DIAGNOSTIC: Show ALL the details
    console.log(`[NICKNAME SYNC DIAGNOSTIC] Member details:`);
    console.log(`  - Discord Username: "${member.user.username}"`);
    console.log(`  - Server Nickname: ${member.nickname === null ? 'null (not set)' : `"${member.nickname}"`}`);
    console.log(`  - Display Name: "${member.displayName}"`);
    console.log(`  - Target IGN: "${ign}"`);
    console.log(`  - member.nickname === ign? ${member.nickname === ign}`);
    console.log(`  - member.nickname === null? ${member.nickname === null}`);

    // ✅ FIX: The problem is here - if nickname is null, it will NEVER equal ign
    // So we should only skip if the nickname is ALREADY SET to the correct value
    if (member.nickname !== null && member.nickname === ign) {
      console.log(`[NICKNAME SYNC DIAGNOSTIC] ⏭️ Nickname is already set correctly to "${ign}", skipping`);
      return { success: true, skipped: true };
    }

    // If we get here, we need to update
    console.log(`[NICKNAME SYNC DIAGNOSTIC] 🔄 Nickname needs update!`);
    if (member.nickname === null) {
      console.log(`[NICKNAME SYNC DIAGNOSTIC]    Reason: Server nickname is not set (null)`);
    } else {
      console.log(`[NICKNAME SYNC DIAGNOSTIC]    Reason: Current nickname "${member.nickname}" doesn't match IGN "${ign}"`);
    }

    // Check if IGN is valid (not too long)
    if (ign.length > 32) {
      console.log(`[NICKNAME SYNC DIAGNOSTIC] ❌ IGN too long: ${ign.length} chars (max 32)`);
      logger.logWarning('Nickname Sync', `IGN too long for Discord nickname: ${ign.substring(0, 32)}...`);
      return { success: false, reason: 'IGN too long (max 32 chars)' };
    }

    // Check if user is server owner (Discord limitation)
    if (member.id === guild.ownerId) {
      console.log(`[NICKNAME SYNC DIAGNOSTIC] ❌ User is server owner (cannot change owner nickname)`);
      return { success: false, reason: 'Server owner (Discord limitation)' };
    }

    // Check bot permissions
    const botMember = await guild.members.fetch(client.user.id);
    console.log(`[NICKNAME SYNC DIAGNOSTIC] Checking permissions...`);
    console.log(`  - Bot has MANAGE_NICKNAMES permission? ${botMember.permissions.has('ManageNicknames')}`);
    console.log(`  - Bot highest role position: ${botMember.roles.highest.position}`);
    console.log(`  - Target user highest role position: ${member.roles.highest.position}`);
    console.log(`  - Bot role higher than user? ${botMember.roles.highest.position > member.roles.highest.position}`);

    if (!botMember.permissions.has('ManageNicknames')) {
      console.log(`[NICKNAME SYNC DIAGNOSTIC] ❌ Bot lacks MANAGE_NICKNAMES permission`);
      return { success: false, reason: 'Bot lacks MANAGE_NICKNAMES permission' };
    }

    if (botMember.roles.highest.position <= member.roles.highest.position) {
      console.log(`[NICKNAME SYNC DIAGNOSTIC] ❌ Bot's role is not high enough`);
      return { success: false, reason: 'Bot lacks permissions (user has higher role)' };
    }

    // ✅ Try to update nickname
    console.log(`[NICKNAME SYNC DIAGNOSTIC] 🔧 Attempting to set nickname to "${ign}"...`);
    
    try {
      await member.setNickname(ign, 'Main character IGN sync');
      console.log(`[NICKNAME SYNC DIAGNOSTIC] ✅ SUCCESS! Nickname updated to "${ign}"`);
      logger.logSuccess(`Updated nickname: ${ign} (${userId})`);
      return { success: true };
    } catch (setError) {
      console.log(`[NICKNAME SYNC DIAGNOSTIC] ❌ setNickname() failed!`);
      console.log(`[NICKNAME SYNC DIAGNOSTIC]    Error code: ${setError.code}`);
      console.log(`[NICKNAME SYNC DIAGNOSTIC]    Error message: ${setError.message}`);
      
      // Handle specific permission error
      if (setError.code === 50013) {
        console.log(`[NICKNAME SYNC DIAGNOSTIC]    Reason: Missing permissions (50013)`);
        return { success: false, reason: 'Bot lacks permissions (user has higher role)' };
      }
      throw setError; // Re-throw other errors
    }
    
  } catch (error) {
    console.log(`[NICKNAME SYNC DIAGNOSTIC] ❌ Unexpected error!`);
    console.log(`[NICKNAME SYNC DIAGNOSTIC]    Error code: ${error.code}`);
    console.log(`[NICKNAME SYNC DIAGNOSTIC]    Error message: ${error.message}`);
    console.log(`[NICKNAME SYNC DIAGNOSTIC]    Stack: ${error.stack}`);
    
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
    console.log('\n' + '='.repeat(80));
    console.log('[NICKNAME SYNC] Starting nickname sync for all users...');
    console.log('='.repeat(80));
    
    logger.logInfo('Starting nickname sync for all users...');
    
    // Get all main characters
    const allChars = await db.getAllCharacters();
    const mainChars = allChars.filter(c => c.character_type === 'main');
    
    console.log(`[NICKNAME SYNC] Found ${mainChars.length} main characters in database`);
    console.log(`[NICKNAME SYNC] Main characters to sync:`);
    mainChars.forEach((char, index) => {
      console.log(`  ${index + 1}. User ID: ${char.user_id} | IGN: "${char.ign}"`);
    });
    
    let success = 0;
    let failed = 0;
    let skipped = 0;
    const successList = [];
    const failedList = [];
    const skippedList = [];
    
    for (const char of mainChars) {
      console.log(`\n[NICKNAME SYNC] Processing ${char.user_id} (IGN: "${char.ign}")...`);
      const result = await updateDiscordNickname(client, guildId, char.user_id, char.ign);
      
      if (result.success) {
        if (result.skipped) {
          skipped++;
          skippedList.push({ ign: char.ign, userId: char.user_id });
          console.log(`[NICKNAME SYNC] ⏭️ Skipped (already correct)`);
        } else {
          success++;
          successList.push({ ign: char.ign, userId: char.user_id });
          console.log(`[NICKNAME SYNC] ✅ Updated successfully`);
        }
      } else {
        failed++;
        failedList.push({ 
          ign: char.ign, 
          userId: char.user_id, 
          reason: result.reason || 'Unknown error' 
        });
        console.log(`[NICKNAME SYNC] ❌ Failed: ${result.reason}`);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Log results with details
    console.log('\n' + '='.repeat(80));
    console.log(`[NICKNAME SYNC] Sync complete: ${success} updated, ${skipped} skipped, ${failed} failed`);
    console.log('='.repeat(80));
    
    if (success > 0) {
      console.log(`\n[NICKNAME SYNC] ✅ UPDATED (${success}):`);
      successList.forEach(user => {
        console.log(`   ✅ ${user.userId} → ${user.ign}`);
      });
    }
    
    if (skipped > 0) {
      console.log(`\n[NICKNAME SYNC] ⏭️ SKIPPED - Already Correct (${skipped}):`);
      skippedList.forEach(user => {
        console.log(`   ⏭️ ${user.userId} → ${user.ign}`);
      });
    }
    
    if (failed > 0) {
      console.log(`\n[NICKNAME SYNC] ❌ FAILED (${failed}):`);
      failedList.forEach(user => {
        console.log(`   ❌ ${user.userId} - ${user.reason}`);
      });
      logger.logWarning('Nickname Sync', `Failed to sync ${failed} user${failed > 1 ? 's' : ''}`, failedList.map(u => `${u.userId}: ${u.reason}`).join(', '));
    }
    
    logger.logInfo(`Nickname sync complete: ${success} updated, ${skipped} skipped, ${failed} failed`);
    return { success, failed, skipped };
    
  } catch (error) {
    console.error(`\n[NICKNAME SYNC] ❌ Fatal error during nickname sync:`, error.message);
    console.error(error.stack);
    logger.logError('Nickname Sync', `Nickname sync error: ${error.message}`);
    return { success: 0, failed: 0, skipped: 0 };
  }
}

export default { updateDiscordNickname, syncAllNicknames };
