import { ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import gameData from '../utils/gameData.js';
import db from '../services/database.js';
import sheetsService from '../services/sheets.js';
import stateManager from '../utils/stateManager.js';
import logger from '../utils/logger.js';
import config from '../utils/config.js';
import { buildCharacterProfileEmbed } from '../components/embeds/characterProfile.js';
import { buildCharacterButtons } from '../components/buttons/characterButtons.js';
import { updateDiscordNickname } from '../utils/nicknameSync.js';

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

// STEP 1: Choose which character type to edit
export async function handleEditCharacter(interaction, userId) {
  try {
    const characters = await db.getAllCharactersWithSubclasses(userId);
    const mainChar = characters.find(c => c.character_type === 'main');
    const alts = characters.filter(c => c.character_type === 'alt');
    const subclasses = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
    
    if (!mainChar) {
      const embed = createEditEmbed('⚠️ No Characters', 'You need to register a main character first!');
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const embed = createEditEmbed('✏️ Edit Character', 'Which type of character do you want to edit?');
    
    const options = [];
    
    if (mainChar) {
      options.push({
        label: 'Main Character',
        value: 'edit_main',
        description: `${mainChar.ign} - ${mainChar.class}`,
        emoji: '⭐'
      });
    }
    
    if (subclasses.length > 0) {
      options.push({
        label: 'Subclass',
        value: 'edit_subclass',
        description: `Edit one of ${subclasses.length} subclass${subclasses.length > 1 ? 'es' : ''}`,
        emoji: '📊'
      });
    }
    
    if (alts.length > 0) {
      options.push({
        label: 'Alt Character',
        value: 'edit_alt',
        description: `Edit one of ${alts.length} alt${alts.length > 1 ? 's' : ''}`,
        emoji: '🎭'
      });
    }
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`edit_char_type_${userId}`)
      .setPlaceholder('✏️ Choose character type')
      .addOptions(options);
      
    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_profile_${userId}`)
      .setLabel('◀️ Back')
      .setStyle(ButtonStyle.Secondary);
      
    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);
      
    await interaction.update({ embeds: [embed], components: [row1, row2] });
  } catch (error) {
    logger.error(`Edit character error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Something went wrong!', 
      ephemeral: config.ephemeral.editChar 
    });
  }
}

// STEP 2a: Show specific main character edit menu
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
          label: 'UID', 
          value: 'uid', 
          description: `Current: ${mainChar.uid || 'Not set'}`, 
          emoji: '🆔' 
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
      .setCustomId(`back_to_edit_choice_${userId}`)
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

// STEP 2b: Show list of alts to edit
export async function handleEditAltChoice(interaction, userId) {
  try {
    const alts = await db.getAlts(userId);
    
    if (alts.length === 0) {
      const embed = createEditEmbed('⚠️ No Alts', 'You don\'t have any alts to edit!');
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const embed = createEditEmbed('✏️ Edit Alt', 'Which alt do you want to edit?');
    
    const options = alts.map((alt, index) => ({
      label: `Alt ${index + 1}: ${alt.ign}`,
      value: alt.id.toString(),
      description: `${alt.class} - ${alt.subclass}`,
      emoji: '🎭'
    }));
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_alt_to_edit_${userId}`)
      .setPlaceholder('✏️ Choose alt to edit')
      .addOptions(options);
      
    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_edit_choice_${userId}`)
      .setLabel('◀️ Back')
      .setStyle(ButtonStyle.Secondary);
      
    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);
    
    await interaction.update({ embeds: [embed], components: [row1, row2] });
  } catch (error) {
    logger.error(`Edit alt choice error: ${error.message}`);
  }
}

// STEP 2c: Show list of subclasses to edit
export async function handleEditSubclassChoice(interaction, userId) {
  try {
    const allChars = await db.getAllCharactersWithSubclasses(userId);
    const subclasses = allChars.filter(c => 
      c.character_type === 'main_subclass' || c.character_type === 'alt_subclass'
    );
    
    if (subclasses.length === 0) {
      const embed = createEditEmbed('⚠️ No Subclasses', 'You don\'t have any subclasses to edit!');
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const embed = createEditEmbed('✏️ Edit Subclass', 'Which subclass do you want to edit?');
    
    const options = subclasses.map((sub, index) => ({
      label: `Subclass ${index + 1}: ${sub.class}`,
      value: sub.id.toString(),
      description: `${sub.subclass} - ${formatAbilityScore(sub.ability_score)}`,
      emoji: '📊'
    }));
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_subclass_to_edit_${userId}`)
      .setPlaceholder('✏️ Choose subclass to edit')
      .addOptions(options);
      
    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_edit_choice_${userId}`)
      .setLabel('◀️ Back')
      .setStyle(ButtonStyle.Secondary);
      
    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);
    
    await interaction.update({ embeds: [embed], components: [row1, row2] });
  } catch (error) {
    logger.error(`Edit subclass choice error: ${error.message}`);
  }
}

