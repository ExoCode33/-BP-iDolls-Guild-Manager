import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { GAME_DATA, getRoleFromClass, getSubclassesForClass, getTimezoneRegions, getCountriesInRegion, getTimezonesForCountry } from '../config/gameData.js';
import { queries } from '../database/queries.js';
import stateManager from '../utils/stateManager.js';

export async function handleUpdateMain(interaction) {
  try {
    // ✅ CRITICAL FIX: Extract userId from button customId
    const userId = extractUserIdFromCustomId(interaction.customId);
    
    // Get current main character
    const mainChar = await queries.getMainCharacter(userId);
    
    if (!mainChar) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Main Character')
        .setDescription('This user doesn\'t have a main character to update!')
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    // Show update options menu
    await showUpdateOptionsMenu(interaction, userId, mainChar);
    
  } catch (error) {
    console.error('Error in handleUpdateMain:', error);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      flags: 64
    });
  }
}

async function showUpdateOptionsMenu(interaction, userId, mainChar) {
  // Get user timezone
  const userTimezone = await queries.getUserTimezone(userId);
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`update_option_${userId}`)
    .setPlaceholder('✏️ What would you like to update?')
    .addOptions([
      {
        label: 'Change Class/Subclass',
        value: 'class',
        description: 'Update your class and subclass',
        emoji: '🎭'
      },
      {
        label: 'Change IGN',
        value: 'ign',
        description: 'Update your in-game name',
        emoji: '🎮'
      },
      {
        label: 'Update Ability Score',
        value: 'ability_score',
        description: 'Update your ability score',
        emoji: '💪'
      },
      {
        label: 'Change Timezone',
        value: 'timezone',
        description: 'Update your timezone',
        emoji: '🌍'
      },
      {
        label: 'Change Guild',
        value: 'guild',
        description: 'Update your guild affiliation',
        emoji: '🏰'
      }
    ]);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_menu_${userId}`)
    .setLabel('Back to Menu')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Main Character')
    .setDescription('Select what you\'d like to update')
    .addFields(
      { name: '🎮 Current IGN', value: mainChar.ign, inline: true },
      { name: '🎭 Current Class', value: `${mainChar.class} (${mainChar.subclass})`, inline: true },
      { name: '⚔️ Role', value: mainChar.role, inline: true }
    )
    .setFooter({ text: '💡 Choose an option to update' })
    .setTimestamp();

  if (mainChar.ability_score) {
    embed.addFields({ name: '💪 Ability Score', value: `~${mainChar.ability_score.toLocaleString()}`, inline: true });
  }
  if (userTimezone?.timezone) {
    embed.addFields({ name: '🌍 Timezone', value: userTimezone.timezone, inline: true });
  }
  if (mainChar.guild) {
    embed.addFields({ name: '🏰 Guild', value: mainChar.guild, inline: true });
  }

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  
  // Store state
  stateManager.setUpdateState(userId, { mainChar });
}

export async function handleUpdateOptionSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const option = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state || !state.mainChar) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        flags: 64
      });
    }

    switch (option) {
      case 'class':
        await showClassSelectionForUpdate(interaction, userId, state.mainChar);
        break;
      case 'ign':
        await showIGNModal(interaction, userId, state.mainChar);
        break;
      case 'ability_score':
        await showAbilityScoreSelectionForUpdate(interaction, userId, state.mainChar);
        break;
      case 'timezone':
        await showTimezoneRegionSelectionForUpdate(interaction, userId, state.mainChar);
        break;
      case 'guild':
        await showGuildSelectionForUpdate(interaction, userId, state.mainChar);
        break;
    }
    
  } catch (error) {
    console.error('Error in handleUpdateOptionSelection:', error);
    stateManager.clearUpdateState(extractUserIdFromCustomId(interaction.customId));
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      flags: 64
    });
  }
}

// ==================== CLASS UPDATE ====================

async function showClassSelectionForUpdate(interaction, userId, mainChar) {
  const classes = Object.keys(GAME_DATA.classes);
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`update_class_${userId}`)
    .setPlaceholder('🎭 Choose your new class')
    .addOptions(
      classes.map(className => ({
        label: className,
        value: className,
        emoji: getClassEmoji(className),
        default: className === mainChar.class
      }))
    );

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_update_menu_${userId}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Class')
    .setDescription('Select your new class')
    .addFields({
      name: '🎭 Current Class',
      value: `${mainChar.class} (${mainChar.subclass})`,
      inline: false
    })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  
  stateManager.setUpdateState(userId, { mainChar, updateType: 'class' });
}

export async function handleUpdateClassSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedClass = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        flags: 64
      });
    }

    const subclasses = getSubclassesForClass(selectedClass);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`update_subclass_${userId}`)
      .setPlaceholder('🎯 Choose your new subclass')
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

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('✏️ Update Subclass')
      .setDescription(`Select your ${selectedClass} subclass`)
      .addFields({
        name: '🎭 New Class',
        value: selectedClass,
        inline: true
      })
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [row1, row2] });
    
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
        flags: 64
      });
    }

    await interaction.deferUpdate();

    const newRole = getRoleFromClass(state.newClass);
    
    await queries.updateCharacter(state.mainChar.id, {
      class: state.newClass,
      subclass: selectedSubclass,
      role: newRole
    });

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Class Updated!')
      .setDescription('The main character\'s class has been updated.')
      .addFields(
        { name: '🎭 New Class', value: `${state.newClass} (${selectedSubclass})`, inline: true },
        { name: '⚔️ New Role', value: newRole, inline: true }
      )
      .setFooter({ text: '💡 Update complete' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
    
    stateManager.clearUpdateState(userId);
    
  } catch (error) {
    console.error('Error in handleUpdateSubclassSelection:', error);
    stateManager.clearUpdateState(extractUserIdFromCustomId(interaction.customId));
  }
}

// ==================== IGN UPDATE (MODAL) ====================

async function showIGNModal(interaction, userId, mainChar) {
  const modal = new ModalBuilder()
    .setCustomId(`update_ign_modal_${userId}`)
    .setTitle('Update IGN');

  const ignInput = new TextInputBuilder()
    .setCustomId('ign')
    .setLabel('New In-Game Name (IGN)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter your new character name')
    .setValue(mainChar.ign)
    .setRequired(true)
    .setMaxLength(100);

  const row = new ActionRowBuilder().addComponents(ignInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
  
  stateManager.setUpdateState(userId, { mainChar, updateType: 'ign' });
}

// ==================== ABILITY SCORE UPDATE (DROPDOWN) ====================

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
    .setPlaceholder('💪 Select your new ability score range')
    .addOptions(abilityScoreRanges);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_update_menu_${userId}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Ability Score')
    .setDescription('Select your new ability score range')
    .addFields({
      name: '💪 Current Ability Score',
      value: mainChar.ability_score ? `~${mainChar.ability_score.toLocaleString()}` : 'Not set',
      inline: false
    })
    .setFooter({ text: '💪 Choose the range closest to your ability score' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  
  stateManager.setUpdateState(userId, { mainChar, updateType: 'ability_score' });
}

export async function handleUpdateAbilityScoreSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedScore = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        flags: 64
      });
    }

    await interaction.deferUpdate();

    await queries.updateCharacter(state.mainChar.id, {
      ability_score: parseInt(selectedScore)
    });

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Ability Score Updated!')
      .setDescription('The ability score has been updated.')
      .addFields({
        name: '💪 New Ability Score',
        value: `~${parseInt(selectedScore).toLocaleString()}`,
        inline: false
      })
      .setFooter({ text: '💡 Update complete' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
    
    stateManager.clearUpdateState(userId);
    
  } catch (error) {
    console.error('Error in handleUpdateAbilityScoreSelection:', error);
    stateManager.clearUpdateState(extractUserIdFromCustomId(interaction.customId));
  }
}

// ==================== TIMEZONE UPDATE (DROPDOWN) ====================

async function showTimezoneRegionSelectionForUpdate(interaction, userId, mainChar) {
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

  // Get current timezone
  const userTimezone = await queries.getUserTimezone(userId);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Timezone')
    .setDescription('Select your timezone region')
    .addFields({
      name: '🌍 Current Timezone',
      value: userTimezone?.timezone || 'Not set',
      inline: false
    })
    .setFooter({ text: '🌍 Choose your region' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  
  stateManager.setUpdateState(userId, { mainChar, updateType: 'timezone' });
}

export async function handleUpdateTimezoneRegionSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedRegion = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        flags: 64
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

    const embed = new EmbedBuilder()
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

    await interaction.update({ embeds: [embed], components: [row1, row2] });
    
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
        flags: 64
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

    const embed = new EmbedBuilder()
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

    await interaction.update({ embeds: [embed], components: [row1, row2] });
    
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
        flags: 64
      });
    }

    await interaction.deferUpdate();

    // Get target user for their tag
    const targetUser = await interaction.client.users.fetch(userId);

    // Update timezone in user_timezones table
    await queries.setUserTimezone(userId, targetUser.tag, selectedTimezone);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Timezone Updated!')
      .setDescription('The timezone has been updated.')
      .addFields({
        name: '🌍 New Timezone',
        value: selectedTimezone,
        inline: false
      })
      .setFooter({ text: '💡 Update complete' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
    
    stateManager.clearUpdateState(userId);
    
  } catch (error) {
    console.error('Error in handleUpdateTimezoneFinalSelection:', error);
    stateManager.clearUpdateState(extractUserIdFromCustomId(interaction.customId));
  }
}

// ==================== GUILD UPDATE (DROPDOWN) ====================

async function showGuildSelectionForUpdate(interaction, userId, mainChar) {
  const guilds = GAME_DATA.guilds;
  
  if (guilds.length === 0) {
    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('⚠️ No Guilds Configured')
      .setDescription('There are no guilds configured in the system.')
      .setTimestamp();
    
    return interaction.update({ embeds: [embed], components: [] });
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`update_guild_${userId}`)
    .setPlaceholder('🏰 Choose your new guild')
    .addOptions(
      guilds.map(guild => ({
        label: guild.name,
        value: guild.name,
        emoji: guild.isVisitor ? '👋' : '🏰',
        default: guild.name === mainChar.guild
      }))
    );

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_update_menu_${userId}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Guild')
    .setDescription('Select your new guild')
    .addFields({
      name: '🏰 Current Guild',
      value: mainChar.guild || 'None',
      inline: false
    })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  
  stateManager.setUpdateState(userId, { mainChar, updateType: 'guild' });
}

export async function handleUpdateGuildSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedGuild = interaction.values[0];
    const state = stateManager.getUpdateState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        flags: 64
      });
    }

    await interaction.deferUpdate();

    await queries.updateCharacter(state.mainChar.id, {
      guild: selectedGuild
    });

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Guild Updated!')
      .setDescription('The guild affiliation has been updated.')
      .addFields({
        name: '🏰 New Guild',
        value: selectedGuild,
        inline: false
      })
      .setFooter({ text: '💡 Update complete' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
    
    stateManager.clearUpdateState(userId);
    
  } catch (error) {
    console.error('Error in handleUpdateGuildSelection:', error);
    stateManager.clearUpdateState(extractUserIdFromCustomId(interaction.customId));
  }
}

// ==================== MODAL HANDLERS ====================

export async function handleUpdateModal(interaction, updateType) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const state = stateManager.getUpdateState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        flags: 64
      });
    }

    await interaction.deferReply({ flags: 64 });

    let updates = {};
    let fieldName = '';
    let newValue = '';

    if (updateType === 'ign') {
      const newIGN = interaction.fields.getTextInputValue('ign');
      updates = { ign: newIGN };
      fieldName = '🎮 New IGN';
      newValue = newIGN;
    }

    await queries.updateCharacter(state.mainChar.id, updates);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Character Updated!')
      .setDescription('The main character has been updated.')
      .addFields({
        name: fieldName,
        value: newValue,
        inline: false
      })
      .setFooter({ text: '💡 Update complete' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    
    stateManager.clearUpdateState(userId);
    
  } catch (error) {
    console.error('Error in handleUpdateModal:', error);
    stateManager.clearUpdateState(extractUserIdFromCustomId(interaction.customId));
  }
}

// ==================== BACK BUTTON HANDLERS ====================

export async function handleBackToUpdateMenu(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  const state = stateManager.getUpdateState(userId);
  
  if (!state || !state.mainChar) {
    return interaction.reply({
      content: '❌ Session expired. Please start over.',
      flags: 64
    });
  }

  await showUpdateOptionsMenu(interaction, userId, state.mainChar);
}

export async function handleBackToUpdateClass(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  const state = stateManager.getUpdateState(userId);
  
  if (!state || !state.mainChar) {
    return interaction.reply({
      content: '❌ Session expired. Please start over.',
      flags: 64
    });
  }

  await showClassSelectionForUpdate(interaction, userId, state.mainChar);
}

export async function handleBackToUpdateTimezoneRegion(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  const state = stateManager.getUpdateState(userId);
  
  if (!state || !state.mainChar) {
    return interaction.reply({
      content: '❌ Session expired. Please start over.',
      flags: 64
    });
  }

  await showTimezoneRegionSelectionForUpdate(interaction, userId, state.mainChar);
}

export async function handleBackToUpdateTimezoneCountry(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  const state = stateManager.getUpdateState(userId);
  
  if (!state || !state.selectedRegion) {
    return interaction.reply({
      content: '❌ Session expired. Please start over.',
      flags: 64
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

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Timezone')
    .setDescription('Select your country')
    .addFields({
      name: '🌍 Region',
      value: state.selectedRegion,
      inline: true
    })
    .setFooter({ text: '💡 Choose your country' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Extract user ID from customId pattern like "button_name_userId"
 * @param {string} customId - The custom ID from the interaction
 * @returns {string} - The extracted user ID
 */
function extractUserIdFromCustomId(customId) {
  const parts = customId.split('_');
  return parts[parts.length - 1];
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
