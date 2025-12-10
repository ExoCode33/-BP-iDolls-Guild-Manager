import logger from '../utils/logger.js';
import * as registration from './registration.js';
import * as editing from './editing.js';
import { buildCharacterProfileEmbed } from '../components/embeds/characterProfile.js';
import { buildCharacterButtons } from '../components/buttons/characterButtons.js';
import db from '../services/database.js';

export async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;
  const userId = customId.split('_').pop();

  console.log('=== BUTTON INTERACTION ===');
  console.log('Custom ID:', customId);
  console.log('User ID:', userId);

  try {
    if (customId.startsWith('register_main_')) {
      console.log('-> Calling registration.handleRegisterMain');
      await registration.handleRegisterMain(interaction, userId);
    }
    else if (customId.startsWith('edit_main_')) {
      console.log('-> Calling editing.handleEditMain');
      await editing.handleEditMain(interaction, userId);
    }
    else if (customId.startsWith('add_alt_')) {
      console.log('-> Calling editing.handleAddAlt');
      await editing.handleAddAlt(interaction, userId);
    }
    else if (customId.startsWith('add_subclass_')) {
      console.log('-> Calling editing.handleAddSubclass');
      await editing.handleAddSubclass(interaction, userId);
    }
    else if (customId.startsWith('remove_main_')) {
      console.log('-> Calling editing.handleRemoveMain');
      await editing.handleRemoveMain(interaction, userId);
    }
    else if (customId.startsWith('remove_alt_')) {
      console.log('-> Calling editing.handleRemoveAlt');
      await editing.handleRemoveAlt(interaction, userId);
    }
    else if (customId.startsWith('remove_subclass_')) {
      console.log('-> Calling editing.handleRemoveSubclass');
      await editing.handleRemoveSubclass(interaction, userId);
    }
    else if (customId.startsWith('confirm_remove_')) {
      console.log('-> Calling editing.handleConfirmRemove');
      await editing.handleConfirmRemove(interaction, userId);
    }
    else if (customId.startsWith('cancel_remove_')) {
      console.log('-> Calling editing.handleCancelRemove');
      await editing.handleCancelRemove(interaction, userId);
    }
    else if (customId.startsWith('back_to_profile_')) {
      console.log('-> Calling handleBackToProfile');
      await handleBackToProfile(interaction, userId);
    }
    else if (customId.startsWith('back_to_edit_menu_')) {
      console.log('-> Calling editing.handleBackToEditMenu');
      await editing.handleBackToEditMenu(interaction, userId);
    }
    else {
      console.log('-> Unknown button:', customId);
    }
    
    console.log('=== BUTTON SUCCESS ===');
  } catch (error) {
    console.error('=== BUTTON ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('Interaction replied?', interaction.replied);
    console.error('Interaction deferred?', interaction.deferred);
    
    await logger.logInteractionError(`Button: ${customId}`, userId, error, interaction);
    
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Something went wrong!', ephemeral: true });
      } else if (interaction.deferred) {
        await interaction.editReply({ content: '❌ Something went wrong!' });
      }
    } catch (replyError) {
      console.error('Failed to send error reply:', replyError.message);
    }
  }
}

