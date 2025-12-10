import logger from '../utils/logger.js';
import * as registration from './registration.js';
import * as editing from './editing.js';
import { buildCharacterProfileEmbed } from '../components/embeds/characterProfile.js';
import { buildCharacterButtons } from '../components/buttons/characterButtons.js';
import db from '../services/database.js';
import { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } from 'discord.js';

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
    else if (customId.startsWith('edit_main_') || customId.startsWith('edit_character_')) {
      console.log('-> Calling editing.handleEditMain');
      await editing.handleEditMain(interaction, userId);
    }
    else if (customId.startsWith('add_character_')) {
      console.log('-> Showing add character menu');
      await handleAddCharacterMenu(interaction, userId);
    }
    else if (customId.startsWith('add_alt_')) {
      console.log('-> Calling editing.handleAddAlt');
      await editing.handleAddAlt(interaction, userId);
    }
    else if (customId.startsWith('add_subclass_')) {
      console.log('-> Calling editing.handleAddSubclass');
      await editing.handleAddSubclass(interaction, userId);
    }
    else if (customId.startsWith('remove_main_') || customId.startsWith('remove_character_')) {
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
      console.log('-> Refreshing profile as fallback');
      await handleBackToProfile(interaction, userId);
    }
    
    console.log('=== BUTTON SUCCESS ===');
  } catch (error) {
    console.error('=== BUTTON ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
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

async function handleAddCharacterMenu(interaction, userId) {
  const mainChar = await db.getMainCharacter(userId);
  
  if (!mainChar) {
    await registration.handleRegisterMain(interaction, userId);
    return;
  }

  const characters = await db.getAllCharactersWithSubclasses(userId);
  const alts = characters.filter(c => c.character_type === 'alt');
  const mainSubclasses = characters.filter(c => c.character_type === 'main_subclass');
  
  const options = [];
  
  if (alts.length < 3) {
    options.push({
      label: 'Alt Character',
      value: 'add_alt',
      description: `Add an alternate character (${alts.length}/3)`,
      emoji: '🎭'
    });
  }
  
  if (mainSubclasses.length < 3) {
    options.push({
      label: 'Subclass',
      value: 'add_subclass',
      description: `Add a subclass for your main (${mainSubclasses.length}/3)`,
      emoji: '📊'
    });
  }
  
  if (options.length === 0) {
    await interaction.update({
      content: '❌ You have reached the maximum (3 alts and 3 subclasses).',
      components: []
    });
    return;
  }
  
  const embed = new EmbedBuilder()
    .setColor('#EC4899')
    .setDescription(`# **Add Character**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nWhat would you like to add?`);
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`add_character_type_${userId}`)
    .setPlaceholder('Choose what to add')
    .addOptions(options);
  
  const row = new ActionRowBuilder().addComponents(selectMenu);
  
  await interaction.update({
    embeds: [embed],
    components: [row]
  });
}

export async function handleSelectMenuInteraction(interaction) {
  const customId = interaction.customId;
  const userId = customId.split('_').pop();

  console.log('=== SELECT MENU INTERACTION ===');
  console.log('Custom ID:', customId);
  console.log('Selected:', interaction.values);

  try {
    // Registration handlers
    if (customId.startsWith('select_region_')) {
      await registration.handleRegionSelect(interaction, userId);
    }
    else if (customId.startsWith('select_country_')) {
      await registration.handleCountrySelect(interaction, userId);
    }
    else if (customId.startsWith('select_timezone_')) {
      await registration.handleTimezoneSelect(interaction, userId);
    }
    else if (customId.startsWith('select_class_')) {
      await registration.handleClassSelect(interaction, userId);
    }
    else if (customId.startsWith('select_subclass_')) {
      await registration.handleSubclassSelect(interaction, userId);
    }
    else if (customId.startsWith('select_ability_score_')) {
      await registration.handleAbilityScoreSelect(interaction, userId);
    }
    else if (customId.startsWith('select_guild_')) {
      await registration.handleGuildSelect(interaction, userId);
    }
    else if (customId.startsWith('add_character_type_')) {
      const selected = interaction.values[0];
      if (selected === 'add_alt') {
        await editing.handleAddAlt(interaction, userId);
      } else if (selected === 'add_subclass') {
        await editing.handleAddSubclass(interaction, userId);
      }
    }
    
    // Editing handlers
    else if (customId.startsWith('edit_main_option_')) {
      await handleEditMainOption(interaction, userId);
    }
    else if (customId.startsWith('edit_class_select_')) {
      await editing.handleEditClassSelect(interaction, userId);
    }
    else if (customId.startsWith('edit_subclass_select_')) {
      await editing.handleEditSubclassSelect(interaction, userId);
    }
    else if (customId.startsWith('edit_score_select_')) {
      await editing.handleEditScoreSelect(interaction, userId);
    }
    else if (customId.startsWith('edit_guild_select_')) {
      await editing.handleEditGuildSelect(interaction, userId);
    }
    else if (customId.startsWith('select_parent_for_subclass_')) {
      await editing.handleSelectParentForSubclass(interaction, userId);
    }
    else if (customId.startsWith('select_alt_to_remove_')) {
      await handleSelectAltToRemove(interaction, userId);
    }
    else if (customId.startsWith('select_subclass_to_remove_')) {
      await handleSelectSubclassToRemove(interaction, userId);
    }
    else if (customId.startsWith('select_alt_to_swap_')) {
      await editing.handleAltSwapSelect(interaction, userId);
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

  try {
    if (customId.startsWith('ign_modal_')) {
      await registration.handleIGNModal(interaction, userId);
    }
    else if (customId.startsWith('edit_ign_modal_')) {
      await editing.handleEditIGNModal(interaction, userId);
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