// STEP 3: Show edit options for selected alt
export async function handleEditAlt(interaction, userId, altId) {
  try {
    const alt = await db.getCharacterById(altId);
    if (!alt) {
      const embed = createEditEmbed('⚠️ Not Found', 'Alt character not found!');
      return await interaction.update({ embeds: [embed], components: [] });
    }

    const embed = createEditEmbed('✏️ Edit Alt Character', `Editing: **${alt.ign}**\n\nChoose what you want to edit:`);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`edit_alt_option_${userId}`)
      .setPlaceholder('✏️ Pick an option')
      .addOptions([
        { 
          label: 'IGN', 
          value: 'ign', 
          description: `Current: ${alt.ign}`, 
          emoji: '🎮' 
        },
        { 
          label: 'UID', 
          value: 'uid', 
          description: `Current: ${alt.uid || 'Not set'}`, 
          emoji: '🆔' 
        },
        { 
          label: 'Class & Subclass', 
          value: 'class', 
          description: `${alt.class} - ${alt.subclass}`, 
          emoji: '🎭' 
        },
        { 
          label: 'Ability Score', 
          value: 'ability_score', 
          description: `Current: ${formatAbilityScore(alt.ability_score)}`, 
          emoji: '💪' 
        },
        { 
          label: 'Guild', 
          value: 'guild', 
          description: `Current: ${alt.guild || 'None'}`, 
          emoji: '🏰' 
        }
      ]);
      
    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_edit_alt_choice_${userId}`)
      .setLabel('◀️ Back')
      .setStyle(ButtonStyle.Secondary);
      
    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);
      
    await interaction.update({ embeds: [embed], components: [row1, row2] });
    stateManager.setUpdateState(userId, { 
      characterId: alt.id, 
      type: 'alt', 
      character: alt 
    });
  } catch (error) {
    logger.error(`Edit alt error: ${error.message}`);
  }
}

// STEP 3: Show edit options for selected subclass
export async function handleEditSubclass(interaction, userId, subclassId) {
  try {
    const subclass = await db.getCharacterById(subclassId);
    if (!subclass) {
      const embed = createEditEmbed('⚠️ Not Found', 'Subclass not found!');
      return await interaction.update({ embeds: [embed], components: [] });
    }

    const embed = createEditEmbed('✏️ Edit Subclass', `Editing: **${subclass.class} - ${subclass.subclass}**\n\nChoose what you want to edit:`);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`edit_subclass_option_${userId}`)
      .setPlaceholder('✏️ Pick an option')
      .addOptions([
        { 
          label: 'Class & Subclass', 
          value: 'class', 
          description: `${subclass.class} - ${subclass.subclass}`, 
          emoji: '🎭' 
        },
        { 
          label: 'Ability Score', 
          value: 'ability_score', 
          description: `Current: ${formatAbilityScore(subclass.ability_score)}`, 
          emoji: '💪' 
        }
      ]);
      
    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_edit_subclass_choice_${userId}`)
      .setLabel('◀️ Back')
      .setStyle(ButtonStyle.Secondary);
      
    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);
      
    await interaction.update({ embeds: [embed], components: [row1, row2] });
    stateManager.setUpdateState(userId, { 
      characterId: subclass.id, 
      type: 'subclass', 
      character: subclass 
    });
  } catch (error) {
    logger.error(`Edit subclass error: ${error.message}`);
  }
}

