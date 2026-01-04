import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from 'discord.js';
import { CharacterRepo, BattleImagineRepo } from '../database/repositories.js';
import { CLASSES, ABILITY_SCORES, COLORS } from '../config/game.js';
import { getScoreRange } from '../ui/utils.js';
import * as ui from '../ui/components.js';
import { profileEmbed } from '../ui/embeds.js';
import logger from '../services/logger.js';
import * as classRoleService from '../services/classRoles.js';
import { NicknamePrefsRepo, updateNickname, buildNickname } from '../services/nickname.js';
import config from '../config/index.js';
import state from '../services/state.js';

// ═══════════════════════════════════════════════════════════════════
// SHOW EDIT MENU - NEW FUNCTION FOR STATIC REGISTRATION
// ═══════════════════════════════════════════════════════════════════

export async function showEditMenu(interaction, userId) {
  console.log('[EDIT] Showing edit menu for user with existing main:', userId);

  const characters = await CharacterRepo.findAllByUser(userId);
  const main = characters.find(c => c.character_type === 'main');

  const embed = await profileEmbed(interaction.user, characters, interaction);
  const buttons = ui.profileButtons(userId, !!main);

  await interaction.reply({
    embeds: [embed],
    components: buttons,
    flags: MessageFlags.Ephemeral
  });
}

// ═══════════════════════════════════════════════════════════════════
// EDIT CHARACTER - SELECT CHARACTER
// ═══════════════════════════════════════════════════════════════════

