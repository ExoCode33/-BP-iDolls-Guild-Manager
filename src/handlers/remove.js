import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } from 'discord.js';
import { queries } from '../database/queries.js';
import stateManager from '../utils/stateManager.js';

// ✅ Extract userId from button customId (handles both user and admin contexts)
function extractUserIdFromCustomId(customId) {
  const parts = customId.split('_');
  return parts[parts.length - 1];
}

// ✅ Format ability score to range display
function formatAbilityScore(score) {
  if (!score || score === '' || score === 0) return 'Not set';
  const numScore = parseInt(score);
  const scoreRanges = {
    10000: '≤10k', 11000: '10-12k', 13000: '12-14k', 15000: '14-16k', 17000: '16-18k',
    19000: '18-20k', 21000: '20-22k', 23000: '22-24k', 25000: '24-26k', 27000: '26-28k',
    29000: '28-30k', 31000: '30-32k', 33000: '32-34k', 35000: '34-36k', 37000: '36-38k',
    39000: '38-40k', 41000: '40-42k', 43000: '42-44k', 45000: '44-46k', 47000: '46-48k',
    49000: '48-50k', 51000: '50-52k', 53000: '52-54k', 55000: '54-56k', 57000: '56k+'
  };
  return scoreRanges[numScore] || `~${numScore.toLocaleString()}`;
}

function getRoleEmoji(role) {
  const emojis = { 'Tank': '🛡️', 'DPS': '⚔️', 'Support': '💚' };
  return emojis[role] || '⭐';
}

// ==================== REMOVE MAIN CHARACTER ====================

export async function handleRemoveMain(interaction) {
  console.log('[REMOVE_MAIN] Starting handler for:', interaction.customId);
  
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    console.log('[REMOVE_MAIN] Extracted userId:', userId);
    
    const mainChar = await queries.getMainCharacter(userId);
    console.log('[REMOVE_MAIN] Main character:', mainChar ? mainChar.ign : 'none');
    
    if (!mainChar) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Main Character')
        .setDescription('This user doesn\'t have a main character to remove!')
        .setTimestamp();
      
      console.log('[REMOVE_MAIN] No main char, sending update...');
      await interaction.update({ embeds: [embed], components: [] });
      console.log('[REMOVE_MAIN] Update sent successfully');
      return;
    }

    const alts = await queries.getAltCharacters(userId);
    console.log('[REMOVE_MAIN] Found', alts.length, 'alts');
    
    console.log('[REMOVE_MAIN] Showing confirmation...');
    await showRemoveMainConfirmation(interaction, userId, mainChar, alts.length);
    console.log('[REMOVE_MAIN] Confirmation shown successfully');
    
  } catch (error) {
    console.error('[REMOVE_MAIN] ERROR:', error);
    console.error('[REMOVE_MAIN] Stack:', error.stack);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Error')
      .setDescription(`An error occurred: ${error.message}`)
      .setTimestamp();
    
    try {
      console.log('[REMOVE_MAIN] Sending error update...');
      await interaction.update({ embeds: [errorEmbed], components: [] });
      console.log('[REMOVE_MAIN] Error update sent');
    } catch (updateError) {
      console.error('[REMOVE_MAIN] Update failed, trying reply:', updateError);
      try {
        await interaction.reply({ embeds: [errorEmbed], flags: 64 });
      } catch (replyError) {
        console.error('[REMOVE_MAIN] Reply also failed:', replyError);
      }
    }
  }
}

async function showRemoveMainConfirmation(interaction, userId, mainChar, altCount) {
  console.log('[REMOVE_MAIN_CONFIRM] Building confirmation for userId:', userId);
  
  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirm_remove_main_${userId}`)
    .setLabel('Yes, Remove Main Character')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('✅');

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cancel_remove_main_${userId}`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('❌');

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('⚠️ Confirm Removal')
    .setDescription('Are you sure you want to remove this main character?')
    .addFields(
      { name: '🎮 IGN', value: mainChar.ign, inline: true },
      { name: '🎭 Class', value: `${mainChar.class} (${mainChar.subclass})`, inline: true },
      { name: '⚔️ Role', value: mainChar.role, inline: true }
    )
    .setFooter({ text: '⚠️ This action cannot be undone!' })
    .setTimestamp();

  if (altCount > 0) {
    embed.addFields({
      name: '⚠️ Warning',
      value: `This will also remove all ${altCount} alt character${altCount !== 1 ? 's' : ''} associated with this main character!`,
      inline: false
    });
  }

  console.log('[REMOVE_MAIN_CONFIRM] Sending update with embed and buttons...');
  await interaction.update({ embeds: [embed], components: [row] });
  console.log('[REMOVE_MAIN_CONFIRM] Update sent successfully');
  
  stateManager.setRemovalState(userId, { mainChar, type: 'main', isAdminEdit: userId !== interaction.user.id });
  console.log('[REMOVE_MAIN_CONFIRM] State saved');
}

