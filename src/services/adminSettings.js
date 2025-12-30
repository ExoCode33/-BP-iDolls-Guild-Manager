import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } from 'discord.js';
import { COLORS } from '../config/game.js';
import { EphemeralSettingsRepo, LoggingRepo } from '../database/repositories.js';
import { Logger } from './logger.js';

const embed = (title, description, color = COLORS.PRIMARY) => 
  new EmbedBuilder().setTitle(title).setDescription(description).setColor(color);

export async function showSettingsMenu(interaction) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`admin_settings_menu_${interaction.user.id}`)
    .setPlaceholder('Choose a setting to configure')
    .addOptions([
      {
        label: 'Ephemeral Commands',
        description: 'Configure which commands reply privately',
        value: 'ephemeral',
        emoji: '🔒'
      },
      {
        label: 'Verification Channel',
        description: 'Set channel for verification notifications',
        value: 'verification',
        emoji: '✅'
      },
      {
        label: 'Logging System',
        description: 'Configure activity logging',
        value: 'logging',
        emoji: '📋'
      }
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  await interaction.reply({
    embeds: [embed('⚙️ Admin Settings', 'Select a setting category to configure:')],
    components: [row],
    ephemeral: true
  });
}

export async function handleSettingsMenuSelect(interaction) {
  const value = interaction.values[0];

  if (value === 'ephemeral') {
    await showEphemeralSettings(interaction);
  } else if (value === 'verification') {
    await showVerificationSettings(interaction);
  } else if (value === 'logging') {
    await showLoggingMenu(interaction);
  }
}

// ═══════════════════════════════════════════════════════════════════
// EPHEMERAL SETTINGS
// ═══════════════════════════════════════════════════════════════════

async function showEphemeralSettings(interaction) {
  const currentSettings = await EphemeralSettingsRepo.getSettings(interaction.guildId);
  
  const allCommands = [
    'register', 'view-character', 'edit-character', 'delete-character',
    'verify', 'set-timezone', 'battle-imagine', 'apply-guild'
  ];

  const options = allCommands.map(cmd => ({
    label: `/${cmd}`,
    value: cmd,
    default: currentSettings.includes(cmd),
    emoji: currentSettings.includes(cmd) ? '✅' : '❌'
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId('toggle_ephemeral_command')
    .setPlaceholder('Select commands to toggle')
    .setMinValues(0)
    .setMaxValues(allCommands.length)
    .addOptions(options);

  const backButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`admin_settings_back_${interaction.user.id}`)
      .setLabel('← Back to Settings')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({
    embeds: [embed(
      '🔒 Ephemeral Command Settings',
      'Commands marked with ✅ will reply privately (only visible to the user).\n\n' +
      'Select commands below to toggle their ephemeral status:'
    )],
    components: [new ActionRowBuilder().addComponents(menu), backButton]
  });
}

// ═══════════════════════════════════════════════════════════════════
// VERIFICATION SETTINGS
// ═══════════════════════════════════════════════════════════════════

async function showVerificationSettings(interaction) {
  const currentChannel = await LoggingRepo.getVerificationChannel(interaction.guildId);
  
  const description = currentChannel 
    ? `**Current Channel:** <#${currentChannel}>\n\nSelect a new channel for verification notifications:`
    : '**Not configured**\n\nSelect a channel for verification notifications:';

  const channels = interaction.guild.channels.cache
    .filter(ch => ch.type === ChannelType.GuildText)
    .map(ch => ({ 
      label: `#${ch.name}`, 
      value: ch.id,
      description: ch.parent?.name || 'No category',
      default: ch.id === currentChannel
    }))
    .slice(0, 25);

  if (channels.length === 0) {
    return interaction.update({
      embeds: [embed('❌ No Channels', 'No text channels found in this server.')],
      components: []
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId('set_verification_channel')
    .setPlaceholder('✅ Select verification channel')
    .addOptions(channels);

  const backButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`admin_settings_back_${interaction.user.id}`)
      .setLabel('← Back to Settings')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({
    embeds: [embed('✅ Verification Channel', description)],
    components: [new ActionRowBuilder().addComponents(menu), backButton]
  });
}

// ═══════════════════════════════════════════════════════════════════
// LOGGING SYSTEM
// ═══════════════════════════════════════════════════════════════════

async function showLoggingMenu(interaction) {
  const config = await Logger.getSettings(interaction.guildId);
  
  const generalStatus = config.generalChannelId 
    ? `<#${config.generalChannelId}>` 
    : '❌ Not set';
  
  const applicationStatus = config.applicationChannelId 
    ? `<#${config.applicationChannelId}>` 
    : '❌ Not set';

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`logging_menu_${interaction.user.id}`)
    .setPlaceholder('Choose a logging setting')
    .addOptions([
      {
        label: 'General Log Channel',
        description: `Currently: ${config.generalChannelId ? 'Set' : 'Not set'}`,
        value: 'general_channel',
        emoji: '📋'
      },
      {
        label: 'Application Log Channel',
        description: `Currently: ${config.applicationChannelId ? 'Set' : 'Not set'}`,
        value: 'application_channel',
        emoji: '📨'
      },
      {
        label: 'Event Settings',
        description: 'Toggle which events to log',
        value: 'event_settings',
        emoji: '⚙️'
      },
      {
        label: 'Grouping Settings',
        description: 'Configure log grouping',
        value: 'grouping_settings',
        emoji: '🔄'
      }
    ]);

  const backButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`admin_settings_back_${interaction.user.id}`)
      .setLabel('← Back to Settings')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({
    embeds: [embed(
      '📋 Logging System',
      `**General Logs:** ${generalStatus}\n` +
      `**Application Logs:** ${applicationStatus}\n\n` +
      'Select an option below to configure:'
    )],
    components: [new ActionRowBuilder().addComponents(menu), backButton]
  });
}

export async function handleLoggingMenuSelect(interaction) {
  const value = interaction.values[0];

  if (value === 'general_channel') {
    await showChannelSelector(interaction, 'general');
  } else if (value === 'application_channel') {
    await showChannelSelector(interaction, 'application');
  } else if (value === 'event_settings') {
    await showEventSettings(interaction);
  } else if (value === 'grouping_settings') {
    await showGroupingSettings(interaction);
  }
}

async function showChannelSelector(interaction, type) {
  const config = await Logger.getSettings(interaction.guildId);
  const currentChannel = type === 'general' ? config.generalChannelId : config.applicationChannelId;
  
  const title = type === 'general' ? '📋 General Log Channel' : '📨 Application Log Channel';
  const description = currentChannel 
    ? `**Current:** <#${currentChannel}>\n\nSelect a new channel:`
    : '**Not configured**\n\nSelect a channel:';

  const channels = interaction.guild.channels.cache
    .filter(ch => ch.type === ChannelType.GuildText)
    .map(ch => ({ 
      label: `#${ch.name}`, 
      value: ch.id,
      description: ch.parent?.name || 'No category',
      default: ch.id === currentChannel
    }))
    .slice(0, 25);

  if (channels.length === 0) {
    return interaction.update({
      embeds: [embed('❌ No Channels', 'No text channels found.')],
      components: []
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`set_${type}_log_channel`)
    .setPlaceholder(`Select ${type} log channel`)
    .addOptions(channels);

  const backButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`logging_back_${interaction.user.id}`)
      .setLabel('← Back to Logging')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({
    embeds: [embed(title, description)],
    components: [new ActionRowBuilder().addComponents(menu), backButton]
  });
}

async function showEventSettings(interaction) {
  const config = await Logger.getSettings(interaction.guildId);
  
  const statusText = Object.entries(config.settings)
    .map(([key, enabled]) => {
      const label = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return `${enabled ? '✅' : '❌'} **${label}**`;
    })
    .join('\n');

  const menu = new StringSelectMenuBuilder()
    .setCustomId('toggle_log_event')
    .setPlaceholder('Select events to toggle')
    .addOptions([
      { label: 'Character Registration', value: 'character_registration' },
      { label: 'Character Updates', value: 'character_updates' },
      { label: 'Character Deletion', value: 'character_deletion' },
      { label: 'Verification', value: 'verification' },
      { label: 'Timezone Changes', value: 'timezone_changes' },
      { label: 'Battle Imagine Changes', value: 'battle_imagine_changes' },
      { label: 'Guild Applications', value: 'guild_applications' },
      { label: 'Application Votes', value: 'application_votes' },
      { label: 'Admin Overrides', value: 'admin_overrides' },
      { label: 'Settings Changes', value: 'settings_changes' },
      { label: 'Role Changes', value: 'role_changes' }
    ]);

  const backButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`logging_back_${interaction.user.id}`)
      .setLabel('← Back to Logging')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({
    embeds: [embed('⚙️ Event Logging Settings', statusText)],
    components: [new ActionRowBuilder().addComponents(menu), backButton]
  });
}

async function showGroupingSettings(interaction) {
  const config = await Logger.getSettings(interaction.guildId);
  
  const statusText = 
    `**Grouping Window:** ${config.grouping.grouping_window_minutes} minutes\n\n` +
    'Events marked ✅ will be grouped:\n\n' +
    Object.entries(config.grouping)
      .filter(([key]) => key !== 'grouping_window_minutes')
      .map(([key, enabled]) => {
        const label = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        return `${enabled ? '✅' : '❌'} **${label}**`;
      })
      .join('\n');

  const menu = new StringSelectMenuBuilder()
    .setCustomId('toggle_log_grouping')
    .setPlaceholder('Toggle grouping or change window')
    .addOptions([
      { label: '⏱️ Change Time Window', value: 'change_window', emoji: '⏱️' },
      { label: 'Character Registration', value: 'character_registration' },
      { label: 'Character Updates', value: 'character_updates' },
      { label: 'Character Deletion', value: 'character_deletion' },
      { label: 'Verification', value: 'verification' },
      { label: 'Timezone Changes', value: 'timezone_changes' },
      { label: 'Battle Imagine Changes', value: 'battle_imagine_changes' },
      { label: 'Settings Changes', value: 'settings_changes' },
      { label: 'Role Changes', value: 'role_changes' }
    ]);

  const backButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`logging_back_${interaction.user.id}`)
      .setLabel('← Back to Logging')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({
    embeds: [embed('🔄 Log Grouping Settings', statusText)],
    components: [new ActionRowBuilder().addComponents(menu), backButton]
  });
}

export async function handleLoggingBackButton(interaction) {
  await showLoggingMenu(interaction);
}

export async function handleSettingsBackButton(interaction) {
  await showSettingsMenu(interaction);
}
