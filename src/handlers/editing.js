import { ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import gameData from '../utils/gameData.js';
import db from '../services/database.js';
import sheetsService from '../services/sheets.js';
import stateManager from '../utils/stateManager.js';
import logger from '../utils/logger.js';
import config from '../utils/config.js';
import { buildCharacterProfileEmbed } from '../components/embeds/characterProfile.js';
import { buildCharacterButtons } from '../components/buttons/characterButtons.js';

// Helper to create consistent embeds
function createEditEmbed(title, description) {
  return new EmbedBuilder()
    .setColor('#EC4899')
    .setDescription(`# **${title}**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${description}`)
    .setTimestamp();
}

function formatAbilityScore(score) {
  const num = parseInt(score);
  const scoreRanges = {
    10000: '≤10k', 11000: '10-12k', 13000: '12-14k', 15000: '14-16k',
    17000: '16-18k', 19000: '18-20k', 21000: '20-22k', 23000: '22-24k',
    25000: '24-26k', 27000: '26-28k', 29000: '28-30k', 31000: '30-32k',
    33000: '32-34k', 35000: '34-36k', 37000: '36-38k', 39000: '38-40k',
    41000: '40-42k', 43000: '42-44k', 45000: '44-46k', 47000: '46-48k',
    49000: '48-50k', 51000: '50-52k', 53000: '52-54k', 55000: '54-56k',
    57000: '56k+'
  };
  return scoreRanges[num] || num.toLocaleString();
}

export async function handleEditMain(interaction, userId) {
  try {
    const mainChar = await db.getMainCharacter(userId);
    if (!mainChar) {
      const embed = createEditEmbed('⚠️ No Main Character', 'You need to register a main character first!');
      return await interaction.update({ embeds: [embed], components: [] });
    }

    const embed = createEditEmbed('✏️ Edit Main Character', 'Choose what you want to edit:');

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`edit_main_option_${userId}`)
      .setPlaceholder('✏️ Pick an option')
      .addOptions([
        { 
          label: 'IGN', 
          value: 'ign', 
          description: `Current: ${mainChar.ign}`, 
          emoji: '🎮' 
        },
        { 
          label: 'Class & Subclass', 
          value: 'class', 
          description: `${mainChar.class} - ${mainChar.subclass}`, 
          emoji: '🎭' 
        },
        { 
          label: 'Ability Score', 
          value: 'ability_score', 
          description: `Current: ${formatAbilityScore(mainChar.ability_score)}`, 
          emoji: '💪' 
        },
        { 
          label: 'Guild', 
          value: 'guild', 
          description: `Current: ${mainChar.guild || 'None'}`, 
          emoji: '🏰' 
        }
      ]);
      
    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_profile_${userId}`)
      .setLabel('◀️ Back')
      .setStyle(ButtonStyle.Secondary);
      
    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);
      
    await interaction.update({ embeds: [embed], components: [row1, row2] });
    stateManager.setUpdateState(userId, { 
      characterId: mainChar.id, 
      type: 'main', 
      character: mainChar 
    });
  } catch (error) {
    logger.error(`Edit main error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Something went wrong!', 
      ephemeral: config.ephemeral.editChar 
    });
  }
}

