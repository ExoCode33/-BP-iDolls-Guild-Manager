import logger from '../utils/logger.js';
import * as registration from './registration.js';
import * as editing from './editing.js';
import { buildCharacterProfileEmbed } from '../components/embeds/characterProfile.js';
import { buildCharacterButtons, buildAddCharacterMenu, buildEditCharacterMenu, buildRemoveCharacterMenu } from '../components/buttons/characterButtons.js';
import db from '../services/database.js';
import { EmbedBuilder } from 'discord.js';

export async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;
  const userId = customId.split('_').pop();

  try {
    if (customId.startsWith('register_main_')) {
      await registration.handleRegisterMain(interaction, userId);
    } 
    else if (customId.startsWith('add_character_')) {
      await handleAddCharacterButton(interaction, userId);
    }
    else if (customId.startsWith('edit_character_')) {
      await handleEditCharacterButton(interaction, userId);
    }
    else if (customId.startsWith('remove_character_')) {
      await handleRemoveCharacterButton(interaction, userId);
    }
    else if (customId.startsWith('confirm_remove_main_')) {
      await editing.handleConfirmRemove(interaction, userId);
    }
    else if (customId.startsWith('cancel_remove_main_')) {
      await editing.handleCancelRemove(interaction, userId);
    }
    else if (customId.startsWith('confirm_remove_')) {
      await editing.handleConfirmRemove(interaction, userId);
    }
    else if (customId.startsWith('cancel_remove_')) {
      await editing.handleCancelRemove(interaction, userId);
    }
    else if (customId.startsWith('back_to_profile_')) {
      await handleBackToProfile(interaction, userId);
    }
  } catch (error) {
    logger.error(`Button error: ${error.message}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
    }
  }
}

export async function handleSelectMenuInteraction(interaction) {
  const customId = interaction.customId;
  const userId = customId.split('_').pop();

  try {
    if (customId.startsWith('select_region_')) {
      await registration.handleRegionSelect(interaction, userId);
    }
    else if (customId.startsWith('select_country_')) {
      await registration.handleCountrySelect(interaction, userId);
    }
    else if (customId.startsWith('select_timezone_')) {
      await registration.handleTimezoneSelect(interaction, userId);
    }
    else if (customId.startsWith('select_guild_')) {
      await registration.handleGuildSelect(interaction, userId);
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
    else if (customId.startsWith('add_character_select_')) {
      await handleAddCharacterSelect(interaction, userId);
    }
    else if (customId.startsWith('edit_character_select_')) {
      await handleEditCharacterSelect(interaction, userId);
    }
    else if (customId.startsWith('remove_character_select_')) {
      await handleRemoveCharacterSelect(interaction, userId);
    }
    else if (customId.startsWith('edit_main_option_')) {
      await handleEditMainOption(interaction, userId);
    }
    else if (customId.startsWith('select_alt_to_swap_')) {
      await handleAltSwapSelect(interaction, userId);
    }
  } catch (error) {
    logger.error(`Select menu error: ${error.message}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
    }
  }
}

