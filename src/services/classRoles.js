import config from '../config/index.js';
import { CharacterRepo } from '../database/repositories.js';

class ClassRoleService {
  constructor() {
    this.client = null;
  }

  init(client) {
    this.client = client;
  }

  /**
   * Get all unique classes from a user's characters
   */
  getUserClasses(characters) {
    const classes = new Set();
    characters.forEach(char => {
      if (char.class) {
        classes.add(char.class);
      }
    });
    return Array.from(classes);
  }

  /**
   * Get role ID for a class name
   */
  getClassRoleId(className) {
    return config.classRoles[className];
  }

  /**
   * Sync all class roles for a user based on their characters
   */
  async syncUserClassRoles(userId, characters = null) {
    if (!this.client || !config.discord.guildId) {
      console.log('[CLASS_ROLES] Client or guild not configured');
      return { success: false, reason: 'Not configured' };
    }

    try {
      const guild = await this.client.guilds.fetch(config.discord.guildId);
      const member = await guild.members.fetch(userId);

      // Get user's characters if not provided
      if (!characters) {
        characters = await CharacterRepo.findAllByUser(userId);
      }

      // Get all unique classes the user has
      const userClasses = this.getUserClasses(characters);
      
      // Determine which class roles they should have
      const shouldHaveRoles = new Set();
      userClasses.forEach(className => {
        const roleId = this.getClassRoleId(className);
        if (roleId) {
          shouldHaveRoles.add(roleId);
        }
      });

      // Get all class role IDs from config
      const allClassRoleIds = Object.values(config.classRoles).filter(id => id);

      // Determine which roles to add and remove
      const rolesToAdd = [];
      const rolesToRemove = [];

      shouldHaveRoles.forEach(roleId => {
        if (!member.roles.cache.has(roleId)) {
          rolesToAdd.push(roleId);
        }
      });

      allClassRoleIds.forEach(roleId => {
        if (!shouldHaveRoles.has(roleId) && member.roles.cache.has(roleId)) {
          rolesToRemove.push(roleId);
        }
      });

      // Apply role changes
      const changes = [];
      
      for (const roleId of rolesToAdd) {
        try {
          await member.roles.add(roleId);
          const role = guild.roles.cache.get(roleId);
          changes.push(`Added: ${role?.name || roleId}`);
          console.log(`[CLASS_ROLES] Added ${role?.name || roleId} to ${userId}`);
        } catch (error) {
          console.error(`[CLASS_ROLES] Failed to add role ${roleId}:`, error.message);
        }
      }

      for (const roleId of rolesToRemove) {
        try {
          await member.roles.remove(roleId);
          const role = guild.roles.cache.get(roleId);
          changes.push(`Removed: ${role?.name || roleId}`);
          console.log(`[CLASS_ROLES] Removed ${role?.name || roleId} from ${userId}`);
        } catch (error) {
          console.error(`[CLASS_ROLES] Failed to remove role ${roleId}:`, error.message);
        }
      }

      return {
        success: true,
        changes,
        userClasses,
        rolesAdded: rolesToAdd.length,
        rolesRemoved: rolesToRemove.length
      };

    } catch (error) {
      console.error('[CLASS_ROLES] Sync error:', error.message);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Add class role when character is created
   */
  async addClassRole(userId, className) {
    if (!this.client || !config.discord.guildId) {
      return { success: false, reason: 'Not configured' };
    }

    const roleId = this.getClassRoleId(className);
    if (!roleId) {
      return { success: false, reason: 'No role configured for this class' };
    }

    try {
      const guild = await this.client.guilds.fetch(config.discord.guildId);
      const member = await guild.members.fetch(userId);

      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId);
        const role = guild.roles.cache.get(roleId);
        console.log(`[CLASS_ROLES] Added ${role?.name || roleId} to ${userId}`);
        return { success: true, roleName: role?.name };
      }

      return { success: true, alreadyHad: true };
    } catch (error) {
      console.error('[CLASS_ROLES] Add error:', error.message);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Remove class role if user no longer has any characters with that class
   */
  async removeClassRoleIfUnused(userId, className) {
    if (!this.client || !config.discord.guildId) {
      return { success: false, reason: 'Not configured' };
    }

    try {
      // Check if user still has any characters with this class
      const characters = await CharacterRepo.findAllByUser(userId);
      const stillHasClass = characters.some(char => char.class === className);

      if (stillHasClass) {
        return { success: true, kept: true, reason: 'User still has this class' };
      }

      // User no longer has this class, remove the role
      const roleId = this.getClassRoleId(className);
      if (!roleId) {
        return { success: false, reason: 'No role configured for this class' };
      }

      const guild = await this.client.guilds.fetch(config.discord.guildId);
      const member = await guild.members.fetch(userId);

      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        const role = guild.roles.cache.get(roleId);
        console.log(`[CLASS_ROLES] Removed ${role?.name || roleId} from ${userId}`);
        return { success: true, removed: true, roleName: role?.name };
      }

      return { success: true, didntHave: true };
    } catch (error) {
      console.error('[CLASS_ROLES] Remove error:', error.message);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Full sync - updates all class roles based on current characters
   */
  async fullSync(userId) {
    const characters = await CharacterRepo.findAllByUser(userId);
    return await this.syncUserClassRoles(userId, characters);
  }
}

export default new ClassRoleService();
