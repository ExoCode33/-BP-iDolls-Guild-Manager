import { ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { gameData, getClassEmoji, getSubclassesForClass, getRoleFromClass, formatAbilityScore } from '../utils/gameData.js';
import db from '../services/database.js';
import sheetsService from '../services/sheets.js';
import stateManager from '../utils/stateManager.js';
import logger from '../utils/logger.js';
import config from '../utils/config.js';
import { buildCharacterProfileEmbed } from '../components/embeds/characterProfile.js';
import { buildCharacterButtons } from '../components/buttons/characterButtons.js';

export async function handleEditMain(interaction, userId) {
  try {
    const mainChar = await db.getMainCharacter(userId);
    if (!mainChar) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Main Character')
        .setDescription('No main character found!')
        .setTimestamp();
      return await interaction.update({ embeds: [embed], components: [] });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`edit_main_option_${userId}`)
      .setPlaceholder('✏️ What to edit?')
      .addOptions([
        { 
          label: 'Edit IGN', 
          value: 'ign', 
          description: `Current: ${mainChar.ign}`, 
          emoji: '🎮' 
        },
        { 
          label: 'Edit Class & Subclass', 
          value: 'class', 
          description: `Current: ${mainChar.class}`, 
          emoji: '🎭' 
        },
        { 
          label: 'Edit Ability Score', 
          value: 'ability_score', 
          description: `Current: ${formatAbilityScore(mainChar.ability_score)}`, 
          emoji: '💪' 
        },
        { 
          label: 'Edit Guild', 
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
    
    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('✏️ Edit Main Character')
      .setDescription('Select what to edit:')
      .addFields(
        { name: '🎮 IGN', value: mainChar.ign, inline: true },
        { name: '🎭 Class', value: `${mainChar.class} (${mainChar.subclass})`, inline: true },
        { name: '💪 Ability Score', value: formatAbilityScore(mainChar.ability_score), inline: true },
        { name: '🏰 Guild', value: mainChar.guild || 'None', inline: true }
      )
      .setTimestamp();
      
    await interaction.update({ embeds: [embed], components: [row1, row2] });
    stateManager.setUpdateState(userId, { 
      characterId: mainChar.id, 
      type: 'main', 
      character: mainChar 
    });
  } catch (error) {
    logger.error(`Edit main error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Error occurred.', 
      ephemeral: config.ephemeral.editChar 
    });
  }
}

export async function handleAddAlt(interaction, userId) {
  try {
    const mainChar = await db.getMainCharacter(userId);
    if (!mainChar) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Main Character')
        .setDescription('Need main character first!')
        .setTimestamp();
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    stateManager.setRegistrationState(userId, { 
      type: 'alt', 
      step: 'class', 
      characterType: 'alt' 
    });
    
    const { startRegistrationFlow } = await import('./registration.js');
    await interaction.update({ 
      content: '🎭 Starting alt registration...', 
      embeds: [], 
      components: [] 
    });
    
    setTimeout(async () => { 
      await startRegistrationFlow(interaction, userId); 
    }, 500);
  } catch (error) {
    logger.error(`Add alt error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Error occurred.', 
      ephemeral: config.ephemeral.editChar 
    });
  }
}

export async function handleAddSubclass(interaction, userId) {
  try {
    const mainChar = await db.getMainCharacter(userId);
    const allChars = await db.getAllCharactersWithSubclasses(userId);
    const subclasses = allChars.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
    
    if (!mainChar) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Main Character')
        .setDescription('Need main character first!')
        .setTimestamp();
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    if (subclasses.length >= 3) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ Subclass Limit')
        .setDescription('Already have 3 subclasses.')
        .setTimestamp();
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const alts = allChars.filter(c => c.character_type === 'alt');
    
    if (alts.length === 0) {
      await startSubclassRegistration(interaction, userId, mainChar.id, 'main');
    } else {
      const options = [
        { 
          label: `Main: ${mainChar.ign}`, 
          value: `main_${mainChar.id}`, 
          emoji: '⭐' 
        },
        ...alts.map(alt => ({ 
          label: `Alt: ${alt.ign}`, 
          value: `alt_${alt.id}`, 
          emoji: '🎭' 
        }))
      ];
      
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`select_parent_for_subclass_${userId}`)
        .setPlaceholder('📊 Add subclass to?')
        .addOptions(options);
        
      const backButton = new ButtonBuilder()
        .setCustomId(`back_to_profile_${userId}`)
        .setLabel('◀️ Cancel')
        .setStyle(ButtonStyle.Secondary);
        
      const row1 = new ActionRowBuilder().addComponents(selectMenu);
      const row2 = new ActionRowBuilder().addComponents(backButton);
      
      const embed = new EmbedBuilder()
        .setColor('#6640D9')
        .setTitle('📊 Add Subclass')
        .setDescription('Select character:')
        .setFooter({ text: `${subclasses.length}/3 subclasses` })
        .setTimestamp();
        
      await interaction.update({ embeds: [embed], components: [row1, row2] });
    }
  } catch (error) {
    logger.error(`Add subclass error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Error occurred.', 
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
  
  const classes = Object.keys(gameData.classes);
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_class_${userId}`)
    .setPlaceholder('🎭 Choose subclass class')
    .addOptions(classes.map(className => ({ 
      label: className, 
      value: className, 
      emoji: getClassEmoji(className) 
    })));
    
  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_profile_${userId}`)
    .setLabel('◀️ Cancel')
    .setStyle(ButtonStyle.Secondary);
    
  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);
  
  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('📊 Add Subclass - Step 1')
    .setDescription('Select class:')
    .setTimestamp();
    
  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleRemoveMain(interaction, userId) {
  try {
    const mainChar = await db.getMainCharacter(userId);
    if (!mainChar) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Main Character')
        .setDescription('No main to remove!')
        .setTimestamp();
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const confirmButton = new ButtonBuilder()
      .setCustomId(`confirm_remove_main_${userId}`)
      .setLabel('✅ Yes, Remove')
      .setStyle(ButtonStyle.Danger);
      
    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_remove_main_${userId}`)
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary);
      
    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('⚠️ Confirm Removal')
      .setDescription('**Remove main character?**\n\n⚠️ This removes ALL alts and subclasses!')
      .addFields(
        { name: '🎮 Main', value: mainChar.ign, inline: true },
        { name: '🎭 Class', value: `${mainChar.class}`, inline: true }
      )
      .setFooter({ text: '⚠️ Cannot be undone!' })
      .setTimestamp();
      
    await interaction.update({ embeds: [embed], components: [row] });
    stateManager.setRemovalState(userId, { 
      type: 'main', 
      character: mainChar 
    });
  } catch (error) {
    logger.error(`Remove main error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Error occurred.', 
      ephemeral: config.ephemeral.editChar 
    });
  }
}

export async function handleRemoveAlt(interaction, userId) {
  try {
    const allChars = await db.getAllCharactersWithSubclasses(userId);
    const alts = allChars.filter(c => c.character_type === 'alt');
    
    if (alts.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Alts')
        .setDescription('No alts to remove!')
        .setTimestamp();
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_alt_to_remove_${userId}`)
      .setPlaceholder('🗑️ Select alt')
      .addOptions(alts.map(alt => ({ 
        label: alt.ign, 
        value: alt.id.toString(), 
        description: `${alt.class}`, 
        emoji: '🎭' 
      })));
      
    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_profile_${userId}`)
      .setLabel('◀️ Cancel')
      .setStyle(ButtonStyle.Secondary);
      
    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);
    
    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('🗑️ Remove Alt')
      .setDescription('Select alt:')
      .addFields({ 
        name: '📋 Alts', 
        value: alts.map((alt, i) => `${i + 1}. ${alt.ign} - ${alt.class}`).join('\n') 
      })
      .setTimestamp();
      
    await interaction.update({ embeds: [embed], components: [row1, row2] });
    stateManager.setRemovalState(userId, { 
      type: 'alt', 
      alts 
    });
  } catch (error) {
    logger.error(`Remove alt error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Error occurred.', 
      ephemeral: config.ephemeral.editChar 
    });
  }
}