export async function handleSelectMenuInteraction(interaction) {
  const customId = interaction.customId;
  const userId = customId.split('_').pop();

  console.log('=== SELECT MENU INTERACTION ===');
  console.log('Custom ID:', customId);
  console.log('User ID:', userId);
  console.log('Selected:', interaction.values);

  try {
    // Registration handlers
    if (customId.startsWith('select_region_')) {
      console.log('-> Calling registration.handleRegionSelect');
      await registration.handleRegionSelect(interaction, userId);
    }
    else if (customId.startsWith('select_country_')) {
      console.log('-> Calling registration.handleCountrySelect');
      await registration.handleCountrySelect(interaction, userId);
    }
    else if (customId.startsWith('select_timezone_')) {
      console.log('-> Calling registration.handleTimezoneSelect');
      await registration.handleTimezoneSelect(interaction, userId);
    }
    else if (customId.startsWith('select_class_')) {
      console.log('-> Calling registration.handleClassSelect');
      await registration.handleClassSelect(interaction, userId);
    }
    else if (customId.startsWith('select_subclass_')) {
      console.log('-> Calling registration.handleSubclassSelect');
      await registration.handleSubclassSelect(interaction, userId);
    }
    else if (customId.startsWith('select_ability_score_')) {
      console.log('-> Calling registration.handleAbilityScoreSelect');
      await registration.handleAbilityScoreSelect(interaction, userId);
    }
    else if (customId.startsWith('select_guild_')) {
      console.log('-> Calling registration.handleGuildSelect');
      await registration.handleGuildSelect(interaction, userId);
    }
    
    // Editing handlers
    else if (customId.startsWith('edit_main_option_')) {
      console.log('-> Calling handleEditMainOption');
      await handleEditMainOption(interaction, userId);
    }
    else if (customId.startsWith('edit_class_select_')) {
      console.log('-> Calling editing.handleEditClassSelect');
      await editing.handleEditClassSelect(interaction, userId);
    }
    else if (customId.startsWith('edit_subclass_select_')) {
      console.log('-> Calling editing.handleEditSubclassSelect');
      await editing.handleEditSubclassSelect(interaction, userId);
    }
    else if (customId.startsWith('edit_score_select_')) {
      console.log('-> Calling editing.handleEditScoreSelect');
      await editing.handleEditScoreSelect(interaction, userId);
    }
    else if (customId.startsWith('edit_guild_select_')) {
      console.log('-> Calling editing.handleEditGuildSelect');
      await editing.handleEditGuildSelect(interaction, userId);
    }
    else if (customId.startsWith('select_parent_for_subclass_')) {
      console.log('-> Calling editing.handleSelectParentForSubclass');
      await editing.handleSelectParentForSubclass(interaction, userId);
    }
    else if (customId.startsWith('select_alt_to_remove_')) {
      console.log('-> Calling handleSelectAltToRemove');
      await handleSelectAltToRemove(interaction, userId);
    }
    else if (customId.startsWith('select_subclass_to_remove_')) {
      console.log('-> Calling handleSelectSubclassToRemove');
      await handleSelectSubclassToRemove(interaction, userId);
    }
    else if (customId.startsWith('select_alt_to_swap_')) {
      console.log('-> Calling editing.handleAltSwapSelect');
      await editing.handleAltSwapSelect(interaction, userId);
    }
    else {
      console.log('-> Unknown select menu:', customId);
    }
    
    console.log('=== SELECT MENU SUCCESS ===');
  } catch (error) {
    console.error('=== SELECT MENU ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    await logger.logInteractionError(`SelectMenu: ${customId}`, userId, error, interaction);
    
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Something went wrong!', ephemeral: true });
      }
    } catch (replyError) {
      console.error('Failed to send error reply:', replyError.message);
    }
  }
}

export async function handleModalSubmit(interaction) {
  const customId = interaction.customId;
  const userId = customId.split('_').pop();

  console.log('=== MODAL SUBMIT ===');
  console.log('Custom ID:', customId);
  console.log('User ID:', userId);

  try {
    if (customId.startsWith('ign_modal_')) {
      console.log('-> Calling registration.handleIGNModal');
      await registration.handleIGNModal(interaction, userId);
    }
    else if (customId.startsWith('edit_ign_modal_')) {
      console.log('-> Calling editing.handleEditIGNModal');
      await editing.handleEditIGNModal(interaction, userId);
    }
    else {
      console.log('-> Unknown modal:', customId);
    }
    
    console.log('=== MODAL SUCCESS ===');
  } catch (error) {
    console.error('=== MODAL ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    await logger.logInteractionError(`Modal: ${customId}`, userId, error, interaction);
    
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Something went wrong!', ephemeral: true });
      }
    } catch (replyError) {
      console.error('Failed to send error reply:', replyError.message);
    }
  }
}

async function handleBackToProfile(interaction, userId) {
  console.log('  -> handleBackToProfile called');
  const characters = await db.getAllCharactersWithSubclasses(userId);
  const mainChar = characters.find(c => c.character_type === 'main');
  const alts = characters.filter(c => c.character_type === 'alt');
  const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
  const targetUser = await interaction.client.users.fetch(userId);
  const embed = await buildCharacterProfileEmbed(targetUser, characters, interaction);
  const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);
  await interaction.update({ embeds: [embed], components: buttons });
  console.log('  -> handleBackToProfile done');
}

async function handleEditMainOption(interaction, userId) {
  console.log('  -> handleEditMainOption called');
  const option = interaction.values[0];
  console.log('  -> Selected option:', option);
  await editing.handleEditMainOption(interaction, userId, option);
  console.log('  -> handleEditMainOption done');
}

async function handleSelectAltToRemove(interaction, userId) {
  console.log('  -> handleSelectAltToRemove called');
  const characterId = parseInt(interaction.values[0]);
  const stateManager = (await import('../utils/stateManager.js')).default;
  const state = stateManager.getRemovalState(userId);
  if (state) {
    state.characterId = characterId;
    stateManager.setRemovalState(userId, state);
  }
  await editing.handleConfirmRemove(interaction, userId);
  console.log('  -> handleSelectAltToRemove done');
}

async function handleSelectSubclassToRemove(interaction, userId) {
  console.log('  -> handleSelectSubclassToRemove called');
  const characterId = parseInt(interaction.values[0]);
  const stateManager = (await import('../utils/stateManager.js')).default;
  const state = stateManager.getRemovalState(userId);
  if (state) {
    state.characterId = characterId;
    stateManager.setRemovalState(userId, state);
  }
  await editing.handleConfirmRemove(interaction, userId);
  console.log('  -> handleSelectSubclassToRemove done');
}

export default { handleButtonInteraction, handleSelectMenuInteraction, handleModalSubmit };
