import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import * as registrationHandler from './registration.js';
import * as editingHandler from './editing.js';
import * as adminToolsHandler from './adminToolsHandler.js';
import db from '../services/database.js';
import logger from '../utils/logger.js';
import config from '../utils/config.js';
import { buildCharacterProfileEmbed } from '../components/embeds/characterProfile.js';
import { buildCharacterButtons } from '../components/buttons/characterButtons.js';

// ============================================================================
// BUTTON INTERACTION HANDLER
// ============================================================================

export async function handleButtonInteraction(interaction) {
  try {
    const customId = interaction.customId;
    const userId = interaction.user.id;
    
    // Extract user ID from customId
    const extractUserId = (id) => {
      const parts = id.split('_');
      return parts[parts.length - 1];
    };
    
    const targetUserId = extractUserId(customId);
    
    // Verify ownership for non-admin interactions
    if (!customId.startsWith('admin_') && targetUserId !== userId) {
      return await interaction.reply({ 
        content: '❌ This is not your menu.', 
        ephemeral: true 
      });
    }
    
    // ======== ADMIN TOOLS ========
    if (customId.startsWith('admin_toggle_error_ping_')) {
      return await adminToolsHandler.handleToggleErrorPing(interaction, targetUserId);
    }
    
    if (customId.startsWith('admin_set_error_role_')) {
      return await adminToolsHandler.handleSetErrorRoleModal(interaction, targetUserId);
    }
    
    if (customId.startsWith('admin_toggle_warn_ping_')) {
      return await adminToolsHandler.handleToggleWarnPing(interaction, targetUserId);
    }
    
    if (customId.startsWith('admin_set_warn_role_')) {
      return await adminToolsHandler.handleSetWarnRoleModal(interaction, targetUserId);
    }
    
    // ======== REGISTRATION ========
    if (customId.startsWith('register_main_')) {
      return await registrationHandler.handleRegisterMain(interaction, targetUserId);
    }
    
    // ======== BACK NAVIGATION ========
    if (customId.startsWith('back_to_profile_')) {
      const characters = await db.getAllCharactersWithSubclasses(targetUserId);
      const mainChar = characters.find(c => c.character_type === 'main');
      const alts = characters.filter(c => c.character_type === 'alt');
      const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
      
      const embed = await buildCharacterProfileEmbed(interaction.user, characters, interaction);
      const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, targetUserId);
      
      return await interaction.update({ embeds: [embed], components: buttons });
    }
    
    if (customId.startsWith('back_to_region_')) {
      return await registrationHandler.handleBackToRegion(interaction, targetUserId);
    }
    
    if (customId.startsWith('back_to_country_')) {
      return await registrationHandler.handleBackToCountry(interaction, targetUserId);
    }
    
    if (customId.startsWith('back_to_timezone_')) {
      return await registrationHandler.handleBackToTimezone(interaction, targetUserId);
    }
    
    if (customId.startsWith('back_to_class_')) {
      return await registrationHandler.handleBackToClass(interaction, targetUserId);
    }
    
    if (customId.startsWith('back_to_subclass_')) {
      return await registrationHandler.handleBackToSubclass(interaction, targetUserId);
    }
    
    if (customId.startsWith('back_to_ability_score_')) {
      return await registrationHandler.handleBackToAbilityScore(interaction, targetUserId);
    }
    
    if (customId.startsWith('back_to_edit_choice_')) {
      return await editingHandler.handleEditCharacter(interaction, targetUserId);
    }
    
    if (customId.startsWith('back_to_edit_main_')) {
      return await editingHandler.handleEditMain(interaction, targetUserId);
    }
    
    if (customId.startsWith('back_to_edit_alt_choice_')) {
      return await editingHandler.handleEditAltChoice(interaction, targetUserId);
    }
    
    if (customId.startsWith('back_to_edit_subclass_choice_')) {
      return await editingHandler.handleEditSubclassChoice(interaction, targetUserId);
    }
    
    if (customId.startsWith('back_to_current_edit_')) {
      const stateManager = (await import('../utils/stateManager.js')).default;
      const state = stateManager.getUpdateState(targetUserId);
      if (state) {
        if (state.type === 'main') {
          return await editingHandler.handleEditMain(interaction, targetUserId);
        } else if (state.type === 'alt') {
          return await editingHandler.handleEditAlt(interaction, targetUserId, state.characterId);
        } else if (state.type === 'subclass') {
          return await editingHandler.handleEditSubclass(interaction, targetUserId, state.characterId);
        }
      }
      return await editingHandler.handleEditCharacter(interaction, targetUserId);
    }
    
    if (customId.startsWith('back_to_remove_choice_')) {
      return await editingHandler.handleRemoveCharacter(interaction, targetUserId);
    }
    
    // ======== EDITING ========
    if (customId.startsWith('add_character_')) {
      const { buildAddCharacterMenu } = await import('../components/buttons/characterButtons.js');
      const characters = await db.getAllCharactersWithSubclasses(targetUserId);
      const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
      
      const { EmbedBuilder } = await import('discord.js');
      const embed = new EmbedBuilder()
        .setColor('#EC4899')
        .setDescription('# **➕ Add Character**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nWhat would you like to add?')
        .setTimestamp();
      
      const menu = buildAddCharacterMenu(targetUserId, subs.length);
      return await interaction.update({ embeds: [embed], components: menu });
    }
    
    if (customId.startsWith('edit_character_')) {
      return await editingHandler.handleEditCharacter(interaction, targetUserId);
    }
    
    if (customId.startsWith('remove_character_')) {
      return await editingHandler.handleRemoveCharacter(interaction, targetUserId);
    }
    
    // ======== REMOVAL CONFIRMATION ========
    if (customId.startsWith('confirm_remove_')) {
      return await editingHandler.handleConfirmRemove(interaction, targetUserId);
    }
    
    if (customId.startsWith('cancel_remove_')) {
      return await editingHandler.handleCancelRemove(interaction, targetUserId);
    }
    
    logger.logButton(customId, interaction.user.username, userId);
    
  } catch (error) {
    logger.error(`Button interaction error: ${error.message}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
    }
  }
}

// ============================================================================
// SELECT MENU INTERACTION HANDLER
// ============================================================================

export async function handleSelectMenuInteraction(interaction) {
  try {
    const customId = interaction.customId;
    const userId = interaction.user.id;
    
    // Extract user ID from customId
    const extractUserId = (id) => {
      const parts = id.split('_');
      return parts[parts.length - 1];
    };
    
    const targetUserId = extractUserId(customId);
    
    // Verify ownership for non-admin interactions
    if (!customId.startsWith('admin_') && targetUserId !== userId) {
      return await interaction.reply({ 
        content: '❌ This is not your menu.', 
        ephemeral: true 
      });
    }
    
    // ======== ADMIN TOOLS ========
    if (customId.startsWith('admin_logger_config_')) {
      return await adminToolsHandler.handleLoggerConfigSelect(interaction, targetUserId);
    }
    
    if (customId.startsWith('admin_set_log_level_')) {
      return await adminToolsHandler.handleSetLogLevel(interaction, targetUserId);
    }
    
    // ======== REGISTRATION ========
    if (customId.startsWith('select_region_')) {
      return await registrationHandler.handleRegionSelect(interaction, targetUserId);
    }
    
    if (customId.startsWith('select_country_')) {
      return await registrationHandler.handleCountrySelect(interaction, targetUserId);
    }
    
    if (customId.startsWith('select_timezone_')) {
      return await registrationHandler.handleTimezoneSelect(interaction, targetUserId);
    }
    
    if (customId.startsWith('select_class_')) {
      return await registrationHandler.handleClassSelect(interaction, targetUserId);
    }
    
    if (customId.startsWith('select_subclass_')) {
      return await registrationHandler.handleSubclassSelect(interaction, targetUserId);
    }
    
    if (customId.startsWith('select_ability_score_')) {
      return await registrationHandler.handleAbilityScoreSelect(interaction, targetUserId);
    }
    
    if (customId.startsWith('select_guild_')) {
      return await registrationHandler.handleGuildSelect(interaction, targetUserId);
    }
    
    // ======== EDITING - ADD ========
    if (customId.startsWith('add_character_select_')) {
      const selected = interaction.values[0];
      if (selected === 'alt') {
        return await editingHandler.handleAddAlt(interaction, targetUserId);
      } else if (selected === 'subclass') {
        return await editingHandler.handleAddSubclass(interaction, targetUserId);
      }
    }
    
    if (customId.startsWith('select_parent_for_subclass_')) {
      return await editingHandler.handleSelectParentForSubclass(interaction, targetUserId);
    }
    
    // ======== EDITING - EDIT TYPE ========
    if (customId.startsWith('edit_char_type_')) {
      const selected = interaction.values[0];
      if (selected === 'edit_main') {
        return await editingHandler.handleEditMain(interaction, targetUserId);
      } else if (selected === 'edit_alt') {
        return await editingHandler.handleEditAltChoice(interaction, targetUserId);
      } else if (selected === 'edit_subclass') {
        return await editingHandler.handleEditSubclassChoice(interaction, targetUserId);
      }
    }
    
    if (customId.startsWith('select_alt_to_edit_')) {
      const altId = parseInt(interaction.values[0]);
      return await editingHandler.handleEditAlt(interaction, targetUserId, altId);
    }
    
    if (customId.startsWith('select_subclass_to_edit_')) {
      const subclassId = parseInt(interaction.values[0]);
      return await editingHandler.handleEditSubclass(interaction, targetUserId, subclassId);
    }
    
    // ======== EDITING - EDIT OPTIONS ========
    if (customId.startsWith('edit_main_option_')) {
      const option = interaction.values[0];
      return await editingHandler.handleEditOption(interaction, targetUserId, option);
    }
    
    if (customId.startsWith('edit_alt_option_')) {
      const option = interaction.values[0];
      return await editingHandler.handleEditOption(interaction, targetUserId, option);
    }
    
    if (customId.startsWith('edit_subclass_option_')) {
      const option = interaction.values[0];
      return await editingHandler.handleEditOption(interaction, targetUserId, option);
    }
    
    if (customId.startsWith('edit_class_select_')) {
      return await editingHandler.handleEditClassSelect(interaction, targetUserId);
    }
    
    if (customId.startsWith('edit_subclass_select_')) {
      return await editingHandler.handleEditSubclassSelect(interaction, targetUserId);
    }
    
    if (customId.startsWith('edit_score_select_')) {
      return await editingHandler.handleEditScoreSelect(interaction, targetUserId);
    }
    
    if (customId.startsWith('edit_guild_select_')) {
      return await editingHandler.handleEditGuildSelect(interaction, targetUserId);
    }
    
    // ======== EDITING - REMOVE TYPE ========
    if (customId.startsWith('remove_char_type_')) {
      const selected = interaction.values[0];
      if (selected === 'remove_main') {
        return await editingHandler.handleRemoveMain(interaction, targetUserId);
      } else if (selected === 'remove_alt') {
        return await editingHandler.handleRemoveAltChoice(interaction, targetUserId);
      } else if (selected === 'remove_subclass') {
        return await editingHandler.handleRemoveSubclassChoice(interaction, targetUserId);
      }
    }
    
    if (customId.startsWith('select_alt_to_remove_')) {
      const altId = parseInt(interaction.values[0]);
      return await editingHandler.handleRemoveAlt(interaction, targetUserId, altId);
    }
    
    if (customId.startsWith('select_subclass_to_remove_')) {
      const subclassId = parseInt(interaction.values[0]);
      return await editingHandler.handleRemoveSubclass(interaction, targetUserId, subclassId);
    }
    
    // ======== LEGACY SELECT HANDLERS (integrated inline) ========
    // These handle any remaining select_ prefixed interactions
    if (customId.startsWith('select_main_') || customId.startsWith('select_alt_')) {
      const selectedValue = interaction.values[0];
      const characters = await db.getAllCharactersWithSubclasses(userId);
      const mainChar = characters.find(c => c.character_type === 'main');
      const alts = characters.filter(c => c.character_type === 'alt');
      const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
      
      const embed = await buildCharacterProfileEmbed(interaction.user, characters, interaction);
      const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);
      
      await interaction.update({ embeds: [embed], components: buttons });
      
      logger.logSelectMenu(
        customId, 
        interaction.user.username, 
        userId, 
        selectedValue,
        { action: 'View character' }
      );
      return;
    }
    
    logger.logSelectMenu(customId, interaction.user.username, userId, interaction.values[0]);
    
  } catch (error) {
    logger.error(`Select menu interaction error: ${error.message}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
    }
  }
}