// Handle edit option selection (works for main, alt, and subclass)
export async function handleEditOption(interaction, userId, option) {
  const state = stateManager.getUpdateState(userId);
  if (!state) return;

  const character = state.character;

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
        .setPlaceholder(character.ign)
        .setValue(character.ign)
        .setRequired(true)
        .setMaxLength(50);

      const row = new ActionRowBuilder().addComponents(ignInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
      
    } else if (option === 'uid') {
      // Show UID modal
      const modal = new ModalBuilder()
        .setCustomId(`edit_uid_modal_${userId}`)
        .setTitle('Edit UID');

      const uidInput = new TextInputBuilder()
        .setCustomId('uid')
        .setLabel('New UID (User ID)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(character.uid || 'Enter UID')
        .setValue(character.uid || '')
        .setRequired(true)
        .setMaxLength(50);

      const row = new ActionRowBuilder().addComponents(uidInput);
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
        .setCustomId(`back_to_current_edit_${userId}`)
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
        .setCustomId(`back_to_current_edit_${userId}`)
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
        .setCustomId(`back_to_current_edit_${userId}`)
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
    await sheetsService.syncAllCharacters(await db.getAllUsersWithCharacters());

    // ✅ NEW: Update Discord nickname if this is a main character (and sync is enabled)
    if (state.type === 'main' && config.sync.nicknameSyncEnabled) {
      await updateDiscordNickname(interaction.client, config.discord.guildId, userId, newIGN);
    }

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

// Handle UID modal submit
export async function handleEditUIDModal(interaction, userId) {
  const state = stateManager.getUpdateState(userId);
  if (!state) return;

  const newUID = interaction.fields.getTextInputValue('uid').trim();

  // ✅ Validate UID is numbers only
  if (!/^\d+$/.test(newUID)) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setDescription('# ❌ **Invalid UID**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n**UID must contain only numbers.**\n\nYou entered: `' + newUID + '`\n\nPlease try again with a valid numeric UID.')
      .setTimestamp();
    
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    stateManager.clearUpdateState(userId);
    return;
  }

  try {
    await db.updateCharacter(state.characterId, { uid: newUID });
    await sheetsService.syncAllCharacters(await db.getAllUsersWithCharacters());

    const characters = await db.getAllCharactersWithSubclasses(userId);
    const mainChar = characters.find(c => c.character_type === 'main');
    const alts = characters.filter(c => c.character_type === 'alt');
    const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

    const embed = await buildCharacterProfileEmbed(interaction.user, characters, interaction);
    const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);

    await interaction.update({ embeds: [embed], components: buttons });
    stateManager.clearUpdateState(userId);

    logger.logAction(interaction.user.tag, 'updated UID', `${newUID}`);
  } catch (error) {
    logger.error(`Edit UID error: ${error.message}`);
    await interaction.reply({ content: '❌ Failed to update UID!', ephemeral: true });
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
    .setCustomId(`back_to_current_edit_${userId}`)
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
    await sheetsService.syncAllCharacters(await db.getAllUsersWithCharacters());

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
    await sheetsService.syncAllCharacters(await db.getAllUsersWithCharacters());

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
    await sheetsService.syncAllCharacters(await db.getAllUsersWithCharacters());

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
  
  const embed = createEditEmbed('🎭 Add Subclass - Step 1/2', 'Pick your subclass class:\n\n*Subclass will use the same IGN and guild as the parent character*');
  
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

// REMOVE CHARACTER - STEP 1: Choose character type
export async function handleRemoveCharacter(interaction, userId) {
  try {
    const characters = await db.getAllCharactersWithSubclasses(userId);
    const mainChar = characters.find(c => c.character_type === 'main');
    const alts = characters.filter(c => c.character_type === 'alt');
    const subclasses = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
    
    if (!mainChar) {
      const embed = createEditEmbed('⚠️ No Characters', 'You don\'t have any characters to remove!');
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const embed = createEditEmbed('🗑️ Remove Character', 'Which type of character do you want to remove?');
    
    const options = [];
    
    if (subclasses.length > 0) {
      options.push({
        label: 'Subclass',
        value: 'remove_subclass',
        description: `Remove one of ${subclasses.length} subclass${subclasses.length > 1 ? 'es' : ''}`,
        emoji: '📊'
      });
    }
    
    if (alts.length > 0) {
      options.push({
        label: 'Alt Character',
        value: 'remove_alt',
        description: `Remove one of ${alts.length} alt${alts.length > 1 ? 's' : ''}`,
        emoji: '🎭'
      });
    }
    
    if (mainChar) {
      options.push({
        label: '⚠️ Main Character',
        value: 'remove_main',
        description: '⚠️ Only removes main, alts stay',
        emoji: '⭐'
      });
    }
    
    if (options.length === 0) {
      const embed = createEditEmbed('⚠️ No Characters', 'You don\'t have any characters to remove!');
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`remove_char_type_${userId}`)
      .setPlaceholder('🗑️ Choose character type')
      .addOptions(options);
      
    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_profile_${userId}`)
      .setLabel('◀️ Back')
      .setStyle(ButtonStyle.Secondary);
      
    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);
      
    await interaction.update({ embeds: [embed], components: [row1, row2] });
  } catch (error) {
    logger.error(`Remove character error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Something went wrong!', 
      ephemeral: config.ephemeral.editChar 
    });
  }
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

export async function handleRemoveAltChoice(interaction, userId) {
  try {
    const alts = await db.getAlts(userId);
    if (alts.length === 0) {
      const embed = createEditEmbed('⚠️ No Alts', 'You don\'t have any alts to remove!');
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const embed = createEditEmbed('🗑️ Remove Alt', 'Which alt do you want to remove?');
    
    const options = alts.map((alt, index) => ({
      label: `Alt ${index + 1}: ${alt.ign}`,
      value: alt.id.toString(),
      description: `${alt.class} - ${alt.subclass}`,
      emoji: '🎭'
    }));
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_alt_to_remove_${userId}`)
      .setPlaceholder('🗑️ Choose alt to remove')
      .addOptions(options);
      
    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_remove_choice_${userId}`)
      .setLabel('◀️ Back')
      .setStyle(ButtonStyle.Secondary);
      
    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);
    
    await interaction.update({ embeds: [embed], components: [row1, row2] });
  } catch (error) {
    logger.error(`Remove alt choice error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Something went wrong!', 
      ephemeral: config.ephemeral.editChar 
    });
  }
}

export async function handleRemoveSubclassChoice(interaction, userId) {
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
    
    const options = subclasses.map((sub, index) => ({
      label: `Subclass ${index + 1}: ${sub.class}`,
      value: sub.id.toString(),
      description: `${sub.subclass} - ${formatAbilityScore(sub.ability_score)}`,
      emoji: '📊'
    }));
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_subclass_to_remove_${userId}`)
      .setPlaceholder('🗑️ Choose subclass to remove')
      .addOptions(options);
      
    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_remove_choice_${userId}`)
      .setLabel('◀️ Back')
      .setStyle(ButtonStyle.Secondary);
      
    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);
    
    await interaction.update({ embeds: [embed], components: [row1, row2] });
  } catch (error) {
    logger.error(`Remove subclass choice error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Something went wrong!', 
      ephemeral: config.ephemeral.editChar 
    });
  }
}

