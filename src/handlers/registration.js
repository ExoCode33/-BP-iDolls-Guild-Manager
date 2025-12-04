import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { GAME_DATA, getRoleFromClass, getSubclassesForClass, getTimezoneRegions, getCountriesInRegion, getTimezonesForCountry } from '../config/gameData.js';
import { queries } from '../database/queries.js';
import stateManager from '../utils/stateManager.js';

export async function handleAddMain(interaction) {
  try {
    const userId = interaction.user.id;
    
    // Check if they already have a main
    const existingMain = await queries.getMainCharacter(userId);
    if (existingMain) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ Already Registered')
        .setDescription('You already have a main character registered!')
        .addFields({
          name: '💡 Tip',
          value: 'Use the **Edit Main Character** button to update your main character.',
          inline: false
        })
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Show class selection menu
    await showClassSelection(interaction, userId, 'main');
    
  } catch (error) {
    console.error('Error in handleAddMain:', error);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

export async function handleAddAlt(interaction) {
  try {
    const userId = interaction.user.id;
    
    // Check if they have a main character
    const mainChar = await queries.getMainCharacter(userId);
    if (!mainChar) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Main Character')
        .setDescription('You need to register a main character before adding alt characters!')
        .addFields({
          name: '💡 Next Step',
          value: 'Use the **Add Main Character** button first.',
          inline: false
        })
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Show class selection menu
    await showClassSelection(interaction, userId, 'alt');
    
  } catch (error) {
    console.error('Error in handleAddAlt:', error);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

async function showClassSelection(interaction, userId, type) {
  const classes = Object.keys(GAME_DATA.classes);
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_class_${type}_${userId}`)
    .setPlaceholder('🎭 Choose your class')
    .addOptions(
      classes.map(className => ({
        label: className,
        value: className,
        emoji: getClassEmoji(className)
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle(`⭐ ${type === 'main' ? 'Register Main Character' : 'Add Alt Character'}`)
    .setDescription('**Step 1 of 3:** Select your class')
    .setFooter({ text: '💡 Choose the class you play' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row] });
  
  // Store state
  stateManager.setRegistrationState(userId, { type, step: 'class' });
}

export async function handleClassSelection(interaction) {
  try {
    const userId = interaction.user.id;
    const selectedClass = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    const type = state.type;
    const subclasses = getSubclassesForClass(selectedClass);
    
    // Show subclass selection
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_subclass_${type}_${userId}`)
      .setPlaceholder('🎯 Choose your subclass')
      .addOptions(
        subclasses.map(subclass => ({
          label: subclass,
          value: subclass
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle(`⭐ ${type === 'main' ? 'Register Main Character' : 'Add Alt Character'}`)
      .setDescription(`**Step 2 of 3:** Select your ${selectedClass} subclass`)
      .addFields({
        name: '🎭 Selected Class',
        value: selectedClass,
        inline: true
      })
      .setFooter({ text: '💡 Choose your specialization' })
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [row] });
    
    // Update state
    stateManager.setRegistrationState(userId, {
      ...state,
      step: 'subclass',
      class: selectedClass
    });
    
  } catch (error) {
    console.error('Error in handleClassSelection:', error);
    stateManager.clearRegistrationState(interaction.user.id);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

export async function handleSubclassSelection(interaction) {
  try {
    const userId = interaction.user.id;
    const selectedSubclass = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    if (!state || !state.class) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    const type = state.type;
    const selectedClass = state.class;
    const role = getRoleFromClass(selectedClass);
    
    // Show the character details modal
    const modal = new ModalBuilder()
      .setCustomId(`character_details_${type}_${userId}`)
      .setTitle(`${type === 'main' ? 'Main Character' : 'Alt Character'} Details`);

    const ignInput = new TextInputBuilder()
      .setCustomId('ign')
      .setLabel('In-Game Name (IGN)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter your character name')
      .setRequired(true)
      .setMaxLength(100);

    const row1 = new ActionRowBuilder().addComponents(ignInput);

    if (type === 'main') {
      const abilityScoreInput = new TextInputBuilder()
        .setCustomId('ability_score')
        .setLabel('Ability Score (Optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 25000')
        .setRequired(false);

      const row2 = new ActionRowBuilder().addComponents(abilityScoreInput);
      modal.addComponents(row1, row2);
    } else {
      modal.addComponents(row1);
    }

    await interaction.showModal(modal);
    
    // Update state
    stateManager.setRegistrationState(userId, {
      ...state,
      step: 'details',
      subclass: selectedSubclass,
      role: role
    });
    
  } catch (error) {
    console.error('Error in handleSubclassSelection:', error);
    stateManager.clearRegistrationState(interaction.user.id);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

export async function handleCharacterDetailsModal(interaction) {
  try {
    const userId = interaction.user.id;
    const state = stateManager.getRegistrationState(userId);
    
    if (!state || !state.class || !state.subclass) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    const type = state.type;
    const ign = interaction.fields.getTextInputValue('ign');
    
    if (type === 'main') {
      const abilityScore = interaction.fields.getTextInputValue('ability_score');
      
      // Update state with IGN and ability score FIRST
      const updatedState = {
        ...state,
        step: 'timezone',
        ign: ign,
        abilityScore: abilityScore || null
      };
      
      stateManager.setRegistrationState(userId, updatedState);
      
      // ✅ NEW: Show smart timezone region selection with updated state
      await showTimezoneRegionSelection(interaction, userId, updatedState);
    } else {
      // For alt, save directly (no timezone needed)
      await saveAltCharacter(interaction, userId, state, ign);
    }
    
  } catch (error) {
    console.error('Error in handleCharacterDetailsModal:', error);
    stateManager.clearRegistrationState(interaction.user.id);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

// ✅ NEW: Show timezone region selection
async function showTimezoneRegionSelection(interaction, userId, state) {
  const regions = getTimezoneRegions();
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_timezone_region_${userId}`)
    .setPlaceholder('🌍 Select your region')
    .addOptions(
      regions.map(region => ({
        label: region,
        value: region,
        emoji: getRegionEmoji(region)
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('⭐ Register Main Character')
    .setDescription('**Step 3a:** Select your region for timezone')
    .setFooter({ text: '💡 Choose your geographic region' })
    .setTimestamp();
  
  // Only add fields if they exist
  if (state.class) {
    embed.addFields({ name: '🎭 Class', value: state.class, inline: true });
  }
  if (state.subclass) {
    embed.addFields({ name: '🎯 Subclass', value: state.subclass, inline: true });
  }
  if (state.ign) {
    embed.addFields({ name: '🎮 IGN', value: state.ign, inline: true });
  }

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// ✅ NEW: Handle timezone region selection
export async function handleTimezoneRegionSelection(interaction) {
  try {
    const userId = interaction.user.id;
    const selectedRegion = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    const countries = getCountriesInRegion(selectedRegion);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_timezone_country_${userId}`)
      .setPlaceholder('🌍 Select your country')
      .addOptions(
        countries.map(country => ({
          label: country,
          value: country
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('⭐ Register Main Character')
      .setDescription('**Step 3b:** Select your country')
      .addFields(
        { name: '🌍 Region', value: selectedRegion, inline: true }
      )
      .setFooter({ text: '💡 Choose your country' })
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [row] });
    
    stateManager.setRegistrationState(userId, {
      ...state,
      selectedRegion: selectedRegion
    });
    
  } catch (error) {
    console.error('Error in handleTimezoneRegionSelection:', error);
    stateManager.clearRegistrationState(interaction.user.id);
  }
}

// ✅ NEW: Handle timezone country selection
export async function handleTimezoneCountrySelection(interaction) {
  try {
    const userId = interaction.user.id;
    const selectedCountry = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    const timezones = getTimezonesForCountry(selectedCountry);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_timezone_${userId}`)
      .setPlaceholder('🕐 Select your timezone')
      .addOptions(
        timezones.map(tz => ({
          label: tz.label,
          value: tz.value,
          description: tz.utc
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('⭐ Register Main Character')
      .setDescription('**Step 3c:** Select your specific timezone')
      .addFields(
        { name: '🌍 Country', value: selectedCountry, inline: true }
      )
      .setFooter({ text: '💡 Choose your timezone' })
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [row] });
    
    stateManager.setRegistrationState(userId, {
      ...state,
      selectedCountry: selectedCountry
    });
    
  } catch (error) {
    console.error('Error in handleTimezoneCountrySelection:', error);
    stateManager.clearRegistrationState(interaction.user.id);
  }
}

// ✅ NEW: Handle final timezone selection
export async function handleTimezoneSelection(interaction) {
  try {
    const userId = interaction.user.id;
    const selectedTimezone = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    // Store timezone and show guild selection
    stateManager.setRegistrationState(userId, {
      ...state,
      timezone: selectedTimezone
    });

    await showGuildSelection(interaction, userId, state);
    
  } catch (error) {
    console.error('Error in handleTimezoneSelection:', error);
    stateManager.clearRegistrationState(interaction.user.id);
  }
}

async function showGuildSelection(interaction, userId, state) {
  const guilds = GAME_DATA.guilds;
  
  if (guilds.length === 0) {
    // No guilds configured, save with empty guild
    await saveMainCharacter(interaction, userId, state, state.ign, '', null);
    return;
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_guild_${userId}`)
    .setPlaceholder('🏰 Choose your guild')
    .addOptions(
      guilds.map(guild => ({
        label: guild.name,
        value: guild.name,
        emoji: guild.isVisitor ? '👋' : '🏰'
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('⭐ Register Main Character')
    .setDescription('**Final Step:** Select your guild')
    .addFields(
      { name: '🎭 Class', value: state.class, inline: true },
      { name: '🎯 Subclass', value: state.subclass, inline: true },
      { name: '🎮 IGN', value: state.ign, inline: true }
    )
    .setFooter({ text: '💡 Choose your guild affiliation' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleGuildSelection(interaction) {
  try {
    const userId = interaction.user.id;
    const selectedGuild = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    await saveMainCharacter(interaction, userId, state, state.ign, selectedGuild, interaction.member);
    
  } catch (error) {
    console.error('Error in handleGuildSelection:', error);
    stateManager.clearRegistrationState(interaction.user.id);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

async function saveMainCharacter(interaction, userId, state, ign, guild, member) {
  try {
    await interaction.deferUpdate();

    const characterData = {
      discordId: userId,
      discordName: interaction.user.tag,
      ign: ign,
      role: state.role,
      className: state.class,
      subclass: state.subclass,
      abilityScore: state.abilityScore ? parseInt(state.abilityScore) : null,
      timezone: state.timezone || null,
      guild: guild
    };

    await queries.createCharacter(characterData);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Main Character Registered!')
      .setDescription('Your main character has been successfully registered.')
      .addFields(
        { name: '🎮 IGN', value: ign, inline: true },
        { name: '🎭 Class', value: `${state.class} (${state.subclass})`, inline: true },
        { name: '⚔️ Role', value: state.role, inline: true }
      )
      .setFooter({ text: '💡 Returning to menu...' })
      .setTimestamp();

    if (guild) {
      embed.addFields({ name: '🏰 Guild', value: guild, inline: true });
    }

    if (state.abilityScore) {
      embed.addFields({ name: '💪 Ability Score', value: state.abilityScore, inline: true });
    }

    if (state.timezone) {
      embed.addFields({ name: '🌍 Timezone', value: state.timezone, inline: true });
    }

    await interaction.editReply({ embeds: [embed], components: [] });
    
    // Clear state
    stateManager.clearRegistrationState(userId);
    
    // ✅ FIXED: Delete success message and show clean menu
    setTimeout(async () => {
      try {
        // Delete the success message
        await interaction.deleteReply();
        
        // Show fresh menu
        const editMemberDetails = await import('../commands/edit-member-details.js');
        await editMemberDetails.default.showMainMenu(interaction, false);
      } catch (error) {
        console.error('Error returning to menu after registration:', error);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error saving main character:', error);
    stateManager.clearRegistrationState(userId);
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Registration Failed')
      .setDescription('An error occurred while saving your character.')
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed], components: [] });
  }
}

async function saveAltCharacter(interaction, userId, state, ign) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const mainChar = await queries.getMainCharacter(userId);
    
    if (!mainChar) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Main Character')
        .setDescription('You need a main character before adding alts!')
        .setTimestamp();
      
      stateManager.clearRegistrationState(userId);
      return interaction.editReply({ embeds: [embed] });
    }

    const altData = {
      discordId: userId,
      mainCharacterId: mainChar.id,
      ign: ign,
      role: state.role,
      className: state.class,
      subclass: state.subclass
    };

    await queries.createAltCharacter(altData);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Alt Character Added!')
      .setDescription('Your alt character has been successfully registered.')
      .addFields(
        { name: '🎮 IGN', value: ign, inline: true },
        { name: '🎭 Class', value: `${state.class} (${state.subclass})`, inline: true },
        { name: '⚔️ Role', value: state.role, inline: true }
      )
      .setFooter({ text: '💡 Returning to menu...' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    
    // Clear state
    stateManager.clearRegistrationState(userId);
    
    // ✅ FIXED: Delete success message and show clean menu
    setTimeout(async () => {
      try {
        // Delete the success message
        await interaction.deleteReply();
        
        // Show fresh menu
        const editMemberDetails = await import('../commands/edit-member-details.js');
        await editMemberDetails.default.showMainMenu(interaction, false);
      } catch (error) {
        console.error('Error returning to menu after alt registration:', error);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error saving alt character:', error);
    stateManager.clearRegistrationState(userId);
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Registration Failed')
      .setDescription('An error occurred while saving your alt character.')
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
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
