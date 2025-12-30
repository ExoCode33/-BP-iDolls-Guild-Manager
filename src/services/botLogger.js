import { EmbedBuilder } from 'discord.js';
import { COLORS } from '../config/game.js';
import { LoggerSettingsRepo } from '../database/repositories.js';

export class BotLogger {
  static pendingLogs = new Map();
  
  static LOG_TYPES = {
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

  static async getLogSettings(guildId) {
    return await LoggerSettingsRepo.getSettings(guildId);
  }

  static async setGeneralLogChannel(guildId, channelId) {
    await LoggerSettingsRepo.setGeneralLogChannel(guildId, channelId);
  }

  static async setApplicationLogChannel(guildId, channelId) {
    await LoggerSettingsRepo.setApplicationLogChannel(guildId, channelId);
  }

  static async toggleLogSetting(guildId, settingKey) {
    const config = await LoggerSettingsRepo.getSettings(guildId);
    config.settings[settingKey] = !config.settings[settingKey];
    await LoggerSettingsRepo.updateLogSettings(guildId, config.settings);
  }

  static async toggleGroupingSetting(guildId, settingKey) {
    const config = await LoggerSettingsRepo.getSettings(guildId);
    config.grouping[settingKey] = !config.grouping[settingKey];
    await LoggerSettingsRepo.updateGrouping(guildId, config.grouping);
  }

  static async setGroupingWindow(guildId, minutes) {
    const config = await LoggerSettingsRepo.getSettings(guildId);
    config.grouping.grouping_window_minutes = minutes;
    await LoggerSettingsRepo.updateGrouping(guildId, config.grouping);
  }

  static async log(client, guildId, logType, data) {
    const config = await LoggerSettingsRepo.getSettings(guildId);
    
    if (!config.settings[logType]) {
      return;
    }

    let channelId;
    if ([
      this.LOG_TYPES.GUILD_APPLICATIONS,
      this.LOG_TYPES.APPLICATION_VOTES,
      this.LOG_TYPES.ADMIN_OVERRIDES
    ].includes(logType)) {
      channelId = config.applicationChannelId;
    } else {
      channelId = config.generalChannelId;
    }

    if (!channelId) {
      return;
    }

    const shouldGroup = config.grouping[logType];
    
    if (shouldGroup) {
      this.addToGroup(client, guildId, channelId, logType, data, config.grouping.grouping_window_minutes || 10);
    } else {
      this.sendLog(client, channelId, logType, [data]);
    }
  }

  static addToGroup(client, guildId, channelId, logType, data, windowMinutes) {
    const key = `${guildId}-${logType}`;
    
    if (!this.pendingLogs.has(key)) {
      this.pendingLogs.set(key, {
        events: [],
        timeout: null,
        channelId,
        logType
      });
    }

    const group = this.pendingLogs.get(key);
    group.events.push(data);

    if (group.timeout) {
      clearTimeout(group.timeout);
    }

    group.timeout = setTimeout(() => {
      this.sendLog(client, channelId, logType, group.events);
      this.pendingLogs.delete(key);
    }, windowMinutes * 60 * 1000);
  }

  static async sendLog(client, channelId, logType, events) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) return;

