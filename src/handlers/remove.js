import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } from 'discord.js';
import { queries } from '../database/queries.js';
import stateManager from '../utils/stateManager.js';

export async function handleRemoveMain(interaction) {
  try {
    const userId = interaction.user.id;
    
    // Get main character
    const mainChar = await queries.getMainCharacter(userId);
    
    if (!mainChar) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Main Character')
        .setDescription('You don\'t have a main character to remove!')
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Check if they have alts
    const alts = await queries.getAltCharacters(userId);
    
    // Show confirmation
    await showRemoveMainConfirmation(interaction, userId, mainChar, alts.length);
    
  } catch (error) {
    console.error('Error in handleRemoveMain:', error);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

async function showRemoveMainConfirmation(interaction, userId, mainChar, altCount) {
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

  await interaction.update({ embeds: [embed], components: [row] });
  
  stateManager.setRemovalState(userId, { mainChar, type: 'main' });
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

    // Delete the main character (cascade will delete alts)
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
      .setFooter({ text: '💡 You can register again anytime with /edit-member-details' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
    
    stateManager.clearRemovalState(userId);
    
    // Return to main menu
    const editMemberDetails = await import('../commands/edit-member-details.js');
    setTimeout(async () => {
      await editMemberDetails.default.showMainMenu(interaction, true);
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
  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('❌ Removal Cancelled')
    .setDescription('Your main character was not removed.')
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [] });
  
  stateManager.clearRemovalState(interaction.user.id);
  
  // Return to main menu
  const editMemberDetails = await import('../commands/edit-member-details.js');
  setTimeout(async () => {
    await editMemberDetails.default.showMainMenu(interaction, true);
  }, 1500);
}

export async function handleRemoveAlt(interaction) {
  try {
    const userId = interaction.user.id;
    
    // Get alt characters
    const alts = await queries.getAltCharacters(userId);
    
    if (alts.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Alt Characters')
        .setDescription('You don\'t have any alt characters to remove!')
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Show alt selection menu
    await showAltSelectionForRemoval(interaction, userId, alts);
    
  } catch (error) {
    console.error('Error in handleRemoveAlt:', error);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

async function showAltSelectionForRemoval(interaction, userId, alts) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_alt_remove_${userId}`)
    .setPlaceholder('🗑️ Select alt character to remove')
    .addOptions(
      alts.map((alt, index) => ({
        label: alt.ign,
        value: alt.ign,
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
    const selectedIGN = interaction.values[0];
    const state = stateManager.getRemovalState(userId);
    
    if (!state || !state.alts) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    const selectedAlt = state.alts.find(alt => alt.ign === selectedIGN);
    
    if (!selectedAlt) {
      return interaction.reply({
        content: '❌ Alt character not found.',
        ephemeral: true
      });
    }

    // Show confirmation
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

    // Delete the alt character
    await queries.deleteAltCharacter(userId, state.alt.ign);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Alt Character Removed')
      .setDescription('Your alt character has been successfully removed.')
      .addFields({
        name: '🎮 Removed IGN',
        value: state.alt.ign,
        inline: false
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
    
    stateManager.clearRemovalState(userId);
    
    // Return to main menu
    const editMemberDetails = await import('../commands/edit-member-details.js');
    setTimeout(async () => {
      await editMemberDetails.default.showMainMenu(interaction, true);
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
  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('❌ Removal Cancelled')
    .setDescription('Your alt character was not removed.')
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [] });
  
  stateManager.clearRemovalState(interaction.user.id);
  
  // Return to main menu
  const editMemberDetails = await import('../commands/edit-member-details.js');
  setTimeout(async () => {
    await editMemberDetails.default.showMainMenu(interaction, true);
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
