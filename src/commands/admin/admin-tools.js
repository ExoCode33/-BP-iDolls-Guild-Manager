import discord from 'discord.js';
const { 
  SlashCommandBuilder,
  EmbedBuilder, 
  ActionRowBuilder,
  StringSelectMenuBuilder
} = discord;
import db from '../../services/database.js';
import sheetsService from '../../services/sheets.js';
import logger from '../../utils/logger.js';
import config from '../../utils/config.js';
import { syncAllNicknames } from '../../utils/nicknameSync.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin-tools')
    .setDescription('Admin tools and bot configuration')
    .setDefaultMemberPermissions('8')
    .addSubcommand(sub => 
      sub.setName('spreadsheet-sync')
        .setDescription('Force sync to Google Sheets')
    )
    .addSubcommand(sub => 
      sub.setName('logger-config')
        .setDescription('Configure logging settings')
    )
    .addSubcommand(sub => 
      sub.setName('logger-status')
        .setDescription('View current logger configuration')
    )
    .addSubcommand(sub =>
      sub.setName('log-cleanup')
        .setDescription('Manually trigger Discord log cleanup')
    )
    .addSubcommand(sub =>
      sub.setName('nickname-sync')
        .setDescription('Manually sync all Discord nicknames with IGNs')
    ),
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'spreadsheet-sync') {
        await handleSync(interaction);
      } else if (subcommand === 'logger-config') {
        await handleLoggerConfig(interaction);
      } else if (subcommand === 'logger-status') {
        await handleLoggerStatus(interaction);
      } else if (subcommand === 'log-cleanup') {
        await handleLogCleanup(interaction);
      } else if (subcommand === 'nickname-sync') {
        await handleNicknameSync(interaction);
      }
    } catch (error) {
      logger.error(`Admin tools error: ${error.message}`);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: '❌ Error occurred.', 
          ephemeral: config.ephemeral.admin 
        });
      } else {
        await interaction.editReply({ content: '❌ Error occurred.' });
      }
    }
  }
};

// ============================================================================
// SYNC HANDLER
// ============================================================================

async function handleSync(interaction) {
  await interaction.deferReply({ ephemeral: config.ephemeral.admin });
  
  try {
    const startTime = Date.now();
    const allChars = await db.getAllUsersWithCharacters();
    
    const enrichedChars = await Promise.all(
      allChars.map(async (char) => {
        let discordName = char.user_id;
        try {
          const user = await interaction.client.users.fetch(char.user_id);
          discordName = user.username;
          if (interaction.guild) {
            try {
              const member = await interaction.guild.members.fetch(char.user_id);
              if (member.nickname) discordName = member.nickname;
            } catch (error) {}
          }
        } catch (error) {}
        return { ...char, discord_name: discordName };
      })
    );
    
    await sheetsService.syncAllCharacters(enrichedChars);
    const duration = Date.now() - startTime;
    
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Google Sheets Sync Complete')
      .setDescription(`Successfully synced ${enrichedChars.length} characters to Google Sheets.`)
      .addFields(
        { name: 'Duration', value: `${duration}ms`, inline: true },
        { name: 'Characters', value: enrichedChars.length.toString(), inline: true }
      )
      .setFooter({ text: `Synced by ${interaction.user.username}` })
      .setTimestamp();
      
    await interaction.editReply({ embeds: [embed] });
    await logger.logSuccess(`Admin ${interaction.user.username} forced Google Sheets sync`, `${enrichedChars.length} characters in ${duration}ms`);
  } catch (error) {
    logger.error(`Sync error: ${error.message}`);
    await interaction.editReply({ content: '❌ Sync failed. Check logs for details.' });
  }
}

// ============================================================================
// NICKNAME SYNC HANDLER
// ============================================================================

async function handleNicknameSync(interaction) {
  await interaction.deferReply({ ephemeral: config.ephemeral.admin });
  
  try {
    const startTime = Date.now();
    
    // Get guild ID from config
    const guildId = config.discord.guildId;
    
    if (!guildId) {
      await interaction.editReply({ content: '❌ Guild ID not configured in environment variables.' });
      return;
    }
    
    // Run the sync
    const results = await syncAllNicknames(interaction.client, guildId, db);
    
    const duration = Date.now() - startTime;
    
    const embed = new EmbedBuilder()
      .setColor(results.failed > 0 ? '#FFA500' : '#00FF00')
      .setTitle('🏷️ Nickname Sync Complete')
      .setDescription(`Discord nickname sync has been executed.`)
      .addFields(
        { name: '✅ Updated', value: results.success.toString(), inline: true },
        { name: '⏭️ Skipped', value: results.skipped.toString(), inline: true },
        { name: '❌ Failed', value: results.failed.toString(), inline: true },
        { name: 'Duration', value: `${duration}ms`, inline: false }
      )
      .setFooter({ text: `Executed by ${interaction.user.username}` })
      .setTimestamp();
    
    if (results.failed > 0) {
      embed.addFields({
        name: 'Note',
        value: 'Check Railway logs for detailed failure reasons.',
        inline: false
      });
    }
    
    await interaction.editReply({ embeds: [embed] });
    await logger.logInfo(`Admin ${interaction.user.username} triggered nickname sync`, `Updated: ${results.success}, Skipped: ${results.skipped}, Failed: ${results.failed}`);
    
  } catch (error) {
    logger.error(`Nickname sync error: ${error.message}`);
    await interaction.editReply({ content: '❌ Nickname sync failed. Check logs for details.' });
  }
}