export async function start(interaction, userId) {
  console.log('[EDIT] Starting edit for user:', userId);

  const characters = await CharacterRepo.findAllByUser(userId);

  if (characters.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setDescription('# ❌ **No Characters**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nYou have no characters to edit.')
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      '# ✏️ **Edit Character**\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      'Select the character you want to edit.'
    )
    .setTimestamp();

  // ✅ FIXED: Character dropdown with score range
  const characterOptions = characters.map(char => {
    const iconId = CLASSES[char.class]?.iconId || null;
    const emoji = iconId ? { id: iconId } : (CLASSES[char.class]?.emoji || '🎮');
    
    return {
      label: `${char.ign} (${char.class})`,
      value: String(char.id),
      description: `${char.subclass} - ${getScoreRange(char.ability_score)}`,
      emoji: emoji
    };
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_edit_character_${userId}`)
    .setPlaceholder('🎮 Select character to edit')
    .addOptions(characterOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_profile_${userId}`)
    .setLabel('◀️ Back to Profile')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

// ═══════════════════════════════════════════════════════════════════
// EDIT CHARACTER - SELECT FIELD
// ═══════════════════════════════════════════════════════════════════

export async function selectCharacter(interaction, userId) {
  const characterId = parseInt(interaction.values[0]);
  const character = await CharacterRepo.findById(characterId);

  if (!character) {
    await interaction.update({
      content: '❌ Character not found.',
      components: []
    });
    return;
  }

  console.log('[EDIT] Selected character:', characterId, character.ign);
  state.set(userId, 'edit', { characterId, character });

  // ✅ FIXED: Edit field selection with score range
  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      `# ✏️ **Edit ${character.ign}**\n` +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      'What would you like to edit?\n\n' +
      `**🎭 Class:** ${character.class}\n` +
      `**✨ Subclass:** ${character.subclass}\n` +
      `**💪 Score:** ${getScoreRange(character.ability_score)}\n` +
      `**🎮 IGN:** ${character.ign}\n` +
      `**🆔 UID:** ${character.uid}\n` +
      `**🏰 Guild:** ${character.guild}`
    )
    .setTimestamp();

  const options = [
    { label: 'Class & Subclass', value: 'class', emoji: '🎭' },
    { label: 'Ability Score', value: 'score', emoji: '💪' },
    { label: 'IGN', value: 'ign', emoji: '🎮' },
    { label: 'UID', value: 'uid', emoji: '🆔' },
    { label: 'Guild', value: 'guild', emoji: '🏰' },
    { label: 'Battle Imagines', value: 'battle_imagines', emoji: '⚔️' },
    { label: 'Discord Nickname', value: 'discord_nickname', emoji: '🏷️' }
  ];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_edit_field_${userId}`)
    .setPlaceholder('✏️ Select field to edit')
    .addOptions(options);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_edit_select_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

// ═══════════════════════════════════════════════════════════════════
// EDIT FIELD HANDLERS
// ═══════════════════════════════════════════════════════════════════

export async function selectField(interaction, userId) {
  const field = interaction.values[0];
  const currentState = state.get(userId, 'edit');

  console.log('[EDIT] Selected field:', field);
  state.set(userId, 'edit', { ...currentState, field });

  switch (field) {
    case 'class':
      await showClassSelection(interaction, userId);
      break;
    case 'score':
      await showScoreSelection(interaction, userId);
      break;
    case 'ign':
      await showIGNModal(interaction, userId);
      break;
    case 'uid':
      await showUIDModal(interaction, userId);
      break;
    case 'guild':
      await showGuildSelection(interaction, userId);
      break;
    case 'battle_imagines':
      await showBattleImagineSelection(interaction, userId);
      break;
    case 'discord_nickname':
      await showNicknameSelection(interaction, userId);
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════
// CLASS EDITING
// ═══════════════════════════════════════════════════════════════════

async function showClassSelection(interaction, userId) {
  const currentState = state.get(userId, 'edit');
  const character = currentState.character;

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      `# 🎭 **Edit Class**\n` +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      `**Current:** ${character.class} - ${character.subclass}\n\n` +
      'Select a new class.'
    )
    .setTimestamp();

  const classOptions = Object.entries(CLASSES).map(([name, data]) => {
    const iconId = data.iconId || null;
    return {
      label: name,
      value: name,
      description: data.role,
      emoji: iconId ? { id: iconId } : data.emoji
    };
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`edit_select_class_${userId}`)
    .setPlaceholder('🎭 Pick your class')
    .addOptions(classOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_edit_field_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleClassEdit(interaction, userId) {
  const className = interaction.values[0];
  const currentState = state.get(userId, 'edit');

  console.log('[EDIT] Class selected:', className);
  state.set(userId, 'edit', { ...currentState, newClass: className });

  const subclasses = CLASSES[className].subclasses;
  const classRole = CLASSES[className].role;

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      `# ✨ **Edit Subclass**\n` +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      `**Class:** ${className}\n\n` +
      'Select a new subclass.'
    )
    .setTimestamp();

  const subclassOptions = subclasses.map(subclassName => {
    const roleEmoji = classRole === 'Tank' ? '🛡️' : classRole === 'DPS' ? '⚔️' : '💚';
    const iconId = CLASSES[className]?.iconId || null;

    return {
      label: subclassName,
      value: subclassName,
      description: classRole,
      emoji: iconId ? { id: iconId } : roleEmoji
    };
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`edit_select_subclass_${userId}`)
    .setPlaceholder('📋 Pick your subclass')
    .addOptions(subclassOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_edit_class_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleSubclassEdit(interaction, userId) {
  const subclassName = interaction.values[0];
  const currentState = state.get(userId, 'edit');
  const character = currentState.character;
  const newClass = currentState.newClass;

  try {
    const oldClass = character.class;

    // Update character
    await CharacterRepo.update(character.id, {
      class: newClass,
      subclass: subclassName
    });

    console.log('[EDIT] Updated class/subclass for character:', character.id);

    // Update class roles
    if (oldClass !== newClass) {
      // Check if old class is still used
      const stillUsesOldClass = await classRoleService.checkClassUsage(userId, oldClass);
      if (!stillUsesOldClass) {
        await classRoleService.removeClassRole(userId, oldClass);
      }

      // Add new class role
      await classRoleService.addClassRole(userId, newClass);
    }

    // Show success and return to profile
    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.update({
      embeds: [embed],
      components: buttons
    });

    logger.edit(interaction.user.username, character.ign, 'class', `${oldClass} → ${newClass} - ${subclassName}`);
    state.clear(userId, 'edit');
  } catch (error) {
    console.error('[EDIT ERROR]', error);
    logger.error('Edit', `Class edit error: ${error.message}`, error);

    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// SCORE EDITING
// ═══════════════════════════════════════════════════════════════════

async function showScoreSelection(interaction, userId) {
  const currentState = state.get(userId, 'edit');
  const character = currentState.character;

  // ✅ FIXED: Score selection with current score range
  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      `# 💪 **Edit Ability Score**\n` +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      `**Current:** ${getScoreRange(character.ability_score)}\n\n` +
      'Select a new score range.'
    )
    .setTimestamp();

  const scoreOptions = ABILITY_SCORES.map(score => ({
    label: score.label,
    value: score.value,
    description: 'Your ability score range',
    emoji: '💪'
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`edit_select_score_${userId}`)
    .setPlaceholder('💪 Pick your score')
    .addOptions(scoreOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_edit_field_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleScoreEdit(interaction, userId) {
  const newScore = interaction.values[0];
  const currentState = state.get(userId, 'edit');
  const character = currentState.character;

  try {
    await CharacterRepo.update(character.id, {
      ability_score: newScore
    });

    console.log('[EDIT] Updated score for character:', character.id);

    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.update({
      embeds: [embed],
      components: buttons
    });

    logger.edit(interaction.user.username, character.ign, 'score', `${character.ability_score} → ${newScore}`);
    state.clear(userId, 'edit');
  } catch (error) {
    console.error('[EDIT ERROR]', error);
    logger.error('Edit', `Score edit error: ${error.message}`, error);

    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// IGN/UID EDITING
// ═══════════════════════════════════════════════════════════════════

async function showIGNModal(interaction, userId) {
  const currentState = state.get(userId, 'edit');
  const character = currentState.character;

  const modal = new ModalBuilder()
    .setCustomId(`edit_ign_modal_${userId}`)
    .setTitle('Edit IGN');

  const ignInput = new TextInputBuilder()
    .setCustomId('ign')
    .setLabel('In-Game Name (IGN)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter new IGN')
    .setValue(character.ign)
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(ignInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

export async function handleIGNEdit(interaction, userId) {
  const newIGN = interaction.fields.getTextInputValue('ign');
  const currentState = state.get(userId, 'edit');
  const character = currentState.character;

  try {
    await CharacterRepo.update(character.id, { ign: newIGN });
    console.log('[EDIT] Updated IGN for character:', character.id);

    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.update({
      embeds: [embed],
      components: buttons
    });

    logger.edit(interaction.user.username, character.ign, 'ign', `${character.ign} → ${newIGN}`);
    state.clear(userId, 'edit');
  } catch (error) {
    console.error('[EDIT ERROR]', error);
    logger.error('Edit', `IGN edit error: ${error.message}`, error);

    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      components: []
    });
  }
}

async function showUIDModal(interaction, userId) {
  const currentState = state.get(userId, 'edit');
  const character = currentState.character;

  const modal = new ModalBuilder()
    .setCustomId(`edit_uid_modal_${userId}`)
    .setTitle('Edit UID');

  const uidInput = new TextInputBuilder()
    .setCustomId('uid')
    .setLabel('User ID (UID)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter new UID')
    .setValue(character.uid)
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(uidInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

export async function handleUIDEdit(interaction, userId) {
  const newUID = interaction.fields.getTextInputValue('uid').trim();
  const currentState = state.get(userId, 'edit');
  const character = currentState.character;

  if (!/^\d+$/.test(newUID)) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setDescription(
        '# ❌ **Invalid UID**\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '**UID must contain only numbers.**\n\n' +
        `You entered: \`${newUID}\`\n\n` +
        'Please try again.'
      );

    const retryButton = new ButtonBuilder()
      .setCustomId(`retry_edit_uid_${userId}`)
      .setLabel('✏️ Retry')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(retryButton);

    await interaction.update({
      embeds: [errorEmbed],
      components: [row]
    });
    return;
  }

  try {
    await CharacterRepo.update(character.id, { uid: newUID });
    console.log('[EDIT] Updated UID for character:', character.id);

    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.update({
      embeds: [embed],
      components: buttons
    });

    logger.edit(interaction.user.username, character.ign, 'uid', `${character.uid} → ${newUID}`);
    state.clear(userId, 'edit');
  } catch (error) {
    console.error('[EDIT ERROR]', error);
    logger.error('Edit', `UID edit error: ${error.message}`, error);

    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      components: []
    });
  }
}

export async function retryUIDEdit(interaction, userId) {
  await showUIDModal(interaction, userId);
}

// ═══════════════════════════════════════════════════════════════════
// GUILD EDITING
// ═══════════════════════════════════════════════════════════════════

async function showGuildSelection(interaction, userId) {
  const currentState = state.get(userId, 'edit');
  const character = currentState.character;

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      `# 🏰 **Edit Guild**\n` +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      `**Current:** ${character.guild}\n\n` +
      'Select a new guild.'
    )
    .setTimestamp();

  const config = await import('../config/index.js').then(m => m.default);
  const guildOptions = config.guilds.map(guild => ({
    label: guild.name,
    value: guild.name,
    emoji: guild.name === 'iDolls' ? '💖' : guild.name === 'Visitor' ? '👋' : '🤝'
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`edit_select_guild_${userId}`)
    .setPlaceholder('🏰 Select your guild')
    .addOptions(guildOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_edit_field_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleGuildEdit(interaction, userId) {
  const newGuild = interaction.values[0];
  const currentState = state.get(userId, 'edit');
  const character = currentState.character;

  try {
    await CharacterRepo.update(character.id, { guild: newGuild });
    console.log('[EDIT] Updated guild for character:', character.id);

    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.update({
      embeds: [embed],
      components: buttons
    });

    logger.edit(interaction.user.username, character.ign, 'guild', `${character.guild} → ${newGuild}`);
    state.clear(userId, 'edit');
  } catch (error) {
    console.error('[EDIT ERROR]', error);
    logger.error('Edit', `Guild edit error: ${error.message}`, error);

    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// BATTLE IMAGINE EDITING
// ═══════════════════════════════════════════════════════════════════

async function showBattleImagineSelection(interaction, userId) {
  const currentState = state.get(userId, 'edit');
  const character = currentState.character;

  const battleImagines = await BattleImagineRepo.findByCharacter(character.id);

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      `# ⚔️ **Edit Battle Imagines**\n` +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      (battleImagines.length > 0
        ? '**Current Battle Imagines:**\n' + battleImagines.map(bi => `• ${bi.imagine_name}: ${bi.tier}`).join('\n') + '\n\n'
        : '**No Battle Imagines set.**\n\n') +
      'Select a Battle Imagine to edit.'
    )
    .setTimestamp();

  const config = await import('../config/index.js').then(m => m.default);
  const biOptions = config.battleImagines.map(bi => ({
    label: bi.name,
    value: bi.name,
    emoji: '⚔️'
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`edit_select_bi_${userId}`)
    .setPlaceholder('⚔️ Select Battle Imagine')
    .addOptions(biOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_edit_field_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function selectBattleImagine(interaction, userId) {
  const biName = interaction.values[0];
  const currentState = state.get(userId, 'edit');

  console.log('[EDIT] Selected BI:', biName);
  state.set(userId, 'edit', { ...currentState, selectedBI: biName });

  const character = currentState.character;
  const existing = await BattleImagineRepo.findByCharacter(character.id);
  const biData = existing.find(bi => bi.imagine_name === biName);

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      `# ⚔️ **Edit ${biName}**\n` +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      (biData ? `**Current Tier:** ${biData.tier}\n\n` : `**Not set**\n\n`) +
      'Select a new tier (or None to remove).'
    )
    .setTimestamp();

  const tierOptions = [
    { label: 'None', value: 'none', emoji: '❌', description: `Remove ${biName}` },
    { label: 'Tier 0', value: 'T0', emoji: '0️⃣' },
    { label: 'Tier 1', value: 'T1', emoji: '1️⃣' },
    { label: 'Tier 2', value: 'T2', emoji: '2️⃣' },
    { label: 'Tier 3', value: 'T3', emoji: '3️⃣' },
    { label: 'Tier 4', value: 'T4', emoji: '4️⃣' },
    { label: 'Tier 5', value: 'T5', emoji: '5️⃣' }
  ];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`edit_select_bi_tier_${userId}`)
    .setPlaceholder('⚔️ Select tier')
    .addOptions(tierOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_edit_bi_list_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleBattleImagineTierEdit(interaction, userId) {
  const tier = interaction.values[0];
  const currentState = state.get(userId, 'edit');
  const character = currentState.character;
  const biName = currentState.selectedBI;

  try {
    if (tier === 'none') {
      await BattleImagineRepo.delete(character.id, biName);
      console.log('[EDIT] Removed BI:', biName);
      logger.edit(interaction.user.username, character.ign, 'battle_imagine', `Removed ${biName}`);
    } else {
      await BattleImagineRepo.add(character.id, biName, tier);
      console.log('[EDIT] Updated BI:', biName, tier);
      logger.edit(interaction.user.username, character.ign, 'battle_imagine', `${biName}: ${tier}`);
    }

    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.update({
      embeds: [embed],
      components: buttons
    });

    state.clear(userId, 'edit');
  } catch (error) {
    console.error('[EDIT ERROR]', error);
    logger.error('Edit', `BI edit error: ${error.message}`, error);

    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// DISCORD NICKNAME EDITING
// ═══════════════════════════════════════════════════════════════════

async function showNicknameSelection(interaction, userId) {
  const characters = await CharacterRepo.findAllByUser(userId);
  const main = characters.find(c => c.character_type === 'main');
  const alts = characters.filter(c => c.character_type === 'alt');
  
  if (!main) {
    await interaction.update({
      content: '❌ No main character found.',
      components: []
    });
    return;
  }

  // Get current nickname preferences
  const prefs = await NicknamePrefsRepo.get(userId);
  const currentNickname = await buildNickname(userId);

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      `# 🏷️ **Edit Discord Nickname**\n` +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      `**Current Nickname:** ${currentNickname}\n\n` +
      '**Select which characters to include:**\n' +
      '• Main character is always shown first\n' +
      '• Select "All" to include all characters\n' +
      '• Characters are joined with middle dot (·)\n' +
      '• Maximum Discord nickname length: 32 characters'
    )
    .setTimestamp();

  // Build options
  const options = [];
  
  // Add "All" option
  options.push({
    label: 'All Characters',
    value: 'all',
    description: `${main.ign}${alts.length > 0 ? ' + ' + alts.length + ' alt(s)' : ''}`,
    emoji: '✨',
    default: prefs === null || (prefs && prefs.length === alts.length)
  });
  
  // Add main (always included, but shown for clarity)
  options.push({
    label: `${main.ign} (Main)`,
    value: `main_${main.id}`,
    description: 'Always included',
    emoji: '👑',
    default: true // Always selected
  });
  
  // Add alts
  for (const alt of alts) {
    options.push({
      label: alt.ign,
      value: `alt_${alt.id}`,
      description: `${alt.class} - Alt`,
      emoji: '🎭',
      default: prefs && prefs.includes(alt.id)
    });
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`edit_select_nickname_${userId}`)
    .setPlaceholder('🏷️ Select characters for nickname')
    .setMinValues(1)
    .setMaxValues(options.length)
    .addOptions(options);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_edit_field_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleNicknameEdit(interaction, userId) {
  const selections = interaction.values;
  
  try {
    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');
    const alts = characters.filter(c => c.character_type === 'alt');
    
    if (!main) {
      await interaction.update({
        content: '❌ No main character found.',
        components: []
      });
      return;
    }

    let selectedCharIds = [];

    // Check if "All" was selected
    if (selections.includes('all')) {
      // Include all alt character IDs
      selectedCharIds = alts.map(alt => alt.id);
    } else {
      // Extract selected alt IDs (main is always included, don't store it)
      for (const selection of selections) {
        if (selection.startsWith('alt_')) {
          const altId = parseInt(selection.split('_')[1]);
          selectedCharIds.push(altId);
        }
      }
    }

    // Save preferences
    await NicknamePrefsRepo.set(userId, selectedCharIds);
    console.log('[EDIT] Updated nickname preferences:', selectedCharIds);

    // Update Discord nickname
    const result = await updateNickname(interaction.client, config.discord.guildId, userId);
    
    if (!result.success) {
      console.error('[EDIT] Failed to update Discord nickname:', result.reason);
    }

    // Build preview of new nickname
    const newNickname = await buildNickname(userId);

    // Show success and return to profile
    const allCharacters = await CharacterRepo.findAllByUser(userId);
    const mainChar = allCharacters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, allCharacters, interaction);
    const buttons = ui.profileButtons(userId, !!mainChar);

    // Add a field to show the updated nickname
    embed.addFields({
      name: '🏷️ Discord Nickname Updated',
      value: `**New Nickname:** ${newNickname}\n${result.success ? '✅ Synced to Discord' : '⚠️ ' + result.reason}`,
      inline: false
    });

    await interaction.update({
      embeds: [embed],
      components: buttons
    });

    logger.edit(interaction.user.username, 'Discord Nickname', 'nickname', newNickname);
    state.clear(userId, 'edit');
  } catch (error) {
    console.error('[EDIT ERROR]', error);
    logger.error('Edit', `Nickname edit error: ${error.message}`, error);

    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// BACK NAVIGATION
// ═══════════════════════════════════════════════════════════════════

export async function backToEditSelect(interaction, userId) {
  await start(interaction, userId);
}

export async function backToEditField(interaction, userId) {
  const currentState = state.get(userId, 'edit');
  if (!currentState || !currentState.character) {
    await start(interaction, userId);
    return;
  }
  
  // Recreate the interaction.values array
  interaction.values = [String(currentState.character.id)];
  await selectCharacter(interaction, userId);
}

export async function backToEditClass(interaction, userId) {
  await showClassSelection(interaction, userId);
}

export async function backToBIList(interaction, userId) {
  await showBattleImagineSelection(interaction, userId);
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export default {
  showEditMenu,
  start,
  selectCharacter,
  selectField,
  handleClassEdit,
  handleSubclassEdit,
  handleScoreEdit,
  handleIGNEdit,
  handleUIDEdit,
  retryUIDEdit,
  handleGuildEdit,
  selectBattleImagine,
  handleBattleImagineTierEdit,
  handleNicknameEdit,
  backToEditSelect,
  backToEditField,
  backToEditClass,
  backToBIList
};
