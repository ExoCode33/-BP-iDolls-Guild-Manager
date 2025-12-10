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
    // Registration buttons
    if (customId.startsWith('register_main_')) {
      console.log('-> Calling registration.handleRegisterMain');
      await registration.handleRegisterMain(interaction, userId);
    }
    // Registration back buttons
    else if (customId.startsWith('back_to_region_')) {
      console.log('-> Back to region selection');
      await registration.handleBackToRegion(interaction, userId);
    }
    else if (customId.startsWith('back_to_country_')) {
      console.log('-> Back to country selection');
      await registration.handleBackToCountry(interaction, userId);
    }
    else if (customId.startsWith('back_to_timezone_')) {
      console.log('-> Back to timezone selection');
      await registration.handleBackToTimezone(interaction, userId);
    }
    else if (customId.startsWith('back_to_class_')) {
      console.log('-> Back to class selection');
      await registration.handleBackToClass(interaction, userId);
    }
    else if (customId.startsWith('back_to_subclass_')) {
      console.log('-> Back to subclass selection');
      await registration.handleBackToSubclass(interaction, userId);
    }
    else if (customId.startsWith('back_to_ability_score_')) {
      console.log('-> Back to ability score selection');
      await registration.handleBackToAbilityScore(interaction, userId);
    }
    // Edit buttons
    else if (customId.startsWith('edit_character_')) {
      console.log('-> Calling editing.handleEditCharacter');
      await editing.handleEditCharacter(interaction, userId);
    }
    // Add character
    else if (customId.startsWith('add_character_')) {
      console.log('-> Showing add character menu');
      await handleAddCharacterMenu(interaction, userId);
    }
    // Remove character
    else if (customId.startsWith('remove_character_')) {
      console.log('-> Calling editing.handleRemoveCharacter');
      await editing.handleRemoveCharacter(interaction, userId);
    }
    else if (customId.startsWith('confirm_remove_')) {
      console.log('-> Calling editing.handleConfirmRemove');
      await editing.handleConfirmRemove(interaction, userId);
    }
    else if (customId.startsWith('cancel_remove_')) {
      console.log('-> Calling editing.handleCancelRemove');
      await editing.handleCancelRemove(interaction, userId);
    }
    // Navigation back buttons
    else if (customId.startsWith('back_to_profile_')) {
      console.log('-> Calling handleBackToProfile');
      await handleBackToProfile(interaction, userId);
    }
    else if (customId.startsWith('back_to_edit_choice_')) {
      console.log('-> Calling editing.handleEditCharacter');
      await editing.handleEditCharacter(interaction, userId);
    }
    else if (customId.startsWith('back_to_edit_alt_choice_')) {
      console.log('-> Calling editing.handleEditAltChoice');
      await editing.handleEditAltChoice(interaction, userId);
    }
    else if (customId.startsWith('back_to_edit_subclass_choice_')) {
      console.log('-> Calling editing.handleEditSubclassChoice');
      await editing.handleEditSubclassChoice(interaction, userId);
    }
    else if (customId.startsWith('back_to_remove_choice_')) {
      console.log('-> Calling editing.handleRemoveCharacter');
      await editing.handleRemoveCharacter(interaction, userId);
    }
    else if (customId.startsWith('back_to_current_edit_')) {
      console.log('-> Back to current edit menu');
      const stateManager = (await import('../utils/stateManager.js')).default;
      const state = stateManager.getUpdateState(userId);
      if (state) {
        if (state.type === 'main') {
          await editing.handleEditMain(interaction, userId);
        } else if (state.type === 'alt') {
          await editing.handleEditAlt(interaction, userId, state.characterId);
        } else if (state.type === 'subclass') {
          await editing.handleEditSubclass(interaction, userId, state.characterId);
        }
      }
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
  const allSubclasses = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
  
  const options = [];
  
  if (alts.length < 3) {
    options.push({
      label: 'Alt Character',
      value: 'add_alt',
      description: `Add an alternate character (${alts.length}/3)`,
      emoji: '🎭'
    });
  }
  
  if (allSubclasses.length < 3) {
    options.push({
      label: 'Subclass',
      value: 'add_subclass',
      description: `Add a subclass (${allSubclasses.length}/3 total)`,
      emoji: '📊'
    });
  }
  
  if (options.length === 0) {
    await interaction.update({
      content: '❌ You have reached the maximum (3 alts and 3 total subclasses).',
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
    
    // Add character type selection
    else if (customId.startsWith('add_character_type_')) {
      const selected = interaction.values[0];
      if (selected === 'add_alt') {
        await editing.handleAddAlt(interaction, userId);
      } else if (selected === 'add_subclass') {
        await editing.handleAddSubclass(interaction, userId);
      }
    }
    
    // Edit character type selection (STEP 1)
    else if (customId.startsWith('edit_char_type_')) {
      const selected = interaction.values[0];
      if (selected === 'edit_main') {
        await editing.handleEditMain(interaction, userId);
      } else if (selected === 'edit_alt') {
        await editing.handleEditAltChoice(interaction, userId);
      } else if (selected === 'edit_subclass') {
        await editing.handleEditSubclassChoice(interaction, userId);
      }
    }
    
    // Select specific alt to edit (STEP 2)
    else if (customId.startsWith('select_alt_to_edit_')) {
      const altId = parseInt(interaction.values[0]);
      await editing.handleEditAlt(interaction, userId, altId);
    }
    
    // Select specific subclass to edit (STEP 2)
    else if (customId.startsWith('select_subclass_to_edit_')) {
      const subclassId = parseInt(interaction.values[0]);
      await editing.handleEditSubclass(interaction, userId, subclassId);
    }
    
    // Edit option for main character (STEP 2/3)
    else if (customId.startsWith('edit_main_option_')) {
      const option = interaction.values[0];
      await editing.handleEditOption(interaction, userId, option);
    }
    
    // Edit option for alt character (STEP 3)
    else if (customId.startsWith('edit_alt_option_')) {
      const option = interaction.values[0];
      await editing.handleEditOption(interaction, userId, option);
    }
    
    // Edit option for subclass (STEP 3)
    else if (customId.startsWith('edit_subclass_option_')) {
      const option = interaction.values[0];
      await editing.handleEditOption(interaction, userId, option);
    }
    
    // Class and subclass editing
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
    
    // Subclass parent selection
    else if (customId.startsWith('select_parent_for_subclass_')) {
      await editing.handleSelectParentForSubclass(interaction, userId);
    }
    
    // Remove character type selection (STEP 1)
    else if (customId.startsWith('remove_char_type_')) {
      const selected = interaction.values[0];
      if (selected === 'remove_main') {
        await editing.handleRemoveMain(interaction, userId);
      } else if (selected === 'remove_alt') {
        await editing.handleRemoveAltChoice(interaction, userId);
      } else if (selected === 'remove_subclass') {
        await editing.handleRemoveSubclassChoice(interaction, userId);
      }
    }
    
    // Select specific alt to remove (STEP 2)
    else if (customId.startsWith('select_alt_to_remove_')) {
      await handleSelectAltToRemove(interaction, userId);
    }
    
    // Select specific subclass to remove (STEP 2)
    else if (customId.startsWith('select_subclass_to_remove_')) {
      await handleSelectSubclassToRemove(interaction, userId);
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
    else if (customId.startsWith('edit_uid_modal_')) {
      await editing.handleEditUIDModal(interaction, userId);
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
  const stateManager = (await import('../utils/stateManager.js')).default;
  stateManager.clearRegistrationState(userId);
  stateManager.clearUpdateState(userId);
  stateManager.clearRemovalState(userId);
  
  const characters = await db.getAllCharactersWithSubclasses(userId);
  const mainChar = characters.find(c => c.character_type === 'main');
  const alts = characters.filter(c => c.character_type === 'alt');
  const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
  const targetUser = await interaction.client.users.fetch(userId);
  const embed = await buildCharacterProfileEmbed(targetUser, characters, interaction);
  const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);
  await interaction.update({ embeds: [embed], components: buttons });
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
