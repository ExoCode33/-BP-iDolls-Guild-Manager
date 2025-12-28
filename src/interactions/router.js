// /app/src/interactions/router.js

import { MessageFlags } from 'discord.js';
import logger from '../services/logger.js';
import state from '../services/state.js';
import * as reg from './registration.js';
import * as edit from './editing.js';
import applicationService from '../services/applications.js';

const ephemeralFlag = { flags: MessageFlags.Ephemeral };

function extractUserId(customId) {
  const parts = customId.split('_');
  return parts[parts.length - 1];
}

function isOwner(interaction, targetUserId) {
  return interaction.user.id === targetUserId;
}

function isAdmin(interaction) {
  return interaction.member?.permissions?.has('Administrator');
}

export async function route(interaction) {
  const customId = interaction.customId;
  const userId = extractUserId(customId);
  const isAdminAction = customId.startsWith('admin_');

  // Application handlers - FIRST, before ownership checks
  if (customId.startsWith('app_vote_accept_')) {
    const appId = parseInt(customId.split('_')[3]);
    return applicationService.handleVote(interaction, appId, 'accept');
  }
  if (customId.startsWith('app_vote_deny_')) {
    const appId = parseInt(customId.split('_')[3]);
    return applicationService.handleVote(interaction, appId, 'deny');
  }
  
  // ✅ FIX: Handle the main "Admin Override" button click
  if (customId.startsWith('app_override_') && !customId.includes('accept') && !customId.includes('deny') && !customId.includes('cancel')) {
    const appId = parseInt(customId.split('_')[2]);
    return applicationService.showOverrideMenu(interaction, appId);
  }
  
  if (customId.startsWith('app_override_accept_')) {
    const appId = parseInt(customId.split('_')[3]);
    return applicationService.handleOverride(interaction, appId, 'accept');
  }
  if (customId.startsWith('app_override_deny_')) {
    const appId = parseInt(customId.split('_')[3]);
    return applicationService.handleOverride(interaction, appId, 'deny');
  }
  if (customId.startsWith('app_override_') && customId.includes('cancel')) {
    return interaction.update({ content: '❌ Override cancelled.', components: [], flags: MessageFlags.Ephemeral });
  }

  // Check ownership - admins can bypass for admin_ prefixed actions
  if (!isOwner(interaction, userId) && !isAdminAction) {
    return interaction.reply({ content: 'This is not your session.', ...ephemeralFlag });
  }

  // For admin actions, verify they have admin perms
  if (isAdminAction && !isAdmin(interaction)) {
    return interaction.reply({ content: 'You need Administrator permission.', ...ephemeralFlag });
  }

  logger.interaction(interaction.isButton() ? 'button' : 'select', customId, interaction.user.username);

  try {
    // Admin actions (operate on other users)
    if (customId.startsWith('admin_reg_start_')) return reg.start(interaction, userId, 'main');
    if (customId.startsWith('admin_add_')) return edit.showAddMenu(interaction, userId);
    if (customId.startsWith('admin_edit_')) return edit.showEditMenu(interaction, userId);
    if (customId.startsWith('admin_remove_')) return edit.showRemoveMenu(interaction, userId);

    // Registration - START
    if (customId.startsWith('reg_start_')) return reg.start(interaction, userId, 'main');

    // Back buttons
    if (customId.startsWith('back_to_profile_')) return edit.backToProfile(interaction, userId);
    if (customId.startsWith('back_to_region_')) return reg.backToRegion(interaction, userId);
    if (customId.startsWith('back_to_country_')) return reg.backToCountry(interaction, userId);
    if (customId.startsWith('back_to_timezone_')) return reg.backToTimezone(interaction, userId);
    if (customId.startsWith('back_to_class_')) return reg.backToClass(interaction, userId);
    if (customId.startsWith('back_to_subclass_')) return reg.backToSubclass(interaction, userId);
    if (customId.startsWith('back_to_score_')) return reg.backToScore(interaction, userId);
    if (customId.startsWith('back_to_battle_imagine_')) return reg.backToBattleImagine(interaction, userId);
    if (customId.startsWith('retry_ign_uid_')) return reg.retryIGN(interaction, userId);

    // Add character
    if (customId.startsWith('add_type_')) return edit.handleAddType(interaction, userId);
    if (customId.startsWith('add_')) return edit.showAddMenu(interaction, userId);
    if (customId.startsWith('parent_')) return edit.handleParentSelect(interaction, userId);

    // Edit character - back buttons
    if (customId.startsWith('edit_type_back_')) return edit.backToEditType(interaction, userId);
    if (customId.startsWith('edit_field_back_')) return edit.backToFieldSelect(interaction, userId);
    if (customId.startsWith('edit_class_back_')) return edit.backToClassSelect(interaction, userId);
    if (customId.startsWith('edit_bi_back_')) return edit.backToBattleImagineList(interaction, userId);
    
    // Edit character - selections
    if (customId.startsWith('edit_type_')) return edit.handleEditType(interaction, userId);
    if (customId.startsWith('edit_alt_')) return edit.handleEditAltSelect(interaction, userId);
    if (customId.startsWith('edit_subclass_')) return edit.handleEditSubclassSelect(interaction, userId);
    if (customId.startsWith('edit_field_')) return edit.handleFieldSelect(interaction, userId);
    if (customId.startsWith('edit_bi_select_')) return edit.handleEditBattleImagineSelect(interaction, userId);
    if (customId.startsWith('edit_bi_tier_')) return edit.handleEditBattleImagineTier(interaction, userId);
    if (customId.startsWith('edit_')) return edit.showEditMenu(interaction, userId);

    // Remove character
    if (customId.startsWith('remove_type_')) return edit.handleRemoveType(interaction, userId);
    if (customId.startsWith('remove_alt_')) return edit.handleRemoveAltSelect(interaction, userId);
    if (customId.startsWith('remove_subclass_')) return edit.handleRemoveSubclassSelect(interaction, userId);
    if (customId.startsWith('remove_')) return edit.showRemoveMenu(interaction, userId);

    // Confirm/cancel
    if (customId.startsWith('confirm_deleteall_')) return edit.confirmDeleteAll(interaction, userId);
    if (customId.startsWith('confirm_delete_')) return edit.confirmDelete(interaction, userId);
    if (customId.startsWith('cancel_')) return edit.cancelAction(interaction, userId);

    logger.warning('Router', `Unknown customId: ${customId}`);
  } catch (e) {
    logger.error('Router', `Failed handling ${customId}`, e);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Something went wrong.', ...ephemeralFlag });
    }
  }
}

