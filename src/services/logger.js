import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import pool from '../database/index.js';
import { COLORS } from '../config/game.js';

// ═══════════════════════════════════════════════════════════════════
// COMPREHENSIVE EVENT LOGGING SYSTEM
// ═══════════════════════════════════════════════════════════════════

class ProfessionalLogger {
  constructor() {
    this.eventQueue = new Map(); // For grouping similar events
  }

  // ═══════════════════════════════════════════════════════════════════
  // CHARACTER EVENTS
  // ═══════════════════════════════════════════════════════════════════

  async logCharacterRegistration(guildId, data) {
    const config = await this.getConfig(guildId);
    if (!config.enabled.character_registration) return;

    const embed = new EmbedBuilder()
      .setTitle('📝 New Character Registered')
      .setColor(COLORS.SUCCESS)
      .addFields(
        { name: '👤 User', value: `<@${data.userId}>`, inline: true },
        { name: '🎮 IGN', value: data.ign, inline: true },
        { name: '🆔 UID', value: data.uid, inline: true },
        { name: '⚔️ Class', value: data.class, inline: true },
        { name: '🎯 Subclass', value: data.subclass || 'None', inline: true },
        { name: '🏆 Score', value: data.abilityScore || 'N/A', inline: true },
        { name: '🏰 Guild', value: data.guild || 'None', inline: true },
        { name: '📊 Type', value: data.characterType === 'main' ? 'Main' : 'Alt', inline: true },
        { name: '🕐 Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setFooter({ text: `Character ID: ${data.characterId}` })
      .setTimestamp();

    await this.sendLog(guildId, 'general', embed);
  }

  async logCharacterUpdate(guildId, data) {
    const config = await this.getConfig(guildId);
    if (!config.enabled.character_updates) return;

    const embed = new EmbedBuilder()
      .setTitle('✏️ Character Updated')
      .setColor(COLORS.INFO)
      .addFields(
        { name: '👤 User', value: `<@${data.userId}>`, inline: true },
        { name: '🎮 Character', value: data.ign, inline: true },
        { name: '📝 Field Updated', value: data.field, inline: true },
        { name: '📤 Old Value', value: `\`${data.oldValue}\``, inline: true },
        { name: '📥 New Value', value: `\`${data.newValue}\``, inline: true },
        { name: '🕐 Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setFooter({ text: `Character ID: ${data.characterId}` })
      .setTimestamp();

    await this.sendLog(guildId, 'general', embed);
  }

  async logCharacterDeletion(guildId, data) {
    const config = await this.getConfig(guildId);
    if (!config.enabled.character_deletion) return;

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Character Deleted')
      .setColor(COLORS.ERROR)
      .addFields(
        { name: '👤 User', value: `<@${data.userId}>`, inline: true },
        { name: '🎮 IGN', value: data.ign, inline: true },
        { name: '🆔 UID', value: data.uid, inline: true },
        { name: '⚔️ Class', value: data.class, inline: true },
        { name: '📊 Type', value: data.characterType === 'main' ? 'Main' : 'Alt', inline: true },
        { name: '🕐 Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setFooter({ text: `Character was created ${data.createdAt}` })
      .setTimestamp();

    await this.sendLog(guildId, 'general', embed);
  }

  // ═══════════════════════════════════════════════════════════════════
  // APPLICATION EVENTS (DETAILED)
  // ═══════════════════════════════════════════════════════════════════

  async logApplicationCreated(guildId, data) {
    const config = await this.getConfig(guildId);
    if (!config.enabled.guild_applications) return;

    const embed = new EmbedBuilder()
      .setTitle('📋 New Guild Application')
      .setColor(COLORS.PRIMARY)
      .setDescription(`**${data.guildName}** has a new applicant!`)
      .addFields(
        { name: '👤 Applicant', value: `<@${data.userId}>`, inline: true },
        { name: '🎮 IGN', value: data.ign, inline: true },
        { name: '🆔 UID', value: data.uid, inline: true },
        { name: '⚔️ Class', value: `${data.class} (${data.subclass})`, inline: true },
        { name: '🏆 Score', value: data.abilityScore || 'N/A', inline: true },
        { name: '🏰 Guild', value: data.guildName, inline: true },
        { name: '🕐 Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
      )
      .setFooter({ text: `Application ID: ${data.applicationId} | Awaiting votes...` })
      .setTimestamp();

    await this.sendLog(guildId, 'application', embed);
  }

  async logApplicationVote(guildId, data) {
    const config = await this.getConfig(guildId);
    if (!config.enabled.application_votes) return;

    const voteIcon = data.vote === 'accept' ? '✅' : '❌';
    const voteColor = data.vote === 'accept' ? COLORS.SUCCESS : COLORS.ERROR;

    const embed = new EmbedBuilder()
      .setTitle(`${voteIcon} Vote Cast`)
      .setColor(voteColor)
      .setDescription(`**${data.guildName}** application received a vote`)
      .addFields(
        { name: '🗳️ Voter', value: `<@${data.voterId}>`, inline: true },
        { name: '👤 Applicant', value: `<@${data.applicantId}>`, inline: true },
        { name: '🎮 IGN', value: data.ign, inline: true },
        { name: '📊 Vote', value: data.vote === 'accept' ? '**Accept**' : '**Deny**', inline: true },
        { name: '✅ Accept Votes', value: `${data.acceptCount}`, inline: true },
        { name: '❌ Deny Votes', value: `${data.denyCount}`, inline: true },
        { name: '📋 Status', value: data.status || 'Pending', inline: true },
        { name: '🕐 Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setFooter({ text: `Application ID: ${data.applicationId}` })
      .setTimestamp();

    // Add voter list
    if (data.acceptVoters && data.acceptVoters.length > 0) {
      embed.addFields({
        name: '✅ Accept Voters',
        value: data.acceptVoters.map(v => `<@${v}>`).join(', '),
        inline: false
      });
    }
    if (data.denyVoters && data.denyVoters.length > 0) {
      embed.addFields({
        name: '❌ Deny Voters',
        value: data.denyVoters.map(v => `<@${v}>`).join(', '),
        inline: false
      });
    }

    await this.sendLog(guildId, 'application', embed);
  }

  async logApplicationDecision(guildId, data) {
    const config = await this.getConfig(guildId);
    if (!config.enabled.guild_applications) return;

    const approved = data.status === 'approved';
    const embed = new EmbedBuilder()
      .setTitle(approved ? '✅ Application Approved' : '❌ Application Denied')
      .setColor(approved ? COLORS.SUCCESS : COLORS.ERROR)
      .setDescription(`**${data.guildName}** application has been ${data.status}`)
      .addFields(
        { name: '👤 Applicant', value: `<@${data.userId}>`, inline: true },
        { name: '🎮 IGN', value: data.ign, inline: true },
        { name: '🏰 Guild', value: data.guildName, inline: true },
        { name: '✅ Accept Votes', value: `${data.acceptCount}`, inline: true },
        { name: '❌ Deny Votes', value: `${data.denyCount}`, inline: true },
        { name: '📊 Final Status', value: data.status.toUpperCase(), inline: true }
      )
      .setFooter({ text: `Application ID: ${data.applicationId}` })
      .setTimestamp();

    // List all voters
    if (data.acceptVoters && data.acceptVoters.length > 0) {
      embed.addFields({
        name: '✅ Voted to Accept',
        value: data.acceptVoters.map(v => `<@${v}>`).join(', '),
        inline: false
      });
    }
    if (data.denyVoters && data.denyVoters.length > 0) {
      embed.addFields({
        name: '❌ Voted to Deny',
        value: data.denyVoters.map(v => `<@${v}>`).join(', '),
        inline: false
      });
    }

    await this.sendLog(guildId, 'application', embed);
  }

  async logApplicationOverride(guildId, data) {
    const config = await this.getConfig(guildId);
    if (!config.enabled.admin_overrides) return;

    const approved = data.decision === 'approved';
    const embed = new EmbedBuilder()
      .setTitle('⚠️ Admin Override')
      .setColor(COLORS.WARNING)
      .setDescription(`An admin manually ${approved ? 'approved' : 'denied'} an application`)
      .addFields(
        { name: '👑 Admin', value: `<@${data.adminId}>`, inline: true },
        { name: '👤 Applicant', value: `<@${data.userId}>`, inline: true },
        { name: '🎮 IGN', value: data.ign, inline: true },
        { name: '🏰 Guild', value: data.guildName, inline: true },
        { name: '📊 Decision', value: approved ? '✅ APPROVED' : '❌ DENIED', inline: true },
        { name: '🕐 Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .addFields({
        name: '📝 Vote History',
        value: `Accept: ${data.acceptCount} | Deny: ${data.denyCount}`,
        inline: false
      })
      .setFooter({ text: `Application ID: ${data.applicationId} | Manual Override` })
      .setTimestamp();

    await this.sendLog(guildId, 'application', embed);
  }

  // ═══════════════════════════════════════════════════════════════════
  // SYSTEM EVENTS
  // ═══════════════════════════════════════════════════════════════════

  async logVerification(guildId, data) {
    const config = await this.getConfig(guildId);
    if (!config.enabled.verification) return;

    const embed = new EmbedBuilder()
      .setTitle(data.type === 'player' ? '🎮 New Player Verified' : '👋 New Visitor Joined')
      .setColor(data.type === 'player' ? COLORS.SUCCESS : COLORS.INFO)
      .addFields(
        { name: '👤 User', value: `<@${data.userId}>`, inline: true },
        { name: '📊 Type', value: data.type === 'player' ? 'Player' : 'Visitor', inline: true },
        { name: '🕐 Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    await this.sendLog(guildId, 'general', embed);
  }

  async logRoleChange(guildId, data) {
    const config = await this.getConfig(guildId);
    if (!config.enabled.role_changes) return;

    const embed = new EmbedBuilder()
      .setTitle('🎭 Role Updated')
      .setColor(COLORS.INFO)
      .addFields(
        { name: '👤 User', value: `<@${data.userId}>`, inline: true },
        { name: '📊 Action', value: data.action === 'add' ? 'Added' : 'Removed', inline: true },
        { name: '🎭 Role', value: `<@&${data.roleId}>`, inline: true },
        { name: '👑 By', value: data.adminId ? `<@${data.adminId}>` : 'System', inline: true },
        { name: '🕐 Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    await this.sendLog(guildId, 'general', embed);
  }

  async logSettingsChange(guildId, data) {
    const config = await this.getConfig(guildId);
    if (!config.enabled.settings_changes) return;

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Settings Changed')
      .setColor(COLORS.WARNING)
      .addFields(
        { name: '👑 Admin', value: `<@${data.adminId}>`, inline: true },
        { name: '🔧 Setting', value: data.setting, inline: true },
        { name: '📥 New Value', value: `\`${data.value}\``, inline: true },
        { name: '🕐 Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    await this.sendLog(guildId, 'general', embed);
  }

  async logBattleImagineChange(guildId, data) {
    const config = await this.getConfig(guildId);
    if (!config.enabled.battle_imagine_changes) return;

    const actionIcon = data.action === 'add' ? '➕' : data.action === 'update' ? '✏️' : '➖';
    const actionColor = data.action === 'add' ? COLORS.SUCCESS : data.action === 'update' ? COLORS.INFO : COLORS.ERROR;

    const embed = new EmbedBuilder()
      .setTitle(`${actionIcon} Battle Imagine ${data.action.charAt(0).toUpperCase() + data.action.slice(1)}ed`)
      .setColor(actionColor)
      .addFields(
        { name: '👤 User', value: `<@${data.userId}>`, inline: true },
        { name: '🎮 Character', value: data.ign, inline: true },
        { name: '⚔️ Imagine', value: data.imagineName, inline: true },
        { name: '⭐ Tier', value: data.tier, inline: true },
        { name: '🕐 Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    await this.sendLog(guildId, 'general', embed);
  }

  async logTimezoneChange(guildId, data) {
    const config = await this.getConfig(guildId);
    if (!config.enabled.timezone_changes) return;

    const embed = new EmbedBuilder()
      .setTitle('🌍 Timezone Updated')
      .setColor(COLORS.INFO)
      .addFields(
        { name: '👤 User', value: `<@${data.userId}>`, inline: true },
        { name: '📤 Old Timezone', value: data.oldTimezone || 'Not set', inline: true },
        { name: '📥 New Timezone', value: data.newTimezone, inline: true },
        { name: '🕐 Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    await this.sendLog(guildId, 'general', embed);
  }

  // ═══════════════════════════════════════════════════════════════════
  // ERROR LOGGING
  // ═══════════════════════════════════════════════════════════════════

  async logError(guildId, data) {
    const config = await this.getConfig(guildId);
    if (!config.enabled.errors) return;

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Error Occurred')
      .setColor(COLORS.ERROR)
      .addFields(
        { name: '📍 Location', value: data.location, inline: true },
        { name: '👤 User', value: data.userId ? `<@${data.userId}>` : 'System', inline: true },
        { name: '🕐 Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
        { name: '❌ Error', value: `\`\`\`${data.error}\`\`\``, inline: false }
      )
      .setTimestamp();

    await this.sendLog(guildId, 'general', embed);
  }

  // ═══════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════

  async sendLog(guildId, type, embed) {
    try {
      const config = await this.getConfig(guildId);
      const channelId = type === 'application' ? config.channels.application : config.channels.general;
      
      if (!channelId) return;

      const client = global.client;
      const channel = await client.channels.fetch(channelId);
      
      if (channel) {
        await channel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error('[LOGGER] Failed to send log:', error);
    }
  }

  async getConfig(guildId) {
    try {
      const result = await pool.query(
        'SELECT * FROM guild_settings WHERE guild_id = $1',
        [guildId]
      );

      if (result.rows.length === 0) {
        // Return default config
        return {
          channels: {
            general: null,
            application: null
          },
          enabled: {
            character_registration: true,
            character_updates: true,
            character_deletion: true,
            verification: true,
            timezone_changes: true,
            battle_imagine_changes: true,
            guild_applications: true,
            application_votes: true,
            admin_overrides: true,
            settings_changes: true,
            role_changes: true,
            errors: true
          }
        };
      }

      const settings = result.rows[0];
      return {
        channels: {
          general: settings.general_log_channel_id,
          application: settings.application_log_channel_id
        },
        enabled: settings.log_settings || {}
      };
    } catch (error) {
      console.error('[LOGGER] Failed to get config:', error);
      return { channels: {}, enabled: {} };
    }
  }

  async setChannel(guildId, type, channelId) {
    const field = type === 'application' ? 'application_log_channel_id' : 'general_log_channel_id';
    await pool.query(
      `INSERT INTO guild_settings (guild_id, ${field}) 
       VALUES ($1, $2) 
       ON CONFLICT (guild_id) 
       DO UPDATE SET ${field} = $2`,
      [guildId, channelId]
    );
  }

  async toggleEvent(guildId, eventType) {
    const config = await this.getConfig(guildId);
    const newValue = !config.enabled[eventType];
    
    config.enabled[eventType] = newValue;
    
    await pool.query(
      `INSERT INTO guild_settings (guild_id, log_settings) 
       VALUES ($1, $2) 
       ON CONFLICT (guild_id) 
       DO UPDATE SET log_settings = $2`,
      [guildId, JSON.stringify(config.enabled)]
    );
    
    return newValue;
  }
}

export const Logger = new ProfessionalLogger();
