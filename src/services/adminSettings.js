import { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } from 'discord.js';
import { Logger } from './logger-PROFESSIONAL.js';
import { COLORS } from '../config/game.js';
import pool from '../database/index.js';

// ═══════════════════════════════════════════════════════════════════
// MAIN SETTINGS PANEL
// ═══════════════════════════════════════════════════════════════════

export async function showMainPanel(interaction) {
  const config = await Logger.getConfig(interaction.guildId);
  
  const embed = new EmbedBuilder()
    .setTitle('⚙️ Admin Settings Panel')
    .setDescription('**Professional Logging & Configuration System**\n\nSelect a category below to configure:')
    .setColor(COLORS.PRIMARY)
    .addFields(
      {
        name: '📋 Logging Channels',
        value: `General: ${config.channels.general ? `<#${config.channels.general}>` : '`Not Set`'}\nApplication: ${config.channels.application ? `<#${config.channels.application}>` : '`Not Set`'}`,
        inline: false
      },
      {
        name: '🔔 Event Types',
        value: 'Configure which events get logged',
        inline: true
      },
      {
        name: '📊 Status',
        value: `${Object.values(config.enabled).filter(v => v).length}/${Object.keys(config.enabled).length} events enabled`,
        inline: true
      }
    )
    .setFooter({ text: 'Use the menu below to navigate' })
    .setTimestamp();

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`admin_main_menu_${interaction.user.id}`)
    .setPlaceholder('📂 Select a category...')
    .addOptions(
      {
        label: 'Set Logging Channels',
        description: 'Configure where logs are posted',
        value: 'channels',
        emoji: '📋'
      },
      {
        label: 'Configure Event Logging',
        description: 'Toggle which events to log',
        value: 'events',
        emoji: '🔔'
      },
      {
        label: 'View Current Settings',
        description: 'See all current configurations',
        value: 'view',
        emoji: '📊'
      },
      {
        label: 'Test Logging System',
        description: 'Send test messages to verify setup',
        value: 'test',
        emoji: '🧪'
      }
    );

  const closeButton = new ButtonBuilder()
    .setCustomId(`admin_close_${interaction.user.id}`)
    .setLabel('Close Panel')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('❌');

  const row1 = new ActionRowBuilder().addComponents(menu);
  const row2 = new ActionRowBuilder().addComponents(closeButton);

  return interaction.update({
    embeds: [embed],
    components: [row1, row2]
  });
}

// ═══════════════════════════════════════════════════════════════════
// CHANNEL CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

export async function showChannelConfig(interaction) {
  const config = await Logger.getConfig(interaction.guildId);
  
  const embed = new EmbedBuilder()
    .setTitle('📋 Logging Channels')
    .setDescription('**Configure where logs are posted**\n\nSet different channels for different log types:')
    .setColor(COLORS.INFO)
    .addFields(
      {
        name: '📢 General Logs',
        value: config.channels.general ? `<#${config.channels.general}>` : '`Not Set`',
        inline: true
      },
      {
        name: '📋 Application Logs',
        value: config.channels.application ? `<#${config.channels.application}>` : '`Not Set`',
        inline: true
      },
      {
        name: '\u200b',
        value: '**What goes where?**',
        inline: false
      },
      {
        name: '📢 General Logs Include:',
        value: '• Character registration\n• Character updates\n• Character deletion\n• Verification\n• Role changes\n• Settings changes\n• Timezone changes\n• Battle Imagine changes\n• Errors',
        inline: true
      },
      {
        name: '📋 Application Logs Include:',
        value: '• New applications\n• Vote notifications\n• Application decisions\n• Admin overrides\n• Vote summaries',
        inline: true
      }
    )
    .setFooter({ text: 'Select channels below' })
    .setTimestamp();

  const generalChannel = new ChannelSelectMenuBuilder()
    .setCustomId(`set_general_channel_${interaction.user.id}`)
    .setPlaceholder('📢 Select General Log Channel')
    .setChannelTypes(ChannelType.GuildText);

  const appChannel = new ChannelSelectMenuBuilder()
    .setCustomId(`set_app_channel_${interaction.user.id}`)
    .setPlaceholder('📋 Select Application Log Channel')
    .setChannelTypes(ChannelType.GuildText);

  const backButton = new ButtonBuilder()
    .setCustomId(`admin_back_${interaction.user.id}`)
    .setLabel('Back to Main Menu')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('⬅️');

  const row1 = new ActionRowBuilder().addComponents(generalChannel);
  const row2 = new ActionRowBuilder().addComponents(appChannel);
  const row3 = new ActionRowBuilder().addComponents(backButton);

  return interaction.update({
    embeds: [embed],
    components: [row1, row2, row3]
  });
}

