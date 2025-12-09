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
  } catch (error) {
    logger.error(`Button error: ${error.message}`);
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
  }
}

export async function handleSelectMenuInteraction(interaction) {
  const customId = interaction.customId;
  const userId = customId.split('_').pop();

  try {
    if (customId.startsWith('select_class_')) await registration.handleClassSelect(interaction, userId);
    else if (customId.startsWith('select_subclass_')) await registration.handleSubclassSelect(interaction, userId);
    else if (customId.startsWith('select_ability_score_')) await registration.handleAbilityScoreSelect(interaction, userId);
    else if (customId.startsWith('select_guild_')) await registration.handleGuildSelect(interaction, userId);
    else if (customId.startsWith('edit_main_option_')) await handleEditMainOption(interaction, userId);
    else if (customId.startsWith('select_parent_for_subclass_')) await handleSelectParentForSubclass(interaction, userId);
    else if (customId.startsWith('select_alt_to_remove_')) await handleSelectAltToRemove(interaction, userId);
    else if (customId.startsWith('select_subclass_to_remove_')) await handleSelectSubclassToRemove(interaction, userId);
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
  const embed = await buildCharacterProfileEmbed(targetUser, characters);
  const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);
  await interaction.update({ embeds: [embed], components: buttons });
}

async function handleEditMainOption(interaction, userId) {
  logger.log('Edit main option - implement');
  await interaction.reply({ content: '✏️ Coming soon!', ephemeral: true });
}

async function handleSelectParentForSubclass(interaction, userId) {
  const selected = interaction.values[0];
  const [type, id] = selected.split('_');
  logger.log(`Subclass parent: ${type} ${id}`);
  await interaction.reply({ content: '📊 Coming soon!', ephemeral: true });
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
