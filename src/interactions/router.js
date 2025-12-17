import config from '../config/index.js';
import logger from '../services/logger.js';
import { CharacterRepo } from '../database/repositories.js';
import { profileEmbed } from '../ui/embeds.js';
import * as ui from '../ui/components.js';
import * as reg from './registration.js';
import * as edit from './editing.js';

function extractUserId(customId) {
  const parts = customId.split('_');
  return parts[parts.length - 1];
}

function isOwner(interaction, targetUserId) {
  return interaction.user.id === targetUserId;
}

export async function route(interaction) {
  const customId = interaction.customId;
  const userId = extractUserId(customId);

  if (!isOwner(interaction, userId)) {
    return interaction.reply({ content: 'This is not your session.', ephemeral: true });
  }

  logger.interaction(interaction.isButton() ? 'button' : 'select', customId, interaction.user.username);

  try {
    if (customId.startsWith('reg_start_')) return reg.start(interaction, userId, 'main');
    if (customId.startsWith('reg_region_')) return reg.handleRegion(interaction, userId);
    if (customId.startsWith('reg_country_')) return reg.handleCountry(interaction, userId);
    if (customId.startsWith('reg_timezone_')) return reg.handleTimezone(interaction, userId);
    if (customId.startsWith('reg_class_')) return reg.handleClass(interaction, userId);
    if (customId.startsWith('reg_subclass_')) return reg.handleSubclass(interaction, userId);
    if (customId.startsWith('reg_score_')) return reg.handleScore(interaction, userId);
    if (customId.startsWith('reg_bi_')) return reg.handleBattleImagine(interaction, userId);
    if (customId.startsWith('reg_guild_')) return reg.handleGuild(interaction, userId);

    if (customId.startsWith('back_profile_')) return edit.backToProfile(interaction, userId);
    if (customId.startsWith('back_region_')) return reg.backToRegion(interaction, userId);
    if (customId.startsWith('back_country_')) return reg.backToCountry(interaction, userId);
    if (customId.startsWith('back_timezone_')) return reg.backToTimezone(interaction, userId);
    if (customId.startsWith('back_class_')) return reg.backToClass(interaction, userId);
    if (customId.startsWith('back_subclass_')) return reg.backToSubclass(interaction, userId);
    if (customId.startsWith('back_score_')) return reg.backToScore(interaction, userId);
    if (customId.startsWith('back_bi_')) return reg.backToBattleImagine(interaction, userId);
    if (customId.startsWith('retry_ign_')) return reg.retryIGN(interaction, userId);

    if (customId.startsWith('add_type_')) return edit.handleAddType(interaction, userId);
    if (customId.startsWith('add_')) return edit.showAddMenu(interaction, userId);
    if (customId.startsWith('parent_')) return edit.handleParentSelect(interaction, userId);

    if (customId.startsWith('edit_type_back_')) return edit.backToEditType(interaction, userId);
    if (customId.startsWith('edit_type_')) return edit.handleEditType(interaction, userId);
    if (customId.startsWith('edit_char_')) return edit.handleEditCharSelect(interaction, userId);
    if (customId.startsWith('edit_field_back_')) return edit.backToFieldSelect(interaction, userId);
    if (customId.startsWith('edit_field_')) return edit.handleFieldSelect(interaction, userId);
    if (customId.startsWith('edit_class_back_')) return edit.backToClassSelect(interaction, userId);
    if (customId.startsWith('edit_')) return edit.showEditMenu(interaction, userId);

    if (customId.startsWith('remove_type_')) return edit.handleRemoveType(interaction, userId);
    if (customId.startsWith('remove_char_')) return edit.handleRemoveCharSelect(interaction, userId);
    if (customId.startsWith('remove_')) return edit.showRemoveMenu(interaction, userId);

    if (customId.startsWith('confirm_deleteall_')) return edit.confirmDeleteAll(interaction, userId);
    if (customId.startsWith('confirm_delete_')) return edit.confirmDelete(interaction, userId);
    if (customId.startsWith('cancel_')) return edit.cancelAction(interaction, userId);

    logger.warning('Router', `Unknown customId: ${customId}`);
  } catch (e) {
    logger.error('Router', `Failed handling ${customId}`, e);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Something went wrong.', ephemeral: true });
    }
  }
}

export async function routeSelectMenu(interaction) {
  const customId = interaction.customId;
  const userId = extractUserId(customId);

  if (!isOwner(interaction, userId)) {
    return interaction.reply({ content: 'This is not your session.', ephemeral: true });
  }

  logger.interaction('select', customId, interaction.user.username);

  try {
    if (customId.startsWith('reg_class_')) {
      if (interaction.message.components.some(r => 
        r.components.some(c => c.customId?.startsWith('edit_field_')))) {
        return edit.handleEditClass(interaction, userId);
      }
      return reg.handleClass(interaction, userId);
    }

    if (customId.startsWith('reg_subclass_')) {
      const s = require('../services/state.js').default.get(userId, 'edit');
      if (s?.field === 'class') {
        return edit.handleEditSubclass(interaction, userId);
      }
      return reg.handleSubclass(interaction, userId);
    }

    if (customId.startsWith('reg_score_')) {
      const s = require('../services/state.js').default.get(userId, 'edit');
      if (s?.field === 'score') {
        return edit.handleEditScore(interaction, userId);
      }
      return reg.handleScore(interaction, userId);
    }

    if (customId.startsWith('reg_guild_')) {
      const s = require('../services/state.js').default.get(userId, 'edit');
      if (s?.field === 'guild') {
        return edit.handleEditGuild(interaction, userId);
      }
      return reg.handleGuild(interaction, userId);
    }

    return route(interaction);
  } catch (e) {
    logger.error('Router', `Failed handling select ${customId}`, e);
  }
}

export async function routeModal(interaction) {
  const customId = interaction.customId;
  const userId = extractUserId(customId);

  logger.interaction('modal', customId, interaction.user.username);

  try {
    if (customId.startsWith('reg_ign_')) {
      return reg.handleIGN(interaction, userId);
    }

    if (customId.startsWith('edit_ign_')) {
      return edit.handleEditModal(interaction, userId, 'ign');
    }

    if (customId.startsWith('edit_uid_')) {
      return edit.handleEditModal(interaction, userId, 'uid');
    }
  } catch (e) {
    logger.error('Router', `Failed handling modal ${customId}`, e);
  }
}
