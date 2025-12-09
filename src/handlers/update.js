import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { GAME_DATA, getRoleFromClass, getSubclassesForClass, getTimezoneRegions, getCountriesInRegion, getTimezonesForCountry } from '../config/gameData.js';
import { queries } from '../database/queries.js';
import stateManager from '../utils/stateManager.js';

// ✅ Ephemeral configuration
const EPHEMERAL_CONFIG = {
  editMemberDetails: process.env.EDIT_MEMBER_DETAILS_EPHEMERAL !== 'false',
};

// ✅ Helper to get ephemeral options
function getEphemeralOptions(userId, interactionUserId) {
  const isAdminEdit = userId !== interactionUserId;
  const shouldBePrivate = isAdminEdit ? process.env.ADMIN_EPHEMERAL !== 'false' : EPHEMERAL_CONFIG.editMemberDetails;
  return shouldBePrivate ? { flags: 64 } : {};
}

// ✅ Extract userId from button customId
function extractUserIdFromCustomId(customId) {
  const parts = customId.split('_');
  return parts[parts.length - 1];
}

// ✅ Format ability score to range display
function formatAbilityScore(score) {
  if (!score || score === '' || score === 0) return 'Not set';
  
  const numScore = parseInt(score);
  
  const scoreRanges = {
    10000: '≤10k',
    11000: '10-12k',
    13000: '12-14k',
    15000: '14-16k',
    17000: '16-18k',
    19000: '18-20k',
    21000: '20-22k',
    23000: '22-24k',
    25000: '24-26k',
    27000: '26-28k',
    29000: '28-30k',
    31000: '30-32k',
    33000: '32-34k',
    35000: '34-36k',
    37000: '36-38k',
    39000: '38-40k',
    41000: '40-42k',
    43000: '42-44k',
    45000: '44-46k',
    47000: '46-48k',
    49000: '48-50k',
    51000: '50-52k',
    53000: '52-54k',
    55000: '54-56k',
    57000: '56k+'
  };
  
  return scoreRanges[numScore] || `~${numScore.toLocaleString()}`;
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

function getRegionEmoji(region) {
  const emojis = {
    'North America': '🌎',
    'Europe (West)': '🇪🇺',
    'Europe (North)': '❄️',
    'Europe (East & Other)': '🇪🇺',
    'Asia (East)': '🌏',
    'Asia (Southeast)': '🌏',
    'Asia (South & Central)': '🌏',
    'Middle East': '🕌',
    'Oceania': '🌏',
    'Africa': '🌍',
    'South America': '🌎',
    'Other': '🌐'
  };
  return emojis[region] || '🌐';
}

// ==================== UPDATE MAIN CHARACTER ====================

export async function handleUpdateMain(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    
    const mainChar = await queries.getMainCharacter(userId);
    if (!mainChar) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Main Character')
        .setDescription('This user doesn\'t have a main character to update!')
        .setTimestamp();
      
      return interaction.update({ embeds: [errorEmbed], components: [] });
    }

    stateManager.setUpdateState(userId, {
      characterId: mainChar.id,
      type: 'main',
      isAdminEdit: userId !== interaction.user.id
    });

    await showUpdateMenu(interaction, userId, mainChar);
    
  } catch (error) {
    console.error('Error in handleUpdateMain:', error);
    
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

// ==================== UPDATE ALT CHARACTER ====================

export async function handleUpdateAlt(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    
    const alts = await queries.getAltCharacters(userId);
    if (alts.length === 0) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Alt Characters')
        .setDescription('This user doesn\'t have any alt characters to update!')
        .setTimestamp();
      
      return interaction.update({ embeds: [errorEmbed], components: [] });
    }

    await showAltSelectionForUpdate(interaction, userId, alts);
    
  } catch (error) {
    console.error('Error in handleUpdateAlt:', error);
    
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

async function showAltSelectionForUpdate(interaction, userId, alts) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_alt_update_${userId}`)
    .setPlaceholder('📋 Select which alt to edit')
    .addOptions(
      alts.map((alt, index) => ({
        label: `${alt.ign} (${alt.class})`,
        value: alt.id.toString(),
        description: `AS: ${formatAbilityScore(alt.ability_score)}`,
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
    .setTitle('✏️ Edit Alt Character')
    .setDescription('**Select which alt character you want to edit:**')
    .addFields({
      name: '📋 Your Alt Characters',
      value: alts.map((alt, i) => `${i + 1}. ${alt.ign} - ${alt.class} (${alt.subclass})`).join('\n'),
      inline: false
    })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  
  stateManager.setUpdateState(userId, { 
    alts, 
    type: 'alt_selection',
    isAdminEdit: userId !== interaction.user.id
  });
}

export async function handleAltSelectionForUpdate(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedAltId = parseInt(interaction.values[0]);
    const state = stateManager.getUpdateState(userId);
    
    if (!state || !state.alts) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    const selectedAlt = state.alts.find(alt => alt.id === selectedAltId);
    
    if (!selectedAlt) {
      return interaction.reply({
        content: '❌ Alt character not found.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    stateManager.setUpdateState(userId, {
      characterId: selectedAlt.id,
      type: 'alt',
      character: selectedAlt,
      isAdminEdit: state.isAdminEdit
    });

    await showUpdateMenu(interaction, userId, selectedAlt);
    
  } catch (error) {
    console.error('Error in handleAltSelectionForUpdate:', error);
    stateManager.clearUpdateState(extractUserIdFromCustomId(interaction.customId));
  }
}

// ==================== UPDATE SUBCLASS ====================

export async function handleUpdateSubclass(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    
    const allCharacters = await queries.getAllCharactersWithSubclasses(userId);
    const mainSubclasses = allCharacters.filter(c => c.character_type === 'main_subclass');
    const altSubclasses = allCharacters.filter(c => c.character_type === 'alt_subclass');
    const alts = allCharacters.filter(c => c.character_type === 'alt');
    const mainChar = allCharacters.find(c => c.character_type === 'main');
    
    const totalSubclasses = mainSubclasses.length + altSubclasses.length;
    
    if (totalSubclasses === 0) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Subclasses')
        .setDescription('This user doesn\'t have any subclasses to update!')
        .setTimestamp();
      
      return interaction.update({ embeds: [errorEmbed], components: [] });
    }

    await showSubclassSelectionForUpdate(interaction, userId, mainChar, mainSubclasses, alts, altSubclasses);
    
  } catch (error) {
    console.error('Error in handleUpdateSubclass:', error);
    
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

async function showSubclassSelectionForUpdate(interaction, userId, mainChar, mainSubclasses, alts, altSubclasses) {
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
    .setCustomId(`select_subclass_update_${userId}`)
    .setPlaceholder('📊 Select subclass to edit')
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
    .setTitle('✏️ Edit Subclass')
    .setDescription('**Select which subclass you want to edit:**')
    .addFields({
      name: '📊 Available Subclasses',
      value: `**Main Subclasses:** ${mainSubclasses.length}\n**Alt Subclasses:** ${altSubclasses.length}\n**Total:** ${options.length}`,
      inline: false
    })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  
  stateManager.setUpdateState(userId, { 
    mainSubclasses,
    altSubclasses,
    alts,
    mainChar,
    type: 'subclass_selection',
    isAdminEdit: userId !== interaction.user.id
  });
}

export async function handleSubclassSelectionForUpdate(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedValue = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
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
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    stateManager.setUpdateState(userId, {
      characterId: selectedSubclass.id,
      type: 'subclass',
      character: selectedSubclass,
      parentName: parentName,
      isAdminEdit: state.isAdminEdit
    });

    // For subclasses, we only allow updating ability score
    await showSubclassAbilityScoreUpdate(interaction, userId, selectedSubclass, parentName);
    
  } catch (error) {
    console.error('Error in handleSubclassSelectionForUpdate:', error);
    stateManager.clearUpdateState(extractUserIdFromCustomId(interaction.customId));
  }
}

async function showSubclassAbilityScoreUpdate(interaction, userId, subclass, parentName) {
  const abilityScoreRanges = [
    { label: '10k or smaller', value: '10000', description: 'Ability Score: ≤10,000' },
    { label: '10k - 12k', value: '11000', description: 'Ability Score: 10,001 - 12,000' },
    { label: '12k - 14k', value: '13000', description: 'Ability Score: 12,001 - 14,000' },
    { label: '14k - 16k', value: '15000', description: 'Ability Score: 14,001 - 16,000' },
    { label: '16k - 18k', value: '17000', description: 'Ability Score: 16,001 - 18,000' },
    { label: '18k - 20k', value: '19000', description: 'Ability Score: 18,001 - 20,000' },
    { label: '20k - 22k', value: '21000', description: 'Ability Score: 20,001 - 22,000' },
    { label: '22k - 24k', value: '23000', description: 'Ability Score: 22,001 - 24,000' },
    { label: '24k - 26k', value: '25000', description: 'Ability Score: 24,001 - 26,000' },
    { label: '26k - 28k', value: '27000', description: 'Ability Score: 26,001 - 28,000' },
    { label: '28k - 30k', value: '29000', description: 'Ability Score: 28,001 - 30,000' },
    { label: '30k - 32k', value: '31000', description: 'Ability Score: 30,001 - 32,000' },
    { label: '32k - 34k', value: '33000', description: 'Ability Score: 32,001 - 34,000' },
    { label: '34k - 36k', value: '35000', description: 'Ability Score: 34,001 - 36,000' },
    { label: '36k - 38k', value: '37000', description: 'Ability Score: 36,001 - 38,000' },
    { label: '38k - 40k', value: '39000', description: 'Ability Score: 38,001 - 40,000' },
    { label: '40k - 42k', value: '41000', description: 'Ability Score: 40,001 - 42,000' },
    { label: '42k - 44k', value: '43000', description: 'Ability Score: 42,001 - 44,000' },
    { label: '44k - 46k', value: '45000', description: 'Ability Score: 44,001 - 46,000' },
    { label: '46k - 48k', value: '47000', description: 'Ability Score: 46,001 - 48,000' },
    { label: '48k - 50k', value: '49000', description: 'Ability Score: 48,001 - 50,000' },
    { label: '50k - 52k', value: '51000', description: 'Ability Score: 50,001 - 52,000' },
    { label: '52k - 54k', value: '53000', description: 'Ability Score: 52,001 - 54,000' },
    { label: '54k - 56k', value: '55000', description: 'Ability Score: 54,001 - 56,000' },
    { label: '56k+', value: '57000', description: 'Ability Score: 56,001+' }
  ];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`update_ability_score_select_${userId}`)
    .setPlaceholder('💪 Select new ability score range')
    .addOptions(abilityScoreRanges);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_menu_${userId}`)
    .setLabel('Back to Menu')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const abilityUpdateEmbed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Subclass Ability Score')
    .setDescription('Select new ability score range for this subclass')
    .addFields(
      { name: '🎮 Parent Character', value: parentName, inline: true },
      { name: '🎭 Subclass', value: `${subclass.class} (${subclass.subclass})`, inline: true },
      { name: '💪 Current Ability Score', value: formatAbilityScore(subclass.ability_score), inline: true }
    )
    .setFooter({ text: '💪 Choose the range closest to your ability score' })
    .setTimestamp();

  await interaction.update({ embeds: [abilityUpdateEmbed], components: [row1, row2] });
}

