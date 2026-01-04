import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { CharacterRepo } from '../database/repositories.js';
import * as ui from '../ui/components.js';
import { profileEmbed } from '../ui/embeds.js';
import { getScoreRange } from '../ui/utils.js';
import { COLORS } from '../config/game.js';
import logger from '../services/logger.js';
import * as classRoleService from '../services/classRoles.js';

// ═══════════════════════════════════════════════════════════════════
// REMOVE - SELECT TYPE
// ═══════════════════════════════════════════════════════════════════

export async function start(interaction, userId) {
  console.log('[REMOVE] Starting remove for user:', userId);

  const characters = await CharacterRepo.findAllByUser(userId);
  const main = characters.find(c => c.character_type === 'main');
  const alts = characters.filter(c => c.character_type === 'alt');
  const subclasses = characters.filter(c => c.character_type === 'main_subclass');

  if (!main) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setDescription('# ❌ **No Characters**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nYou have no characters to remove.')
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#FF9900')
    .setDescription(
      '# 🗑️ **Remove Character**\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '⚠️ **Warning:** This action cannot be undone!\n\n' +
      'What would you like to remove?'
    )
    .setTimestamp();

  const options = [];

  // Add main option (with subclasses warning if any)
  if (main) {
    const subclassWarning = subclasses.length > 0 ? ` (+ ${subclasses.length} subclass${subclasses.length > 1 ? 'es' : ''})` : '';
    options.push({
      label: `Main Character${subclassWarning}`,
      value: 'main',
      description: `${main.ign} - ${main.class}`,
      emoji: '🎮'
    });
  }

  // ✅ FIXED: Add subclass options with score range
  subclasses.forEach(sub => {
    options.push({
      label: `Subclass: ${sub.class}`,
      value: `subclass_${sub.id}`,
      description: `${sub.subclass} - ${getScoreRange(sub.ability_score)}`,
      emoji: '✨'
    });
  });

  // Add alt options
  alts.forEach(alt => {
    options.push({
      label: `Alt: ${alt.ign}`,
      value: `alt_${alt.id}`,
      description: `${alt.class} - ${alt.subclass}`,
      emoji: '🎭'
    });
  });

  // Add remove all option
  options.push({
    label: 'Remove All Data',
    value: 'all',
    description: 'Delete all characters and data',
    emoji: '💀'
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_remove_type_${userId}`)
    .setPlaceholder('🗑️ Select what to remove')
    .addOptions(options);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_profile_${userId}`)
    .setLabel('◀️ Back to Profile')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

// ═══════════════════════════════════════════════════════════════════
// REMOVE - CONFIRM
// ═══════════════════════════════════════════════════════════════════

export async function selectRemoveType(interaction, userId) {
  const selectedType = interaction.values[0];

  console.log('[REMOVE] Selected type:', selectedType);

  if (selectedType === 'main') {
    await confirmRemoveMain(interaction, userId);
  } else if (selectedType === 'all') {
    await confirmRemoveAll(interaction, userId);
  } else if (selectedType.startsWith('subclass_')) {
    const subclassId = parseInt(selectedType.split('_')[1]);
    await confirmRemoveSubclass(interaction, userId, subclassId);
  } else if (selectedType.startsWith('alt_')) {
    const altId = parseInt(selectedType.split('_')[1]);
    await confirmRemoveAlt(interaction, userId, altId);
  }
}

async function confirmRemoveMain(interaction, userId) {
  const main = await CharacterRepo.findMain(userId);
  const subclasses = await CharacterRepo.findSubclasses(main.id);

  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setDescription(
      `# ⚠️ **Remove Main Character?**\n` +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '**You are about to remove:**\n\n' +
      `🎮 **IGN:** ${main.ign}\n` +
      `🆔 **UID:** ${main.uid}\n` +
      `🎭 **Class:** ${main.class} - ${main.subclass}\n` +
      `💪 **Score:** ${getScoreRange(main.ability_score)}\n` +
      `🏰 **Guild:** ${main.guild}\n\n` +
      (subclasses.length > 0
        ? `⚠️ **This will also remove ${subclasses.length} subclass${subclasses.length > 1 ? 'es' : ''}:**\n` +
          subclasses.map(s => `  • ${s.class} - ${s.subclass}`).join('\n') + '\n\n'
        : '') +
      '**This action cannot be undone!**'
    )
    .setTimestamp();

  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirm_remove_main_${userId}`)
    .setLabel('✅ Yes, Remove Main')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cancel_remove_${userId}`)
    .setLabel('❌ Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  await interaction.update({ embeds: [embed], components: [row] });
}

async function confirmRemoveSubclass(interaction, userId, subclassId) {
  const subclass = await CharacterRepo.findById(subclassId);

  if (!subclass) {
    await interaction.update({
      content: '❌ Subclass not found.',
      components: []
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#FF9900')
    .setDescription(
      `# ⚠️ **Remove Subclass?**\n` +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '**You are about to remove:**\n\n' +
      `🎭 **Class:** ${subclass.class}\n` +
      `✨ **Subclass:** ${subclass.subclass}\n` +
      `💪 **Score:** ${getScoreRange(subclass.ability_score)}\n\n` +
      '**This action cannot be undone!**'
    )
    .setTimestamp();

  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirm_remove_subclass_${userId}_${subclassId}`)
    .setLabel('✅ Yes, Remove Subclass')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cancel_remove_${userId}`)
    .setLabel('❌ Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  await interaction.update({ embeds: [embed], components: [row] });
}

async function confirmRemoveAlt(interaction, userId, altId) {
  const alt = await CharacterRepo.findById(altId);

  if (!alt) {
    await interaction.update({
      content: '❌ Alt character not found.',
      components: []
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#FF9900')
    .setDescription(
      `# ⚠️ **Remove Alt Character?**\n` +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '**You are about to remove:**\n\n' +
      `🎮 **IGN:** ${alt.ign}\n` +
      `🆔 **UID:** ${alt.uid}\n` +
      `🎭 **Class:** ${alt.class} - ${alt.subclass}\n` +
      `💪 **Score:** ${getScoreRange(alt.ability_score)}\n` +
      `🏰 **Guild:** ${alt.guild}\n\n` +
      '**This action cannot be undone!**'
    )
    .setTimestamp();

  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirm_remove_alt_${userId}_${altId}`)
    .setLabel('✅ Yes, Remove Alt')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cancel_remove_${userId}`)
    .setLabel('❌ Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  await interaction.update({ embeds: [embed], components: [row] });
}

async function confirmRemoveAll(interaction, userId) {
  const characters = await CharacterRepo.findAllByUser(userId);

  const embed = new EmbedBuilder()
    .setColor('#8B0000')
    .setDescription(
      `# 💀 **Remove ALL Data?**\n` +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '**⚠️ EXTREME WARNING ⚠️**\n\n' +
      `**This will permanently delete ${characters.length} character${characters.length > 1 ? 's' : ''}:**\n` +
      characters.map(c => `  • ${c.ign} (${c.class})`).join('\n') + '\n\n' +
      '**ALL data will be lost forever!**\n' +
      '**This action cannot be undone!**'
    )
    .setTimestamp();

  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirm_remove_all_${userId}`)
    .setLabel('💀 YES, DELETE EVERYTHING')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cancel_remove_${userId}`)
    .setLabel('❌ Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  await interaction.update({ embeds: [embed], components: [row] });
}

// ═══════════════════════════════════════════════════════════════════
// REMOVE - EXECUTE
// ═══════════════════════════════════════════════════════════════════

export async function executeRemoveMain(interaction, userId) {
  console.log('[REMOVE] Executing remove main for user:', userId);

  try {
    const main = await CharacterRepo.findMain(userId);

    if (!main) {
      await interaction.update({
        content: '❌ Main character not found.',
        components: []
      });
      return;
    }

    const mainClass = main.class;

    // Delete subclasses
    await CharacterRepo.deleteSubclasses(main.id);
    console.log('[REMOVE] Deleted subclasses for main:', main.id);

    // Delete the main character
    await CharacterRepo.delete(main.id);
    console.log('[REMOVE] Deleted main character:', main.id);

    // 🆕 Clear nickname preferences and update Discord nickname
    const { NicknamePrefsRepo, updateNickname } = await import('../services/nickname.js');
    const config = await import('../config/index.js').then(m => m.default);
    
    // Get remaining characters to check if there's a new main
    const remainingChars = await CharacterRepo.findAllByUser(userId);
    const newMain = remainingChars.find(c => c.character_type === 'main');
    
    if (newMain) {
      // User still has a main, update nickname preferences to empty (just main name)
      await NicknamePrefsRepo.set(userId, []);
      await updateNickname(interaction.client, config.discord.guildId, userId);
      console.log('[REMOVE] Updated Discord nickname for new main');
    }

    // Update class roles - check if class is still used
    const remainingCharacters = await CharacterRepo.findAllByUser(userId);
    const stillUsesClass = remainingCharacters.some(c => c.class === mainClass);

    if (!stillUsesClass) {
      await classRoleService.removeClassRole(userId, mainClass);
      console.log('[REMOVE] Removed class role:', mainClass);
    }

    // Also check subclass roles
    const subclasses = await CharacterRepo.findSubclasses(userId);
    for (const sub of subclasses) {
      const stillUsesSubClass = remainingCharacters.some(c => c.class === sub.class);
      if (!stillUsesSubClass) {
        await classRoleService.removeClassRole(userId, sub.class);
      }
    }

    // Show updated profile or no characters message
    const characters = await CharacterRepo.findAllByUser(userId);
    const newMain = characters.find(c => c.character_type === 'main');

    if (characters.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setDescription(
          '# ✅ **Main Character Removed**\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          `**${main.ign}** has been removed.\n\n` +
          'You have no characters registered.\n' +
          'Use `/register` to create a new character.'
        )
        .setTimestamp();

      await interaction.update({ embeds: [embed], components: [] });
    } else {
      const embed = await profileEmbed(interaction.user, characters, interaction);
      const buttons = ui.profileButtons(userId, !!newMain);

      await interaction.update({
        embeds: [embed],
        components: buttons
      });
    }

    logger.delete(interaction.user.username, main.ign, main.class);
  } catch (error) {
    console.error('[REMOVE ERROR]', error);
    logger.error('Remove', `Remove main error: ${error.message}`, error);

    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      components: []
    });
  }
}

export async function executeRemoveSubclass(interaction, userId, subclassId) {
  console.log('[REMOVE] Executing remove subclass:', subclassId);

  try {
    const subclass = await CharacterRepo.findById(subclassId);

    if (!subclass) {
      await interaction.update({
        content: '❌ Subclass not found.',
        components: []
      });
      return;
    }

    const subclassClass = subclass.class;

    // Delete the subclass
    await CharacterRepo.delete(subclassId);
    console.log('[REMOVE] Deleted subclass:', subclassId);

    // 🆕 Clean up nickname preferences
    const { NicknamePrefsRepo, updateNickname } = await import('../services/nickname.js');
    const prefs = await NicknamePrefsRepo.get(userId);
    if (prefs && prefs.includes(subclassId)) {
      const updatedPrefs = prefs.filter(id => id !== subclassId);
      await NicknamePrefsRepo.set(userId, updatedPrefs);
      console.log('[REMOVE] Cleaned up nickname preferences for subclass:', subclassId);
      
      // Update Discord nickname to reflect the change
      const config = await import('../config/index.js').then(m => m.default);
      await updateNickname(interaction.client, config.discord.guildId, userId);
      console.log('[REMOVE] Updated Discord nickname');
    }

    // Update class roles - check if class is still used
    const remainingCharacters = await CharacterRepo.findAllByUser(userId);
    const stillUsesClass = remainingCharacters.some(c => c.class === subclassClass);

    if (!stillUsesClass) {
      await classRoleService.removeClassRole(userId, subclassClass);
      console.log('[REMOVE] Removed class role:', subclassClass);
    }

    // Show updated profile
    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.update({
      embeds: [embed],
      components: buttons
    });

    logger.delete(interaction.user.username, subclass.ign, `${subclass.class} (subclass)`);
  } catch (error) {
    console.error('[REMOVE ERROR]', error);
    logger.error('Remove', `Remove subclass error: ${error.message}`, error);

    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      components: []
    });
  }
}

export async function executeRemoveAlt(interaction, userId, altId) {
  console.log('[REMOVE] Executing remove alt:', altId);

  try {
    const alt = await CharacterRepo.findById(altId);

    if (!alt) {
      await interaction.update({
        content: '❌ Alt character not found.',
        components: []
      });
      return;
    }

    const altClass = alt.class;

    // Delete the alt
    await CharacterRepo.delete(altId);
    console.log('[REMOVE] Deleted alt:', altId);

    // 🆕 Clean up nickname preferences
    const { NicknamePrefsRepo, updateNickname } = await import('../services/nickname.js');
    const prefs = await NicknamePrefsRepo.get(userId);
    if (prefs && prefs.includes(altId)) {
      const updatedPrefs = prefs.filter(id => id !== altId);
      await NicknamePrefsRepo.set(userId, updatedPrefs);
      console.log('[REMOVE] Cleaned up nickname preferences for alt:', altId);
      
      // Update Discord nickname to reflect the change
      const config = await import('../config/index.js').then(m => m.default);
      await updateNickname(interaction.client, config.discord.guildId, userId);
      console.log('[REMOVE] Updated Discord nickname');
    }

    // Update class roles - check if class is still used
    const remainingCharacters = await CharacterRepo.findAllByUser(userId);
    const stillUsesClass = remainingCharacters.some(c => c.class === altClass);

    if (!stillUsesClass) {
      await classRoleService.removeClassRole(userId, altClass);
      console.log('[REMOVE] Removed class role:', altClass);
    }

    // Show updated profile
    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.update({
      embeds: [embed],
      components: buttons
    });

    logger.delete(interaction.user.username, alt.ign, alt.class);
  } catch (error) {
    console.error('[REMOVE ERROR]', error);
    logger.error('Remove', `Remove alt error: ${error.message}`, error);

    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      components: []
    });
  }
}

export async function executeRemoveAll(interaction, userId) {
  console.log('[REMOVE] Executing remove all for user:', userId);

  try {
    const characters = await CharacterRepo.findAllByUser(userId);

    // Collect all unique classes
    const allClasses = new Set(characters.map(c => c.class));

    // Delete all characters
    for (const character of characters) {
      await CharacterRepo.delete(character.id);
    }

    console.log('[REMOVE] Deleted all characters for user:', userId);

    // 🆕 Clear all nickname preferences and reset Discord nickname
    const { NicknamePrefsRepo, updateNickname } = await import('../services/nickname.js');
    const config = await import('../config/index.js').then(m => m.default);
    await NicknamePrefsRepo.set(userId, []);
    
    // Reset Discord nickname to username (since no characters left)
    const guild = await interaction.client.guilds.fetch(config.discord.guildId);
    const member = await guild.members.fetch(userId);
    if (member && member.nickname) {
      await member.setNickname(null, 'All characters removed');
      console.log('[REMOVE] Reset Discord nickname to username');
    }
    console.log('[REMOVE] Cleared nickname preferences');

    // Remove all class roles
    for (const className of allClasses) {
      await classRoleService.removeClassRole(userId, className);
      console.log('[REMOVE] Removed class role:', className);
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setDescription(
        '# ✅ **All Data Removed**\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        `**All ${characters.length} character${characters.length > 1 ? 's' : ''} have been removed.**\n\n` +
        'You have no characters registered.\n' +
        'Use `/register` to create a new character.'
      )
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });

    logger.delete(interaction.user.username, 'ALL', `Removed ${characters.length} characters`);
  } catch (error) {
    console.error('[REMOVE ERROR]', error);
    logger.error('Remove', `Remove all error: ${error.message}`, error);

    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CANCEL
// ═══════════════════════════════════════════════════════════════════

export async function cancelRemove(interaction, userId) {
  console.log('[REMOVE] Cancelled remove for user:', userId);

  const characters = await CharacterRepo.findAllByUser(userId);
  const main = characters.find(c => c.character_type === 'main');

  const embed = await profileEmbed(interaction.user, characters, interaction);
  const buttons = ui.profileButtons(userId, !!main);

  await interaction.update({
    embeds: [embed],
    components: buttons
  });
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export default {
  start,
  selectRemoveType,
  executeRemoveMain,
  executeRemoveSubclass,
  executeRemoveAlt,
  executeRemoveAll,
  cancelRemove
};
