import logger from '../utils/logger.js';
import * as registration from './registration.js';
import * as editing from './editing.js';
import { buildCharacterProfileEmbed } from '../components/embeds/characterProfile.js';
import { buildCharacterButtons } from '../components/buttons/characterButtons.js';
import db from '../services/database.js';

export async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;
  const userId = customId.split('_').pop();

  try {
    if (customId.startsWith('register_main_')) await registration.handleRegisterMain(interaction, userId);
    else if (customId.startsWith('edit_main_')) await editing.handleEditMain(interaction, userId);
    else if (customId.startsWith('add_alt_')) await editing.handleAddAlt(interaction, userId);
    else if (customId.startsWith('add_subclass_')) await editing.handleAddSubclass(interaction, userId);
    else if (customId.startsWith('remove_main_')) await editing.handleRemoveMain(interaction, userId);
    else if (customId.startsWith('remove_alt_')) await editing.handleRemoveAlt(interaction, userId);
    else if (customId.startsWith('remove_subclass_')) await editing.handleRemoveSubclass(interaction, userId);
    else if (customId.startsWith('confirm_remove_')) await editing.handleConfirmRemove(interaction, userId);
    else if (customId.startsWith('cancel_remove_')) await editing.handleCancelRemove(interaction, userId);
    else if (customId.startsWith('back_to_profile_')) await handleBackToProfile(interaction, userId);
    else if (customId.startsWith('back_to_edit_menu_')) await editing.handleBackToEditMenu(interaction, userId);
  } catch (error) {
    logger.error(`Button error: ${error.message}`);
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
  }
}

export async function handleSelectMenuInteraction(interaction) {
  const customId = interaction.customId;
  const userId = customId.split('_').pop();

  try {
    // Registration handlers
    if (customId.startsWith('select_region_')) await registration.handleRegionSelect(interaction, userId);
    else if (customId.startsWith('select_country_')) await registration.handleCountrySelect(interaction, userId);
    else if (customId.startsWith('select_timezone_')) await registration.handleTimezoneSelect(interaction, userId);
    else if (customId.startsWith('select_class_')) await registration.handleClassSelect(interaction, userId);
    else if (customId.startsWith('select_subclass_')) await registration.handleSubclassSelect(interaction, userId);
    else if (customId.startsWith('select_ability_score_')) await registration.handleAbilityScoreSelect(interaction, userId);
    else if (customId.startsWith('select_guild_')) await registration.handleGuildSelect(interaction, userId);
    
    // Editing handlers
    else if (customId.startsWith('edit_main_option_')) await handleEditMainOption(interaction, userId);
    else if (customId.startsWith('edit_class_select_')) await editing.handleEditClassSelect(interaction, userId);
    else if (customId.startsWith('edit_subclass_select_')) await editing.handleEditSubclassSelect(interaction, userId);
    else if (customId.startsWith('edit_score_select_')) await editing.handleEditScoreSelect(interaction, userId);
    else if (customId.startsWith('edit_guild_select_')) await editing.handleEditGuildSelect(interaction, userId);
    else if (customId.startsWith('select_parent_for_subclass_')) await editing.handleSelectParentForSubclass(interaction, userId);
    else if (customId.startsWith('select_alt_to_remove_')) await handleSelectAltToRemove(interaction, userId);
    else if (customId.startsWith('select_subclass_to_remove_')) await handleSelectSubclassToRemove(interaction, userId);
    else if (customId.startsWith('select_alt_to_swap_')) await editing.handleAltSwapSelect(interaction, userId);
  } catch (error) {
    logger.error(`Select menu error: ${error.message}`);
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
  }
}

export async function handleModalSubmit(interaction) {
  const customId = interaction.customId;
  const userId = customId.split('_').pop();

  try {
    if (customId.startsWith('ign_modal_')) await registration.handleIGNModal(interaction, userId);
    else if (customId.startsWith('edit_ign_modal_')) await editing.handleEditIGNModal(interaction, userId);
  } catch (error) {
    logger.error(`Modal error: ${error.message}`);
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
  }
}

async function handleBackToProfile(interaction, userId) {
  const characters = await db.getAllCharactersWithSubclasses(userId);
  const mainChar = characters.find(c => c.character_type === 'main');
  const alts = characters.filter(c => c.character_type === 'alt');
  const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
  const targetUser = await interaction.client.users.fetch(userId);
  const embed = await buildCharacterProfileEmbed(targetUser, characters, interaction);
  const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);
  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleEditMainOption(interaction, userId) {
  const option = interaction.values[0];
  await editing.handleEditMainOption(interaction, userId, option);
}

async function handleSelectAltToRemove(interaction, userId) {
  const characterId = parseInt(interaction.values[0]);
  const stateManager = (await import('../utils/stateManager.js')).default;
  const state = stateManager.getRemovalState(userId);
  if (state) {
    state.characterId = characterId;
    stateManager.setRemovalState(userId, state);
  }
  await editing.handleConfirmRemove(interaction, userId);
}

async function handleSelectSubclassToRemove(interaction, userId) {
  const characterId = parseInt(interaction.values[0]);
  const stateManager = (await import('../utils/stateManager.js')).default;
  const state = stateManager.getRemovalState(userId);
  if (state) {
    state.characterId = characterId;
    stateManager.setRemovalState(userId, state);
  }
  await editing.handleConfirmRemove(interaction, userId);
}

export default { handleButtonInteraction, handleSelectMenuInteraction, handleModalSubmit };