async function showUpdateMenu(interaction, userId, character) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`update_option_${userId}`)
    .setPlaceholder('✏️ Choose what to update')
    .addOptions([
      {
        label: 'Update IGN',
        value: 'ign',
        description: `Current: ${mainChar.ign}`,
        emoji: '🎮'
      },
      {
        label: 'Update Class & Subclass',
        value: 'class',
        description: `Current: ${mainChar.class} (${mainChar.subclass})`,
        emoji: '🎭'
      },
      {
        label: 'Update Ability Score',
        value: 'ability_score',
        description: `Current: ${formatAbilityScore(mainChar.ability_score)}`,
        emoji: '💪'
      },
      {
        label: 'Update Guild',
        value: 'guild',
        description: `Current: ${mainChar.guild || 'None'}`,
        emoji: '🏰'
      },
      {
        label: 'Update Timezone',
        value: 'timezone',
        description: 'Update your timezone',
        emoji: '🌍'
      }
    ]);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_menu_${userId}`)
    .setLabel('Back to Menu')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const updateEmbed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Main Character')
    .setDescription('**Select what you want to update:**')
    .addFields(
      { name: '🎮 Current IGN', value: mainChar.ign, inline: true },
      { name: '🎭 Current Class', value: `${mainChar.class} (${mainChar.subclass})`, inline: true },
      { name: '💪 Current Ability Score', value: formatAbilityScore(mainChar.ability_score), inline: true },
      { name: '🏰 Current Guild', value: mainChar.guild || 'None', inline: true }
    )
    .setFooter({ text: '💡 Choose an option to update' })
    .setTimestamp();

  await interaction.update({ embeds: [updateEmbed], components: [row1, row2] });
}

export async function handleUpdateOptionSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedOption = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    const mainChar = await queries.getMainCharacter(userId);
    if (!mainChar) {
      return interaction.reply({
        content: '❌ Character not found.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    stateManager.setUpdateState(userId, {
      ...state,
      field: selectedOption
    });

    switch (selectedOption) {
      case 'ign':
        await showUpdateIGNModal(interaction, userId);
        break;
      case 'class':
        await showUpdateClassSelection(interaction, userId, mainChar);
        break;
      case 'ability_score':
        await showAbilityScoreSelectionForUpdate(interaction, userId, mainChar);
        break;
      case 'guild':
        await showUpdateGuildSelection(interaction, userId, mainChar);
        break;
      case 'timezone':
        await showUpdateTimezoneSelection(interaction, userId);
        break;
    }
    
  } catch (error) {
    console.error('Error in handleUpdateOptionSelection:', error);
    stateManager.clearUpdateState(extractUserIdFromCustomId(interaction.customId));
  }
}

// ==================== UPDATE IGN ====================

async function showUpdateIGNModal(interaction, userId) {
  const modal = new ModalBuilder()
    .setCustomId(`update_ign_modal_${userId}`)
    .setTitle('Update Character Name');

  const ignInput = new TextInputBuilder()
    .setCustomId('ign')
    .setLabel('New In-Game Name (IGN)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter new character name')
    .setRequired(true)
    .setMaxLength(100);

  const row = new ActionRowBuilder().addComponents(ignInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

export async function handleUpdateModal(interaction, field) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const state = stateManager.getUpdateState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    await interaction.deferReply({ ...getEphemeralOptions(userId, interaction.user.id) });

    const newValue = interaction.fields.getTextInputValue(field);

    const updates = { [field]: newValue };
    await queries.updateCharacter(state.characterId, updates);

    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Updated!')
      .setDescription(`The ${field.toUpperCase()} has been updated successfully.`)
      .addFields({
        name: `🎮 New ${field.toUpperCase()}`,
        value: newValue,
        inline: false
      })
      .setFooter({ text: '💡 Update complete' })
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed] });
    
    stateManager.clearUpdateState(userId);
    
  } catch (error) {
    console.error('Error in handleUpdateModal:', error);
    stateManager.clearUpdateState(extractUserIdFromCustomId(interaction.customId));
  }
}

// ==================== UPDATE CLASS ====================

async function showUpdateClassSelection(interaction, userId, mainChar) {
  const classes = Object.keys(GAME_DATA.classes);
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`update_class_${userId}`)
    .setPlaceholder('🎭 Choose new class')
    .addOptions(
      classes.map(className => ({
        label: className,
        value: className,
        emoji: getClassEmoji(className)
      }))
    );

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_update_menu_${userId}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const classUpdateEmbed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Class')
    .setDescription('Select your new class')
    .addFields({
      name: '🎭 Current Class',
      value: `${mainChar.class} (${mainChar.subclass})`,
      inline: false
    })
    .setFooter({ text: '💡 This will also update your subclass' })
    .setTimestamp();

  await interaction.update({ embeds: [classUpdateEmbed], components: [row1, row2] });
}

export async function handleUpdateClassSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedClass = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    const subclasses = getSubclassesForClass(selectedClass);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`update_subclass_${userId}`)
      .setPlaceholder('🎯 Choose new subclass')
      .addOptions(
        subclasses.map(subclass => ({
          label: subclass,
          value: subclass
        }))
      );

    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_update_class_${userId}`)
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️');

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);

    const subclassUpdateEmbed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('✏️ Update Subclass')
      .setDescription(`Select your new ${selectedClass} subclass`)
      .addFields({
        name: '🎭 Selected Class',
        value: selectedClass,
        inline: true
      })
      .setFooter({ text: '💡 Choose your specialization' })
      .setTimestamp();

    await interaction.update({ embeds: [subclassUpdateEmbed], components: [row1, row2] });
    
    stateManager.setUpdateState(userId, {
      ...state,
      newClass: selectedClass
    });
    
  } catch (error) {
    console.error('Error in handleUpdateClassSelection:', error);
    stateManager.clearUpdateState(extractUserIdFromCustomId(interaction.customId));
  }
}

