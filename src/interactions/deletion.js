import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { CharacterRepo, UserRepo, BattleImagineRepo, ApplicationRepo } from '../database/repositories.js';
import { updateNickname, removeNickname } from '../services/nickname.js';
import * as ui from '../ui/components.js';
import { profileEmbed } from '../ui/profile.js';
import { COLORS } from '../utils/constants.js';
import config from '../config.js';
import logger from '../utils/logger.js';
import * as classRoleService from '../services/classRole.js';

// ═══════════════════════════════════════════════════════════════════
// DELETE MAIN CHARACTER
// ═══════════════════════════════════════════════════════════════════

export async function handleDelete(interaction, userId) {
  console.log('[DELETION] Delete requested for user:', userId);

  const main = await CharacterRepo.findMain(userId);
  const alts = await CharacterRepo.findAlts(userId);
  
  if (!main) {
    const errorEmbed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setDescription(
        '# ❌ **No Main Character**\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        'You don\'t have a main character to delete.'
      )
      .setTimestamp();
    
    await interaction.update({ embeds: [errorEmbed], components: [] });
    return;
  }

  // If user has alts, offer to promote one
  if (alts.length > 0) {
    const warningEmbed = new EmbedBuilder()
      .setColor('#FF9900')
      .setDescription(
        '# ⚠️ **Delete Main Character**\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        `**Main Character:** ${main.ign}\n\n` +
        `**You have ${alts.length} alt character${alts.length > 1 ? 's' : ''}:**\n` +
        alts.map(a => `  • ${a.ign} (${a.class})`).join('\n') + '\n\n' +
        '**Choose an option:**\n' +
        '• **Promote Alt**: Keep your alts and promote one to main\n' +
        '• **Delete Main Only**: Delete main + subclasses, keep alts\n\n' +
        '**Note:** Your Discord nickname will be removed.'
      )
      .setTimestamp();

    const promoteButton = new ButtonBuilder()
      .setCustomId(`promote_alt_${userId}`)
      .setLabel('⬆️ Promote Alt to Main')
      .setStyle(ButtonStyle.Primary);

    const deleteMainButton = new ButtonBuilder()
      .setCustomId(`confirm_delete_main_only_${userId}`)
      .setLabel('🗑️ Delete Main Only')
      .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_delete_${userId}`)
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(promoteButton, deleteMainButton, cancelButton);

    await interaction.update({ embeds: [warningEmbed], components: [row] });
    return;
  }

  // No alts, show normal delete confirmation
  const subclasses = await CharacterRepo.findSubclasses(userId);

  const warningEmbed = new EmbedBuilder()
    .setColor('#FF0000')
    .setDescription(
      '# ⚠️ **Delete Main Character**\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      `**This will delete:**\n` +
      `• Main: ${main.ign}\n` +
      (subclasses.length > 0 
        ? `• ${subclasses.length} subclass${subclasses.length > 1 ? 'es' : ''}:\n${subclasses.map(s => `  - ${s.class}`).join('\n')}\n`
        : '') +
      '\n**This action cannot be undone!**\n' +
      'Your Discord nickname will be removed.'
    )
    .setTimestamp();

  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirm_delete_main_${userId}`)
    .setLabel('✅ Yes, Delete Main')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cancel_delete_${userId}`)
    .setLabel('❌ Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  await interaction.update({ embeds: [warningEmbed], components: [row] });
}

// ═══════════════════════════════════════════════════════════════════
// PROMOTE ALT TO MAIN
// ═══════════════════════════════════════════════════════════════════

export async function showAltPromotionSelection(interaction, userId) {
  console.log('[DELETION] Showing alt promotion selection for user:', userId);

  const alts = await CharacterRepo.findAlts(userId);

  if (alts.length === 0) {
    await handleDelete(interaction, userId);
    return;
  }

  const selectionEmbed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      '# ⬆️ **Promote Alt to Main**\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      'Select which alt to promote to main character:\n\n' +
      '**Your Alts:**\n' +
      alts.map((a, i) => `${i + 1}. ${a.ign} - ${a.class} (${a.subclass})`).join('\n')
    )
    .setTimestamp();

  const altOptions = alts.map((alt, index) => ({
    label: `${alt.ign} - ${alt.class}`,
    value: alt.id.toString(),
    description: `${alt.subclass} | ${alt.ability_score}`,
    emoji: '🎮'
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_alt_promote_${userId}`)
    .setPlaceholder('Choose an alt to promote')
    .addOptions(altOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_delete_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [selectionEmbed], components: [row1, row2] });
}