// Handle edit option selection
export async function handleEditMainOption(interaction, userId, option) {
  const state = stateManager.getUpdateState(userId);
  if (!state) return;

  const mainChar = state.character;

  try {
    if (option === 'ign') {
      // Show IGN modal
      const modal = new ModalBuilder()
        .setCustomId(`edit_ign_modal_${userId}`)
        .setTitle('Edit IGN');

      const ignInput = new TextInputBuilder()
        .setCustomId('ign')
        .setLabel('New In-Game Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(mainChar.ign)
        .setValue(mainChar.ign)
        .setRequired(true)
        .setMaxLength(50);

      const row = new ActionRowBuilder().addComponents(ignInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
      
    } else if (option === 'class') {
      // Show class selection
      const embed = createEditEmbed('🎭 Edit Class', 'Pick your new class:');

      const classOptions = Object.keys(gameData.classes).map(className => ({
        label: className,
        value: className,
        description: gameData.classes[className].role,
        emoji: gameData.classes[className].emoji
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`edit_class_select_${userId}`)
        .setPlaceholder('🎭 Choose your class')
        .addOptions(classOptions);

      const backButton = new ButtonBuilder()
        .setCustomId(`back_to_edit_menu_${userId}`)
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary);

      const row1 = new ActionRowBuilder().addComponents(selectMenu);
      const row2 = new ActionRowBuilder().addComponents(backButton);

      await interaction.update({ embeds: [embed], components: [row1, row2] });
      
    } else if (option === 'ability_score') {
      // Show ability score selection
      const embed = createEditEmbed('💪 Edit Ability Score', 'Pick your new score range:');

      const scoreOptions = gameData.abilityScores.map(score => ({
        label: score.label,
        value: score.value,
        description: `${score.label} power level`
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`edit_score_select_${userId}`)
        .setPlaceholder('💪 Choose your score')
        .addOptions(scoreOptions);

      const backButton = new ButtonBuilder()
        .setCustomId(`back_to_edit_menu_${userId}`)
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary);

      const row1 = new ActionRowBuilder().addComponents(selectMenu);
      const row2 = new ActionRowBuilder().addComponents(backButton);

      await interaction.update({ embeds: [embed], components: [row1, row2] });
      
    } else if (option === 'guild') {
      // Show guild selection
      const embed = createEditEmbed('🏰 Edit Guild', 'Pick your new guild:');

      const guildOptions = config.guilds.map(guild => ({
        label: guild.name,
        value: guild.name,
        description: `Join ${guild.name}`
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`edit_guild_select_${userId}`)
        .setPlaceholder('🏰 Choose your guild')
        .addOptions(guildOptions);

      const backButton = new ButtonBuilder()
        .setCustomId(`back_to_edit_menu_${userId}`)
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary);

      const row1 = new ActionRowBuilder().addComponents(selectMenu);
      const row2 = new ActionRowBuilder().addComponents(backButton);

      await interaction.update({ embeds: [embed], components: [row1, row2] });
    }
  } catch (error) {
    logger.error(`Edit option error: ${error.message}`);
  }
}

// Handle IGN modal submit
export async function handleEditIGNModal(interaction, userId) {
  const state = stateManager.getUpdateState(userId);
  if (!state) return;

  const newIGN = interaction.fields.getTextInputValue('ign');

  try {
    await db.updateCharacter(state.characterId, { ign: newIGN });
    await sheetsService.syncCharacters();

    const characters = await db.getAllCharactersWithSubclasses(userId);
    const mainChar = characters.find(c => c.character_type === 'main');
    const alts = characters.filter(c => c.character_type === 'alt');
    const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

    const embed = await buildCharacterProfileEmbed(interaction.user, characters, interaction);
    const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);

    await interaction.update({ embeds: [embed], components: buttons });
    stateManager.clearUpdateState(userId);

    logger.logAction(interaction.user.tag, 'updated IGN', `${newIGN}`);
  } catch (error) {
    logger.error(`Edit IGN error: ${error.message}`);
    await interaction.reply({ content: '❌ Failed to update IGN!', ephemeral: true });
  }
}

// Handle class selection
export async function handleEditClassSelect(interaction, userId) {
  const state = stateManager.getUpdateState(userId);
  if (!state) return;

  const className = interaction.values[0];
  const subclasses = gameData.classes[className].subclasses;
  const classRole = gameData.classes[className].role;

  const embed = createEditEmbed('📋 Edit Subclass', `**Class:** ${className}\n\nPick your subclass:`);

  const subclassOptions = subclasses.map(subclassName => {
    const roleEmoji = classRole === 'Tank' ? '🛡️' : classRole === 'DPS' ? '⚔️' : '💚';
    return {
      label: subclassName,
      value: subclassName,
      description: classRole,
      emoji: roleEmoji
    };
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`edit_subclass_select_${userId}`)
    .setPlaceholder('📋 Choose your subclass')
    .addOptions(subclassOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_edit_menu_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  
  stateManager.setUpdateState(userId, { ...state, newClass: className });
}

// Handle subclass selection
export async function handleEditSubclassSelect(interaction, userId) {
  const state = stateManager.getUpdateState(userId);
  if (!state) return;

  const subclassName = interaction.values[0];

  try {
    await db.updateCharacter(state.characterId, { 
      class: state.newClass,
      subclass: subclassName 
    });
    await sheetsService.syncCharacters();

    const characters = await db.getAllCharactersWithSubclasses(userId);
    const mainChar = characters.find(c => c.character_type === 'main');
    const alts = characters.filter(c => c.character_type === 'alt');
    const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

    const embed = await buildCharacterProfileEmbed(interaction.user, characters, interaction);
    const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);

    await interaction.update({ embeds: [embed], components: buttons });
    stateManager.clearUpdateState(userId);

    logger.logAction(interaction.user.tag, 'updated class', `${state.newClass} - ${subclassName}`);
  } catch (error) {
    logger.error(`Edit class error: ${error.message}`);
    await interaction.reply({ content: '❌ Failed to update class!', ephemeral: true });
  }
}

// Handle score selection
export async function handleEditScoreSelect(interaction, userId) {
  const state = stateManager.getUpdateState(userId);
  if (!state) return;

  const newScore = interaction.values[0];

  try {
    await db.updateCharacter(state.characterId, { ability_score: newScore });
    await sheetsService.syncCharacters();

    const characters = await db.getAllCharactersWithSubclasses(userId);
    const mainChar = characters.find(c => c.character_type === 'main');
    const alts = characters.filter(c => c.character_type === 'alt');
    const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

    const embed = await buildCharacterProfileEmbed(interaction.user, characters, interaction);
    const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);

    await interaction.update({ embeds: [embed], components: buttons });
    stateManager.clearUpdateState(userId);

    logger.logAction(interaction.user.tag, 'updated score', formatAbilityScore(newScore));
  } catch (error) {
    logger.error(`Edit score error: ${error.message}`);
    await interaction.reply({ content: '❌ Failed to update score!', ephemeral: true });
  }
}

// Handle guild selection
export async function handleEditGuildSelect(interaction, userId) {
  const state = stateManager.getUpdateState(userId);
  if (!state) return;

  const newGuild = interaction.values[0];

  try {
    await db.updateCharacter(state.characterId, { guild: newGuild });
    await sheetsService.syncCharacters();

    const characters = await db.getAllCharactersWithSubclasses(userId);
    const mainChar = characters.find(c => c.character_type === 'main');
    const alts = characters.filter(c => c.character_type === 'alt');
    const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

    const embed = await buildCharacterProfileEmbed(interaction.user, characters, interaction);
    const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);

    await interaction.update({ embeds: [embed], components: buttons });
    stateManager.clearUpdateState(userId);

    logger.logAction(interaction.user.tag, 'updated guild', newGuild);
  } catch (error) {
    logger.error(`Edit guild error: ${error.message}`);
    await interaction.reply({ content: '❌ Failed to update guild!', ephemeral: true });
  }
}

// Handle back to edit menu
export async function handleBackToEditMenu(interaction, userId) {
  await handleEditMain(interaction, userId);
}

export async function handleAddAlt(interaction, userId) {
  try {
    const mainChar = await db.getMainCharacter(userId);
    if (!mainChar) {
      const embed = createEditEmbed('⚠️ No Main Character', 'You need to register a main character first!');
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    stateManager.setRegistrationState(userId, { 
      type: 'alt', 
      step: 'region',
      characterType: 'alt' 
    });
    
    const { handleRegisterMain } = await import('./registration.js');
    await handleRegisterMain(interaction, userId);
    
  } catch (error) {
    logger.error(`Add alt error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Something went wrong!', 
      ephemeral: config.ephemeral.editChar 
    });
  }
}

export async function handleAddSubclass(interaction, userId) {
  try {
    const mainChar = await db.getMainCharacter(userId);
    if (!mainChar) {
      const embed = createEditEmbed('⚠️ No Main Character', 'You need to register a main character first!');
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const allChars = await db.getAllCharactersWithSubclasses(userId);
    const subclasses = allChars.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
    
    if (subclasses.length >= 3) {
      const embed = createEditEmbed('⚠️ Subclass Limit', 'You already have 3 subclasses! Remove one to add more.');
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const alts = allChars.filter(c => c.character_type === 'alt');
    
    if (alts.length === 0) {
      await startSubclassRegistration(interaction, userId, mainChar.id, 'main');
    } else {
      const embed = createEditEmbed('📊 Add Subclass', 'Which character should this subclass be for?');
      
      const options = [
        { 
          label: `Main: ${mainChar.ign}`, 
          value: `main_${mainChar.id}`, 
          description: `${mainChar.class} - ${mainChar.subclass}`,
          emoji: '⭐' 
        },
        ...alts.map(alt => ({ 
          label: `Alt: ${alt.ign}`, 
          value: `alt_${alt.id}`, 
          description: `${alt.class} - ${alt.subclass}`,
          emoji: '🎭' 
        }))
      ];
      
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`select_parent_for_subclass_${userId}`)
        .setPlaceholder('📊 Choose character')
        .addOptions(options);
        
      const backButton = new ButtonBuilder()
        .setCustomId(`back_to_profile_${userId}`)
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary);
        
      const row1 = new ActionRowBuilder().addComponents(selectMenu);
      const row2 = new ActionRowBuilder().addComponents(backButton);
      
      await interaction.update({ embeds: [embed], components: [row1, row2] });
    }
  } catch (error) {
    logger.error(`Add subclass error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Something went wrong!', 
      ephemeral: config.ephemeral.editChar 
    });
  }
}

async function startSubclassRegistration(interaction, userId, parentId, parentType) {
  stateManager.setRegistrationState(userId, { 
    type: 'subclass', 
    parentId, 
    parentType, 
    characterType: parentType === 'main' ? 'main_subclass' : 'alt_subclass', 
    step: 'class' 
  });
  
  const embed = createEditEmbed('🎭 Add Subclass - Step 1/2', 'Pick your subclass class:');
  
  const classes = Object.keys(gameData.classes);
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_class_${userId}`)
    .setPlaceholder('🎭 Choose class')
    .addOptions(classes.map(className => ({ 
      label: className, 
      value: className,
      description: gameData.classes[className].role,
      emoji: gameData.classes[className].emoji 
    })));
    
  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_profile_${userId}`)
    .setLabel('◀️ Cancel')
    .setStyle(ButtonStyle.Secondary);
    
  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);
    
  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleRemoveMain(interaction, userId) {
  try {
    const mainChar = await db.getMainCharacter(userId);
    if (!mainChar) {
      const embed = createEditEmbed('⚠️ No Main Character', 'Nothing to remove!');
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const embed = createEditEmbed(
      '⚠️ Remove Main Character', 
      `**Are you sure you want to remove your main character?**\n\n🎮 **${mainChar.ign}**\n🎭 ${mainChar.class} - ${mainChar.subclass}\n\n⚠️ This ONLY removes the main character.\nAlts and subclasses will remain.`
    );
    
    const confirmButton = new ButtonBuilder()
      .setCustomId(`confirm_remove_main_${userId}`)
      .setLabel('✅ Yes, Remove')
      .setStyle(ButtonStyle.Danger);
      
    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_remove_main_${userId}`)
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary);
      
    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
    
    await interaction.update({ embeds: [embed], components: [row] });
    stateManager.setRemovalState(userId, { characterId: mainChar.id, type: 'main' });
  } catch (error) {
    logger.error(`Remove main error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Something went wrong!', 
      ephemeral: config.ephemeral.editChar 
    });
  }
}

export async function handleRemoveAlt(interaction, userId) {
  try {
    const alts = await db.getAlts(userId);
    if (alts.length === 0) {
      const embed = createEditEmbed('⚠️ No Alts', 'You don\'t have any alts to remove!');
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const embed = createEditEmbed('🗑️ Remove Alt', 'Which alt do you want to remove?');
    
    const options = alts.map(alt => ({
      label: alt.ign,
      value: alt.id.toString(),
      description: `${alt.class} - ${alt.subclass}`,
      emoji: '🎭'
    }));
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_alt_to_remove_${userId}`)
      .setPlaceholder('🗑️ Choose alt to remove')
      .addOptions(options);
      
    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_profile_${userId}`)
      .setLabel('◀️ Cancel')
      .setStyle(ButtonStyle.Secondary);
      
    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);
    
    await interaction.update({ embeds: [embed], components: [row1, row2] });
    stateManager.setRemovalState(userId, { type: 'alt' });
  } catch (error) {
    logger.error(`Remove alt error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Something went wrong!', 
      ephemeral: config.ephemeral.editChar 
    });
  }
}

export async function handleRemoveSubclass(interaction, userId) {
  try {
    const allChars = await db.getAllCharactersWithSubclasses(userId);
    const subclasses = allChars.filter(c => 
      c.character_type === 'main_subclass' || c.character_type === 'alt_subclass'
    );
    
    if (subclasses.length === 0) {
      const embed = createEditEmbed('⚠️ No Subclasses', 'You don\'t have any subclasses to remove!');
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const embed = createEditEmbed('🗑️ Remove Subclass', 'Which subclass do you want to remove?');
    
    const options = subclasses.map(sub => ({
      label: sub.class,
      value: sub.id.toString(),
      description: `${sub.subclass} - ${formatAbilityScore(sub.ability_score)}`,
      emoji: '📊'
    }));
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_subclass_to_remove_${userId}`)
      .setPlaceholder('🗑️ Choose subclass to remove')
      .addOptions(options);
      
    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_profile_${userId}`)
      .setLabel('◀️ Cancel')
      .setStyle(ButtonStyle.Secondary);
      
    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);
    
    await interaction.update({ embeds: [embed], components: [row1, row2] });
    stateManager.setRemovalState(userId, { type: 'subclass' });
  } catch (error) {
    logger.error(`Remove subclass error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Something went wrong!', 
      ephemeral: config.ephemeral.editChar 
    });
  }
}

