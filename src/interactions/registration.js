import { 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} from 'discord.js';
import logger from '../services/consoleLogger.js';
import { CharacterRepo, BattleImagineRepo, TimezoneRepo } from '../database/repositories.js';
import state from '../services/state.js';
import config from '../config/index.js';
import { CLASSES, ABILITY_SCORES, REGIONS, TIMEZONE_ABBR, TIERS } from '../config/game.js';
import { formatScore } from '../ui/utils.js';
import { updateNickname } from '../services/nickname.js';
import { profileEmbed } from '../ui/embeds.js';
import * as ui from '../ui/components.js';
import applicationService from '../services/applications.js';
import classRoleService from '../services/classRoles.js';

const activeInteractions = new Map();

function hasActiveInteraction(userId, interactionId) {
  const active = activeInteractions.get(userId);
  if (!active) return false;
  
  if (Date.now() - active.timestamp > 3000) {
    activeInteractions.delete(userId);
    return false;
  }
  
  return active.id !== interactionId;
}

function setActiveInteraction(userId, interactionId) {
  activeInteractions.set(userId, {
    id: interactionId,
    timestamp: Date.now()
  });
}

function clearActiveInteraction(userId) {
  activeInteractions.delete(userId);
}

function centerText(text, width = 42) {
  return text.padStart((text.length + width) / 2).padEnd(width);
}

function createRegEmbed(step, total, title, description) {
  const titleLine = centerText(title);
  const descLines = description.split('\n').map(line => centerText(line));
  
  const progress = step / total;
  const filledBars = Math.floor(progress * 10);
  const emptyBars = 10 - filledBars;
  const progressBar = '♥'.repeat(filledBars) + '♡'.repeat(emptyBars);
  const progressText = `${progressBar} ${step}/${total}`;
  
  const ansiText = [
    '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m',
    `\u001b[1;34m${titleLine}\u001b[0m`,
    '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m',
    '',
    ...descLines.map(line => `\u001b[0;37m${line}\u001b[0m`),
    '',
    `\u001b[1;35m${centerText(progressText)}\u001b[0m`,
    '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m'
  ].join('\n');

  return new EmbedBuilder()
    .setColor('#EC4899')
    .setDescription(`\`\`\`ansi\n${ansiText}\n\`\`\``)
    .setTimestamp();
}

function getClassIconId(className) {
  const iconMap = {
    'Beat Performer': '1448837920931840021',
    'Frost Mage': '1448837917144387604',
    'Heavy Guardian': '1448837916171309147',
    'Marksman': '1448837914338267350',
    'Shield Knight': '1448837913218388000',
    'Stormblade': '1448837911838593188',
    'Verdant Oracle': '1448837910294958140',
    'Wind Knight': '1448837908302925874'
  };
  return iconMap[className] || null;
}

function getTimezoneAbbr(timezoneLabel) {
  const match = timezoneLabel.match(/^([A-Z]+)/);
  return match ? match[1] : timezoneLabel;
}

function getTotalSteps(characterType) {
  if (characterType === 'subclass' || characterType === 'main_subclass') {
    return 3;
  }
  
  const battleImagineSteps = config.battleImagines.length;
  return 7 + battleImagineSteps;
}