export async function handleUpdateSubclassSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedSubclass = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state || !state.newClass) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    await interaction.deferReply({ ...getEphemeralOptions(userId, interaction.user.id) });

    const role = getRoleFromClass(state.newClass);
    
    const updates = {
      class: state.newClass,
      subclass: selectedSubclass,
      role: role
    };

    await queries.updateCharacter(state.characterId, updates);

    const classSuccessEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Class Updated!')
      .setDescription('The class and subclass have been updated successfully.')
      .addFields(
        { name: '🎭 New Class', value: state.newClass, inline: true },
        { name: '🎯 New Subclass', value: selectedSubclass, inline: true },
        { name: '⚔️ New Role', value: role, inline: true }
      )
      .setFooter({ text: '💡 Update complete' })
      .setTimestamp();

    await interaction.editReply({ embeds: [classSuccessEmbed] });
    
    stateManager.clearUpdateState(userId);
    
  } catch (error) {
    console.error('Error in handleUpdateSubclassSelection:', error);
    stateManager.clearUpdateState(extractUserIdFromCustomId(interaction.customId));
  }
}

// ==================== UPDATE ABILITY SCORE ====================

async function showAbilityScoreSelectionForUpdate(interaction, userId, mainChar) {
  const abilityScoreRanges = [
    { label: '10k or smaller', value: '10000', description: 'Ability Score: ≤10,000' },
    { label: '10k - 12k', value: '11000', description: 'Ability Score: 10,001 - 12,000' },
    { label: '12k - 14k', value: '13000', description: 'Ability Score: 12,001 - 14,000' },
    { label: '14k - 16k', value: '15000', description: 'Ability Score: 14,001 - 16,000' },
    { label: '16k - 18k', value: '17000', description: 'Ability Score: 16,001 - 18,000' },
    { label: '18k - 20k', value: '19000', description: 'Ability Score: 18,001 - 20,000' },
    { label: '20k - 22k', value: '21000', description: 'Ability Score: 20,001 - 22,000' },
    { label: '22k - 24k', value: '23000', description: 'Ability Score: 22,001 - 24,000' },
    { label: '24k - 26k', value: '25000', description: 'Ability Score: 24,001 - 26,000' },
    { label: '26k - 28k', value: '27000', description: 'Ability Score: 26,001 - 28,000' },
    { label: '28k - 30k', value: '29000', description: 'Ability Score: 28,001 - 30,000' },
    { label: '30k - 32k', value: '31000', description: 'Ability Score: 30,001 - 32,000' },
    { label: '32k - 34k', value: '33000', description: 'Ability Score: 32,001 - 34,000' },
    { label: '34k - 36k', value: '35000', description: 'Ability Score: 34,001 - 36,000' },
    { label: '36k - 38k', value: '37000', description: 'Ability Score: 36,001 - 38,000' },
    { label: '38k - 40k', value: '39000', description: 'Ability Score: 38,001 - 40,000' },
    { label: '40k - 42k', value: '41000', description: 'Ability Score: 40,001 - 42,000' },
    { label: '42k - 44k', value: '43000', description: 'Ability Score: 42,001 - 44,000' },
    { label: '44k - 46k', value: '45000', description: 'Ability Score: 44,001 - 46,000' },
    { label: '46k - 48k', value: '47000', description: 'Ability Score: 46,001 - 48,000' },
    { label: '48k - 50k', value: '49000', description: 'Ability Score: 48,001 - 50,000' },
    { label: '50k - 52k', value: '51000', description: 'Ability Score: 50,001 - 52,000' },
    { label: '52k - 54k', value: '53000', description: 'Ability Score: 52,001 - 54,000' },
    { label: '54k - 56k', value: '55000', description: 'Ability Score: 54,001 - 56,000' },
    { label: '56k+', value: '57000', description: 'Ability Score: 56,001+' }
  ];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`update_ability_score_select_${userId}`)
    .setPlaceholder('💪 Select new ability score range')
    .addOptions(abilityScoreRanges);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_update_menu_${userId}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const abilityUpdateEmbed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Ability Score')
    .setDescription('Select your new ability score range')
    .addFields({
      name: '💪 Current Ability Score',
      value: formatAbilityScore(mainChar.ability_score),
      inline: false
    })
    .setFooter({ text: '💪 Choose the range closest to your ability score' })
    .setTimestamp();

  await interaction.update({ embeds: [abilityUpdateEmbed], components: [row1, row2] });
}

export async function handleUpdateAbilityScoreSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedScore = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    await interaction.deferReply({ ...getEphemeralOptions(userId, interaction.user.id) });

    const updates = { ability_score: parseInt(selectedScore) };
    await queries.updateCharacter(state.characterId, updates);

    const abilitySuccessEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Ability Score Updated!')
      .setDescription('The ability score has been updated.')
      .addFields({
        name: '💪 New Ability Score',
        value: formatAbilityScore(parseInt(selectedScore)),
        inline: false
      })
      .setFooter({ text: '💡 Update complete' })
      .setTimestamp();

    await interaction.editReply({ embeds: [abilitySuccessEmbed] });
    
    stateManager.clearUpdateState(userId);
    
  } catch (error) {
    console.error('Error in handleUpdateAbilityScoreSelection:', error);
    stateManager.clearUpdateState(extractUserIdFromCustomId(interaction.customId));
  }
}

// ==================== UPDATE GUILD ====================

async function showUpdateGuildSelection(interaction, userId, mainChar) {
  const guilds = GAME_DATA.guilds;
  
  if (guilds.length === 0) {
    const noGuildsEmbed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('⚠️ No Guilds Configured')
      .setDescription('No guilds are configured in the system.')
      .setTimestamp();
    
    return interaction.update({ embeds: [noGuildsEmbed], components: [] });
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`update_guild_${userId}`)
    .setPlaceholder('🏰 Choose new guild')
    .addOptions(
      guilds.map(guild => ({
        label: guild.name,
        value: guild.name,
        emoji: guild.isVisitor ? '👋' : '🏰'
      }))
    );

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_update_menu_${userId}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const guildUpdateEmbed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Guild')
    .setDescription('Select your new guild')
    .addFields({
      name: '🏰 Current Guild',
      value: mainChar.guild || 'None',
      inline: false
    })
    .setFooter({ text: '💡 Choose your guild affiliation' })
    .setTimestamp();

  await interaction.update({ embeds: [guildUpdateEmbed], components: [row1, row2] });
}

