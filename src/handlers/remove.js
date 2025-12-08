import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } from 'discord.js';
import { queries } from '../database/queries.js';
import stateManager from '../utils/stateManager.js';

// ✅ Extract userId from button customId (handles both user and admin contexts)
function extractUserIdFromCustomId(customId) {
  const parts = customId.split('_');
  return parts[parts.length - 1];
}

export async function handleRemoveMain(interaction) {
  console.log('[REMOVE_MAIN] Starting handler for:', interaction.customId);
  
  try {
    // ✅ Extract userId from button customId
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
    .setDescription('Are you sure you want to remove your main character?')
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
  
  stateManager.setRemovalState(userId, { mainChar, type: 'main' });
  console.log('[REMOVE_MAIN_CONFIRM] State saved');
}

export async function handleConfirmRemoveMain(interaction) {
  try {
    const userId = interaction.user.id;
    const state = stateManager.getRemovalState(userId);
    
    if (!state || !state.mainChar) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    await interaction.deferUpdate();

    await queries.deleteMainCharacter(userId);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Character Removed')
      .setDescription('Your main character (and all alt characters) have been successfully removed.')
      .addFields({
        name: '🎮 Removed IGN',
        value: state.mainChar.ign,
        inline: false
      })
      .setFooter({ text: '💡 Returning to menu...' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
    
    stateManager.clearRemovalState(userId);
    
    setTimeout(async () => {
      try {
        const editMemberDetails = await import('../commands/edit-member-details.js');
        await editMemberDetails.default.showMainMenu(interaction, false);
      } catch (error) {
        console.error('Error returning to menu after removal:', error);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error in handleConfirmRemoveMain:', error);
    stateManager.clearRemovalState(interaction.user.id);
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Removal Failed')
      .setDescription('An error occurred while removing your character.')
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed], components: [] });
  }
}

export async function handleCancelRemoveMain(interaction) {
  const userId = interaction.user.id;
  
  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('❌ Removal Cancelled')
    .setDescription('Your main character was not removed.')
    .setFooter({ text: '💡 Returning to menu...' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [] });
  
  stateManager.clearRemovalState(userId);
  
  setTimeout(async () => {
    try {
      const editMemberDetails = await import('../commands/edit-member-details.js');
      await editMemberDetails.default.showMainMenu(interaction, false);
    } catch (error) {
      console.error('Error returning to menu after cancel:', error);
    }
  }, 1500);
}

export async function handleRemoveAlt(interaction) {
  try {
    // ✅ Extract userId from button customId
    const userId = extractUserIdFromCustomId(interaction.customId);
    
    const alts = await queries.getAltCharacters(userId);
    
    if (alts.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Alt Characters')
        .setDescription('This user doesn\'t have any alt characters to remove!')
        .setTimestamp();
      
      // ✅ Use update for button interactions
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
        value: alt.id.toString(), // ✅ FIXED: Use alt.id instead of ign
        description: `${alt.class} (${alt.subclass}) - ${alt.role}`,
        emoji: getClassEmoji(alt.class)
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

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

  await interaction.update({ embeds: [embed], components: [row] });
  
  stateManager.setRemovalState(userId, { alts, type: 'alt' });
}

export async function handleAltSelectionForRemoval(interaction) {
  try {
    const userId = interaction.user.id;
    const selectedAltId = parseInt(interaction.values[0]); // ✅ FIXED: Parse as ID
    const state = stateManager.getRemovalState(userId);
    
    if (!state || !state.alts) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    const selectedAlt = state.alts.find(alt => alt.id === selectedAltId); // ✅ FIXED: Find by ID
    
    if (!selectedAlt) {
      return interaction.reply({
        content: '❌ Alt character not found.',
        ephemeral: true
      });
    }

    await showRemoveAltConfirmation(interaction, userId, selectedAlt);
    
  } catch (error) {
    console.error('Error in handleAltSelectionForRemoval:', error);
    stateManager.clearRemovalState(interaction.user.id);
  }
}

async function showRemoveAltConfirmation(interaction, userId, alt) {
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
  
  stateManager.setRemovalState(userId, { alt, type: 'alt' });
}

export async function handleConfirmRemoveAlt(interaction) {
  try {
    const userId = interaction.user.id;
    const state = stateManager.getRemovalState(userId);
    
    if (!state || !state.alt) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    await interaction.deferUpdate();

    // ✅ FIXED: Use deleteCharacter with alt's ID
    await queries.deleteCharacter(state.alt.id);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Alt Character Removed')
      .setDescription('Your alt character has been successfully removed.')
      .addFields({
        name: '🎮 Removed IGN',
        value: state.alt.ign,
        inline: false
      })
      .setFooter({ text: '💡 Returning to menu...' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
    
    stateManager.clearRemovalState(userId);
    
    setTimeout(async () => {
      try {
        const editMemberDetails = await import('../commands/edit-member-details.js');
        await editMemberDetails.default.showMainMenu(interaction, false);
      } catch (error) {
        console.error('Error returning to menu after alt removal:', error);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error in handleConfirmRemoveAlt:', error);
    stateManager.clearRemovalState(interaction.user.id);
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Removal Failed')
      .setDescription('An error occurred while removing your alt character.')
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed], components: [] });
  }
}

export async function handleCancelRemoveAlt(interaction) {
  const userId = interaction.user.id;
  
  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('❌ Removal Cancelled')
    .setDescription('Your alt character was not removed.')
    .setFooter({ text: '💡 Returning to menu...' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [] });
  
  stateManager.clearRemovalState(userId);
  
  setTimeout(async () => {
    try {
      const editMemberDetails = await import('../commands/edit-member-details.js');
      await editMemberDetails.default.showMainMenu(interaction, false);
    } catch (error) {
      console.error('Error returning to menu after cancel:', error);
    }
  }, 1500);
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