export async function handleConfirmRemove(interaction, userId) {
  const state = stateManager.getRemovalState(userId);
  if (!state) return;

  try {
    await db.deleteCharacter(state.characterId);
    await sheetsService.syncCharacters();

    const characters = await db.getAllCharactersWithSubclasses(userId);
    const mainChar = characters.find(c => c.character_type === 'main');
    const alts = characters.filter(c => c.character_type === 'alt');
    const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

    const embed = await buildCharacterProfileEmbed(interaction.user, characters, interaction);
    const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);

    await interaction.update({ embeds: [embed], components: buttons });
    stateManager.clearRemovalState(userId);

    logger.logAction(interaction.user.tag, 'removed character', state.type);
  } catch (error) {
    logger.error(`Confirm remove error: ${error.message}`);
    await interaction.reply({ content: '❌ Failed to remove!', ephemeral: true });
  }
}

export async function handleCancelRemove(interaction, userId) {
  stateManager.clearRemovalState(userId);

  const characters = await db.getAllCharactersWithSubclasses(userId);
  const mainChar = characters.find(c => c.character_type === 'main');
  const alts = characters.filter(c => c.character_type === 'alt');
  const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

  const embed = await buildCharacterProfileEmbed(interaction.user, characters, interaction);
  const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);

  await interaction.update({ embeds: [embed], components: buttons });
}

