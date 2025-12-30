import { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } from 'discord.js';
import logger from './logger.js';
import { COLORS } from '../config/game.js';

// ═══════════════════════════════════════════════════════════════════
// PERSISTENT ADMIN SETTINGS PANEL
// ═══════════════════════════════════════════════════════════════════

export async function showSettingsMenu(interaction) {
  const config = await logger.getSettings(interaction.guildId);
  
  const embed = new EmbedBuilder()
    .setTitle('⚙️ Admin Settings Panel')
    .setDescription('**Professional Configuration System**\n\nSelect a category below to configure:')
    .setColor(COLORS.PRIMARY)
    .addFields(
      {
        name: '📋 Logging Channels',
        value: `General: ${config.generalChannelId ? `<#${config.generalChannelId}>` : '`Not Set`'}\nApplication: ${config.applicationChannelId ? `<#${config.applicationChannelId}>` : '`Not Set`'}`,
        inline: false
      },
      {
        name: '🔔 Event Types',
        value: 'Configure which events get logged',
        inline: true
      },
      {
        name: '📊 Status',
        value: `${Object.values(config.settings).filter(v => v).length}/${Object.keys(config.settings).length} events enabled`,
        inline: true
      }
    )
    .setFooter({ text: 'Use the menu below to navigate' })
    .setTimestamp();

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`admin_settings_menu_${interaction.user.id}`)
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
      }
    );

  const row1 = new ActionRowBuilder().addComponents(menu);

  return interaction.update({
    embeds: [embed],
    components: [row1]
  });
}

export async function showChannelsMenu(interaction) {
  const config = await logger.getSettings(interaction.guildId);
  
  const embed = new EmbedBuilder()
    .setTitle('📋 Logging Channels')
    .setDescription('**Configure where logs are posted**\n\nSet different channels for different log types:')
    .setColor(COLORS.PRIMARY)
    .addFields(
      {
        name: '📢 General Logs',
        value: config.generalChannelId ? `<#${config.generalChannelId}>` : '`Not Set`',
        inline: true
      },
      {
        name: '📋 Application Logs',
        value: config.applicationChannelId ? `<#${config.applicationChannelId}>` : '`Not Set`',
        inline: true
      },
      {
        name: '\u200b',
        value: '**What goes where?**',
        inline: false
      },
      {
        name: '📢 General Logs Include:',
        value: '• Character registration\n• Character updates\n• Character deletion\n• Verification\n• Role changes\n• Settings changes',
        inline: true
      },
      {
        name: '📋 Application Logs Include:',
        value: '• New applications\n• Vote notifications\n• Application decisions\n• Admin overrides\n• Vote summaries',
        inline: true
      }
    )
    .setTimestamp();

  const generalChannel = new ChannelSelectMenuBuilder()
    .setCustomId('set_general_log_channel')
    .setPlaceholder('📢 Select General Log Channel')
    .setChannelTypes(ChannelType.GuildText);

  const appChannel = new ChannelSelectMenuBuilder()
    .setCustomId('set_application_log_channel')
    .setPlaceholder('📋 Select Application Log Channel')
    .setChannelTypes(ChannelType.GuildText);

  const backButton = new ButtonBuilder()
    .setCustomId(`admin_settings_back_${interaction.user.id}`)
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

export async function showEventsMenu(interaction) {
  const config = await logger.getSettings(interaction.guildId);
  
  const embed = new EmbedBuilder()
    .setTitle('🔔 Event Logging Configuration')
    .setDescription('**Toggle which events get logged**\n\nEnable or disable specific event types:')
    .setColor(COLORS.PRIMARY)
    .setTimestamp();

  const events = {
    'character_registration': '📝 Character Registration',
    'character_updates': '✏️ Character Updates',
    'character_deletion': '🗑️ Character Deletion',
    'verification': '✅ User Verification',
    'guild_applications': '📋 Guild Applications',
    'application_votes': '🗳️ Application Votes',
    'admin_overrides': '⚠️ Admin Overrides',
    'settings_changes': '⚙️ Settings Changes',
    'role_changes': '🎭 Role Changes'
  };

  const enabledCount = Object.values(config.settings).filter(v => v).length;
  const totalCount = Object.keys(events).length;

  embed.addFields({
    name: '📊 Status',
    value: `**${enabledCount}/${totalCount}** events enabled`,
    inline: false
  });

  for (const [key, label] of Object.entries(events)) {
    const status = config.settings[key] ? '🟢 Enabled' : '🔴 Disabled';
    embed.addFields({
      name: label,
      value: status,
      inline: true
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId('toggle_log_event')
    .setPlaceholder('🔔 Select an event to toggle...')
    .addOptions(
      Object.entries(events).map(([key, label]) => ({
        label: label,
        value: key,
        description: config.settings[key] ? 'Click to disable' : 'Click to enable',
        emoji: config.settings[key] ? '🟢' : '🔴'
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
    .setCustomId(`admin_settings_back_${interaction.user.id}`)
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

export async function showViewSettings(interaction) {
  const config = await logger.getSettings(interaction.guildId);
  
  const embed = new EmbedBuilder()
    .setTitle('📊 Current Settings Overview')
    .setDescription('**Your complete logging configuration**')
    .setColor(COLORS.SUCCESS)
    .addFields(
      {
        name: '📋 Logging Channels',
        value: `**General:** ${config.generalChannelId ? `<#${config.generalChannelId}>` : '`Not Set`'}\n**Application:** ${config.applicationChannelId ? `<#${config.applicationChannelId}>` : '`Not Set`'}`,
        inline: false
      }
    )
    .setTimestamp();

  const enabled = [];
  const disabled = [];
  
  const eventNames = {
    'character_registration': 'Character Registration',
    'character_updates': 'Character Updates',
    'character_deletion': 'Character Deletion',
    'verification': 'User Verification',
    'guild_applications': 'Guild Applications',
    'application_votes': 'Application Votes',
    'admin_overrides': 'Admin Overrides',
    'settings_changes': 'Settings Changes',
    'role_changes': 'Role Changes'
  };

  for (const [key, label] of Object.entries(eventNames)) {
    if (config.settings[key]) {
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
    .setCustomId(`admin_settings_back_${interaction.user.id}`)
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
// HANDLERS
// ═══════════════════════════════════════════════════════════════════

export async function handleSettingsMenuSelect(interaction) {
  const value = interaction.values[0];
  
  switch (value) {
    case 'channels':
      return showChannelsMenu(interaction);
    case 'events':
      return showEventsMenu(interaction);
    case 'view':
      return showViewSettings(interaction);
    default:
      return showSettingsMenu(interaction);
  }
}

export async function handleSettingsBackButton(interaction) {
  return showSettingsMenu(interaction);
}

export async function handleLoggingMenuSelect(interaction) {
  // Kept for compatibility
  return handleSettingsMenuSelect(interaction);
}

export async function handleLoggingBackButton(interaction) {
  // Kept for compatibility
  return showSettingsMenu(interaction);
}

export async function handleVerificationChannelSelect(interaction) {
  // Placeholder
}

export async function handleLogChannelSelect(interaction) {
  // Placeholder
}

export async function handleLogBatchSelect(interaction) {
  // Placeholder
}

export async function handleLogCategoriesSelect(interaction) {
  // Placeholder
}

export async function handleEphemeralSelect(interaction) {
  // Placeholder
}

export async function handleLogSelect(interaction) {
  // Placeholder
}
