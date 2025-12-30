import { showSettingsMenu, handleSettingsMenuSelect, handleLoggingMenuSelect, handleLoggingBackButton, handleSettingsBackButton } from '../services/adminSettings.js';
import { EphemeralSettingsRepo, LoggingRepo } from '../database/repositories.js';
import { Logger } from '../services/logger.js';
import { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { COLORS } from '../config/game.js';

const successEmbed = (description) => 
  new EmbedBuilder().setDescription(`✅ ${description}`).setColor(COLORS.SUCCESS);

const errorEmbed = (description) => 
  new EmbedBuilder().setDescription(`❌ ${description}`).setColor(COLORS.ERROR);

export async function route(interaction) {
  const customId = interaction.customId;

  // Admin settings button routing
  if (customId.startsWith('admin_settings_back_')) {
    const userId = customId.split('_')[3];
    if (interaction.user.id !== userId) {
      return interaction.update({ 
        embeds: [errorEmbed('This menu is not for you.')], 
        components: []
      });
    }
    return handleSettingsBackButton(interaction);
  }

  if (customId.startsWith('logging_back_')) {
    const userId = customId.split('_')[2];
    if (interaction.user.id !== userId) {
      return interaction.update({ 
        embeds: [errorEmbed('This menu is not for you.')], 
        components: []
      });
    }
    return handleLoggingBackButton(interaction);
  }

  console.log(`[Router] Unhandled button: ${customId}`);
}

export async function routeSelectMenu(interaction) {
  const customId = interaction.customId;

  // ═══════════════════════════════════════════════════════════════════
  // ADMIN SETTINGS SELECT MENUS
  // ═══════════════════════════════════════════════════════════════════

  if (customId.startsWith('admin_settings_menu_')) {
    const userId = customId.split('_')[3];
    if (interaction.user.id !== userId) {
      return interaction.update({ 
        embeds: [errorEmbed('This menu is not for you.')], 
        components: []
      });
    }
    return handleSettingsMenuSelect(interaction);
  }

  if (customId === 'toggle_ephemeral_command') {
    const selected = interaction.values;
    await EphemeralSettingsRepo.updateSettings(interaction.guildId, selected);
    return interaction.update({
      embeds: [successEmbed(`Ephemeral settings updated! ${selected.length} command(s) will reply privately.`)],
      components: []
    });
  }

  if (customId === 'set_verification_channel') {
    const channelId = interaction.values[0];
    await LoggingRepo.setVerificationChannel(interaction.guildId, channelId);
    return interaction.update({
      embeds: [successEmbed(`Verification channel set to <#${channelId}>`)],
      components: []
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // LOGGING SYSTEM SELECT MENUS
  // ═══════════════════════════════════════════════════════════════════

  if (customId.startsWith('logging_menu_')) {
    const userId = customId.split('_')[2];
    if (interaction.user.id !== userId) {
      return interaction.update({ 
        embeds: [errorEmbed('This menu is not for you.')], 
        components: []
      });
    }
    return handleLoggingMenuSelect(interaction);
  }

  if (customId === 'set_general_log_channel') {
    const channelId = interaction.values[0];
    await Logger.setGeneralLogChannel(interaction.guildId, channelId);
    return interaction.update({
      embeds: [successEmbed(`General log channel set to <#${channelId}>`)],
      components: []
    });
  }

  if (customId === 'set_application_log_channel') {
    const channelId = interaction.values[0];
    await Logger.setApplicationLogChannel(interaction.guildId, channelId);
    return interaction.update({
      embeds: [successEmbed(`Application log channel set to <#${channelId}>`)],
      components: []
    });
  }

  if (customId === 'toggle_log_event') {
    const eventType = interaction.values[0];
    await Logger.toggleLogSetting(interaction.guildId, eventType);
    const config = await Logger.getSettings(interaction.guildId);
    const status = config.settings[eventType] ? 'enabled' : 'disabled';
    return interaction.update({
      embeds: [successEmbed(`Event logging ${status}`)],
      components: []
    });
  }

  if (customId === 'toggle_log_grouping') {
    const value = interaction.values[0];
    
    if (value === 'change_window') {
      const modal = new ModalBuilder()
        .setCustomId('log_grouping_window')
        .setTitle('Set Grouping Time Window');

      const input = new TextInputBuilder()
        .setCustomId('minutes')
        .setLabel('Minutes (1-60)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('10')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    await Logger.toggleGroupingSetting(interaction.guildId, value);
    const config = await Logger.getSettings(interaction.guildId);
    const status = config.grouping[value] ? 'enabled' : 'disabled';
    return interaction.update({
      embeds: [successEmbed(`Grouping ${status} for this event`)],
      components: []
    });
  }

  console.log(`[Router] Unhandled select menu: ${customId}`);
}

export async function routeModal(interaction) {
  const customId = interaction.customId;

  // ═══════════════════════════════════════════════════════════════════
  // LOGGING SYSTEM MODALS
  // ═══════════════════════════════════════════════════════════════════

  if (customId === 'log_grouping_window') {
    const minutes = parseInt(interaction.fields.getTextInputValue('minutes'));
    
    if (isNaN(minutes) || minutes < 1 || minutes > 60) {
      return interaction.update({
        embeds: [errorEmbed('Please enter a valid number between 1 and 60.')],
        components: []
      });
    }

    await Logger.setGroupingWindow(interaction.guildId, minutes);
    return interaction.update({
      embeds: [successEmbed(`Grouping window set to ${minutes} minutes`)],
      components: []
    });
  }

  console.log(`[Router] Unhandled modal: ${customId}`);
}
