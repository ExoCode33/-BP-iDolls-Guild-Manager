import { 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  EmbedBuilder 
} from 'discord.js';
import logger from '../utils/logger.js';
import db from '../services/database.js';
import { buildCharacterProfileEmbed } from '../components/embeds/characterProfile.js';
import { buildCharacterButtons } from '../components/buttons/characterButtons.js';
import { classes, getSubclassesByClass, getAbilityScores } from '../utils/gameData.js';
import config from '../utils/config.js';

const stateManager = (await import('../utils/stateManager.js')).default;

// Region → Countries → Timezones mapping
const REGIONS = {
  'North America': {
    '🇺🇸 United States': {
      'Eastern Time': 'America/New_York',
      'Central Time': 'America/Chicago',
      'Mountain Time': 'America/Denver',
      'Pacific Time': 'America/Los_Angeles',
      'Alaska Time': 'America/Anchorage',
      'Hawaii Time': 'Pacific/Honolulu'
    },
    '🇨🇦 Canada': {
      'Eastern Time': 'America/Toronto',
      'Central Time': 'America/Winnipeg',
      'Mountain Time': 'America/Edmonton',
      'Pacific Time': 'America/Vancouver',
      'Atlantic Time': 'America/Halifax'
    },
    '🇲🇽 Mexico': {
      'Central Time': 'America/Mexico_City',
      'Mountain Time': 'America/Chihuahua',
      'Pacific Time': 'America/Tijuana'
    }
  },
  'South America': {
    '🇧🇷 Brazil': {
      'Brasília Time': 'America/Sao_Paulo',
      'Amazon Time': 'America/Manaus'
    },
    '🇦🇷 Argentina': { 'Buenos Aires': 'America/Buenos_Aires' },
    '🇨🇱 Chile': { 'Santiago': 'America/Santiago' },
    '🇨🇴 Colombia': { 'Bogotá': 'America/Bogota' },
    '🇵🇪 Peru': { 'Lima': 'America/Lima' }
  },
  'Europe': {
    '🇬🇧 United Kingdom': { 'London': 'Europe/London' },
    '🇫🇷 France': { 'Paris': 'Europe/Paris' },
    '🇩🇪 Germany': { 'Berlin': 'Europe/Berlin' },
    '🇮🇹 Italy': { 'Rome': 'Europe/Rome' },
    '🇪🇸 Spain': { 'Madrid': 'Europe/Madrid' },
    '🇳🇱 Netherlands': { 'Amsterdam': 'Europe/Amsterdam' },
    '🇧🇪 Belgium': { 'Brussels': 'Europe/Brussels' },
    '🇦🇹 Austria': { 'Vienna': 'Europe/Vienna' },
    '🇵🇱 Poland': { 'Warsaw': 'Europe/Warsaw' },
    '🇸🇪 Sweden': { 'Stockholm': 'Europe/Stockholm' },
    '🇬🇷 Greece': { 'Athens': 'Europe/Athens' },
    '🇹🇷 Turkey': { 'Istanbul': 'Europe/Istanbul' },
    '🇷🇺 Russia': {
      'Moscow': 'Europe/Moscow',
      'St Petersburg': 'Europe/Moscow',
      'Yekaterinburg': 'Asia/Yekaterinburg',
      'Novosibirsk': 'Asia/Novosibirsk',
      'Vladivostok': 'Asia/Vladivostok'
    }
  },
  'Asia': {
    '🇯🇵 Japan': { 'Tokyo': 'Asia/Tokyo' },
    '🇰🇷 South Korea': { 'Seoul': 'Asia/Seoul' },
    '🇨🇳 China': { 'Beijing/Shanghai': 'Asia/Shanghai' },
    '🇭🇰 Hong Kong': { 'Hong Kong': 'Asia/Hong_Kong' },
    '🇹🇼 Taiwan': { 'Taipei': 'Asia/Taipei' },
    '🇸🇬 Singapore': { 'Singapore': 'Asia/Singapore' },
    '🇹🇭 Thailand': { 'Bangkok': 'Asia/Bangkok' },
    '🇻🇳 Vietnam': { 'Ho Chi Minh': 'Asia/Ho_Chi_Minh' },
    '🇵🇭 Philippines': { 'Manila': 'Asia/Manila' },
    '🇮🇩 Indonesia': {
      'Jakarta': 'Asia/Jakarta',
      'Bali': 'Asia/Makassar'
    },
    '🇮🇳 India': { 'New Delhi/Mumbai': 'Asia/Kolkata' },
    '🇦🇪 UAE': { 'Dubai': 'Asia/Dubai' },
    '🇸🇦 Saudi Arabia': { 'Riyadh': 'Asia/Riyadh' }
  },
  'Oceania': {
    '🇦🇺 Australia': {
      'Sydney/Melbourne': 'Australia/Sydney',
      'Brisbane': 'Australia/Brisbane',
      'Adelaide': 'Australia/Adelaide',
      'Perth': 'Australia/Perth',
      'Darwin': 'Australia/Darwin'
    },
    '🇳🇿 New Zealand': { 'Auckland': 'Pacific/Auckland' },
    '🇫🇯 Fiji': { 'Suva': 'Pacific/Fiji' }
  },
  'Africa': {
    '🇿🇦 South Africa': { 'Johannesburg': 'Africa/Johannesburg' },
    '🇪🇬 Egypt': { 'Cairo': 'Africa/Cairo' },
    '🇳🇬 Nigeria': { 'Lagos': 'Africa/Lagos' },
    '🇰🇪 Kenya': { 'Nairobi': 'Africa/Nairobi' },
    '🇲🇦 Morocco': { 'Casablanca': 'Africa/Casablanca' }
  }
};

