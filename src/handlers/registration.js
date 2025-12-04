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

    // Show class selection menu (same flow as main character)
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
    .setDescription('**Step 1:** Select your class')
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
      .setDescription(`**Step 2:** Select your ${selectedClass} subclass`)
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
    
    // Update state
    stateManager.setRegistrationState(userId, {
      ...state,
      step: 'next',
      subclass: selectedSubclass,
      role: role
    });

    // Both main and alt now follow same flow (ability score → guild → timezone/IGN)
    await showAbilityScoreSelection(interaction, userId, state, selectedClass, selectedSubclass, type);
    
  } catch (error) {
    console.error('Error in handleSubclassSelection:', error);
    stateManager.clearRegistrationState(interaction.user.id);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

async function showAbilityScoreSelection(interaction, userId, state, selectedClass, selectedSubclass, type) {
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
    .setCustomId(`select_ability_score_${userId}`)
    .setPlaceholder('💪 Select your ability score range')
    .addOptions(abilityScoreRanges);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_subclass_${userId}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle(`⭐ Register ${type === 'main' ? 'Main' : 'Alt'} Character`)
    .setDescription('**Step 3:** Select your ability score range')
    .addFields(
      { name: '🎭 Class', value: selectedClass, inline: true },
      { name: '🎯 Subclass', value: selectedSubclass, inline: true }
    )
    .setFooter({ text: '💪 Choose the range closest to your ability score' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleAbilityScoreSelection(interaction) {
  try {
    const userId = interaction.user.id;
    const selectedAbilityScore = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    // Update state with ability score
    stateManager.setRegistrationState(userId, {
      ...state,
      abilityScore: selectedAbilityScore
    });

    // Show guild selection
    await showGuildSelectionEarly(interaction, userId, state);
    
  } catch (error) {
    console.error('Error in handleAbilityScoreSelection:', error);
    stateManager.clearRegistrationState(interaction.user.id);
  }
}

async function showGuildSelectionEarly(interaction, userId, state) {
  const guilds = GAME_DATA.guilds;
  
  if (guilds.length === 0) {
    // No guilds configured, skip to next step
    stateManager.setRegistrationState(userId, {
      ...state,
      guild: null
    });
    
    // Main goes to timezone, alt goes to IGN
    if (state.type === 'main') {
      await showSmartTimezoneSelection(interaction, userId, state);
    } else {
      await showIGNModal(interaction, userId);
    }
    return;
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_guild_early_${userId}`)
    .setPlaceholder('🏰 Choose your guild')
    .addOptions(
      guilds.map(guild => ({
        label: guild.name,
        value: guild.name,
        emoji: guild.isVisitor ? '👋' : '🏰'
      }))
    );

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_ability_${userId}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle(`⭐ Register ${state.type === 'main' ? 'Main' : 'Alt'} Character`)
    .setDescription('**Step 4:** Select your guild')
    .addFields(
      { name: '🎭 Class', value: state.class, inline: true },
      { name: '🎯 Subclass', value: state.subclass, inline: true },
      { name: '💪 Ability Score', value: `~${parseInt(state.abilityScore).toLocaleString()}`, inline: true }
    )
    .setFooter({ text: '🏰 Choose your guild affiliation' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleGuildSelectionEarly(interaction) {
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

    // Store guild
    stateManager.setRegistrationState(userId, {
      ...state,
      guild: selectedGuild
    });

    // Main goes to timezone, alt goes to IGN modal
    if (state.type === 'main') {
      await showSmartTimezoneSelection(interaction, userId, state);
    } else {
      await showIGNModal(interaction, userId);
    }
    
  } catch (error) {
    console.error('Error in handleGuildSelectionEarly:', error);
    stateManager.clearRegistrationState(interaction.user.id);
  }
}

async function showIGNModal(interaction, userId) {
  const modal = new ModalBuilder()
    .setCustomId(`ign_modal_alt_${userId}`)
    .setTitle('Final Step: Character Name');

  const ignInput = new TextInputBuilder()
    .setCustomId('ign')
    .setLabel('In-Game Name (IGN)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter your character name')
    .setRequired(true)
    .setMaxLength(100);

  const row = new ActionRowBuilder().addComponents(ignInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function showSmartTimezoneSelection(interaction, userId, state) {
  // Get current UTC time
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  
  // Try to estimate user's local time from their interaction timestamp
  // Discord interactions include the user's local timestamp
  const userLocalTime = new Date(interaction.createdTimestamp);
  const userHour = userLocalTime.getHours();
  const userMinute = userLocalTime.getMinutes();
  const estimatedTime = `${userHour.toString().padStart(2, '0')}:${userMinute.toString().padStart(2, '0')}`;

  // Generate time options (every hour from 00:00 to 23:00)
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
    const option = {
      label: timeLabel,
      value: hour.toString()
    };
    
    // Mark the closest hour to user's estimated time
    if (hour === userHour || hour === (userHour + 1) % 24) {
      option.description = '← Close to your time';
    }
    
    timeOptions.push(option);
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_current_time_${userId}`)
    .setPlaceholder(`🕐 Select the time closest to yours`)
    .addOptions(timeOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('⭐ Register Main Character')
    .setDescription(`**Step 5:** What time is it for you right now?\n\n🕐 **Your estimated local time:** ~${estimatedTime}\n💡 Select the hour closest to your current local time\n\n*This helps us suggest your timezone*`)
    .addFields(
      { name: '🎭 Class', value: state.class, inline: true },
      { name: '🎯 Subclass', value: state.subclass, inline: true },
      { name: '💪 Ability Score', value: `~${parseInt(state.abilityScore).toLocaleString()}`, inline: true }
    )
    .setFooter({ text: '🌍 We\'ll suggest timezones based on your selection' })
    .setTimestamp();
  
  if (state.guild) {
    embed.addFields({ name: '🏰 Guild', value: state.guild, inline: true });
  }

  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleCurrentTimeSelection(interaction) {
  try {
    const userId = interaction.user.id;
    const selectedHour = parseInt(interaction.values[0]);
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    // Calculate timezone offset
    const now = new Date();
    const currentHour = now.getUTCHours();
    const offsetHours = selectedHour - currentHour;
    
    // Get matching timezones
    const matchingTimezones = getSuggestedTimezones(offsetHours);

    if (matchingTimezones.length === 0) {
      // Fallback to manual selection
      await showTimezoneRegionSelection(interaction, userId, state);
      return;
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_suggested_timezone_${userId}`)
      .setPlaceholder('🌍 Select your timezone')
      .addOptions([
        {
          label: '🔄 Show all timezones',
          value: 'SHOW_ALL_TIMEZONES',
          description: 'Browse all available timezones'
        },
        ...matchingTimezones.slice(0, 24) // Limit to 24 (1 slot for "show all")
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('⭐ Register Main Character')
      .setDescription('**Step 6:** Select your timezone from suggestions\n\n💡 Based on your time, these timezones match!')
      .addFields(
        { name: '🕐 Your Time', value: `${selectedHour.toString().padStart(2, '0')}:00`, inline: true },
        { name: '🌍 UTC Offset', value: `UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}`, inline: true }
      )
      .setFooter({ text: '🌍 Select your timezone or browse all' })
      .setTimestamp();
    
    if (state.guild) {
      embed.addFields({ name: '🏰 Guild', value: state.guild, inline: true });
    }

    await interaction.update({ embeds: [embed], components: [row] });

    stateManager.setRegistrationState(userId, {
      ...state,
      selectedOffset: offsetHours
    });
    
  } catch (error) {
    console.error('Error in handleCurrentTimeSelection:', error);
    stateManager.clearRegistrationState(interaction.user.id);
  }
}

function getSuggestedTimezones(offsetHours) {
  const suggestions = [];
  
  // Get all regions
  const regions = getTimezoneRegions();
  
  for (const region of regions) {
    const countries = getCountriesInRegion(region);
    
    for (const country of countries) {
      const timezones = getTimezonesForCountry(country);
      
      for (const tz of timezones) {
        // Parse UTC offset from string like "UTC-5/-4" or "UTC+9"
        const utcMatch = tz.utc.match(/UTC([+-]?\d+)/);
        if (utcMatch) {
          const tzOffset = parseInt(utcMatch[1]);
          if (tzOffset === offsetHours) {
            suggestions.push({
              label: tz.label,
              value: tz.value,
              description: `${country} - ${tz.utc}`
            });
          }
        }
      }
    }
  }

  return suggestions;
}

export async function handleSuggestedTimezoneSelection(interaction) {
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

    // Check if user wants to see all timezones
    if (selectedTimezone === 'SHOW_ALL_TIMEZONES') {
      await showTimezoneRegionSelection(interaction, userId, state);
      return;
    }

    // Store timezone
    stateManager.setRegistrationState(userId, {
      ...state,
      timezone: selectedTimezone
    });

    // Show IGN modal
    const modal = new ModalBuilder()
      .setCustomId(`ign_modal_main_${userId}`)
      .setTitle('Final Step: Character Name');

    const ignInput = new TextInputBuilder()
      .setCustomId('ign')
      .setLabel('In-Game Name (IGN)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter your character name')
      .setRequired(true)
      .setMaxLength(100);

    const row = new ActionRowBuilder().addComponents(ignInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
    
  } catch (error) {
    console.error('Error in handleSuggestedTimezoneSelection:', error);
    stateManager.clearRegistrationState(interaction.user.id);
  }
}

export async function handleIGNModal(interaction) {
  try {
    const userId = interaction.user.id;
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    const ign = interaction.fields.getTextInputValue('ign');
    const type = state.type;

    if (type === 'main') {
      // Save main character with timezone separately
      await saveMainCharacterFinal(interaction, userId, state, ign);
    } else {
      // Save alt character (no timezone)
      await saveAltCharacter(interaction, userId, state, ign);
    }
    
  } catch (error) {
    console.error('Error in handleIGNModal:', error);
    stateManager.clearRegistrationState(interaction.user.id);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

async function saveMainCharacterFinal(interaction, userId, state, ign) {
  await interaction.deferReply({ ephemeral: true });

  // Save main character (without timezone in character record)
  const characterData = {
    discordId: userId,
    discordName: interaction.user.tag,
    ign: ign,
    role: state.role,
    className: state.class,
    subclass: state.subclass,
    abilityScore: state.abilityScore ? parseInt(state.abilityScore) : null,
    guild: state.guild || null,
    isMain: true  // ✅ NEW: Mark as main character
  };

  await queries.createCharacter(characterData);

  // Save timezone separately if provided
  if (state.timezone) {
    await queries.setUserTimezone(userId, interaction.user.tag, state.timezone);
  }

  const embed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('✅ Main Character Registered!')
    .setDescription('Your main character has been successfully registered.')
    .addFields(
      { name: '🎮 IGN', value: ign, inline: true },
      { name: '🎭 Class', value: `${state.class} (${state.subclass})`, inline: true },
      { name: '⚔️ Role', value: state.role, inline: true }
    )
    .setFooter({ text: '💡 Loading your profile...' })
    .setTimestamp();

  if (state.guild) {
    embed.addFields({ name: '🏰 Guild', value: state.guild, inline: true });
  }

  if (state.abilityScore) {
    embed.addFields({ name: '💪 Ability Score', value: `~${parseInt(state.abilityScore).toLocaleString()}`, inline: true });
  }

  if (state.timezone) {
    embed.addFields({ name: '🌍 Timezone', value: state.timezone, inline: true });
  }

  await interaction.editReply({ embeds: [embed], components: [] });
  
  stateManager.clearRegistrationState(userId);
  
  // Show main menu immediately
  setTimeout(async () => {
    try {
      const editMemberDetails = await import('../commands/edit-member-details.js');
      await editMemberDetails.default.showMainMenu(interaction, false);
    } catch (error) {
      console.error('Error returning to menu after registration:', error);
    }
  }, 2000);
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

    // Save alt character WITH ability score and guild (like main)
    const altData = {
      discordId: userId,
      discordName: interaction.user.tag,
      ign: ign,
      role: state.role,
      className: state.class,
      subclass: state.subclass,
      abilityScore: state.abilityScore ? parseInt(state.abilityScore) : null,  // ✅ NOW INCLUDED
      guild: state.guild || null,  // ✅ NOW INCLUDED
      isMain: false
    };

    await queries.createCharacter(altData);

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

    if (state.abilityScore) {
      embed.addFields({ name: '💪 Ability Score', value: `~${parseInt(state.abilityScore).toLocaleString()}`, inline: true });
    }

    if (state.guild) {
      embed.addFields({ name: '🏰 Guild', value: state.guild, inline: true });
    }

    await interaction.editReply({ embeds: [embed] });
    
    // Clear state
    stateManager.clearRegistrationState(userId);
    
    // Show menu
    setTimeout(async () => {
      try {
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

async function showTimezoneRegionSelection(interaction, userId, state) {
  const regions = getTimezoneRegions();
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_timezone_region_${userId}`)
    .setPlaceholder('🌍 Select your region (or skip)')
    .addOptions(
      [
        {
          label: '⏭️ Skip Timezone',
          value: 'SKIP_TIMEZONE',
          description: 'Continue without setting a timezone'
        },
        ...regions.map(region => ({
          label: region,
          value: region,
          emoji: getRegionEmoji(region)
        }))
      ]
    );

  const backButton = new ButtonBuilder()
    .setCustomId(`back_from_timezone_${userId}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('⭐ Register Main Character')
    .setDescription('**Step (Optional):** Select your timezone region\n\n💡 You can skip this step or select a region below.')
    .setFooter({ text: '🌍 Timezone helps coordinate with guild members' })
    .setTimestamp();
  
  if (state.class) {
    embed.addFields({ name: '🎭 Class', value: state.class, inline: true });
  }
  if (state.subclass) {
    embed.addFields({ name: '🎯 Subclass', value: state.subclass, inline: true });
  }

  await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
}

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

    // Check if user wants to skip timezone
    if (selectedRegion === 'SKIP_TIMEZONE') {
      stateManager.setRegistrationState(userId, {
        ...state,
        timezone: null
      });
      
      // Show IGN modal
      const modal = new ModalBuilder()
        .setCustomId(`ign_modal_main_${userId}`)
        .setTitle('Final Step: Character Name');

      const ignInput = new TextInputBuilder()
        .setCustomId('ign')
        .setLabel('In-Game Name (IGN)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter your character name')
        .setRequired(true)
        .setMaxLength(100);

      const row = new ActionRowBuilder().addComponents(ignInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
      return;
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

    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_region_${userId}`)
      .setLabel('Back to Regions')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️');

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('⭐ Register Main Character')
      .setDescription('**Step:** Select your country')
      .addFields(
        { name: '🌍 Region', value: selectedRegion, inline: true }
      )
      .setFooter({ text: '💡 Choose your country or go back' })
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [row1, row2] });
    
    stateManager.setRegistrationState(userId, {
      ...state,
      selectedRegion: selectedRegion
    });
    
  } catch (error) {
    console.error('Error in handleTimezoneRegionSelection:', error);
    stateManager.clearRegistrationState(interaction.user.id);
  }
}

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

    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_country_${userId}`)
      .setLabel('Back to Countries')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️');

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('⭐ Register Main Character')
      .setDescription('**Step:** Select your specific timezone')
      .addFields(
        { name: '🌍 Country', value: selectedCountry, inline: true }
      )
      .setFooter({ text: '💡 Choose your timezone or go back' })
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [row1, row2] });
    
    stateManager.setRegistrationState(userId, {
      ...state,
      selectedCountry: selectedCountry
    });
    
  } catch (error) {
    console.error('Error in handleTimezoneCountrySelection:', error);
    stateManager.clearRegistrationState(interaction.user.id);
  }
}

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

    // Store timezone
    stateManager.setRegistrationState(userId, {
      ...state,
      timezone: selectedTimezone
    });

    // Show IGN modal
    const modal = new ModalBuilder()
      .setCustomId(`ign_modal_main_${userId}`)
      .setTitle('Final Step: Character Name');

    const ignInput = new TextInputBuilder()
      .setCustomId('ign')
      .setLabel('In-Game Name (IGN)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter your character name')
      .setRequired(true)
      .setMaxLength(100);

    const row = new ActionRowBuilder().addComponents(ignInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
    
  } catch (error) {
    console.error('Error in handleTimezoneSelection:', error);
    stateManager.clearRegistrationState(interaction.user.id);
  }
}

export async function handleBackFromTimezone(interaction) {
  try {
    const userId = interaction.user.id;
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    await showTimezoneRegionSelection(interaction, userId, state);
    
  } catch (error) {
    console.error('Error in handleBackFromTimezone:', error);
  }
}

export async function handleBackToRegion(interaction) {
  try {
    const userId = interaction.user.id;
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    await showTimezoneRegionSelection(interaction, userId, state);
    
  } catch (error) {
    console.error('Error in handleBackToRegion:', error);
  }
}

export async function handleBackToCountry(interaction) {
  try {
    const userId = interaction.user.id;
    const state = stateManager.getRegistrationState(userId);
    
    if (!state || !state.selectedRegion) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    const countries = getCountriesInRegion(state.selectedRegion);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_timezone_country_${userId}`)
      .setPlaceholder('🌍 Select your country')
      .addOptions(
        countries.map(country => ({
          label: country,
          value: country
        }))
      );

    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_region_${userId}`)
      .setLabel('Back to Regions')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️');

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('⭐ Register Main Character')
      .setDescription('**Step:** Select your country')
      .addFields(
        { name: '🌍 Region', value: state.selectedRegion, inline: true }
      )
      .setFooter({ text: '💡 Choose your country or go back' })
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [row1, row2] });
    
  } catch (error) {
    console.error('Error in handleBackToCountry:', error);
  }
}

export async function handleBackToCountry(interaction) {
  try {
    const userId = interaction.user.id;
    const state = stateManager.getRegistrationState(userId);
    
    if (!state || !state.selectedRegion) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    const countries = getCountriesInRegion(state.selectedRegion);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_timezone_country_${userId}`)
      .setPlaceholder('🌍 Select your country')
      .addOptions(
        countries.map(country => ({
          label: country,
          value: country
        }))
      );

    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_region_${userId}`)
      .setLabel('Back to Regions')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️');

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('⭐ Register Main Character')
      .setDescription('**Step:** Select your country')
      .addFields(
        { name: '🌍 Region', value: state.selectedRegion, inline: true }
      )
      .setFooter({ text: '💡 Choose your country or go back' })
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [row1, row2] });
    
  } catch (error) {
    console.error('Error in handleBackToCountry:', error);
  }
}

// ✅ NEW: Back button handlers for registration flow
export async function handleBackToSubclass(interaction) {
  try {
    const userId = interaction.user.id;
    const state = stateManager.getRegistrationState(userId);
    
    if (!state || !state.class) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    const subclasses = getSubclassesForClass(state.class);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_subclass_${state.type}_${userId}`)
      .setPlaceholder('🎯 Choose your subclass')
      .addOptions(
        subclasses.map(subclass => ({
          label: subclass,
          value: subclass
        }))
      );

    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_class_${userId}`)
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️');

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle(`⭐ ${state.type === 'main' ? 'Register Main Character' : 'Add Alt Character'}`)
      .setDescription(`**Step 2:** Select your ${state.class} subclass`)
      .addFields({
        name: '🎭 Selected Class',
        value: state.class,
        inline: true
      })
      .setFooter({ text: '💡 Choose your specialization' })
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [row1, row2] });
    
  } catch (error) {
    console.error('Error in handleBackToSubclass:', error);
  }
}

export async function handleBackToAbility(interaction) {
  try {
    const userId = interaction.user.id;
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    await showAbilityScoreSelection(interaction, userId, state, state.class, state.subclass, state.type);
    
  } catch (error) {
    console.error('Error in handleBackToAbility:', error);
  }
}

export async function handleBackToClass(interaction) {
  try {
    const userId = interaction.user.id;
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    await showClassSelection(interaction, userId, state.type);
    
  } catch (error) {
    console.error('Error in handleBackToClass:', error);
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
