import { showSettingsMenu, handleSettingsMenuSelect, handleLoggingMenuSelect, handleLoggingBackButton, handleSettingsBackButton } from '../services/adminSettings.js';
import { EphemeralSettingsRepo, LoggingRepo } from '../database/repositories.js';
import { Logger } from '../services/logger.js';
import { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { COLORS } from '../config/game.js';
import * as reg from './registration.js';
import * as edit from './editing.js';
import applicationService from '../services/applications.js';

const successEmbed = (description) => 
  new EmbedBuilder().setDescription(`✅ ${description}`).setColor(COLORS.SUCCESS);

const errorEmbed = (description) => 
  new EmbedBuilder().setDescription(`❌ ${description}`).setColor(COLORS.ERROR);

// ═══════════════════════════════════════════════════════════════════
// BUTTON ROUTING
// ═══════════════════════════════════════════════════════════════════

export async function route(interaction) {
  const customId = interaction.customId;
  console.log(`[ROUTER] Button: ${customId}`);

  // ═══════════════════════════════════════════════════════════════════
  // REGISTRATION BUTTONS
  // ═══════════════════════════════════════════════════════════════════

  if (customId.startsWith('reg_start_')) {
    const userId = customId.split('_')[2];
    return reg.start(interaction, userId, 'main');
  }

  if (customId.startsWith('reg_subclass_')) {
    const userId = customId.split('_')[2];
    return reg.start(interaction, userId, 'subclass');
  }

  if (customId.startsWith('retry_ign_uid_')) {
    const userId = customId.split('_')[3];
    return reg.retryIGN(interaction, userId);
  }

  if (customId.startsWith('back_to_region_')) {
    const userId = customId.split('_')[3];
    return reg.backToRegion(interaction, userId);
  }

  if (customId.startsWith('back_to_country_')) {
    const userId = customId.split('_')[3];
    return reg.backToCountry(interaction, userId);
  }

  if (customId.startsWith('back_to_timezone_')) {
    const userId = customId.split('_')[3];
    return reg.backToTimezone(interaction, userId);
  }

  if (customId.startsWith('back_to_class_')) {
    const userId = customId.split('_')[3];
    return reg.backToClass(interaction, userId);
  }

  if (customId.startsWith('back_to_subclass_')) {
    const userId = customId.split('_')[3];
    return reg.backToSubclass(interaction, userId);
  }

  if (customId.startsWith('back_to_battle_imagine_')) {
    const userId = customId.split('_')[4];
    return reg.backToBattleImagine(interaction, userId);
  }

  // ═══════════════════════════════════════════════════════════════════
  // PROFILE ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  if (customId.startsWith('add_')) {
    const userId = customId.split('_')[1];
    return edit.showAddMenu(interaction, userId);
  }

  if (customId.startsWith('edit_')) {
    const userId = customId.split('_')[1];
    return edit.showEditMenu(interaction, userId);
  }

  if (customId.startsWith('remove_')) {
    const userId = customId.split('_')[1];
    return edit.showRemoveMenu(interaction, userId);
  }

  // ═══════════════════════════════════════════════════════════════════
  // EDITING NAVIGATION
  // ═══════════════════════════════════════════════════════════════════

  if (customId.startsWith('edit_type_back_')) {
    const userId = customId.split('_')[3];
    return edit.backToEditType(interaction, userId);
  }

  if (customId.startsWith('edit_field_back_')) {
    const userId = customId.split('_')[3];
    return edit.backToFieldSelect(interaction, userId);
  }

  if (customId.startsWith('edit_class_back_')) {
    const userId = customId.split('_')[3];
    return edit.backToClassSelect(interaction, userId);
  }

  if (customId.startsWith('edit_bi_back_')) {
    const userId = customId.split('_')[3];
    return edit.backToBattleImagineList(interaction, userId);
  }

  if (customId.startsWith('back_profile_')) {
    const userId = customId.split('_')[2];
    return edit.backToProfile(interaction, userId);
  }

  if (customId.startsWith('back_to_profile_')) {
    const userId = customId.split('_')[3];
    return edit.backToProfile(interaction, userId);
  }

  // ═══════════════════════════════════════════════════════════════════
  // CONFIRMATION BUTTONS
  // ═══════════════════════════════════════════════════════════════════

  if (customId.startsWith('confirm_delete_')) {
    const userId = customId.split('_')[2];
    return edit.confirmDelete(interaction, userId);
  }

  if (customId.startsWith('confirm_deleteall_')) {
    const userId = customId.split('_')[2];
    return edit.confirmDeleteAll(interaction, userId);
  }

  if (customId.startsWith('cancel_delete_') || customId.startsWith('cancel_deleteall_')) {
    const userId = customId.split('_')[2];
    return edit.cancelAction(interaction, userId);
  }

  // ═══════════════════════════════════════════════════════════════════
  // APPLICATION VOTING
  // ═══════════════════════════════════════════════════════════════════

  if (customId.startsWith('app_vote_accept_')) {
    const applicationId = parseInt(customId.split('_')[3]);
    return applicationService.handleVote(interaction, applicationId, 'accept');
  }

  if (customId.startsWith('app_vote_deny_')) {
    const applicationId = parseInt(customId.split('_')[3]);
    return applicationService.handleVote(interaction, applicationId, 'deny');
  }

  if (customId.startsWith('app_override_accept_')) {
    const applicationId = parseInt(customId.split('_')[3]);
    return applicationService.handleOverride(interaction, applicationId, 'accept');
  }

  if (customId.startsWith('app_override_deny_')) {
    const applicationId = parseInt(customId.split('_')[3]);
    return applicationService.handleOverride(interaction, applicationId, 'deny');
  }

  if (customId.startsWith('app_override_') && !customId.includes('accept') && !customId.includes('deny') && !customId.includes('cancel')) {
    const applicationId = parseInt(customId.split('_')[2]);
    return applicationService.showOverrideMenu(interaction, applicationId);
  }

  if (customId.startsWith('app_override_cancel_')) {
    return interaction.update({ content: '❌ Override cancelled.', components: [] });
  }

  // ═══════════════════════════════════════════════════════════════════
  // VERIFICATION
  // ═══════════════════════════════════════════════════════════════════

  if (customId === 'verification_register') {
    const userId = interaction.user.id;
    return reg.start(interaction, userId, 'main');
  }

  if (customId === 'verification_non_player') {
    try {
      const config = (await import('../config/index.js')).default;
      const guild = interaction.guild;
      const member = await guild.members.fetch(interaction.user.id);
      
      if (config.roles.visitor) {
        await member.roles.add(config.roles.visitor);
      }
      
      return interaction.reply({
        embeds: [successEmbed('Welcome! You now have access to the server. 💫')],
        ephemeral: true
      });
    } catch (error) {
      console.error('[VERIFICATION] Error:', error);
      return interaction.reply({
        embeds: [errorEmbed('Something went wrong. Please contact an admin.')],
        ephemeral: true
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // ADMIN SETTINGS
  // ═══════════════════════════════════════════════════════════════════

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

  console.log(`[ROUTER] ⚠️ Unhandled button: ${customId}`);
}

// ═══════════════════════════════════════════════════════════════════
// SELECT MENU ROUTING
// ═══════════════════════════════════════════════════════════════════

export async function routeSelectMenu(interaction) {
  const customId = interaction.customId;
  console.log(`[ROUTER] Select: ${customId}`);

  // ═══════════════════════════════════════════════════════════════════
  // REGISTRATION SELECTS
  // ═══════════════════════════════════════════════════════════════════

  if (customId.startsWith('select_region_') || customId.startsWith('reg_region_')) {
    const userId = customId.split('_')[2];
    return reg.handleRegion(interaction, userId);
  }

  if (customId.startsWith('select_country_') || customId.startsWith('reg_country_')) {
    const userId = customId.split('_')[2];
    return reg.handleCountry(interaction, userId);
  }

  if (customId.startsWith('select_timezone_') || customId.startsWith('reg_timezone_')) {
    const userId = customId.split('_')[2];
    return reg.handleTimezone(interaction, userId);
  }

  if (customId.startsWith('select_class_') || customId.startsWith('reg_class_')) {
    const userId = customId.split('_')[2];
    return reg.handleClass(interaction, userId);
  }

  if (customId.startsWith('select_subclass_') || customId.startsWith('reg_subclass_')) {
    const userId = customId.split('_')[2];
    return reg.handleSubclass(interaction, userId);
  }

  if (customId.startsWith('select_ability_score_') || customId.startsWith('reg_score_')) {
    const userId = customId.split('_')[3] || customId.split('_')[2];
    return reg.handleScore(interaction, userId);
  }

  if (customId.startsWith('select_battle_imagine_') || customId.startsWith('reg_bi_')) {
    const userId = customId.split('_')[3] || customId.split('_')[2];
    return reg.handleBattleImagine(interaction, userId);
  }

  if (customId.startsWith('select_guild_')) {
    const userId = customId.split('_')[2];
    return reg.handleGuild(interaction, userId);
  }

  // ═══════════════════════════════════════════════════════════════════
  // EDITING SELECTS
  // ═══════════════════════════════════════════════════════════════════

  if (customId.startsWith('add_type_')) {
    const userId = customId.split('_')[2];
    return edit.handleAddType(interaction, userId);
  }

  if (customId.startsWith('edit_type_')) {
    const userId = customId.split('_')[2];
    return edit.handleEditType(interaction, userId);
  }

  if (customId.startsWith('remove_type_')) {
    const userId = customId.split('_')[2];
    return edit.handleRemoveType(interaction, userId);
  }

  if (customId.startsWith('edit_subclass_') && !customId.includes('field')) {
    const userId = customId.split('_')[2];
    return edit.handleEditSubclassSelect(interaction, userId);
  }

  if (customId.startsWith('remove_subclass_')) {
    const userId = customId.split('_')[2];
    return edit.handleRemoveSubclassSelect(interaction, userId);
  }

  if (customId.startsWith('edit_field_')) {
    const userId = customId.split('_')[2];
    return edit.handleFieldSelect(interaction, userId);
  }

  if (customId.startsWith('edit_bi_select_')) {
    const userId = customId.split('_')[3];
    return edit.handleEditBattleImagineSelect(interaction, userId);
  }

  if (customId.startsWith('edit_bi_tier_')) {
    const userId = customId.split('_')[3];
    return edit.handleEditBattleImagineTier(interaction, userId);
  }

  // ═══════════════════════════════════════════════════════════════════
  // ADMIN SETTINGS
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

  console.log(`[ROUTER] ⚠️ Unhandled select: ${customId}`);
}

// ═══════════════════════════════════════════════════════════════════
// MODAL ROUTING
// ═══════════════════════════════════════════════════════════════════

export async function routeModal(interaction) {
  const customId = interaction.customId;
  console.log(`[ROUTER] Modal: ${customId}`);

  // ═══════════════════════════════════════════════════════════════════
  // REGISTRATION MODALS
  // ═══════════════════════════════════════════════════════════════════

  if (customId.startsWith('ign_modal_') || customId.startsWith('reg_ign_')) {
    const userId = customId.split('_')[2];
    return reg.handleIGN(interaction, userId);
  }

  // ═══════════════════════════════════════════════════════════════════
  // EDITING MODALS
  // ═══════════════════════════════════════════════════════════════════

  if (customId.startsWith('edit_ign_')) {
    const userId = customId.split('_')[2];
    return edit.handleEditModal(interaction, userId, 'ign');
  }

  if (customId.startsWith('edit_uid_')) {
    const userId = customId.split('_')[2];
    return edit.handleEditModal(interaction, userId, 'uid');
  }

  // ═══════════════════════════════════════════════════════════════════
  // ADMIN SETTINGS MODALS
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

  console.log(`[ROUTER] ⚠️ Unhandled modal: ${customId}`);
}