export async function handleSwapMainWithAlt(interaction, userId) {
  try {
    const alts = await db.getAlts(userId);
    if (alts.length === 0) {
      const embed = createEditEmbed('⚠️ No Alts', 'You need at least one alt to swap with!');
      return await interaction.update({ embeds: [embed], components: [] });
    }

    const embed = createEditEmbed('🔄 Swap Main with Alt', 'Which alt should become your main?');

    const options = alts.map(alt => ({
      label: alt.ign,
      value: alt.id.toString(),
      description: `${alt.guild} - ${alt.class} (${alt.subclass})`,
      emoji: '🎭'
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_alt_to_swap_${userId}`)
      .setPlaceholder('🔄 Choose alt')
      .addOptions(options);

    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_edit_menu_${userId}`)
      .setLabel('◀️ Back')
      .setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);

    await interaction.update({ embeds: [embed], components: [row1, row2] });
  } catch (error) {
    logger.error(`Swap main error: ${error.message}`);
  }
}

export async function handleAltSwapSelect(interaction, userId) {
  const altId = parseInt(interaction.values[0]);

  try {
    const mainChar = await db.getMainCharacter(userId);
    
    // Swap character types
    await db.query('UPDATE characters SET character_type = ? WHERE id = ?', ['alt', mainChar.id]);
    await db.query('UPDATE characters SET character_type = ? WHERE id = ?', ['main', altId]);
    
    await sheetsService.syncCharacters();

    const characters = await db.getAllCharactersWithSubclasses(userId);
    const newMain = characters.find(c => c.character_type === 'main');
    const alts = characters.filter(c => c.character_type === 'alt');
    const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

    const embed = await buildCharacterProfileEmbed(interaction.user, characters, interaction);
    const buttons = buildCharacterButtons(newMain, alts.length, subs.length, userId);

    await interaction.update({ embeds: [embed], components: buttons });

    logger.logAction(interaction.user.tag, 'swapped main with alt', `${newMain.ign}`);
  } catch (error) {
    logger.error(`Alt swap error: ${error.message}`);
    await interaction.reply({ content: '❌ Failed to swap!', ephemeral: true });
  }
}

export async function handleSelectParentForSubclass(interaction, userId) {
  const selected = interaction.values[0];
  const [type, id] = selected.split('_');
  await startSubclassRegistration(interaction, userId, parseInt(id), type);
}

export default {
  handleEditMain,
  handleEditMainOption,
  handleEditIGNModal,
  handleEditClassSelect,
  handleEditSubclassSelect,
  handleEditScoreSelect,
  handleEditGuildSelect,
  handleBackToEditMenu,
  handleAddAlt,
  handleAddSubclass,
  handleRemoveMain,
  handleRemoveAlt,
  handleRemoveSubclass,
  handleConfirmRemove,
  handleCancelRemove,
  handleSwapMainWithAlt,
  handleAltSwapSelect,
  handleSelectParentForSubclass
};