export async function handleConfirmRemoveMain(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const state = stateManager.getRemovalState(userId);
    
    if (!state || !state.mainChar) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        flags: 64
      });
    }

    await interaction.deferUpdate();

    await queries.deleteMainCharacter(userId);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Character Removed')
      .setDescription('The main character (and all alt characters) have been successfully removed.')
      .addFields({
        name: '🎮 Removed IGN',
        value: state.mainChar.ign,
        inline: false
      })
      .setFooter({ text: '💡 Returning to menu...' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
    
    stateManager.clearRemovalState(userId);
    
    // ✅ Return to menu after 2 seconds
    setTimeout(async () => {
      try {
        const targetUser = await interaction.client.users.fetch(userId);
        if (state.isAdminEdit) {
          await returnToAdminMenu(interaction, userId, targetUser);
        } else {
          await returnToUserMenu(interaction, userId);
        }
      } catch (error) {
        console.error('Error returning to menu after main removal:', error);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error in handleConfirmRemoveMain:', error);
    const userId = extractUserIdFromCustomId(interaction.customId);
    stateManager.clearRemovalState(userId);
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Removal Failed')
      .setDescription('An error occurred while removing the character.')
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed], components: [] });
  }
}

export async function handleCancelRemoveMain(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  
  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('❌ Removal Cancelled')
    .setDescription('The main character was not removed.')
    .setFooter({ text: '💡 Use /edit-member-details to manage your characters' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [] });
  
  stateManager.clearRemovalState(userId);
}

// ==================== REMOVE ALT CHARACTER ====================

export async function handleRemoveAlt(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    
    const alts = await queries.getAltCharacters(userId);
    
    if (alts.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Alt Characters')
        .setDescription('This user doesn\'t have any alt characters to remove!')
        .setTimestamp();
      
      return interaction.update({ embeds: [embed], components: [] });
    }

    await showAltSelectionForRemoval(interaction, userId, alts);
    
  } catch (error) {
    console.error('Error in handleRemoveAlt:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Error')
      .setDescription('An error occurred. Please try again.')
      .setTimestamp();
    
    try {
      await interaction.update({ embeds: [errorEmbed], components: [] });
    } catch {
      await interaction.reply({ embeds: [errorEmbed], flags: 64 });
    }
  }
}

async function showAltSelectionForRemoval(interaction, userId, alts) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_alt_remove_${userId}`)
    .setPlaceholder('🗑️ Select alt character to remove')
    .addOptions(
      alts.map((alt, index) => ({
        label: alt.ign,
        value: alt.id.toString(),
        description: `${alt.class} (${alt.subclass}) - ${alt.role}`,
        emoji: getClassEmoji(alt.class)
      }))
    );

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_menu_${userId}`)
    .setLabel('Back to Menu')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('🗑️ Remove Alt Character')
    .setDescription('Select which alt character you want to remove')
    .addFields({
      name: '📋 Your Alt Characters',
      value: alts.map((alt, i) => `${i + 1}. ${alt.ign} - ${alt.class} (${alt.subclass})`).join('\n'),
      inline: false
    })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  
  stateManager.setRemovalState(userId, { alts, type: 'alt', isAdminEdit: userId !== interaction.user.id });
}

export async function handleAltSelectionForRemoval(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedAltId = parseInt(interaction.values[0]);
    const state = stateManager.getRemovalState(userId);
    
    if (!state || !state.alts) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        flags: 64
      });
    }

    const selectedAlt = state.alts.find(alt => alt.id === selectedAltId);
    
    if (!selectedAlt) {
      return interaction.reply({
        content: '❌ Alt character not found.',
        flags: 64
      });
    }

    await showRemoveAltConfirmation(interaction, userId, selectedAlt, state.isAdminEdit);
    
  } catch (error) {
    console.error('Error in handleAltSelectionForRemoval:', error);
    stateManager.clearRemovalState(extractUserIdFromCustomId(interaction.customId));
  }
}