function getCountryEmoji(countryName) {
  const emojiMap = {
    'United States': '🇺🇸',
    'Canada': '🇨🇦',
    'Mexico': '🇲🇽',
    'Brazil': '🇧🇷',
    'Argentina': '🇦🇷',
    'Chile': '🇨🇱',
    'Colombia': '🇨🇴',
    'Peru': '🇵🇪',
    'United Kingdom': '🇬🇧',
    'France': '🇫🇷',
    'Germany': '🇩🇪',
    'Italy': '🇮🇹',
    'Spain': '🇪🇸',
    'Netherlands': '🇳🇱',
    'Belgium': '🇧🇪',
    'Austria': '🇦🇹',
    'Poland': '🇵🇱',
    'Sweden': '🇸🇪',
    'Greece': '🇬🇷',
    'Turkey': '🇹🇷',
    'Russia': '🇷🇺',
    'Japan': '🇯🇵',
    'South Korea': '🇰🇷',
    'China': '🇨🇳',
    'Hong Kong': '🇭🇰',
    'Taiwan': '🇹🇼',
    'Singapore': '🇸🇬',
    'Thailand': '🇹🇭',
    'Vietnam': '🇻🇳',
    'Philippines': '🇵🇭',
    'Indonesia': '🇮🇩',
    'India': '🇮🇳',
    'UAE': '🇦🇪',
    'Saudi Arabia': '🇸🇦',
    'Australia': '🇦🇺',
    'New Zealand': '🇳🇿',
    'Fiji': '🇫🇯',
    'South Africa': '🇿🇦',
    'Egypt': '🇪🇬',
    'Nigeria': '🇳🇬',
    'Kenya': '🇰🇪',
    'Morocco': '🇲🇦'
  };
  return emojiMap[countryName] || '🌍';
}

function getTimezoneCities(tzLabel) {
  const cityExamples = {
    'EST (Eastern)': 'New York, Toronto, Miami',
    'CST (Central)': 'Chicago, Mexico City, Winnipeg',
    'MST (Mountain)': 'Denver, Phoenix, Edmonton',
    'PST (Pacific)': 'Los Angeles, Vancouver, Seattle',
    'AKST (Alaska)': 'Anchorage, Juneau',
    'HST (Hawaii)': 'Honolulu, Hilo',
    'AST (Atlantic)': 'Halifax, San Juan',
    'GMT (London)': 'London, Dublin, Lisbon',
    'CET (Paris)': 'Paris, Berlin, Rome',
    'CET (Berlin)': 'Berlin, Amsterdam, Brussels',
    'CET (Rome)': 'Rome, Vienna, Stockholm',
    'CET (Madrid)': 'Madrid, Barcelona',
    'CET (Amsterdam)': 'Amsterdam, Copenhagen',
    'CET (Brussels)': 'Brussels, Luxembourg',
    'CET (Vienna)': 'Vienna, Prague',
    'CET (Warsaw)': 'Warsaw, Budapest',
    'CET (Stockholm)': 'Stockholm, Oslo',
    'EET (Athens)': 'Athens, Helsinki, Cairo',
    'TRT (Istanbul)': 'Istanbul, Ankara',
    'MSK (Moscow)': 'Moscow, St. Petersburg',
    'JST (Tokyo)': 'Tokyo, Osaka, Seoul',
    'KST (Seoul)': 'Seoul, Busan',
    'CST (Beijing)': 'Beijing, Shanghai, Hong Kong',
    'HKT (Hong Kong)': 'Hong Kong, Macau',
    'CST (Taipei)': 'Taipei, Kaohsiung',
    'SGT (Singapore)': 'Singapore, Kuala Lumpur',
    'ICT (Bangkok)': 'Bangkok, Hanoi, Jakarta',
    'ICT (Ho Chi Minh)': 'Ho Chi Minh, Phnom Penh',
    'PST (Manila)': 'Manila, Cebu',
    'WIB (Jakarta)': 'Jakarta, Bandung',
    'WITA (Bali)': 'Bali, Makassar',
    'IST (New Delhi)': 'New Delhi, Mumbai, Bangalore',
    'GST (Dubai)': 'Dubai, Abu Dhabi',
    'AST (Riyadh)': 'Riyadh, Jeddah',
    'AEDT (Sydney)': 'Sydney, Melbourne',
    'AEST (Brisbane)': 'Brisbane, Gold Coast',
    'ACDT (Adelaide)': 'Adelaide',
    'AWST (Perth)': 'Perth',
    'ACST (Darwin)': 'Darwin',
    'NZDT (Auckland)': 'Auckland, Wellington',
    'FJT (Suva)': 'Suva, Nadi',
    'SAST (Johannesburg)': 'Johannesburg, Cape Town',
    'EET (Cairo)': 'Cairo, Alexandria',
    'WAT (Lagos)': 'Lagos, Accra',
    'EAT (Nairobi)': 'Nairobi, Kampala',
    'WET (Casablanca)': 'Casablanca, Rabat',
    'BRT (Brasília)': 'São Paulo, Rio de Janeiro',
    'AMT (Amazon)': 'Manaus',
    'ART (Buenos Aires)': 'Buenos Aires, Córdoba',
    'CLT (Santiago)': 'Santiago, Valparaíso',
    'COT (Bogotá)': 'Bogotá, Medellín',
    'PET (Lima)': 'Lima, Cusco'
  };
  return cityExamples[tzLabel] || tzLabel.split('(')[1]?.replace(')', '') || tzLabel;
}

