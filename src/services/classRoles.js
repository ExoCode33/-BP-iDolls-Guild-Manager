// INSTRUCTIONS: Replace your src/services/classRoles.js with this version
// 
// Key changes:
// 1. Catches "Unknown Member" errors and logs them as warnings, not errors
// 2. Automatically cleans up database for users who left
// 3. Prevents spam in logs

import config from '../config/index.js';
import logger from './logger.js';
import { CharacterRepo } from '../database/repositories.js';

/**
 * Add a class role to a user
 */
export async function addClassRole(userId, className) {
  try {
    const guild = await global.client.guilds.fetch(config.discord.guildId);
    
    // Try to fetch the member
    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch (error) {
      if (error.message === 'Unknown Member') {
        console.log(`[CLASS ROLE] User ${userId} not in server, skipping role add for ${className}`);
        // Clean up their data since they're not in the server
        await cleanupLeftMember(userId);
        return;
      }
      throw error;
    }
    
    const classRoleId = config.classRoles?.[className];
    
    if (!classRoleId) {
      console.log(`[CLASS ROLE] No role configured for class: ${className}`);
      return;
    }
    
    // Check if they already have the role
    if (member.roles.cache.has(classRoleId)) {
      console.log(`[CLASS ROLE] ${member.user.username} already has ${className} role`);
      return;
    }
    
    await member.roles.add(classRoleId);
    console.log(`[CLASS ROLE] Added ${className} role to ${member.user.username}`);
    
  } catch (error) {
    // Don't spam logs with Unknown Member errors
    if (error.message === 'Unknown Member') {
      console.log(`[CLASS ROLE] User ${userId} left server, skipping role add for ${className}`);
      await cleanupLeftMember(userId);
    } else {
      console.error(`[CLASS ROLE] Error adding role for ${className}:`, error.message);
      logger.error('ClassRole', `Failed to add ${className} role: ${error.message}`, error);
    }
  }
}

/**
 * Remove a class role from a user
 */
export async function removeClassRole(userId, className) {
  try {
    const guild = await global.client.guilds.fetch(config.discord.guildId);
    
    // Try to fetch the member
    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch (error) {
      if (error.message === 'Unknown Member') {
        console.log(`[CLASS ROLE] User ${userId} not in server, skipping role removal for ${className}`);
        // Clean up their data since they're not in the server
        await cleanupLeftMember(userId);
        return;
      }
      throw error;
    }
    
    const classRoleId = config.classRoles?.[className];
    
    if (!classRoleId) {
      console.log(`[CLASS ROLE] No role configured for class: ${className}`);
      return;
    }
    
    // Check if they have the role
    if (!member.roles.cache.has(classRoleId)) {
      console.log(`[CLASS ROLE] ${member.user.username} doesn't have ${className} role`);
      return;
    }
    
    await member.roles.remove(classRoleId);
    console.log(`[CLASS ROLE] Removed ${className} role from ${member.user.username}`);
    
  } catch (error) {
    // Don't spam logs with Unknown Member errors
    if (error.message === 'Unknown Member') {
      console.log(`[CLASS ROLE] User ${userId} left server, skipping role removal for ${className}`);
      await cleanupLeftMember(userId);
    } else {
      console.error(`[CLASS ROLE] Error removing role for ${className}:`, error.message);
      logger.error('ClassRole', `Failed to remove ${className} role: ${error.message}`, error);
    }
  }
}

/**
 * Check if a user still uses a specific class
 */
export async function checkClassUsage(userId, className) {
  const characters = await CharacterRepo.findAllByUser(userId);
  return characters.some(c => c.class === className);
}

/**
 * Clean up data for a member who left the server
 */
async function cleanupLeftMember(userId) {
  try {
    const characters = await CharacterRepo.findAllByUser(userId);
    
    if (characters.length === 0) {
      return; // Nothing to clean up
    }
    
    console.log(`[CLASS ROLE] Auto-cleanup: User ${userId} left, removing ${characters.length} character(s)`);
    
    // Delete all characters
    for (const character of characters) {
      await CharacterRepo.delete(character.id);
    }
    
    // Delete nickname preferences directly from database
    try {
      const db = await import('../database/index.js').then(m => m.default);
      await db.run('DELETE FROM nickname_preferences WHERE user_id = ?', [userId]);
    } catch (error) {
      // Ignore if table doesn't exist
    }
    
    console.log(`[CLASS ROLE] Auto-cleanup complete for user ${userId}`);
    
  } catch (error) {
    console.error(`[CLASS ROLE] Error during auto-cleanup for ${userId}:`, error.message);
  }
}

export default {
  addClassRole,
  removeClassRole,
  checkClassUsage
};