export async function routeSelectMenu(interaction) {
  const customId = interaction.customId;
  const userId = extractUserId(customId);
  const isAdminAction = customId.startsWith('admin_');

  if (!isOwner(interaction, userId) && !isAdminAction) {
    return interaction.reply({ content: 'This is not your session.', ...ephemeralFlag });
  }

  if (isAdminAction && !isAdmin(interaction)) {
    return interaction.reply({ content: 'You need Administrator permission.', ...ephemeralFlag });
  }

  logger.interaction('select', customId, interaction.user.username);

  try {
    // Registration select menus - these need to be routed to registration handlers
    if (customId.startsWith('select_region_')) return reg.handleRegion(interaction, userId);
    if (customId.startsWith('select_country_')) return reg.handleCountry(interaction, userId);
    if (customId.startsWith('select_timezone_')) return reg.handleTimezone(interaction, userId);
    if (customId.startsWith('select_class_')) {
      const s = state.get(userId, 'edit');
      if (s?.field === 'class') {
        return edit.handleEditClass(interaction, userId);
      }
      return reg.handleClass(interaction, userId);
    }
    if (customId.startsWith('select_subclass_')) {
      const s = state.get(userId, 'edit');
      if (s?.field === 'class') {
        return edit.handleEditSubclass(interaction, userId);
      }
      return reg.handleSubclass(interaction, userId);
    }
    if (customId.startsWith('select_ability_score_')) {
      const s = state.get(userId, 'edit');
      if (s?.field === 'score') {
        return edit.handleEditScore(interaction, userId);
      }
      return reg.handleScore(interaction, userId);
    }
    if (customId.startsWith('select_battle_imagine_')) return reg.handleBattleImagine(interaction, userId);
    if (customId.startsWith('select_guild_')) {
      const s = state.get(userId, 'edit');
      if (s?.field === 'guild') {
        return edit.handleEditGuild(interaction, userId);
      }
      return reg.handleGuild(interaction, userId);
    }

    // Edit character type selections
    if (customId.startsWith('add_type_')) return edit.handleAddType(interaction, userId);
    if (customId.startsWith('edit_type_')) return edit.handleEditType(interaction, userId);
    if (customId.startsWith('remove_type_')) return edit.handleRemoveType(interaction, userId);
    if (customId.startsWith('parent_')) return edit.handleParentSelect(interaction, userId);
    if (customId.startsWith('edit_alt_')) return edit.handleEditAltSelect(interaction, userId);
    if (customId.startsWith('edit_subclass_')) return edit.handleEditSubclassSelect(interaction, userId);
    if (customId.startsWith('edit_field_')) return edit.handleFieldSelect(interaction, userId);
    if (customId.startsWith('edit_bi_select_')) return edit.handleEditBattleImagineSelect(interaction, userId);
    if (customId.startsWith('edit_bi_tier_')) return edit.handleEditBattleImagineTier(interaction, userId);

    logger.warning('Router', `Unknown select customId: ${customId}`);
  } catch (e) {
    logger.error('Router', `Failed handling select ${customId}`, e);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Something went wrong.', ...ephemeralFlag });
    }
  }
}

export async function routeModal(interaction) {
  const customId = interaction.customId;
  const userId = extractUserId(customId);

  logger.interaction('modal', customId, interaction.user.username);

  try {
    // Registration modals
    if (customId.startsWith('ign_modal_')) {
      return reg.handleIGN(interaction, userId);
    }

    // Edit modals
    if (customId.startsWith('edit_ign_')) {
      return edit.handleEditModal(interaction, userId, 'ign');
    }

    if (customId.startsWith('edit_uid_')) {
      return edit.handleEditModal(interaction, userId, 'uid');
    }

    logger.warning('Router', `Unknown modal customId: ${customId}`);
  } catch (e) {
    logger.error('Router', `Failed handling modal ${customId}`, e);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Something went wrong.', ...ephemeralFlag });
    }
  }
}
