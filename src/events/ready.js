import { Events } from 'discord.js';
import { CharacterRepo } from '../database/repositories.js';
import config from '../config/index.js';
import logger from '../services/logger.js';

/**
 * AUTOMATIC CLEANUP ON BOT STARTUP + DAILY SCHEDULE
 * 
 * Runs cleanup:
 * 1. When the bot starts up
 * 2. Once every 24 hours automatically
 * 
 * Removes data for users who are no longer in the Discord server.
 */

async function performCleanup(client) {
  console.log('[AUTO-CLEANUP] Starting cleanup check...');
  
  try {
    // Get all unique user IDs from the database
    const allCharacters = await CharacterRepo.findAll();
    const userIds = [...new Set(allCharacters.map(c => c.user_id))];
    
    if (userIds.length === 0) {
      console.log('[AUTO-CLEANUP] No users in database, nothing to check');
      return { cleanedUsers: 0, cleanedCharacters: 0 };
    }
    
    console.log(`[AUTO-CLEANUP] Checking ${userIds.length} unique users...`);
    
    // Get the guild
    const guild = await client.guilds.fetch(config.discord.guildId);
    await guild.members.fetch(); // Fetch all members
    
    let cleanedUsers = 0;
    let cleanedCharacters = 0;
    
    // Check each user
    for (const userId of userIds) {
      try {
        // Try to fetch the member from the guild
        const member = await guild.members.fetch(userId).catch(() => null);
        
        if (!member) {
          // User is not in the server anymore - DELETE their data
          const userCharacters = await CharacterRepo.findAllByUser(userId);
          
          if (userCharacters.length > 0) {
            // Delete all their characters (this cascades to battle_imagines)
            for (const character of userCharacters) {
              await CharacterRepo.delete(character.id);
              cleanedCharacters++;
            }
            
            // Delete nickname preferences directly from database (no Discord sync)
            try {
              const db = await import('../database/index.js').then(m => m.default);
              await db.run(
                'DELETE FROM nickname_preferences WHERE user_id = ?',
                [userId]
              );
              console.log(`[AUTO-CLEANUP] Cleared nickname prefs for ${userId}`);
            } catch (error) {
              // Table might not exist yet, ignore
              console.log(`[AUTO-CLEANUP] Note: Could not clear nickname prefs for ${userId} (${error.message})`);
            }
            
            cleanedUsers++;
            console.log(`[AUTO-CLEANUP] Removed ${userCharacters.length} character(s) for user ${userId} (not in server)`);
          }
        }
      } catch (error) {
        console.error(`[AUTO-CLEANUP] Error checking user ${userId}:`, error.message);
      }
    }
    
    if (cleanedUsers > 0) {
      console.log(`[AUTO-CLEANUP] ✅ Cleanup complete: ${cleanedUsers} user(s), ${cleanedCharacters} character(s) removed`);
      logger.system(
        'Auto-Cleanup',
        `Removed data for ${cleanedUsers} user(s) who left the server (${cleanedCharacters} characters)`,
        { cleanedUsers, cleanedCharacters }
      );
    } else {
      console.log('[AUTO-CLEANUP] ✅ No cleanup needed - all users are in the server');
    }
    
    return { cleanedUsers, cleanedCharacters };
    
  } catch (error) {
    console.error('[AUTO-CLEANUP ERROR]', error);
    logger.error('Auto-Cleanup', `Cleanup failed: ${error.message}`, error);
    return { cleanedUsers: 0, cleanedCharacters: 0, error: error.message };
  }
}

export default {
  name: Events.ClientReady,
  once: true,
  
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    
    // Run cleanup on startup (wait 5 seconds for bot to fully initialize)
    setTimeout(async () => {
      console.log('[AUTO-CLEANUP] Running startup cleanup check...');
      await performCleanup(client);
    }, 5000);
    
    // Schedule daily cleanup (runs every 24 hours)
    const DAILY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    setInterval(async () => {
      console.log('[AUTO-CLEANUP] Running scheduled daily cleanup...');
      await performCleanup(client);
    }, DAILY);
    
    console.log('[AUTO-CLEANUP] ✅ Scheduled daily cleanup (runs every 24 hours)');
  }
};