export async function handleUpdateGuildSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedGuild = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    await interaction.deferReply({ ...getEphemeralOptions(userId, interaction.user.id) });

    const updates = { guild: selectedGuild };
    await queries.updateCharacter(state.characterId, updates);

    const guildSuccessEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Guild Updated!')
      .setDescription('The guild has been updated successfully.')
      .addFields({
        name: '🏰 New Guild',
        value: selectedGuild,
        inline: false
      })
      .setFooter({ text: '💡 Update complete' })
      .setTimestamp();

    await interaction.editReply({ embeds: [guildSuccessEmbed] });
    
    stateManager.clearUpdateState(userId);
    
  } catch (error) {
    console.error('Error in handleUpdateGuildSelection:', error);
    stateManager.clearUpdateState(extractUserIdFromCustomId(interaction.customId));
  }
}

// ==================== UPDATE TIMEZONE ====================

async function showUpdateTimezoneSelection(interaction, userId) {
  const regions = getTimezoneRegions();
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`update_timezone_region_${userId}`)
    .setPlaceholder('🌍 Select your region')
    .addOptions(
      regions.map(region => ({
        label: region,
        value: region,
        emoji: getRegionEmoji(region)
      }))
    );

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_update_menu_${userId}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const timezoneUpdateEmbed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Timezone')
    .setDescription('Select your timezone region')
    .setFooter({ text: '🌍 Timezone helps coordinate with guild members' })
    .setTimestamp();

  await interaction.update({ embeds: [timezoneUpdateEmbed], components: [row1, row2] });
}

export async function handleUpdateTimezoneRegionSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedRegion = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    const countries = getCountriesInRegion(selectedRegion);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`update_timezone_country_${userId}`)
      .setPlaceholder('🌍 Select your country')
      .addOptions(
        countries.map(country => ({
          label: country,
          value: country
        }))
      );

    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_update_timezone_region_${userId}`)
      .setLabel('Back to Regions')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️');

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);

    const countryUpdateEmbed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('✏️ Update Timezone')
      .setDescription('Select your country')
      .addFields({
        name: '🌍 Region',
        value: selectedRegion,
        inline: true
      })
      .setFooter({ text: '💡 Choose your country' })
      .setTimestamp();

    await interaction.update({ embeds: [countryUpdateEmbed], components: [row1, row2] });
    
    stateManager.setUpdateState(userId, {
      ...state,
      selectedRegion: selectedRegion
    });
    
  } catch (error) {
    console.error('Error in handleUpdateTimezoneRegionSelection:', error);
    stateManager.clearUpdateState(extractUserIdFromCustomId(interaction.customId));
  }
}

export async function handleUpdateTimezoneCountrySelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedCountry = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    const timezones = getTimezonesForCountry(selectedCountry);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`update_timezone_final_${userId}`)
      .setPlaceholder('🕐 Select your timezone')
      .addOptions(
        timezones.map(tz => ({
          label: tz.label,
          value: tz.value,
          description: tz.utc
        }))
      );

    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_update_timezone_country_${userId}`)
      .setLabel('Back to Countries')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️');

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);

    const timezoneSelectEmbed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('✏️ Update Timezone')
      .setDescription('Select your specific timezone')
      .addFields({
        name: '🌍 Country',
        value: selectedCountry,
        inline: true
      })
      .setFooter({ text: '💡 Choose your timezone' })
      .setTimestamp();

    await interaction.update({ embeds: [timezoneSelectEmbed], components: [row1, row2] });
    
    stateManager.setUpdateState(userId, {
      ...state,
      selectedCountry: selectedCountry
    });
    
  } catch (error) {
    console.error('Error in handleUpdateTimezoneCountrySelection:', error);
    stateManager.clearUpdateState(extractUserIdFromCustomId(interaction.customId));
  }
}

export async function handleUpdateTimezoneFinalSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedTimezone = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    await interaction.deferReply({ ...getEphemeralOptions(userId, interaction.user.id) });

    const targetUser = await interaction.client.users.fetch(userId);
    await queries.setUserTimezone(userId, targetUser.tag, selectedTimezone);

    const timezoneSuccessEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Timezone Updated!')
      .setDescription('Your timezone has been updated successfully.')
      .addFields({
        name: '🌍 New Timezone',
        value: selectedTimezone,
        inline: false
      })
      .setFooter({ text: '💡 Update complete' })
      .setTimestamp();

    await interaction.editReply({ embeds: [timezoneSuccessEmbed] });
    
    stateManager.clearUpdateState(userId);
    
  } catch (error) {
    console.error('Error in handleUpdateTimezoneFinalSelection:', error);
    stateManager.clearUpdateState(extractUserIdFromCustomId(interaction.customId));
  }
}

// ==================== BACK BUTTON HANDLERS ====================

export async function handleBackToUpdateMenu(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  const state = stateManager.getUpdateState(userId);
  
  if (!state) {
    return interaction.reply({
      content: '❌ Session expired. Please start over.',
      ...getEphemeralOptions(userId, interaction.user.id)
    });
  }

  const mainChar = await queries.getMainCharacter(userId);
  if (!mainChar) {
    return interaction.reply({
      content: '❌ Character not found.',
      ...getEphemeralOptions(userId, interaction.user.id)
    });
  }

  await showUpdateMenu(interaction, userId, mainChar);
}

