import config from '../config.js';
import { getClassRoleId } from '../utils/classRoleMapping.js';
import logger from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════
// CLASS ROLE MANAGEMENT SERVICE
// ═══════════════════════════════════════════════════════════════════

/**
 * Add a class role to a user
 * @param {string} userId - Discord user ID
 * @param {string} className - Class name
 */
export async function addClassRole(userId, className) {
  try {
    const roleId = getClassRoleId(className);
    
    if (!roleId) {
      console.log(`[CLASS ROLE] No role configured for class: ${className}`);
      return { success: false, reason: 'No role configured' };
    }

    const client = global.discordClient;
    if (!client) {
      console.error('[CLASS ROLE] Discord client not available');
      return { success: false, reason: 'Client not available' };
    }

    const guild = await client.guilds.fetch(config.discord.guildId);
    const member = await guild.members.fetch(userId);
    const role = await guild.roles.fetch(roleId);

    if (!role) {
      console.error(`[CLASS ROLE] Role not found: ${roleId} for class ${className}`);
      return { success: false, reason: 'Role not found' };
    }

    if (member.roles.cache.has(roleId)) {
      console.log(`[CLASS ROLE] User already has role ${className}`);
      return { success: true, reason: 'Already has role' };
    }

    await member.roles.add(role);
    console.log(`✅ [CLASS ROLE] Assigned ${className} role to ${member.user.username}`);
    logger.info('ClassRole', `Assigned ${className} to ${member.user.username}`);

    return { success: true };

  } catch (error) {
    console.error(`[CLASS ROLE] Error adding role for ${className}:`, error.message);
    logger.error('ClassRole', `Failed to add ${className} role: ${error.message}`, error);
    return { success: false, reason: error.message };
  }
}

/**
 * Remove a class role from a user
 * @param {string} userId - Discord user ID
 * @param {string} className - Class name
 */
export async function removeClassRole(userId, className) {
  try {
    const roleId = getClassRoleId(className);
    
    if (!roleId) {
      console.log(`[CLASS ROLE] No role configured for class: ${className}`);
      return { success: false, reason: 'No role configured' };
    }

    const client = global.discordClient;
    if (!client) {
      console.error('[CLASS ROLE] Discord client not available');
      return { success: false, reason: 'Client not available' };
    }

    const guild = await client.guilds.fetch(config.discord.guildId);
    const member = await guild.members.fetch(userId);
    const role = await guild.roles.fetch(roleId);

    if (!role) {
      console.error(`[CLASS ROLE] Role not found: ${roleId} for class ${className}`);
      return { success: false, reason: 'Role not found' };
    }

    if (!member.roles.cache.has(roleId)) {
      console.log(`[CLASS ROLE] User doesn't have role ${className}`);
      return { success: true, reason: 'Already removed' };
    }

    await member.roles.remove(role);
    console.log(`✅ [CLASS ROLE] Removed ${className} role from ${member.user.username}`);
    logger.info('ClassRole', `Removed ${className} from ${member.user.username}`);

    return { success: true };

  } catch (error) {
    console.error(`[CLASS ROLE] Error removing role for ${className}:`, error.message);
    logger.error('ClassRole', `Failed to remove ${className} role: ${error.message}`, error);
    return { success: false, reason: error.message };
  }
}

/**
 * Update class roles when a character's class changes
 * @param {string} userId - Discord user ID
 * @param {string} oldClass - Previous class name
 * @param {string} newClass - New class name
 * @param {Function} hasOtherWithOldClass - Function to check if user has other characters with old class
 */
export async function updateClassRole(userId, oldClass, newClass, hasOtherWithOldClass) {
  try {
    // Add new class role
    await addClassRole(userId, newClass);

    // Remove old class role only if no other characters have it
    const hasOther = await hasOtherWithOldClass();
    if (!hasOther) {
      await removeClassRole(userId, oldClass);
    }

    return { success: true };

  } catch (error) {
    console.error('[CLASS ROLE] Error updating class role:', error.message);
    return { success: false, reason: error.message };
  }
}

export default {
  addClassRole,
  removeClassRole,
  updateClassRole
};