async function assignRoles(client, userId, guildName, characterData = null) {
  if (!config.discord?.guildId) {
    logger.debug('Registration', 'Guild ID not configured');
    return;
  }

  try {
    const guild = await client.guilds.fetch(config.discord.guildId);
    const member = await guild.members.fetch(userId);

    if (guildName === 'Visitor') {
      if (config.roles.visitor) {
        await member.roles.add(config.roles.visitor);
        logger.roles(`Added Visitor role to ${member.user.username}`);
      }
      
      if (config.roles.verified && member.roles.cache.has(config.roles.verified)) {
        await member.roles.remove(config.roles.verified);
        logger.roles(`Removed Registered role from ${member.user.username}`);
      }
    } else {
      if (config.roles.verified) {
        await member.roles.add(config.roles.verified);
        logger.roles(`Added Registered role to ${member.user.username}`);
      }

      if (config.roles.visitor && member.roles.cache.has(config.roles.visitor)) {
        await member.roles.remove(config.roles.visitor);
        logger.roles(`Removed Visitor role from ${member.user.username}`);
      }
    }

  } catch (error) {
    logger.error('Registration', 'Role assignment error', error);
  }
}

async function removeRoles(client, userId) {
  if (!config.roles?.registered || !config.discord?.guildId) {
    logger.debug('Registration', 'Role removal not configured');
    return;
  }

  try {
    const guild = await client.guilds.fetch(config.discord.guildId);
    const member = await guild.members.fetch(userId);

    if (config.roles.verified && member.roles.cache.has(config.roles.verified)) {
      await member.roles.remove(config.roles.verified);
      logger.roles(`Removed Registered role from ${member.user.username}`);
    }

    if (config.roles.visitor) {
      await member.roles.add(config.roles.visitor);
      logger.roles(`Added Visitor role to ${member.user.username}`);
    }

  } catch (error) {
    logger.error('Registration', 'Role removal error', error);
  }
}