export async function handleBackToUpdateClass(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  const state = stateManager.getUpdateState(userId);
  
  if (!state) {
    return interaction.reply({
      content: '❌ Session expired. Please start over.',
      ...getEphemeralOptions(userId, interaction.user.id)
    });
  }

  const mainChar = await queries.getMainCharacter(userId);
  if (!mainChar) {
    return interaction.reply({
      content: '❌ Character not found.',
      ...getEphemeralOptions(userId, interaction.user.id)
    });
  }

  await showUpdateClassSelection(interaction, userId, mainChar);
}

export async function handleBackToUpdateTimezoneRegion(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  const state = stateManager.getUpdateState(userId);
  
  if (!state) {
    return interaction.reply({
      content: '❌ Session expired. Please start over.',
      ...getEphemeralOptions(userId, interaction.user.id)
    });
  }

  await showUpdateTimezoneSelection(interaction, userId);
}

export async function handleBackToUpdateTimezoneCountry(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  const state = stateManager.getUpdateState(userId);
  
  if (!state || !state.selectedRegion) {
    return interaction.reply({
      content: '❌ Session expired. Please start over.',
      ...getEphemeralOptions(userId, interaction.user.id)
    });
  }

  const countries = getCountriesInRegion(state.selectedRegion);
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`update_timezone_country_${userId}`)
    .setPlaceholder('🌍 Select your country')
    .addOptions(
      countries.map(country => ({
        label: country,
        value: country
      }))
    );

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_update_timezone_region_${userId}`)
    .setLabel('Back to Regions')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const countryBackEmbed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Timezone')
    .setDescription('Select your country')
    .addFields({
      name: '🌍 Region',
      value: state.selectedRegion,
      inline: true
    })
    .setFooter({ text: '💡 Choose your country or go back' })
    .setTimestamp();

  await interaction.update({ embeds: [countryBackEmbed], components: [row1, row2] });
}