async function showRemoveAltConfirmation(interaction, userId, alt, isAdminEdit) {
  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirm_remove_alt_${userId}`)
    .setLabel('Yes, Remove This Alt')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('✅');

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cancel_remove_alt_${userId}`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('❌');

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('⚠️ Confirm Alt Removal')
    .setDescription('Are you sure you want to remove this alt character?')
    .addFields(
      { name: '🎮 IGN', value: alt.ign, inline: true },
      { name: '🎭 Class', value: `${alt.class} (${alt.subclass})`, inline: true },
      { name: '⚔️ Role', value: alt.role, inline: true }
    )
    .setFooter({ text: '⚠️ This action cannot be undone!' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row] });
  
  stateManager.setRemovalState(userId, { alt, type: 'alt', isAdminEdit });
}

export async function handleConfirmRemoveAlt(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const state = stateManager.getRemovalState(userId);
    
    if (!state || !state.alt) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        flags: 64
      });
    }

    await interaction.deferUpdate();

    await queries.deleteCharacter(state.alt.id);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Alt Character Removed')
      .setDescription('The alt character has been successfully removed.')
      .addFields({
        name: '🎮 Removed IGN',
        value: state.alt.ign,
        inline: false
      })
      .setFooter({ text: '💡 Returning to menu...' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
    
    stateManager.clearRemovalState(userId);
    
    // ✅ Return to menu after 2 seconds
    setTimeout(async () => {
      try {
        const targetUser = await interaction.client.users.fetch(userId);
        if (state.isAdminEdit) {
          await returnToAdminMenu(interaction, userId, targetUser);
        } else {
          await returnToUserMenu(interaction, userId);
        }
      } catch (error) {
        console.error('Error returning to menu after alt removal:', error);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error in handleConfirmRemoveAlt:', error);
    const userId = extractUserIdFromCustomId(interaction.customId);
    stateManager.clearRemovalState(userId);
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Removal Failed')
      .setDescription('An error occurred while removing the alt character.')
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed], components: [] });
  }
}

export async function handleCancelRemoveAlt(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  
  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('❌ Removal Cancelled')
    .setDescription('The alt character was not removed.')
    .setFooter({ text: '💡 Use /edit-member-details to manage your characters' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [] });
  
  stateManager.clearRemovalState(userId);
}

// ==================== REMOVE SUBCLASS ====================

export async function handleRemoveSubclass(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    
    const allCharacters = await queries.getAllCharactersWithSubclasses(userId);
    const mainChar = allCharacters.find(c => c.character_type === 'main');
    const mainSubclasses = allCharacters.filter(c => c.character_type === 'main_subclass');
    const alts = allCharacters.filter(c => c.character_type === 'alt');
    
    // Get all alt subclasses
    const altSubclasses = allCharacters.filter(c => c.character_type === 'alt_subclass');
    
    const totalSubclasses = mainSubclasses.length + altSubclasses.length;
    
    if (totalSubclasses === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Subclasses')
        .setDescription('This user doesn\'t have any subclasses to remove!')
        .setTimestamp();
      
      return interaction.update({ embeds: [embed], components: [] });
    }

    await showSubclassSelectionForRemoval(interaction, userId, mainChar, mainSubclasses, alts, altSubclasses);
    
  } catch (error) {
    console.error('Error in handleRemoveSubclass:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Error')
      .setDescription('An error occurred. Please try again.')
      .setTimestamp();
    
    try {
      await interaction.update({ embeds: [errorEmbed], components: [] });
    } catch {
      await interaction.reply({ embeds: [errorEmbed], flags: 64 });
    }
  }
}