// ============================================================================
// LOG CLEANUP HANDLER
// ============================================================================

async function handleLogCleanup(interaction) {
  await interaction.deferReply({ ephemeral: config.ephemeral.admin });
  
  try {
    // Run cleanup and get count
    const deleted = await logger.manualCleanup();
    
    const embed = new EmbedBuilder()
      .setColor('#EC4899')
      .setTitle('🧹 Log Cleanup Complete')
      .setDescription(`Discord log cleanup has been executed.`)
      .addFields(
        { name: 'Messages Deleted', value: deleted.toString(), inline: true },
        { name: 'Total Sent', value: logger.stats.messagesSent.toString(), inline: true },
        { name: 'Total Deleted (All Time)', value: logger.stats.messagesDeleted.toString(), inline: true }
      )
      .setFooter({ text: `Executed by ${interaction.user.username}` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    await logger.logInfo(`Admin ${interaction.user.username} triggered log cleanup`, `Deleted ${deleted} messages`);
  } catch (error) {
    logger.error(`Log cleanup error: ${error.message}`);
    await interaction.editReply({ content: '❌ Cleanup failed. Check logs for details.' });
  }
}

// ============================================================================
// LOGGER CONFIG HANDLER
// ============================================================================

async function handleLoggerConfig(interaction) {
  try {
    const embed = new EmbedBuilder()
      .setColor('#EC4899')
      .setTitle('⚙️ Logger Configuration')
      .setDescription('Choose a setting to configure:')
      .addFields(
        { name: '📊 Log Level', value: 'Set the verbosity of Discord logging', inline: false },
        { name: '📺 Log Channel', value: 'Set the Discord channel for logs', inline: false },
        { name: '🔔 Error Ping', value: 'Configure error role ping', inline: false },
        { name: '⚠️ Warning Ping', value: 'Configure warning role ping', inline: false },
        { name: '🐛 Debug Mode', value: 'Toggle debug console logging', inline: false }
      )
      .setTimestamp();
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`admin_logger_config_${interaction.user.id}`)
      .setPlaceholder('⚙️ Choose a setting')
      .addOptions([
        { label: 'Log Level', value: 'log_level', description: 'ERROR_ONLY, WARN_ERROR, INFO, VERBOSE, DEBUG, ALL', emoji: '📊' },
        { label: 'Log Channel', value: 'log_channel', description: 'Set the Discord channel for logs', emoji: '📺' },
        { label: 'Error Ping Settings', value: 'error_ping', description: 'Configure error role ping', emoji: '🔔' },
        { label: 'Warning Ping Settings', value: 'warn_ping', description: 'Configure warning role ping', emoji: '⚠️' },
        { label: 'Debug Mode', value: 'debug_mode', description: 'Toggle debug console logging', emoji: '🐛' }
      ]);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: config.ephemeral.admin });
  } catch (error) {
    logger.error(`Logger config error: ${error.message}`);
    await interaction.reply({ content: '❌ Error showing config menu.', ephemeral: config.ephemeral.admin });
  }
}

// ============================================================================
// LOGGER STATUS HANDLER
// ============================================================================

async function handleLoggerStatus(interaction) {
  await interaction.deferReply({ ephemeral: config.ephemeral.admin });
  
  try {
    const settings = await db.getAllBotSettings();
    
    let channelName = 'Not set';
    if (settings.log_channel_id) {
      try {
        const channel = await interaction.client.channels.fetch(settings.log_channel_id);
        channelName = channel ? `#${channel.name}` : 'Invalid channel';
      } catch (error) {
        channelName = 'Invalid channel';
      }
    }
    
    let errorRoleName = 'Not set';
    if (settings.error_ping_role_id && interaction.guild) {
      try {
        const role = await interaction.guild.roles.fetch(settings.error_ping_role_id);
        errorRoleName = role ? `@${role.name}` : 'Invalid role';
      } catch (error) {
        errorRoleName = 'Invalid role';
      }
    }
    
    let warnRoleName = 'Not set';
    if (settings.warn_ping_role_id && interaction.guild) {
      try {
        const role = await interaction.guild.roles.fetch(settings.warn_ping_role_id);
        warnRoleName = role ? `@${role.name}` : 'Invalid role';
      } catch (error) {
        warnRoleName = 'Invalid role';
      }
    }
    
    const embed = new EmbedBuilder()
      .setColor('#EC4899')
      .setTitle('📊 Logger Status')
      .setDescription('Current logger configuration:')
      .addFields(
        { name: '📊 Log Level', value: settings.log_level || 'INFO', inline: true },
        { name: '🐛 Debug Mode', value: settings.debug_mode ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: '📺 Log Channel', value: channelName, inline: false },
        { name: '🔔 Error Ping', value: settings.error_ping_enabled ? `✅ Enabled → ${errorRoleName}` : '❌ Disabled', inline: false },
        { name: '⚠️ Warning Ping', value: settings.warn_ping_enabled ? `✅ Enabled → ${warnRoleName}` : '❌ Disabled', inline: false }
      )
      .setFooter({ text: 'Use /admin-tools logger-config to change settings' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error(`Logger status error: ${error.message}`);
    await interaction.editReply({ content: '❌ Error fetching logger status.' });
  }
}