// NEW FUNCTION - Show confirmation for alt removal
export async function handleRemoveAlt(interaction, userId, altId) {
  try {
    const alt = await db.getCharacterById(altId);
    if (!alt) {
      const embed = createEditEmbed('⚠️ Not Found', 'Alt character not found!');
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const embed = createEditEmbed(
      '⚠️ Remove Alt Character', 
      `**Are you sure you want to remove this alt?**\n\n🎮 **${alt.ign}**\n🎭 ${alt.class} • ${alt.subclass}\n\n⚠️ This will permanently delete this alt character.`
    );
    
    const confirmButton = new ButtonBuilder()
      .setCustomId(`confirm_remove_alt_${userId}_${altId}`)
      .setLabel('✅ Yes, Remove')
      .setStyle(ButtonStyle.Danger);
      
    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_remove_alt_${userId}`)
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary);
      
    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
    
    await interaction.update({ embeds: [embed], components: [row] });
    stateManager.setRemovalState(userId, { characterId: altId, type: 'alt' });
  } catch (error) {
    logger.error(`Remove alt error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Something went wrong!', 
      ephemeral: config.ephemeral.editChar 
    });
  }
}

// NEW FUNCTION - Show confirmation for subclass removal
export async function handleRemoveSubclass(interaction, userId, subclassId) {
  try {
    const subclass = await db.getCharacterById(subclassId);
    if (!subclass) {
      const embed = createEditEmbed('⚠️ Not Found', 'Subclass not found!');
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const embed = createEditEmbed(
      '⚠️ Remove Subclass', 
      `**Are you sure you want to remove this subclass?**\n\n🎭 **${subclass.class} • ${subclass.subclass}**\n💪 ${formatAbilityScore(subclass.ability_score)}\n\n⚠️ This will permanently delete this subclass.`
    );
    
    const confirmButton = new ButtonBuilder()
      .setCustomId(`confirm_remove_subclass_${userId}_${subclassId}`)
      .setLabel('✅ Yes, Remove')
      .setStyle(ButtonStyle.Danger);
      
    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_remove_subclass_${userId}`)
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary);
      
    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
    
    await interaction.update({ embeds: [embed], components: [row] });
    stateManager.setRemovalState(userId, { characterId: subclassId, type: 'subclass' });
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
    await sheetsService.syncAllCharacters(await db.getAllUsersWithCharacters());

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

export async function handleSelectParentForSubclass(interaction, userId) {
  const selected = interaction.values[0];
  const [type, id] = selected.split('_');
  await startSubclassRegistration(interaction, userId, parseInt(id), type);
}

export default {
  handleEditCharacter,
  handleEditMain,
  handleEditAltChoice,
  handleEditSubclassChoice,
  handleEditAlt,
  handleEditSubclass,
  handleEditOption,
  handleEditIGNModal,
  handleEditUIDModal,
  handleEditClassSelect,
  handleEditSubclassSelect,
  handleEditScoreSelect,
  handleEditGuildSelect,
  handleAddAlt,
  handleAddSubclass,
  handleRemoveCharacter,
  handleRemoveMain,
  handleRemoveAltChoice,
  handleRemoveSubclassChoice,
  handleRemoveAlt,
  handleRemoveSubclass,
  handleConfirmRemove,
  handleCancelRemove,
  handleSelectParentForSubclass
};