export async function handleRegisterMain(interaction, userId) {
  const embed = new EmbedBuilder()
    .setColor('#EC4899')
    .setTitle('🎮 Register Main Character - Step 1/6')
    .setDescription('**Select your region:**\n\nThis will help us show the correct time on your profile.')
    .setTimestamp();

  const regionOptions = Object.keys(REGIONS).map(region => ({
    label: region,
    value: region,
    description: `Select ${region}`
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_region_${userId}`)
    .setPlaceholder('🌍 Choose your region')
    .addOptions(regionOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleRegionSelect(interaction, userId) {
  const region = interaction.values[0];
  stateManager.setRegistrationState(userId, { region });

  const embed = new EmbedBuilder()
    .setColor('#EC4899')
    .setTitle('🎮 Register Main Character - Step 2/6')
    .setDescription(`**Region:** ${region}\n\n**Select your country:**`)
    .setTimestamp();

  const countries = Object.keys(REGIONS[region]);
  const countryOptions = countries.map(country => ({
    label: country,
    value: country,
    description: `Select ${country.replace(/🇦-🇿 /g, '')}`
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_country_${userId}`)
    .setPlaceholder('🏳️ Choose your country')
    .addOptions(countryOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleCountrySelect(interaction, userId) {
  const state = stateManager.getRegistrationState(userId);
  const country = interaction.values[0];
  stateManager.setRegistrationState(userId, { ...state, country });

  const embed = new EmbedBuilder()
    .setColor('#EC4899')
    .setTitle('🎮 Register Main Character - Step 3/6')
    .setDescription(`**Region:** ${state.region}\n**Country:** ${country}\n\n**Select your timezone:**`)
    .setTimestamp();

  const timezones = REGIONS[state.region][country];
  const timezoneOptions = Object.keys(timezones).map(tzName => ({
    label: tzName,
    value: timezones[tzName],
    description: timezones[tzName]
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_timezone_${userId}`)
    .setPlaceholder('🕐 Choose your timezone')
    .addOptions(timezoneOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleTimezoneSelect(interaction, userId) {
  const state = stateManager.getRegistrationState(userId);
  const timezone = interaction.values[0];
  
  // Save timezone to database immediately
  await db.setUserTimezone(userId, timezone);
  
  stateManager.setRegistrationState(userId, { ...state, timezone });

  // Now show current time and proceed to guild selection
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { 
    timeZone: timezone, 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  const embed = new EmbedBuilder()
    .setColor('#EC4899')
    .setTitle('🎮 Register Main Character - Step 4/6')
    .setDescription(`**Timezone set!** 🌍\n\nYour current time: **${timeString}**\n\n**Now select your guild:**`)
    .setTimestamp();

  const guildOptions = config.guilds.map(guild => ({
    label: guild.name,
    value: guild.name,
    description: `Join ${guild.name}`
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_guild_${userId}`)
    .setPlaceholder('🏰 Choose your guild')
    .addOptions(guildOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleGuildSelect(interaction, userId) {
  const guild = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  stateManager.setRegistrationState(userId, { ...state, guild });

  const modal = new ModalBuilder()
    .setCustomId(`ign_modal_${userId}`)
    .setTitle('Enter Your IGN');

  const ignInput = new TextInputBuilder()
    .setCustomId('ign')
    .setLabel('In-Game Name (IGN)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter your in-game name')
    .setRequired(true)
    .setMaxLength(50);

  const row = new ActionRowBuilder().addComponents(ignInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

export async function handleIGNModal(interaction, userId) {
  const ign = interaction.fields.getTextInputValue('ign');
  const state = stateManager.getRegistrationState(userId);
  stateManager.setRegistrationState(userId, { ...state, ign });

  const embed = new EmbedBuilder()
    .setColor('#EC4899')
    .setTitle('🎮 Register Main Character - Step 5/6')
    .setDescription(`**IGN:** ${ign}\n**Guild:** ${state.guild}\n**Timezone:** ${state.timezone}\n\n**Select your class:**`)
    .setTimestamp();

  const classOptions = classes.map(cls => ({
    label: cls.name,
    value: cls.name,
    description: cls.role,
    emoji: cls.emoji
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_class_${userId}`)
    .setPlaceholder('🎭 Choose your class')
    .addOptions(classOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: config.ephemeral.registerChar });
}

export async function handleClassSelect(interaction, userId) {
  const className = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  stateManager.setRegistrationState(userId, { ...state, class: className });

  const subclasses = getSubclassesByClass(className);
  
  const embed = new EmbedBuilder()
    .setColor('#EC4899')
    .setTitle('🎮 Register Main Character - Step 5/6')
    .setDescription(`**Class:** ${className}\n\n**Select your subclass:**`)
    .setTimestamp();

  const subclassOptions = subclasses.map(sub => ({
    label: sub.name,
    value: sub.name,
    description: sub.role,
    emoji: sub.roleEmoji
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_subclass_${userId}`)
    .setPlaceholder('📋 Choose your subclass')
    .addOptions(subclassOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleSubclassSelect(interaction, userId) {
  const subclassName = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  stateManager.setRegistrationState(userId, { ...state, subclass: subclassName });

  const abilityScores = getAbilityScores();
  
  const embed = new EmbedBuilder()
    .setColor('#EC4899')
    .setTitle('🎮 Register Main Character - Step 6/6')
    .setDescription(`**Subclass:** ${subclassName}\n\n**Select your ability score:**`)
    .setTimestamp();

  const scoreOptions = abilityScores.map(score => ({
    label: score.label,
    value: score.value
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_ability_score_${userId}`)
    .setPlaceholder('💪 Choose your score')
    .addOptions(scoreOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleAbilityScoreSelect(interaction, userId) {
  const abilityScore = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);

  try {
    const characterData = {
      userId,
      ign: state.ign,
      guild: state.guild,
      class: state.class,
      subclass: state.subclass,
      abilityScore,
      characterType: 'main'
    };

    await db.createCharacter(characterData);
    stateManager.clearRegistrationState(userId);

    const characters = await db.getAllCharactersWithSubclasses(userId);
    const mainChar = characters.find(c => c.character_type === 'main');
    const alts = characters.filter(c => c.character_type === 'alt');
    const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

    const embed = await buildCharacterProfileEmbed(interaction.user, characters, interaction);
    const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);

    await interaction.update({ 
      embeds: [embed], 
      components: buttons
    });

    logger.logAction(interaction.user.tag, 'registered main character', `${state.ign} - ${state.class}`);
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    await interaction.update({
      content: '❌ Error during registration. Please try again.',
      embeds: [],
      components: []
    });
  }
}

export default {
  handleRegisterMain,
  handleRegionSelect,
  handleCountrySelect,
  handleTimezoneSelect,
  handleGuildSelect,
  handleIGNModal,
  handleClassSelect,
  handleSubclassSelect,
  handleAbilityScoreSelect
};