// ============================================================================
// MODAL SUBMIT HANDLER
// ============================================================================

export async function handleModalSubmit(interaction) {
  try {
    const customId = interaction.customId;
    const userId = interaction.user.id;
    
    // Extract user ID from customId
    const extractUserId = (id) => {
      const parts = id.split('_');
      return parts[parts.length - 1];
    };
    
    const targetUserId = extractUserId(customId);
    
    // Verify ownership for non-admin interactions
    if (!customId.startsWith('admin_') && targetUserId !== userId) {
      return await interaction.reply({ 
        content: '❌ This is not your modal.', 
        ephemeral: true 
      });
    }
    
    // ======== ADMIN TOOLS ========
    if (customId.startsWith('admin_set_log_channel_')) {
      return await adminToolsHandler.handleSetLogChannelModal(interaction, targetUserId);
    }
    
    if (customId.startsWith('admin_set_error_role_modal_')) {
      return await adminToolsHandler.handleSetErrorRoleSubmit(interaction, targetUserId);
    }
    
    if (customId.startsWith('admin_set_warn_role_modal_')) {
      return await adminToolsHandler.handleSetWarnRoleSubmit(interaction, targetUserId);
    }
    
    // ======== REGISTRATION ========
    if (customId.startsWith('ign_modal_')) {
      return await registrationHandler.handleIGNModal(interaction, targetUserId);
    }
    
    // ======== EDITING ========
    if (customId.startsWith('edit_ign_modal_')) {
      return await editingHandler.handleEditIGNModal(interaction, targetUserId);
    }
    
    if (customId.startsWith('edit_uid_modal_')) {
      return await editingHandler.handleEditUIDModal(interaction, targetUserId);
    }
    
    // ======== LEGACY MODAL HANDLERS (integrated inline) ========
    // These handle any remaining edit_ or delete_ prefixed modals
    if (customId.startsWith('edit_main_') || 
        customId.startsWith('edit_alt_') || 
        customId.startsWith('edit_subclass_') ||
        customId.startsWith('delete_confirm_')) {
      
      const characters = await db.getAllCharactersWithSubclasses(userId);
      const mainChar = characters.find(c => c.character_type === 'main');
      const alts = characters.filter(c => c.character_type === 'alt');
      const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
      
      const embed = await buildCharacterProfileEmbed(interaction.user, characters, interaction);
      const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);
      
      await interaction.update({ embeds: [embed], components: buttons });
      
      logger.logModal(customId, interaction.user.username, userId);
      return;
    }
    
    logger.logModal(customId, interaction.user.username, userId);
    
  } catch (error) {
    logger.error(`Modal submit error: ${error.message}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
    }
  }
}