      const embed = this.createLogEmbed(logType, events);
      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('[LOGGER] Error sending log:', error);
    }
  }

  static createLogEmbed(logType, events) {
    switch (logType) {
      case this.LOG_TYPES.CHARACTER_REGISTRATION:
        return this.characterRegistrationEmbed(events);
      case this.LOG_TYPES.CHARACTER_UPDATES:
        return this.characterUpdatesEmbed(events);
      case this.LOG_TYPES.CHARACTER_DELETION:
        return this.characterDeletionEmbed(events);
      case this.LOG_TYPES.VERIFICATION:
        return this.verificationEmbed(events);
      case this.LOG_TYPES.TIMEZONE_CHANGES:
        return this.timezoneChangesEmbed(events);
      case this.LOG_TYPES.BATTLE_IMAGINE_CHANGES:
        return this.battleImagineChangesEmbed(events);
      case this.LOG_TYPES.GUILD_APPLICATIONS:
        return this.guildApplicationsEmbed(events);
      case this.LOG_TYPES.APPLICATION_VOTES:
        return this.applicationVotesEmbed(events);
      case this.LOG_TYPES.ADMIN_OVERRIDES:
        return this.adminOverridesEmbed(events);
      case this.LOG_TYPES.SETTINGS_CHANGES:
        return this.settingsChangesEmbed(events);
      case this.LOG_TYPES.ROLE_CHANGES:
        return this.roleChangesEmbed(events);
      default:
        return new EmbedBuilder()
          .setColor(COLORS.PRIMARY)
          .setTitle('Unknown Log Type')
          .setTimestamp();
    }
  }

  static characterRegistrationEmbed(events) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle(`📝 Character Registration${events.length > 1 ? 's' : ''} (${events.length})`)
      .setTimestamp();

    if (events.length === 1) {
      const e = events[0];
      embed.setDescription(
        `**User:** <@${e.userId}>\n` +
        `**IGN:** ${e.ign}\n` +
        `**UID:** ${e.uid}\n` +
        `**Class:** ${e.class} - ${e.subclass}\n` +
        `**Type:** ${e.characterType === 'main' ? 'Main Character' : 'Subclass'}\n` +
        `**Score:** ${e.abilityScore || 'Not set'}`
      );
    } else {
      const list = events.map(e => `• <@${e.userId}> - **${e.ign}** (${e.class})`).join('\n');
      embed.setDescription(list);
    }

    return embed;
  }

  static characterUpdatesEmbed(events) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`✏️ Character Update${events.length > 1 ? 's' : ''} (${events.length})`)
      .setTimestamp();

    if (events.length === 1) {
      const e = events[0];
      const changes = e.changes.map(c => `**${c.field}:** ${c.old} → ${c.new}`).join('\n');
      embed.setDescription(
        `**User:** <@${e.userId}>\n` +
        `**Character:** ${e.ign}\n\n` +
        `**Changes:**\n${changes}`
      );
    } else {
      const list = events.map(e => `• <@${e.userId}> updated **${e.ign}**`).join('\n');
      embed.setDescription(list);
    }

    return embed;
  }

  static characterDeletionEmbed(events) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle(`🗑️ Character Deletion${events.length > 1 ? 's' : ''} (${events.length})`)
      .setTimestamp();

    const list = events.map(e => `• <@${e.userId}> deleted **${e.ign}** (${e.class})`).join('\n');
    embed.setDescription(list);

    return embed;
  }

  static verificationEmbed(events) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle(`✅ Verification${events.length > 1 ? 's' : ''} (${events.length})`)
      .setTimestamp();

    if (events.length === 1) {
      const e = events[0];
      embed.setDescription(
        `**User:** <@${e.userId}>\n` +
        `**Type:** ${e.type === 'player' ? '🎮 BP Player' : '✨ Non-Player'}\n` +
        `**Roles Added:** ${e.roles.map(r => `<@&${r}>`).join(', ')}`
      );
    } else {
      const list = events.map(e => `• <@${e.userId}> - ${e.type === 'player' ? '🎮 Player' : '✨ Non-Player'}`).join('\n');
      embed.setDescription(list);
    }

    return embed;
  }

  static timezoneChangesEmbed(events) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`🌍 Timezone Change${events.length > 1 ? 's' : ''} (${events.length})`)
      .setTimestamp();

    if (events.length === 1) {
      const e = events[0];
      embed.setDescription(
        `**User:** <@${e.userId}>\n` +
        `**New Timezone:** ${e.timezone}`
      );
    } else {
      const list = events.map(e => `• <@${e.userId}> → **${e.timezone}**`).join('\n');
      embed.setDescription(list);
    }

    return embed;
  }

  static battleImagineChangesEmbed(events) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`⚔️ Battle Imagine Change${events.length > 1 ? 's' : ''} (${events.length})`)
      .setTimestamp();

    if (events.length === 1) {
      const e = events[0];
      embed.setDescription(
        `**User:** <@${e.userId}>\n` +
        `**Character:** ${e.ign}\n` +
        `**Action:** ${e.action}\n` +
        `**Imagine:** ${e.imagineName} ${e.tier || ''}`
      );
    } else {
      const list = events.map(e => `• <@${e.userId}> - ${e.action} **${e.imagineName}**`).join('\n');
      embed.setDescription(list);
    }

    return embed;
  }

  static guildApplicationsEmbed(events) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`📨 Guild Application${events.length > 1 ? 's' : ''} (${events.length})`)
      .setTimestamp();

    const list = events.map(e => 
      `• <@${e.userId}> applied with **${e.ign}**\n` +
      `  **UID:** ${e.uid} | **Score:** ${e.abilityScore} | **Class:** ${e.class}`
    ).join('\n\n');

    embed.setDescription(list);
    return embed;
  }

  static applicationVotesEmbed(events) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`🗳️ Application Vote${events.length > 1 ? 's' : ''} (${events.length})`)
      .setTimestamp();

    const list = events.map(e => 
      `• <@${e.voterId}> voted **${e.vote}** on <@${e.applicantId}>'s application\n` +
      `  Character: **${e.ign}**`
    ).join('\n\n');

    embed.setDescription(list);
    return embed;
  }

  static adminOverridesEmbed(events) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle(`⚠️ Admin Override${events.length > 1 ? 's' : ''} (${events.length})`)
      .setTimestamp();

    const list = events.map(e => 
      `• <@${e.adminId}> **${e.action}** <@${e.userId}>'s application\n` +
      `  Character: **${e.ign}**\n` +
      `  Reason: ${e.reason || 'No reason provided'}`
    ).join('\n\n');

    embed.setDescription(list);
    return embed;
  }

  static settingsChangesEmbed(events) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`⚙️ Settings Change${events.length > 1 ? 's' : ''} (${events.length})`)
      .setTimestamp();

    const list = events.map(e => 
      `• <@${e.adminId}> changed **${e.setting}**\n` +
      `  ${e.oldValue} → ${e.newValue}`
    ).join('\n\n');

    embed.setDescription(list);
    return embed;
  }

  static roleChangesEmbed(events) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`👥 Role Change${events.length > 1 ? 's' : ''} (${events.length})`)
      .setTimestamp();

    const list = events.map(e => 
      `• <@${e.userId}> ${e.action === 'add' ? 'received' : 'lost'} <@&${e.roleId}>\n` +
      `  By: <@${e.moderatorId}>`
    ).join('\n\n');

    embed.setDescription(list);
    return embed;
  }
}