export async function start(interaction, userId, characterType = 'main') {
  if (hasActiveInteraction(userId, interaction.id)) {
    logger.debug('Registration', `Race condition detected for ${userId}, ignoring`);
    return;
  }
  
  setActiveInteraction(userId, interaction.id);
  
  const currentState = state.get(userId, 'reg') || {};
  
  logger.debug('Registration', `Starting for ${userId}, type: ${characterType}`);
  
  if (characterType === 'subclass' || currentState.type === 'subclass') {
    state.set(userId, 'reg', { ...currentState, type: 'subclass' });
    clearActiveInteraction(userId);
    return showClassSelection(interaction, userId);
  }
  
  state.set(userId, 'reg', { type: 'main' });
  
  const totalSteps = getTotalSteps('main');
  const embed = createRegEmbed(1, totalSteps, '🌍 Choose Your Region', 'Where are you playing from?');

  const regionOptions = Object.keys(REGIONS).map(region => ({
    label: region,
    value: region,
    emoji: '🌍',
    description: 'Select your region'
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_region_${userId}`)
    .setPlaceholder('🌍 Pick your region')
    .addOptions(regionOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_profile_${userId}`)
    .setLabel('❌ Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  if (interaction.replied || interaction.deferred) {
    await interaction.editReply({ embeds: [embed], components: [row1, row2] });
  } else {
    await interaction.update({ embeds: [embed], components: [row1, row2] });
  }
  
  clearActiveInteraction(userId);
}

async function showClassSelection(interaction, userId) {
  const currentState = state.get(userId, 'reg');
  const totalSteps = getTotalSteps('subclass');
  
  const embed = createRegEmbed(1, totalSteps, '🎭 Which class speaks to you?', 'Choose your subclass');

  const classOptions = Object.entries(CLASSES).map(([name, data]) => ({
    label: name,
    value: name,
    description: data.role,
    emoji: data.iconId ? { id: data.iconId } : data.emoji
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_class_${userId}`)
    .setPlaceholder('🎭 Pick your class')
    .addOptions(classOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_profile_${userId}`)
    .setLabel('❌ Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleRegion(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) return;
  setActiveInteraction(userId, interaction.id);
  
  const region = interaction.values[0];
  const currentState = state.get(userId, 'reg') || {};
  state.set(userId, 'reg', { ...currentState, region });

  const totalSteps = getTotalSteps('main');
  const embed = createRegEmbed(2, totalSteps, '🏳️ Choose Your Country', `Region: ${region}`);

  const countries = Object.keys(REGIONS[region]);
  const countryOptions = countries.map(country => {
    const countryName = country.replace(/^[\u{1F1E6}-\u{1F1FF}]{2}\s*/u, '');
    const emoji = getCountryEmoji(countryName);
    return {
      label: countryName,
      value: country,
      description: emoji + ' ' + region,
      emoji: emoji
    };
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_country_${userId}`)
    .setPlaceholder('🏳️ Pick your country')
    .addOptions(countryOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_region_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  clearActiveInteraction(userId);
}

export async function handleCountry(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) return;
  setActiveInteraction(userId, interaction.id);
  
  const currentState = state.get(userId, 'reg');
  const country = interaction.values[0];
  state.set(userId, 'reg', { ...currentState, country });

  const totalSteps = getTotalSteps('main');
  const countryName = country.replace(/^[\u{1F1E6}-\u{1F1FF}]{2}\s*/u, '');
  const embed = createRegEmbed(3, totalSteps, '🕐 Choose Your Timezone', `Country: ${countryName}`);

  const timezones = REGIONS[currentState.region][country];
  
  const timezoneOptions = Object.keys(timezones).map(tzLabel => {
    const cities = getTimezoneCities(tzLabel);
    const abbr = tzLabel.split(' ')[0];
    
    return {
      label: abbr,
      value: timezones[tzLabel],
      description: cities,
      emoji: '🕐'
    };
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_timezone_${userId}`)
    .setPlaceholder('🕐 Pick your timezone')
    .addOptions(timezoneOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_country_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  clearActiveInteraction(userId);
}

export async function handleTimezone(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) return;
  setActiveInteraction(userId, interaction.id);
  
  const currentState = state.get(userId, 'reg');
  const timezone = interaction.values[0];
  
  let timezoneAbbr = '';
  const timezones = REGIONS[currentState.region][currentState.country];
  for (const [label, tz] of Object.entries(timezones)) {
    if (tz === timezone) {
      timezoneAbbr = getTimezoneAbbr(label);
      break;
    }
  }
  
  await TimezoneRepo.set(userId, timezone);
  state.set(userId, 'reg', { ...currentState, timezone, timezoneAbbr });

  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { 
    timeZone: timezone, 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  const totalSteps = getTotalSteps('main');
  const embed = createRegEmbed(4, totalSteps, '🎭 Which class speaks to you?', `Timezone: ${timezoneAbbr} • ${timeString}`);

  const classOptions = Object.entries(CLASSES).map(([name, data]) => ({
    label: name,
    value: name,
    description: data.role,
    emoji: data.iconId ? { id: data.iconId } : data.emoji
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_class_${userId}`)
    .setPlaceholder('🎭 Pick your class')
    .addOptions(classOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_timezone_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  clearActiveInteraction(userId);
}

export async function handleClass(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) return;
  setActiveInteraction(userId, interaction.id);
  
  const className = interaction.values[0];
  const currentState = state.get(userId, 'reg');
  state.set(userId, 'reg', { ...currentState, class: className });

  const subclasses = CLASSES[className].subclasses;
  const classRole = CLASSES[className].role;
  
  const isSubclas