export async function confirmAltPromotion(interaction, userId, altId) {
  console.log('[DELETION] Confirming alt promotion:', altId);

  try {
    const main = await CharacterRepo.findMain(userId);
    const alt = await CharacterRepo.findById(altId);

    if (!main || !alt) {
      throw new Error('Character not found');
    }

    // Delete subclasses first
    await CharacterRepo.deleteSubclasses(main.id);
    console.log('[DELETION] Deleted subclasses for main:', main.id);

    // Remove class roles that are no longer needed
    const remainingAlts = await CharacterRepo.findAlts(userId);
    const remainingAltClasses = new Set(remainingAlts.filter(a => a.id !== altId).map(a => a.class));
    
    // Don't remove if the promoted alt has it
    if (!remainingAltClasses.has(main.class) && alt.class !== main.class) {
      await classRoleService.removeClassRole(userId, main.class);
    }

    // Delete the old main
    await CharacterRepo.delete(main.id);
    console.log('[DELETION] Deleted old main:', main.id);

    // Promote the alt to main
    await CharacterRepo.promoteAltToMain(altId);
    console.log('[DELETION] Promoted alt to main:', altId);

    // Update nickname to new main's IGN
    if (config.sync.nicknameEnabled) {
      try {
        const result = await updateNickname(interaction.client, config.discord.guildId, userId, alt.ign);
        if (result.success) {
          console.log(`✅ [DELETION] Nickname synced to new main: ${alt.ign}`);
        } else {
          console.error(`❌ [DELETION] Nickname sync failed: ${result.reason}`);
        }
      } catch (e) {
        console.error('[DELETION] Nickname sync error:', e.message);
      }
    }

    logger.register(interaction.user.username, 'promoted_alt', alt.ign, `from ${main.ign}`);

    const characters = await CharacterRepo.findAllByUser(userId);
    const newMain = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!newMain);

    await interaction.update({ 
      embeds: [embed], 
      components: buttons
    });

  } catch (error) {
    console.error('[DELETION ERROR]', error);
    logger.error('Deletion', `Alt promotion error: ${error.message}`, error);
    
    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      embeds: [],
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// DELETE MAIN ONLY (KEEP ALTS)
// ═══════════════════════════════════════════════════════════════════

export async function confirmDeleteMainOnly(interaction, userId) {
  console.log('[DELETION] Deleting main only for user:', userId);

  try {
    const main = await CharacterRepo.findMain(userId);
    
    if (!main) {
      throw new Error('Main character not found');
    }

    // Delete subclasses
    await CharacterRepo.deleteSubclasses(main.id);
    console.log('[DELETION] Deleted subclasses for main:', main.id);

    // Remove class roles that are no longer needed
    const alts = await CharacterRepo.findAlts(userId);
    const altClasses = new Set(alts.map(a => a.class));
    
    if (!altClasses.has(main.class)) {
      await classRoleService.removeClassRole(userId, main.class);
    }

    // Delete the main character
    await CharacterRepo.delete(main.id);
    console.log('[DELETION] Deleted main character:', main.id);

    // Remove nickname
    if (config.sync.nicknameEnabled) {
      try {
        const result = await removeNickname(interaction.client, config.discord.guildId, userId);
        if (result.success) {
          console.log('✅ [DELETION] Nickname removed');
        } else {
          console.error(`❌ [DELETION] Nickname removal failed: ${result.reason}`);
        }
      } catch (e) {
        console.error('[DELETION] Nickname removal error:', e.message);
      }
    }

    logger.register(interaction.user.username, 'deleted_main_only', main.ign, 'kept alts');

    const successEmbed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setDescription(
        '# ✅ **Main Deleted**\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        `**Deleted:** ${main.ign}\n\n` +
        `**Your ${alts.length} alt${alts.length > 1 ? 's' : ''} have been preserved.**\n\n` +
        'Use `/register` to create a new main or promote an alt.'
      )
      .setTimestamp();

    await interaction.update({ embeds: [successEmbed], components: [] });

  } catch (error) {
    console.error('[DELETION ERROR]', error);
    logger.error('Deletion', `Delete main only error: ${error.message}`, error);
    
    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      embeds: [],
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// DELETE ALL DATA
// ═══════════════════════════════════════════════════════════════════

export async function confirmDeleteAll(interaction, userId) {
  console.log('[DELETION] Deleting all data for user:', userId);

  const alts = await CharacterRepo.findAlts(userId);
  const hasAlts = alts.length > 0;

  if (hasAlts) {
    // Show choice: Main + Subclass OR Everything
    const choiceEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setDescription(
        '# ⚠️ **Delete All Data**\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '**Choose what to delete:**\n\n' +
        `**Option 1:** Main + Subclasses\n` +
        `  • Keeps your ${alts.length} alt${alts.length > 1 ? 's' : ''}\n\n` +
        `**Option 2:** Main + Subclasses + All Alts\n` +
        `  • Deletes everything\n` +
        `  • Cannot be undone!`
      )
      .setTimestamp();

    const deleteMainSubButton = new ButtonBuilder()
      .setCustomId(`confirm_delete_main_sub_${userId}`)
      .setLabel('🗑️ Main + Subclasses')
      .setStyle(ButtonStyle.Danger);

    const deleteEverythingButton = new ButtonBuilder()
      .setCustomId(`confirm_delete_everything_${userId}`)
      .setLabel('💀 Delete Everything')
      .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_delete_${userId}`)
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(deleteMainSubButton, deleteEverythingButton, cancelButton);

    await interaction.update({ embeds: [choiceEmbed], components: [row] });
    return;
  }

  // No alts, proceed with full deletion
  await performFullDeletion(interaction, userId);
}

async function performFullDeletion(interaction, userId) {
  try {
    const main = await CharacterRepo.findMain(userId);
    const alts = await CharacterRepo.findAlts(userId);
    
    // Remove all class roles
    const allCharacters = await CharacterRepo.findAllByUser(userId);
    const uniqueClasses = new Set(allCharacters.map(c => c.class));
    
    for (const className of uniqueClasses) {
      await classRoleService.removeClassRole(userId, className);
    }

    // Delete all characters
    await CharacterRepo.deleteAllByUser(userId);
    console.log('[DELETION] Deleted all characters for user:', userId);

    // Delete user record
    await UserRepo.delete(userId);
    console.log('[DELETION] Deleted user record:', userId);

    // Remove nickname
    if (config.sync.nicknameEnabled) {
      try {
        const result = await removeNickname(interaction.client, config.discord.guildId, userId);
        if (result.success) {
          console.log('✅ [DELETION] Nickname removed');
        }
      } catch (e) {
        console.error('[DELETION] Nickname removal error:', e.message);
      }
    }

    logger.register(interaction.user.username, 'deleted_all', main?.ign || 'unknown', `main + ${alts.length} alts`);

    const successEmbed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setDescription(
        '# ✅ **All Data Deleted**\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '**Your account has been cleared.**\n\n' +
        'Use `/register` to create a new character.'
      )
      .setTimestamp();

    await interaction.update({ embeds: [successEmbed], components: [] });

  } catch (error) {
    console.error('[DELETION ERROR]', error);
    logger.error('Deletion', `Full deletion error: ${error.message}`, error);
    
    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      embeds: [],
      components: []
    });
  }
}

export async function confirmDeleteMainAndSub(interaction, userId) {
  console.log('[DELETION] Deleting main + subclasses for user:', userId);

  try {
    const main = await CharacterRepo.findMain(userId);
    
    if (!main) {
      throw new Error('Main character not found');
    }

    // Delete main and subclasses
    await CharacterRepo.deleteMainAndSubclasses(userId);
    console.log('[DELETION] Deleted main and subclasses for user:', userId);

    // Remove class roles that are no longer needed
    const alts = await CharacterRepo.findAlts(userId);
    const altClasses = new Set(alts.map(a => a.class));
    
    if (!altClasses.has(main.class)) {
      await classRoleService.removeClassRole(userId, main.class);
    }
    
    const subclasses = await CharacterRepo.findSubclasses(userId);
    for (const sub of subclasses) {
      if (!altClasses.has(sub.class)) {
        await classRoleService.removeClassRole(userId, sub.class);
      }
    }

    // Remove nickname
    if (config.sync.nicknameEnabled) {
      try {
        const result = await removeNickname(interaction.client, config.discord.guildId, userId);
        if (result.success) {
          console.log('✅ [DELETION] Nickname removed');
        }
      } catch (e) {
        console.error('[DELETION] Nickname removal error:', e.message);
      }
    }

    logger.register(interaction.user.username, 'deleted_main_sub', main.ign, `kept ${alts.length} alts`);

    const successEmbed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setDescription(
        '# ✅ **Main + Subclasses Deleted**\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        `**Deleted:** ${main.ign} + subclasses\n\n` +
        `**Your ${alts.length} alt${alts.length > 1 ? 's' : ''} have been preserved.**\n\n` +
        'Use `/register` to create a new main or promote an alt.'
      )
      .setTimestamp();

    await interaction.update({ embeds: [successEmbed], components: [] });

  } catch (error) {
    console.error('[DELETION ERROR]', error);
    logger.error('Deletion', `Delete main+sub error: ${error.message}`, error);
    
    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      embeds: [],
      components: []
    });
  }
}

export async function confirmDeleteEverything(interaction, userId) {
  await performFullDeletion(interaction, userId);
}

// ═══════════════════════════════════════════════════════════════════
// DELETE SPECIFIC ALT
// ═══════════════════════════════════════════════════════════════════

export async function showDeleteAltSelection(interaction, userId) {
  console.log('[DELETION] Showing alt deletion selection for user:', userId);

  const alts = await CharacterRepo.findAlts(userId);

  if (alts.length === 0) {
    const errorEmbed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setDescription(
        '# ❌ **No Alt Characters**\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        'You don\'t have any alt characters to delete.'
      )
      .setTimestamp();
    
    await interaction.update({ embeds: [errorEmbed], components: [] });
    return;
  }

  const selectionEmbed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      '# 🗑️ **Delete Alt Character**\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      'Select which alt to delete:\n\n' +
      '**Your Alts:**\n' +
      alts.map((a, i) => `${i + 1}. ${a.ign} - ${a.class} (${a.subclass})`).join('\n')
    )
    .setTimestamp();

  const altOptions = alts.map((alt, index) => ({
    label: `${alt.ign} - ${alt.class}`,
    value: alt.id.toString(),
    description: `${alt.subclass} | ${alt.ability_score}`,
    emoji: '🎮'
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_alt_delete_${userId}`)
    .setPlaceholder('Choose an alt to delete')
    .addOptions(altOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_profile_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [selectionEmbed], components: [row1, row2] });
}

export async function confirmDeleteAlt(interaction, userId, altId) {
  console.log('[DELETION] Confirming alt deletion:', altId);

  try {
    const alt = await CharacterRepo.findById(altId);

    if (!alt) {
      throw new Error('Alt character not found');
    }

    // Check if any other characters have the same class
    const hasOtherWithClass = await CharacterRepo.hasAnyCharacterWithClass(userId, alt.class);

    // Delete the alt
    await CharacterRepo.delete(altId);
    console.log('[DELETION] Deleted alt:', altId);

    // Remove class role if no other characters have it
    if (!hasOtherWithClass) {
      await classRoleService.removeClassRole(userId, alt.class);
    }

    logger.register(interaction.user.username, 'deleted_alt', alt.ign, alt.class);

    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.update({ 
      embeds: [embed], 
      components: buttons
    });

  } catch (error) {
    console.error('[DELETION ERROR]', error);
    logger.error('Deletion', `Alt deletion error: ${error.message}`, error);
    
    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      embeds: [],
      components: []
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// CANCEL DELETION
// ═══════════════════════════════════════════════════════════════════

export async function cancelDelete(interaction, userId) {
  console.log('[DELETION] Cancelled deletion for user:', userId);

  const characters = await CharacterRepo.findAllByUser(userId);
  const main = characters.find(c => c.character_type === 'main');

  const embed = await profileEmbed(interaction.user, characters, interaction);
  const buttons = ui.profileButtons(userId, !!main);

  await interaction.update({ 
    embeds: [embed], 
    components: buttons
  });
}

export async function backToDelete(interaction, userId) {
  await handleDelete(interaction, userId);
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export default {
  handleDelete,
  showAltPromotionSelection,
  confirmAltPromotion,
  confirmDeleteMainOnly,
  confirmDeleteAll,
  confirmDeleteMainAndSub,
  confirmDeleteEverything,
  showDeleteAltSelection,
  confirmDeleteAlt,
  cancelDelete,
  backToDelete
};
