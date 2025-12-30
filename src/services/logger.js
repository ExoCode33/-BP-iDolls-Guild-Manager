import { EmbedBuilder } from 'discord.js';
import { COLORS } from '../config/game.js';
import { LoggingRepo } from '../database/repositories.js';

class UnifiedLogger {
  constructor() {
    this.client = null;
    this.pendingLogs = new Map();
  }

  static EVENTS = {
    CHARACTER_REGISTRATION: 'character_registration',
    CHARACTER_UPDATES: 'character_updates',
    CHARACTER_DELETION: 'character_deletion',
    VERIFICATION: 'verification',
    TIMEZONE_CHANGES: 'timezone_changes',
    BATTLE_IMAGINE_CHANGES: 'battle_imagine_changes',
    GUILD_APPLICATIONS: 'guild_applications',
    APPLICATION_VOTES: 'application_votes',
    ADMIN_OVERRIDES: 'admin_overrides',
    SETTINGS_CHANGES: 'settings_changes',
    ROLE_CHANGES: 'role_changes'
  };

  // ═══════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════

  async init(client) {
    this.client = client;
    console.log('[Logger] ✅ Unified logging system ready');
    return this;
  }

  // ═══════════════════════════════════════════════════════════════════
  // SETTINGS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  async getSettings(guildId) {
    return await LoggingRepo.getSettings(guildId);
  }

  async setGeneralLogChannel(guildId, channelId) {
    await LoggingRepo.setGeneralLogChannel(guildId, channelId);
  }

  async setApplicationLogChannel(guildId, channelId) {
    await LoggingRepo.setApplicationLogChannel(guildId, channelId);
  }

  async toggleLogSetting(guildId, settingKey) {
    const config = await LoggingRepo.getSettings(guildId);
    config.settings[settingKey] = !config.settings[settingKey];
    await LoggingRepo.updateLogSettings(guildId, config.settings);
  }

  async toggleGroupingSetting(guildId, settingKey) {
    const config = await LoggingRepo.getSettings(guildId);
    config.grouping[settingKey] = !config.grouping[settingKey];
    await LoggingRepo.updateGrouping(guildId, config.grouping);
  }

  async setGroupingWindow(guildId, minutes) {
    const config = await LoggingRepo.getSettings(guildId);
    config.grouping.grouping_window_minutes = minutes;
    await LoggingRepo.updateGrouping(guildId, config.grouping);
  }

  // ═══════════════════════════════════════════════════════════════════
  // MAIN LOGGING (NEW UNIFIED SYSTEM)
  // ═══════════════════════════════════════════════════════════════════

  async log(client, guildId, eventType, data) {
    try {
      const config = await LoggingRepo.getSettings(guildId);
      
      // Check if logging is enabled for this event
      if (!config.settings[eventType]) {
        console.log(`[Logger] Event ${eventType} disabled, skipping`);
        return;
      }

      // Determine which channel to use
      let channelId;
      if ([
        UnifiedLogger.EVENTS.GUILD_APPLICATIONS,
        UnifiedLogger.EVENTS.APPLICATION_VOTES,
        UnifiedLogger.EVENTS.ADMIN_OVERRIDES
      ].includes(eventType)) {
        channelId = config.applicationChannelId;
      } else {
        channelId = config.generalChannelId;
      }

      if (!channelId) {
        console.log(`[Logger] No channel configured for ${eventType}`);
        return;
      }

      const shouldGroup = config.grouping[eventType];
      
      if (shouldGroup) {
        this.addToGroup(client, guildId, channelId, eventType, data, config.grouping.grouping_window_minutes || 10);
      } else {
        await this.sendLog(client, channelId, eventType, [data]);
      }
    } catch (error) {
      console.error('[Logger] Error:', error);
    }
  }

  addToGroup(client, guildId, channelId, eventType, data, windowMinutes) {
    const key = `${guildId}-${eventType}`;
    
    if (!this.pendingLogs.has(key)) {
      this.pendingLogs.set(key, {
        events: [],
        timeout: null,
        channelId,
        eventType
      });
    }

    const group = this.pendingLogs.get(key);
    group.events.push(data);

    if (group.timeout) {
      clearTimeout(group.timeout);
    }

    group.timeout = setTimeout(async () => {
      const events = [...group.events];
      this.pendingLogs.delete(key);
      await this.sendLog(client, channelId, eventType, events);
    }, windowMinutes * 60 * 1000);
  }

  async sendLog(client, channelId, eventType, events) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        console.log(`[Logger] Channel ${channelId} not found`);
        return;
      }

      const embed = this.createEmbed(eventType, events);
      await channel.send({ embeds: [embed] });
      console.log(`[Logger] ✅ Sent ${eventType} log to ${channel.name}`);
    } catch (error) {
      console.error('[Logger] Error sending log:', error);
    }
  }

  createEmbed(eventType, events) {
    const isGrouped = events.length > 1;
    const data = events[0];

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTimestamp();

    switch (eventType) {
      case UnifiedLogger.EVENTS.CHARACTER_REGISTRATION:
        embed.setTitle(isGrouped ? `📝 ${events.length} Character Registrations` : '📝 Character Registered')
          .setDescription(isGrouped 
            ? events.map(e => `• **${e.ign}** (${e.className}) by <@${e.userId}>`).join('\n')
            : `**IGN:** ${data.ign}\n**UID:** ${data.uid}\n**Class:** ${data.className}\n**User:** <@${data.userId}>`
          );
        break;

      case UnifiedLogger.EVENTS.CHARACTER_UPDATES:
        embed.setTitle(isGrouped ? `✏️ ${events.length} Character Updates` : '✏️ Character Updated')
          .setDescription(isGrouped
            ? events.map(e => `• **${e.ign}** by <@${e.userId}>`).join('\n')
            : `**Character:** ${data.ign}\n**Updated by:** <@${data.userId}>\n**Changes:** ${data.changes || 'Various fields'}`
          );
        break;

      case UnifiedLogger.EVENTS.CHARACTER_DELETION:
        embed.setTitle('🗑️ Character Deleted')
          .setDescription(`**IGN:** ${data.ign}\n**Deleted by:** <@${data.userId}>`);
        break;

      case UnifiedLogger.EVENTS.VERIFICATION:
        embed.setTitle(isGrouped ? `✅ ${events.length} Verifications` : '✅ User Verified')
          .setDescription(isGrouped
            ? events.map(e => `• <@${e.userId}>`).join('\n')
            : `**User:** <@${data.userId}>\n**Verified by:** <@${data.verifiedBy}>`
          );
        break;

      case UnifiedLogger.EVENTS.TIMEZONE_CHANGES:
        embed.setTitle(isGrouped ? `🌍 ${events.length} Timezone Changes` : '🌍 Timezone Changed')
          .setDescription(isGrouped
            ? events.map(e => `• <@${e.userId}> → ${e.timezone}`).join('\n')
            : `**User:** <@${data.userId}>\n**New Timezone:** ${data.timezone}`
          );
        break;

      case UnifiedLogger.EVENTS.BATTLE_IMAGINE_CHANGES:
        embed.setTitle(isGrouped ? `⚔️ ${events.length} Battle Imagine Changes` : '⚔️ Battle Imagine Updated')
          .setDescription(isGrouped
            ? events.map(e => `• **${e.characterIgn}**: ${e.action} ${e.imagineName}`).join('\n')
            : `**Character:** ${data.characterIgn}\n**Action:** ${data.action}\n**Imagine:** ${data.imagineName} (${data.tier})`
          );
        break;

      case UnifiedLogger.EVENTS.GUILD_APPLICATIONS:
        embed.setTitle('📨 Guild Application Submitted')
          .setDescription(`**User:** <@${data.userId}>\n**Character:** ${data.characterIgn}\n**Guild:** ${data.guildName}`);
        break;

      case UnifiedLogger.EVENTS.APPLICATION_VOTES:
        embed.setTitle('🗳️ Application Vote')
          .setDescription(`**Voter:** <@${data.voterId}>\n**Vote:** ${data.voteType}\n**Application ID:** ${data.applicationId}`);
        break;

      case UnifiedLogger.EVENTS.ADMIN_OVERRIDES:
        embed.setTitle('⚠️ Admin Override')
          .setDescription(`**Admin:** <@${data.adminId}>\n**Action:** ${data.action}\n**Target:** ${data.target || 'N/A'}`);
        break;

      case UnifiedLogger.EVENTS.SETTINGS_CHANGES:
        embed.setTitle('⚙️ Settings Changed')
          .setDescription(`**Changed by:** <@${data.userId}>\n**Setting:** ${data.setting}\n**Value:** ${data.value}`);
        break;

      case UnifiedLogger.EVENTS.ROLE_CHANGES:
        embed.setTitle(isGrouped ? `👤 ${events.length} Role Changes` : '👤 Role Changed')
          .setDescription(isGrouped
            ? events.map(e => `• <@${e.userId}>: ${e.action} ${e.roleName}`).join('\n')
            : `**User:** <@${data.userId}>\n**Action:** ${data.action}\n**Role:** ${data.roleName}\n**By:** <@${data.changedBy}>`
          );
        break;
    }

    return embed;
  }

  // ═══════════════════════════════════════════════════════════════════
  // CONVENIENCE METHODS (BACKWARDS COMPATIBLE)
  // ═══════════════════════════════════════════════════════════════════

  startup(botTag, commandCount) {
    console.log(`[BOT] 🚀 ${botTag} started with ${commandCount} commands`);
  }

  shutdown(signal) {
    console.log(`[BOT] 🔴 Shutting down (${signal})`);
  }

  info(title, message) {
    console.log(`[INFO] ${title}: ${message}`);
  }

  error(category, message, error = null) {
    console.error(`[ERROR] ${category}: ${message}`);
    if (error) console.error(error);
  }

  command(commandName, username, subcommand = null) {
    const sub = subcommand ? ` (${subcommand})` : '';
    console.log(`[COMMAND] ${username} used /${commandName}${sub}`);
  }

  register(username, type, ign, className) {
    console.log(`[REGISTER] ${username} registered ${type}: ${ign} (${className})`);
  }

  edit(username, field, oldValue, newValue) {
    console.log(`[EDIT] ${username} changed ${field}: ${oldValue} → ${newValue}`);
  }

  delete(username, type, target) {
    console.log(`[DELETE] ${username} deleted ${type}: ${target}`);
  }

  viewProfile(viewer, target) {
    console.log(`[VIEW] ${viewer} viewed ${target}'s profile`);
  }

  nicknameSync(updated, failed) {
    console.log(`[NICKNAME] Synced ${updated} nicknames (${failed} failed)`);
  }

  send(category, title, message) {
    console.log(`[${category.toUpperCase()}] ${title}: ${message}`);
  }
}

// Single instance
const logger = new UnifiedLogger();

// Export both ways
export const Logger = logger;
export default logger;