async function showSubclassSelectionForRemoval(interaction, userId, mainChar, mainSubclasses, alts, altSubclasses) {
  const options = [];
  
  // Add main subclasses
  mainSubclasses.forEach((sc, index) => {
    options.push({
      label: `Main: ${sc.class} (${sc.subclass})`,
      value: `main_${sc.id}`,
      description: `${mainChar.ign} - ${sc.role} - AS: ${formatAbilityScore(sc.ability_score)}`,
      emoji: '⭐'
    });
  });
  
  // Add alt subclasses
  altSubclasses.forEach((sc, index) => {
    const parentAlt = alts.find(a => a.id === sc.parent_character_id);
    if (parentAlt) {
      options.push({
        label: `Alt: ${sc.class} (${sc.subclass})`,
        value: `alt_${sc.id}`,
        description: `${parentAlt.ign} - ${sc.role} - AS: ${formatAbilityScore(sc.ability_score)}`,
        emoji: '🎭'
      });
    }
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_subclass_remove_${userId}`)
    .setPlaceholder('🗑️ Select subclass to remove')
    .addOptions(options);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_menu_${userId}`)
    .setLabel('Back to Menu')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('🗑️ Remove Subclass')
    .setDescription('Select which subclass you want to remove')
    .addFields({
      name: '📊 Available Subclasses',
      value: `**Main Subclasses:** ${mainSubclasses.length}\n**Alt Subclasses:** ${altSubclasses.length}\n**Total:** ${options.length}`,
      inline: false
    })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  
  stateManager.setRemovalState(userId, { 
    mainSubclasses, 
    altSubclasses,
    alts,
    mainChar,
    type: 'subclass',
    isAdminEdit: userId !== interaction.user.id
  });
}

export async function handleSubclassSelectionForRemoval(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedValue = interaction.values[0];
    const state = stateManager.getRemovalState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        flags: 64
      });
    }

    const [type, idStr] = selectedValue.split('_');
    const subclassId = parseInt(idStr);
    
    let selectedSubclass;
    let parentName;
    
    if (type === 'main') {
      selectedSubclass = state.mainSubclasses.find(sc => sc.id === subclassId);
      parentName = state.mainChar.ign;
    } else {
      selectedSubclass = state.altSubclasses.find(sc => sc.id === subclassId);
      const parentAlt = state.alts.find(a => a.id === selectedSubclass.parent_character_id);
      parentName = parentAlt ? parentAlt.ign : 'Unknown';
    }
    
    if (!selectedSubclass) {
      return interaction.reply({
        content: '❌ Subclass not found.',
        flags: 64
      });
    }

    await showRemoveSubclassConfirmation(interaction, userId, selectedSubclass, parentName, type, state.isAdminEdit);
    
  } catch (error) {
    console.error('Error in handleSubclassSelectionForRemoval:', error);
    stateManager.clearRemovalState(extractUserIdFromCustomId(interaction.customId));
  }
}

