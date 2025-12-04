import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { GAME_DATA, getRoleFromClass, getSubclassesForClass, getTimezoneRegions, getCountriesInRegion, getTimezonesForCountry } from '../config/gameData.js';
import { queries } from '../database/queries.js';
import stateManager from '../utils/stateManager.js';

// ==================== MAIN CHARACTER HANDLERS ====================

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
          value: 'Use the **Edit Main** button to update your main character.',
          inline: false
        })
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Initialize state and show class selection
    stateManager.setRegistrationState(userId, { 
      type: 'main',
      characterType: 'main',
      step: 'class' 
    });
    
    await showClassSelection(interaction, userId, 'main');
    
  } catch (error) {
    console.error('Error in handleAddMain:', error);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

// ==================== ALT CHARACTER HANDLERS ====================

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

    // Initialize state and show class selection
    stateManager.setRegistrationState(userId, { 
      type: 'alt',
      characterType: 'alt',
      step: 'class' 
    });
    
    await showClassSelection(interaction, userId, 'alt');
    
  } catch (error) {
    console.error('Error in handleAddAlt:', error);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

// ==================== SHARED CLASS SELECTION ====================

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

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_menu_${userId}`)
    .setLabel('Back to Menu')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle(`⭐ ${type === 'main' ? 'Register Main Character' : 'Add Alt Character'}`)
    .setDescription('**Step 1:** Select your class')
    .setFooter({ text: '💡 Choose the class you play' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

// ==================== CLASS SELECTION HANDLER ====================

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

    // Update state
    stateManager.setRegistrationState(userId, {
      ...state,
      class: selectedClass,
      step: 'subclass'
    });

    // Show subclass selection
    await showSubclassSelection(interaction, userId, state.type, selectedClass);
    
  } catch (error) {
    console.error('Error in handleClassSelection:', error);
    stateManager.clearRegistrationState(interaction.user.id);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

// ==================== SUBCLASS SELECTION ====================

async function showSubclassSelection(interaction, userId, type, selectedClass) {
  const subclasses = getSubclassesForClass(selectedClass);
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_subclass_${type}_${userId}`)
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
    .setTitle(`⭐ ${type === 'main' ? 'Register Main Character' : 'Add Alt Character'}`)
    .setDescription(`**Step 2:** Select your ${selectedClass} subclass`)
    .addFields({
      name: '🎭 Selected Class',
      value: selectedClass,
      inline: true
    })
    .setFooter({ text: '💡 Choose your specialization' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

// ==================== SUBCLASS SELECTION HANDLER ====================

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

    const role = getRoleFromClass(state.class);
    
    // Update state
    stateManager.setRegistrationState(userId, {
      ...state,
      subclass: selectedSubclass,
      role: role,
      step: 'ability_score'
    });

    // Show ability score selection
    await showAbilityScoreSelection(interaction, userId, state);
    
  } catch (error) {
    console.error('Error in handleSubclassSelection:', error);
    stateManager.clearRegistrationState(interaction.user.id);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

// ==================== ABILITY SCORE SELECTION ====================

async function showAbilityScoreSelection(interaction, userId, state) {
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
    .setTitle(`⭐ ${state.type === 'main' ? 'Register Main Character' : 'Add Alt Character'}`)
    .setDescription('**Step 3:** Select your ability score range')
    .addFields(
      { name: '🎭 Class', value: state.class, inline: true },
      { name: '🎯 Subclass', value: state.subclass, inline: true }
    )
    .setFooter({ text: '💪 Choose the range closest to your ability score' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

// ==================== ABILITY SCORE HANDLER ====================

export async function handleAbilityScoreSelection(interaction) {
  try {
    const userId = interaction.user.id;
    const selectedScore = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ephemeral: true
      });
    }

    // Update state
    stateManager.setRegistrationState(userId, {
      ...state,
      abilityScore: selectedScore,
      step: 'guild'
    });

    // Show guild selection
    await showGuildSelection(interaction, userId, state);
    
  } catch (error) {
    console.error('Error in handleAbilityScoreSelection:', error);
    stateManager.clearRegistrationState(interaction.user.id);
  }
}

// ==================== GUILD SELECTION ====================

async function showGuildSelection(interaction, userId, state) {
  const guilds = GAME_DATA.guilds;
  
  if (guilds.length === 0) {
    // No guilds configured, skip to next step
    stateManager.setRegistrationState(userId, {
      ...state,
      guild: null
    });
    
    // Main goes to timezone, alt goes to IGN
    if (state.type === 'main') {
      await showTimezoneSelection(interaction, userId, state);
    } else {
      await showIGNModal(interaction, userId, state.type);
    }
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

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_ability_${userId}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle(`⭐ ${state.type === 'main' ? 'Register Main Character' : 'Add Alt Character'}`)
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

// ==================== GUILD SELECTION HANDLER ====================

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

    // Store guild
    stateManager.setRegistrationState(userId, {
      ...state,
      guild: selectedGuild,
      step: 'timezone_or_ign'
    });

    // Main goes to timezone, alt goes to IGN modal
    if (state.type === 'main') {
      await showTimezoneSelection(interaction, userId, state);
    } else {
      await showIGNModal(interaction, userId, state.type);
    }
    
  } catch (error) {
    console.error('Error in handleGuildSelection:', error);
    stateManager.clearRegistrationState(interaction.user.id);
  }
}

// ==================== TIMEZONE SELECTION (MAIN ONLY) ====================

async function showTimezoneSelection(interaction, userId, state) {
  // Get current UTC time
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  
  // Estimate user's local time from interaction timestamp
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

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_guild_${userId}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

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

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

// Continue in next file due to length...
export { showIGNModal };

async function showIGNModal(interaction, userId, type) {
  const modal = new ModalBuilder()
    .setCustomId(`ign_modal_${type}_${userId}`)
    .setTitle(`Final Step: Character Name`);

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