export async function handleModalSubmit(interaction) {
  const customId = interaction.customId;
  const userId = customId.split('_').pop();

  try {
    if (customId.startsWith('ign_modal_')) {
      await registration.handleIGNModal(interaction, userId);
    }
  } catch (error) {
    logger.error(`Modal error: ${error.message}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
    }
  }
}

// Handler functions

async function handleAddCharacterButton(interaction, userId) {
  const allChars = await db.getAllCharactersWithSubclasses(userId);
  const subclasses = allChars.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
  
  const menuRows = buildAddCharacterMenu(userId, subclasses.length);
  
  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('➕ Add Character')
    .setDescription('Choose what type of character to add:')
    .addFields(
      { name: '🎭 Alt Character', value: 'Add an alternate character with its own IGN and guild', inline: false },
      { name: '🔄 Subclass', value: `Add a subclass to an existing character (${subclasses.length}/3 used)`, inline: false }
    )
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: menuRows });
}

async function handleEditCharacterButton(interaction, userId) {
  const allChars = await db.getAllCharactersWithSubclasses(userId);
  const mainChar = allChars.find(c => c.character_type === 'main');
  const alts = allChars.filter(c => c.character_type === 'alt');
  const subclasses = allChars.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
  
  if (!mainChar && alts.length === 0 && subclasses.length === 0) {
    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('⚠️ No Characters')
      .setDescription('You have no characters to edit!')
      .setTimestamp();
    return await interaction.update({ embeds: [embed], components: [] });
  }

  const menuRows = buildEditCharacterMenu(userId, mainChar, alts, subclasses);
  
  const embed = new EmbedBuilder()
    .setColor('#4E5058')
    .setTitle('✏️ Edit Character')
    .setDescription('Choose which character to edit:')
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: menuRows });
}

async function handleRemoveCharacterButton(interaction, userId) {
  const allChars = await db.getAllCharactersWithSubclasses(userId);
  const mainChar = allChars.find(c => c.character_type === 'main');
  const alts = allChars.filter(c => c.character_type === 'alt');
  const subclasses = allChars.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
  
  if (!mainChar && alts.length === 0 && subclasses.length === 0) {
    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('⚠️ No Characters')
      .setDescription('You have no characters to remove!')
      .setTimestamp();
    return await interaction.update({ embeds: [embed], components: [] });
  }

  const menuRows = buildRemoveCharacterMenu(userId, mainChar, alts, subclasses);
  
  const embed = new EmbedBuilder()
    .setColor('#4E5058')
    .setTitle('🗑️ Remove Character')
    .setDescription('⚠️ Choose which character to remove:')
    .addFields(
      { name: '⚠️ Note', value: 'Removing main ONLY removes main. Alts stay!', inline: false }
    )
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: menuRows });
}

async function handleAddCharacterSelect(interaction, userId) {
  const selected = interaction.values[0];
  
  if (selected === 'alt') {
    await editing.handleAddAlt(interaction, userId);
  } else if (selected === 'subclass') {
    await editing.handleAddSubclass(interaction, userId);
  }
}

async function handleEditCharacterSelect(interaction, userId) {
  const selected = interaction.values[0];
  const [type, id] = selected.split('_');
  
  if (type === 'main') {
    await editing.handleEditMain(interaction, userId);
  } else if (type === 'alt' || type === 'subclass') {
    await interaction.reply({ 
      content: '✏️ Editing alts and subclasses coming soon! For now, please use the remove/add workflow.', 
      ephemeral: true 
    });
  }
}

async function handleEditMainOption(interaction, userId) {
  const selected = interaction.values[0];
  
  if (selected === 'swap') {
    await editing.handleSwapMainWithAlt(interaction, userId);
  } else {
    // Handle other edit options (IGN, class, etc.) - to be implemented
    await interaction.reply({
      content: `✏️ Editing ${selected} coming soon!`,
      ephemeral: true
    });
  }
}

async function handleAltSwapSelect(interaction, userId) {
  const altId = interaction.values[0];
  await editing.handleConfirmSwap(interaction, userId, altId);
}

async function handleRemoveCharacterSelect(interaction, userId) {
  const selected = interaction.values[0];
  const [type, id] = selected.split('_');
  const characterId = parseInt(id);
  
  const stateManager = (await import('../utils/stateManager.js')).default;
  
  if (type === 'main') {
    const mainChar = await db.getMainCharacter(userId);
    stateManager.setRemovalState(userId, { type: 'main', character: mainChar, characterId: mainChar.id });
    await editing.handleRemoveMain(interaction, userId);
  } else if (type === 'alt') {
    stateManager.setRemovalState(userId, { type: 'alt', characterId });
    await editing.handleConfirmRemove(interaction, userId);
  } else if (type === 'subclass') {
    stateManager.setRemovalState(userId, { type: 'subclass', characterId });
    await editing.handleConfirmRemove(interaction, userId);
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

export default { handleButtonInteraction, handleSelectMenuInteraction, handleModalSubmit };