async function showRemoveSubclassConfirmation(interaction, userId, subclass, parentName, parentType, isAdminEdit) {
  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirm_remove_subclass_${userId}`)
    .setLabel('Yes, Remove Subclass')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('✅');

  const cancelButton = new ButtonBuilder()
    .setCustomId(`cancel_remove_subclass_${userId}`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('❌');

  const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('⚠️ Confirm Subclass Removal')
    .setDescription('Are you sure you want to remove this subclass?')
    .addFields(
      { name: '🎮 Parent Character', value: parentName, inline: true },
      { name: '🎭 Class', value: `${subclass.class} (${subclass.subclass})`, inline: true },
      { name: '⚔️ Role', value: subclass.role, inline: true }
    )
    .setFooter({ text: '⚠️ This action cannot be undone!' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row] });
  
  stateManager.setRemovalState(userId, { subclass, parentName, parentType, type: 'subclass', isAdminEdit });
}

export async function handleConfirmRemoveSubclass(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const state = stateManager.getRemovalState(userId);
    
    if (!state || !state.subclass) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        flags: 64
      });
    }

    await interaction.deferUpdate();

    await queries.deleteSubclass(state.subclass.id);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Subclass Removed')
      .setDescription('The subclass has been successfully removed.')
      .addFields({
        name: '🎮 Parent Character',
        value: state.parentName,
        inline: true
      },
      {
        name: '🎭 Removed Subclass',
        value: `${state.subclass.class} (${state.subclass.subclass})`,
        inline: true
      })
      .setFooter({ text: '💡 Returning to menu...' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
    
    stateManager.clearRemovalState(userId);
    
    // ✅ Return to menu after 2 seconds
    setTimeout(async () => {
      try {
        const targetUser = await interaction.client.users.fetch(userId);
        if (state.isAdminEdit) {
          await returnToAdminMenu(interaction, userId, targetUser);
        } else {
          await returnToUserMenu(interaction, userId);
        }
      } catch (error) {
        console.error('Error returning to menu after subclass removal:', error);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error in handleConfirmRemoveSubclass:', error);
    const userId = extractUserIdFromCustomId(interaction.customId);
    stateManager.clearRemovalState(userId);
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Removal Failed')
      .setDescription('An error occurred while removing the subclass.')
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed], components: [] });
  }
}

export async function handleCancelRemoveSubclass(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  
  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('❌ Removal Cancelled')
    .setDescription('The subclass was not removed.')
    .setFooter({ text: '💡 Use /edit-member-details to manage your characters' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [] });
  
  stateManager.clearRemovalState(userId);
}

// ==================== RETURN TO MENU HELPERS ====================

async function returnToUserMenu(interaction, userId) {
  try {
    const mainChar = await queries.getMainCharacter(userId);
    const allCharacters = mainChar ? await queries.getAllCharactersWithSubclasses(userId) : [];
    const alts = allCharacters.filter(char => char.character_type === 'alt');
    const mainSubclasses = allCharacters.filter(char => char.character_type === 'main_subclass');
    const altSubclasses = allCharacters.filter(char => char.character_type === 'alt_subclass');
    const totalSubclasses = mainSubclasses.length + altSubclasses.length;
    const userTimezone = await queries.getUserTimezone(userId);

    const embed = buildCharacterProfileEmbed(interaction.user, mainChar, allCharacters, alts, mainSubclasses, userTimezone);
    
    const editMemberDetails = await import('../commands/edit-member-details.js');
    // ✅ Fixed: Pass counts, not arrays, and include subclass count
    const components = editMemberDetails.default.buildButtonRows(mainChar, alts.length, totalSubclasses, userId);

    const shouldBePrivate = process.env.EDIT_MEMBER_DETAILS_EPHEMERAL !== 'false';
    const replyOptions = { embeds: [embed], components };
    if (shouldBePrivate) {
      replyOptions.flags = 64;
    }

    await interaction.followUp(replyOptions);
  } catch (error) {
    console.error('Error in returnToUserMenu:', error);
  }
}

async function returnToAdminMenu(interaction, targetUserId, targetUser) {
  try {
    const allCharacters = await queries.getAllCharactersWithSubclasses(targetUserId);
    const userTimezone = await queries.getUserTimezone(targetUserId);

    const mainChar = allCharacters.find(c => c.character_type === 'main');
    const mainSubclasses = allCharacters.filter(c => c.character_type === 'main_subclass');
    const altSubclasses = allCharacters.filter(c => c.character_type === 'alt_subclass');
    const totalSubclasses = mainSubclasses.length + altSubclasses.length;
    const alts = allCharacters.filter(c => c.character_type === 'alt');

    const embed = buildCharacterProfileEmbed(targetUser, mainChar, allCharacters, alts, mainSubclasses, userTimezone);
    
    const editMemberDetails = await import('../commands/edit-member-details.js');
    // ✅ Fixed: Pass counts, not arrays, and include subclass count
    const components = editMemberDetails.default.buildButtonRows(mainChar, alts.length, totalSubclasses, targetUserId);

    const shouldBePrivate = process.env.ADMIN_EPHEMERAL !== 'false';
    const replyOptions = { embeds: [embed], components };
    if (shouldBePrivate) {
      replyOptions.flags = 64;
    }

    await interaction.followUp(replyOptions);
  } catch (error) {
    console.error('Error in returnToAdminMenu:', error);
  }
}

function buildCharacterProfileEmbed(user, mainChar, allCharacters, alts, mainSubclasses, userTimezone) {
  const embed = new EmbedBuilder()
    .setColor(mainChar ? '#6640D9' : '#5865F2')
    .setAuthor({ 
      name: `${user.tag}'s Character Profile`,
      iconURL: user.displayAvatarURL({ dynamic: true })
    })
    .setThumbnail(user.displayAvatarURL({ size: 512 }))
    .setFooter({ text: '💡 Click buttons below to manage your characters' })
    .setTimestamp();

  if (!mainChar) {
    embed.setDescription('**No main character registered yet.**');
    return embed;
  }

  let timezoneDisplay = '🌍 *No timezone set*';
  if (userTimezone?.timezone) {
    const timezoneOffsets = {
      'PST': -8, 'PDT': -7, 'MST': -7, 'MDT': -6, 'CST': -6, 'CDT': -5,
      'EST': -5, 'EDT': -4, 'AST': -4, 'ADT': -3, 'NST': -3.5, 'NDT': -2.5,
      'AKST': -9, 'AKDT': -8, 'HST': -10, 'UTC': 0, 'GMT': 0,
      'WET': 0, 'WEST': 1, 'CET': 1, 'CEST': 2, 'EET': 2, 'EEST': 3,
      'TRT': 3, 'MSK': 3, 'GST': 4, 'IST': 5.5, 'ICT': 7, 'WIB': 7,
      'SGT': 8, 'HKT': 8, 'PHT': 8, 'MYT': 8, 'JST': 9, 'KST': 9,
      'AEST': 10, 'AEDT': 11, 'AWST': 8, 'NZDT': 13, 'NZST': 12
    };
    
    const timezoneAbbreviations = {
      'America/New_York': 'EST', 'America/Chicago': 'CST', 'America/Denver': 'MST',
      'America/Los_Angeles': 'PST', 'America/Toronto': 'EST', 'Europe/London': 'GMT',
      'Europe/Paris': 'CET', 'Asia/Tokyo': 'JST', 'Asia/Seoul': 'KST',
      'Australia/Sydney': 'AEDT', 'Pacific/Auckland': 'NZDT'
    };
    
    const abbrev = timezoneAbbreviations[userTimezone.timezone] || userTimezone.timezone;
    const offset = timezoneOffsets[abbrev] || 0;
    
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    
    let localHours = utcHours + offset;
    if (localHours >= 24) localHours -= 24;
    if (localHours < 0) localHours += 24;
    
    const ampm = localHours >= 12 ? 'PM' : 'AM';
    const displayHours = localHours % 12 || 12;
    const minutes = utcMinutes.toString().padStart(2, '0');
    
    timezoneDisplay = `🌍 ${userTimezone.timezone} • ${displayHours}:${minutes} ${ampm}`;
  }
  
  embed.setDescription(`${timezoneDisplay}\n`);

  const mainRoleEmoji = getRoleEmoji(mainChar.role);
  const formattedAbilityScore = formatAbilityScore(mainChar.ability_score);
  
  embed.addFields({
    name: '⭐ **MAIN CHARACTER**',
    value: 
      '```ansi\n' +
      `✨ \u001b[1;36mIGN:\u001b[0m       ${mainChar.ign}\n` +
      `\n` +
      `🏰 \u001b[1;34mGuild:\u001b[0m     ${mainChar.guild || 'None'}\n` +
      `🎭 \u001b[1;33mClass:\u001b[0m     ${mainChar.class}\n` +
      `🎯 \u001b[1;35mSubclass:\u001b[0m  ${mainChar.subclass}\n` +
      `${mainRoleEmoji} \u001b[1;32mRole:\u001b[0m      ${mainChar.role}\n` +
      `\n` +
      `💪 \u001b[1;31mAbility Score:\u001b[0m ${formattedAbilityScore}\n` +
      '```',
    inline: false
  });

  if (mainSubclasses.length > 0) {
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const subclassText = mainSubclasses.map((sc, i) => {
      const numberEmoji = numberEmojis[i] || `${i + 1}.`;
      const scAbilityScore = formatAbilityScore(sc.ability_score);
      return '```ansi\n' + `${numberEmoji} ${sc.class} › ${sc.subclass} › ${sc.role}\n` +
             `   \u001b[1;31mAbility Score:\u001b[0m ${scAbilityScore}\n` + '```';
    }).join('');
    embed.addFields({ name: '📊 **Subclasses**', value: subclassText, inline: false });
  }

  if (alts && alts.length > 0) {
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const altsText = alts.map((alt, i) => {
      const numberEmoji = numberEmojis[i] || `${i + 1}.`;
      const altAbilityScore = formatAbilityScore(alt.ability_score);
      return '```ansi\n' +
             `${numberEmoji} \u001b[1;36mIGN:\u001b[0m ${alt.ign}  •  \u001b[1;34mGuild:\u001b[0m ${alt.guild || 'None'}\n` +
             `   ${alt.class} › ${alt.subclass} › ${alt.role}\n` +
             `   \u001b[1;31mAbility Score:\u001b[0m ${altAbilityScore}\n` + '```';
    }).join('');
    embed.addFields({ name: `📋 **Alt**`, value: altsText, inline: false });
  }

  embed.addFields({
    name: '\u200B',
    value: `**${allCharacters.length} character${allCharacters.length !== 1 ? 's' : ''} registered • Last updated** •`,
    inline: false
  });

  return embed;
}

function getClassEmoji(className) {
  const emojis = {
    'Beat Performer': '🎵',
    'Frost Mage': '❄️',
    'Heavy Guardian': '🛡️',
    'Marksman': '🏹',
    'Shield Knight': '⚔️',
    'Stormblade': '⚡',
    'Verdant Oracle': '🌿',
    'Wind Knight': '💨'
  };
  return emojis[className] || '⭐';
}