export async function handleRemoveSubclass(interaction, userId) {
  try {
    const allChars = await db.getAllCharactersWithSubclasses(userId);
    const subclasses = allChars.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
    
    if (subclasses.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Subclasses')
        .setDescription('No subclasses to remove!')
        .setTimestamp();
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_subclass_to_remove_${userId}`)
      .setPlaceholder('🗑️ Select subclass')
      .addOptions(subclasses.map(sc => ({ 
        label: `${sc.class} (${sc.subclass})`, 
        value: sc.id.toString(), 
        description: `${sc.parent_ign || 'Main'}`, 
        emoji: '📊' 
      })));
      
    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_profile_${userId}`)
      .setLabel('◀️ Cancel')
      .setStyle(ButtonStyle.Secondary);
      
    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);
    
    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('🗑️ Remove Subclass')
      .setDescription('Select subclass:')
      .addFields({ 
        name: '📊 Subclasses', 
        value: subclasses.map((sc, i) => `${i + 1}. ${sc.class} (${sc.subclass})`).join('\n') 
      })
      .setTimestamp();
      
    await interaction.update({ embeds: [embed], components: [row1, row2] });
    stateManager.setRemovalState(userId, { 
      type: 'subclass', 
      subclasses 
    });
  } catch (error) {
    logger.error(`Remove subclass error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Error occurred.', 
      ephemeral: config.ephemeral.editChar 
    });
  }
}

export async function handleConfirmRemove(interaction, userId) {
  try {
    const state = stateManager.getRemovalState(userId);
    if (!state) {
      return await interaction.reply({ 
        content: '❌ Session expired.', 
        ephemeral: true 
      });
    }
    
    await interaction.deferUpdate();
    
    if (state.type === 'main') {
      await db.deleteMainCharacter(userId);
    } else {
      await db.deleteCharacter(state.characterId);
    }
    
    const allChars = await db.getAllCharacters();
    await sheetsService.syncAllCharacters(allChars);
    
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Removed')
      .setDescription(`${state.type} removed.`)
      .setTimestamp();
      
    await interaction.editReply({ embeds: [embed], components: [] });
    stateManager.clearRemovalState(userId);
    
    setTimeout(async () => {
      const characters = await db.getAllCharactersWithSubclasses(userId);
      const mainChar = characters.find(c => c.character_type === 'main');
      const alts = characters.filter(c => c.character_type === 'alt');
      const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
      const targetUser = await interaction.client.users.fetch(userId);
      const embed = await buildCharacterProfileEmbed(targetUser, characters);
      const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);
      
      await interaction.followUp({ 
        embeds: [embed], 
        components: buttons, 
        ephemeral: config.ephemeral.editChar 
      });
    }, 2000);
  } catch (error) {
    logger.error(`Confirm remove error: ${error.message}`);
    await interaction.editReply({ content: '❌ Error occurred.', ephemeral: true });
    stateManager.clearRemovalState(userId);
  }
}

export async function handleCancelRemove(interaction, userId) {
  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('❌ Cancelled')
    .setDescription('No changes made.')
    .setTimestamp();
    
  await interaction.update({ embeds: [embed], components: [] });
  stateManager.clearRemovalState(userId);
  
  setTimeout(async () => {
    const characters = await db.getAllCharactersWithSubclasses(userId);
    const mainChar = characters.find(c => c.character_type === 'main');
    const alts = characters.filter(c => c.character_type === 'alt');
    const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
    const targetUser = await interaction.client.users.fetch(userId);
    const embed = await buildCharacterProfileEmbed(targetUser, characters);
    const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);
    
    await interaction.followUp({ 
      embeds: [embed], 
      components: buttons, 
      ephemeral: config.ephemeral.editChar 
    });
  }, 1000);
}

export default { 
  handleEditMain, 
  handleAddAlt, 
  handleAddSubclass, 
  handleRemoveMain, 
  handleRemoveAlt, 
  handleRemoveSubclass, 
  handleConfirmRemove, 
  handleCancelRemove 
};