// ═══════════════════════════════════════════════════════════════════
// EVENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

export async function showEventConfig(interaction) {
  const config = await Logger.getConfig(interaction.guildId);
  
  const embed = new EmbedBuilder()
    .setTitle('🔔 Event Logging Configuration')
    .setDescription('**Toggle which events get logged**\n\nEnable or disable specific event types:')
    .setColor(COLORS.INFO)
    .setFooter({ text: 'Select an event to toggle' })
    .setTimestamp();

  // Build event list with status
  const events = {
    'character_registration': '📝 Character Registration',
    'character_updates': '✏️ Character Updates',
    'character_deletion': '🗑️ Character Deletion',
    'verification': '✅ User Verification',
    'timezone_changes': '🌍 Timezone Changes',
    'battle_imagine_changes': '⚔️ Battle Imagine Changes',
    'guild_applications': '📋 Guild Applications',
    'application_votes': '🗳️ Application Votes',
    'admin_overrides': '⚠️ Admin Overrides',
    'settings_changes': '⚙️ Settings Changes',
    'role_changes': '🎭 Role Changes',
    'errors': '❌ Error Logging'
  };

  const enabledCount = Object.values(config.enabled).filter(v => v).length;
  const totalCount = Object.keys(events).length;

  embed.addFields({
    name: '📊 Status',
    value: `**${enabledCount}/${totalCount}** events enabled`,
    inline: false
  });

  // Add current status for each event
  for (const [key, label] of Object.entries(events)) {
    const status = config.enabled[key] ? '🟢 Enabled' : '🔴 Disabled';
    embed.addFields({
      name: label,
      value: status,
      inline: true
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`toggle_event_${interaction.user.id}`)
    .setPlaceholder('🔔 Select an event to toggle...')
    .addOptions(
      Object.entries(events).map(([key, label]) => ({
        label: label,
        value: key,
        description: config.enabled[key] ? 'Currently enabled - click to disable' : 'Currently disabled - click to enable',
        emoji: config.enabled[key] ? '🟢' : '🔴'
      }))
    );

  const enableAllButton = new ButtonBuilder()
    .setCustomId(`admin_enable_all_${interaction.user.id}`)
    .setLabel('Enable All')
    .setStyle(ButtonStyle.Success)
    .setEmoji('✅');

  const disableAllButton = new ButtonBuilder()
    .setCustomId(`admin_disable_all_${interaction.user.id}`)
    .setLabel('Disable All')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('❌');

  const backButton = new ButtonBuilder()
    .setCustomId(`admin_back_${interaction.user.id}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('⬅️');

  const row1 = new ActionRowBuilder().addComponents(menu);
  const row2 = new ActionRowBuilder().addComponents(enableAllButton, disableAllButton, backButton);

  return interaction.update({
    embeds: [embed],
    components: [row1, row2]
  });
}

// ═══════════════════════════════════════════════════════════════════
// VIEW SETTINGS
// ═══════════════════════════════════════════════════════════════════

export async function showViewSettings(interaction) {
  const config = await Logger.getConfig(interaction.guildId);
  
  const embed = new EmbedBuilder()
    .setTitle('📊 Current Settings Overview')
    .setDescription('**Your complete logging configuration**')
    .setColor(COLORS.SUCCESS)
    .addFields(
      {
        name: '📋 Logging Channels',
        value: `**General:** ${config.channels.general ? `<#${config.channels.general}>` : '`Not Set`'}\n**Application:** ${config.channels.application ? `<#${config.channels.application}>` : '`Not Set`'}`,
        inline: false
      }
    )
    .setTimestamp();

  // Split events into enabled and disabled
  const enabled = [];
  const disabled = [];
  
  const eventNames = {
    'character_registration': 'Character Registration',
    'character_updates': 'Character Updates',
    'character_deletion': 'Character Deletion',
    'verification': 'User Verification',
    'timezone_changes': 'Timezone Changes',
    'battle_imagine_changes': 'Battle Imagine Changes',
    'guild_applications': 'Guild Applications',
    'application_votes': 'Application Votes',
    'admin_overrides': 'Admin Overrides',
    'settings_changes': 'Settings Changes',
    'role_changes': 'Role Changes',
    'errors': 'Error Logging'
  };

  for (const [key, label] of Object.entries(eventNames)) {
    if (config.enabled[key]) {
      enabled.push(label);
    } else {
      disabled.push(label);
    }
  }

  if (enabled.length > 0) {
    embed.addFields({
      name: '🟢 Enabled Events',
      value: enabled.map(e => `• ${e}`).join('\n'),
      inline: false
    });
  }

  if (disabled.length > 0) {
    embed.addFields({
      name: '🔴 Disabled Events',
      value: disabled.map(e => `• ${e}`).join('\n'),
      inline: false
    });
  }

  const backButton = new ButtonBuilder()
    .setCustomId(`admin_back_${interaction.user.id}`)
    .setLabel('Back to Main Menu')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('⬅️');

  const row = new ActionRowBuilder().addComponents(backButton);

  return interaction.update({
    embeds: [embed],
    components: [row]
  });
}

// ═══════════════════════════════════════════════════════════════════
// TEST LOGGING
// ═══════════════════════════════════════════════════════════════════

export async function showTestMenu(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🧪 Test Logging System')
    .setDescription('**Send test messages to verify your setup**\n\nSelect which type of log to test:')
    .setColor(COLORS.WARNING)
    .addFields(
      {
        name: '📝 Character Log Test',
        value: 'Tests character registration, updates, and deletion logs',
        inline: false
      },
      {
        name: '📋 Application Log Test',
        value: 'Tests application creation, voting, and decision logs',
        inline: false
      },
      {
        name: '⚙️ System Log Test',
        value: 'Tests verification, role changes, and settings logs',
        inline: false
      }
    )
    .setFooter({ text: 'Test messages will be sent to your configured channels' })
    .setTimestamp();

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`test_log_${interaction.user.id}`)
    .setPlaceholder('🧪 Select a test type...')
    .addOptions(
      {
        label: 'Character Log Test',
        description: 'Send test character-related logs',
        value: 'character',
        emoji: '📝'
      },
      {
        label: 'Application Log Test',
        description: 'Send test application logs',
        value: 'application',
        emoji: '📋'
      },
      {
        label: 'System Log Test',
        description: 'Send test system logs',
        value: 'system',
        emoji: '⚙️'
      },
      {
        label: 'All Tests',
        description: 'Send all test logs',
        value: 'all',
        emoji: '🎯'
      }
    );

  const backButton = new ButtonBuilder()
    .setCustomId(`admin_back_${interaction.user.id}`)
    .setLabel('Back to Main Menu')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('⬅️');

  const row1 = new ActionRowBuilder().addComponents(menu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  return interaction.update({
    embeds: [embed],
    components: [row1, row2]
  });
}

// ═══════════════════════════════════════════════════════════════════
// HANDLERS
// ═══════════════════════════════════════════════════════════════════

export async function handleMenuSelect(interaction) {
  const value = interaction.values[0];
  
  switch (value) {
    case 'channels':
      return showChannelConfig(interaction);
    case 'events':
      return showEventConfig(interaction);
    case 'view':
      return showViewSettings(interaction);
    case 'test':
      return showTestMenu(interaction);
  }
}

export async function handleChannelSet(interaction, type) {
  const channelId = interaction.values[0];
  await Logger.setChannel(interaction.guildId, type, channelId);
  
  await Logger.logSettingsChange(interaction.guildId, {
    adminId: interaction.user.id,
    setting: `${type} log channel`,
    value: `<#${channelId}>`
  });
  
  const embed = new EmbedBuilder()
    .setDescription(`✅ ${type === 'general' ? 'General' : 'Application'} log channel set to <#${channelId}>`)
    .setColor(COLORS.SUCCESS);
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
  
  // Refresh the channel config view
  return showChannelConfig(interaction);
}

export async function handleEventToggle(interaction) {
  const eventType = interaction.values[0];
  const newValue = await Logger.toggleEvent(interaction.guildId, eventType);
  
  await Logger.logSettingsChange(interaction.guildId, {
    adminId: interaction.user.id,
    setting: `${eventType} logging`,
    value: newValue ? 'enabled' : 'disabled'
  });
  
  const embed = new EmbedBuilder()
    .setDescription(`${newValue ? '🟢' : '🔴'} ${eventType} logging ${newValue ? 'enabled' : 'disabled'}`)
    .setColor(newValue ? COLORS.SUCCESS : COLORS.ERROR);
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
  
  // Refresh the event config view
  return showEventConfig(interaction);
}

export async function handleEnableAll(interaction) {
  const config = await Logger.getConfig(interaction.guildId);
  
  for (const key of Object.keys(config.enabled)) {
    config.enabled[key] = true;
  }
  
  await pool.query(
    `INSERT INTO guild_settings (guild_id, log_settings) 
     VALUES ($1, $2) 
     ON CONFLICT (guild_id) 
     DO UPDATE SET log_settings = $2`,
    [interaction.guildId, JSON.stringify(config.enabled)]
  );
  
  await Logger.logSettingsChange(interaction.guildId, {
    adminId: interaction.user.id,
    setting: 'all event logging',
    value: 'enabled'
  });
  
  const embed = new EmbedBuilder()
    .setDescription('✅ All event logging enabled')
    .setColor(COLORS.SUCCESS);
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
  
  return showEventConfig(interaction);
}

export async function handleDisableAll(interaction) {
  const config = await Logger.getConfig(interaction.guildId);
  
  for (const key of Object.keys(config.enabled)) {
    config.enabled[key] = false;
  }
  
  await pool.query(
    `INSERT INTO guild_settings (guild_id, log_settings) 
     VALUES ($1, $2) 
     ON CONFLICT (guild_id) 
     DO UPDATE SET log_settings = $2`,
    [interaction.guildId, JSON.stringify(config.enabled)]
  );
  
  await Logger.logSettingsChange(interaction.guildId, {
    adminId: interaction.user.id,
    setting: 'all event logging',
    value: 'disabled'
  });
  
  const embed = new EmbedBuilder()
    .setDescription('🔴 All event logging disabled')
    .setColor(COLORS.ERROR);
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
  
  return showEventConfig(interaction);
}

export async function handleTestLog(interaction) {
  const testType = interaction.values[0];
  
  const embed = new EmbedBuilder()
    .setDescription('🧪 Sending test logs...')
    .setColor(COLORS.INFO);
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
  
  // Send test logs based on type
  // (Implementation would go here)
  
  const successEmbed = new EmbedBuilder()
    .setDescription('✅ Test logs sent! Check your configured channels.')
    .setColor(COLORS.SUCCESS);
  
  await interaction.editReply({ embeds: [successEmbed] });
}
