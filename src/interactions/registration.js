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
import logger from '../services/logger.js';
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
    'YEKT (Yekaterinburg)': 'Yekaterinburg',
    'NOVT (Novosibirsk)': 'Novosibirsk',
    'VLAT (Vladivostok)': 'Vladivostok',
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
    'PET (Lima)': 'Lima, Cusco',
    'CST (Central)': 'Mexico City, Guadalajara',
    'MST (Mountain)': 'Chihuahua, Hermosillo',
    'PST (Pacific)': 'Tijuana, Mexicali'
  };
  return cityExamples[tzLabel] || tzLabel.split('(')[1]?.replace(')', '') || tzLabel;
}

async function assignRoles(client, userId, guildName, characterData = null) {
  if (!config.discord?.guildId) {
    console.log('[REGISTRATION] Guild ID not configured');
    return;
  }

  try {
    const guild = await client.guilds.fetch(config.discord.guildId);
    const member = await guild.members.fetch(userId);

    if (guildName === 'Visitor') {
      if (config.roles.visitor) {
        await member.roles.add(config.roles.visitor);
        console.log(`[REGISTRATION] Added Visitor role to ${userId}`);
      }
      
      if (config.roles.verified && member.roles.cache.has(config.roles.verified)) {
        await member.roles.remove(config.roles.verified);
        console.log(`[REGISTRATION] Removed Registered role from ${userId}`);
      }
    } else {
      if (config.roles.verified) {
        await member.roles.add(config.roles.verified);
        console.log(`[REGISTRATION] Added Registered role to ${userId}`);
      }

      if (config.roles.visitor && member.roles.cache.has(config.roles.visitor)) {
        await member.roles.remove(config.roles.visitor);
        console.log(`[REGISTRATION] Removed Visitor role from ${userId}`);
      }
    }

  } catch (error) {
    console.error('[REGISTRATION] Role assignment error:', error.message);
  }
}

async function removeRoles(client, userId) {
  if (!config.roles?.registered || !config.discord?.guildId) {
    console.log('[REGISTRATION] Role removal not configured');
    return;
  }

  try {
    const guild = await client.guilds.fetch(config.discord.guildId);
    const member = await guild.members.fetch(userId);

    if (config.roles.verified && member.roles.cache.has(config.roles.verified)) {
      await member.roles.remove(config.roles.verified);
      console.log(`[REGISTRATION] Removed Registered role from ${userId}`);
    }

    if (config.roles.visitor) {
      await member.roles.add(config.roles.visitor);
      console.log(`[REGISTRATION] Added Visitor role to ${userId}`);
    }

  } catch (error) {
    console.error('[REGISTRATION] Role removal error:', error.message);
  }
}

export async function start(interaction, userId, characterType = 'main') {
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId}, ignoring duplicate interaction`);
    return;
  }
  
  setActiveInteraction(userId, interaction.id);
  
  const currentState = state.get(userId, 'reg') || {};
  
  console.log('[REGISTRATION] Starting registration for user:', userId);
  console.log('[REGISTRATION] Character type:', characterType);
  console.log('[REGISTRATION] State:', JSON.stringify(currentState, null, 2));
  
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
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId} at region select, ignoring`);
    return;
  }
  
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
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId} at country select, ignoring`);
    return;
  }
  
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
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId} at timezone select, ignoring`);
    return;
  }
  
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
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId} at class select, ignoring`);
    return;
  }
  
  setActiveInteraction(userId, interaction.id);
  
  const className = interaction.values[0];
  const currentState = state.get(userId, 'reg');
  state.set(userId, 'reg', { ...currentState, class: className });

  const subclasses = CLASSES[className].subclasses;
  const classRole = CLASSES[className].role;
  
  const isSubclass = currentState.type === 'subclass';
  const totalSteps = getTotalSteps(currentState.type || 'main');
  
  const stepNum = isSubclass ? 2 : 5;
  
  const embed = createRegEmbed(stepNum, totalSteps, '✨ Subclass selection!', `Class: ${className}`);

  const subclassOptions = subclasses.map(subclassName => {
    const roleEmoji = classRole === 'Tank' ? '🛡️' : classRole === 'DPS' ? '⚔️' : '💚';
    const iconId = getClassIconId(className);
    
    const option = {
      label: subclassName,
      value: subclassName,
      description: classRole,
      emoji: iconId ? { id: iconId } : roleEmoji
    };
    
    return option;
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_subclass_${userId}`)
    .setPlaceholder('📋 Pick your subclass')
    .addOptions(subclassOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_class_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  
  clearActiveInteraction(userId);
}

export async function handleSubclass(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId} at subclass select, ignoring`);
    return;
  }
  
  setActiveInteraction(userId, interaction.id);
  
  const subclassName = interaction.values[0];
  const currentState = state.get(userId, 'reg');
  state.set(userId, 'reg', { ...currentState, subclass: subclassName });
  
  const isSubclass = currentState.type === 'subclass';
  const totalSteps = getTotalSteps(currentState.type || 'main');
  
  const stepNum = isSubclass ? 3 : 6;
  
  const embed = createRegEmbed(stepNum, totalSteps, '⚔️ What is your ability score?', `Subclass: ${subclassName}`);

  const scoreOptions = ABILITY_SCORES.map(score => ({
    label: score.label,
    value: score.value,
    description: 'Your ability score range',
    emoji: '💪'
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_ability_score_${userId}`)
    .setPlaceholder('💪 Pick your score')
    .addOptions(scoreOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_subclass_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  
  clearActiveInteraction(userId);
}

export async function handleScore(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId} at score select, ignoring`);
    return;
  }
  
  setActiveInteraction(userId, interaction.id);
  
  const abilityScore = interaction.values[0];
  const currentState = state.get(userId, 'reg');
  state.set(userId, 'reg', { ...currentState, abilityScore });

  const isSubclass = currentState.type === 'subclass';
  
  if (isSubclass) {
    try {
      const parentChar = await CharacterRepo.findById(currentState.parentId);
      
      if (!parentChar) {
        clearActiveInteraction(userId);
        throw new Error('Parent character not found');
      }

      const character = await CharacterRepo.create({
        userId,
        ign: parentChar.ign,
        uid: parentChar.uid,
        className: currentState.class,
        subclass: currentState.subclass,
        abilityScore: abilityScore,
        guild: parentChar.guild,
        characterType: 'main_subclass',
        parentId: currentState.parentId
      });

      console.log('[REGISTRATION] Created subclass:', character.id);

      // ✅ ADD CLASS ROLE
      await classRoleService.addClassRole(userId, currentState.class);

      const characters = await CharacterRepo.findAllByUser(userId);
      const main = characters.find(c => c.character_type === 'main');
      
      const embed = await profileEmbed(interaction.user, characters, interaction);
      const buttons = ui.profileButtons(userId, !!main);

      await interaction.update({ 
        embeds: [embed], 
        components: buttons
      });

      logger.register(interaction.user.username, 'subclass', parentChar.ign, `${currentState.class} - ${currentState.subclass}`);
      
      state.clear(userId, 'reg');
      clearActiveInteraction(userId);
    } catch (error) {
      console.error('[REGISTRATION ERROR]', error);
      logger.error('Registration', `Subclass registration error: ${error.message}`, error);
      clearActiveInteraction(userId);
      await interaction.update({
        content: '❌ Something went wrong. Please try again!',
        components: []
      });
    }
    return;
  }

  state.set(userId, 'reg', { 
    ...currentState, 
    abilityScore,
    battleImagines: [],
    currentImagineIndex: 0
  });
  
  await showBattleImagineSelection(interaction, userId);
  
  clearActiveInteraction(userId);
}

async function showBattleImagineSelection(interaction, userId) {
  const currentState = state.get(userId, 'reg');
  const { currentImagineIndex, battleImagines } = currentState;
  
  if (currentImagineIndex >= config.battleImagines.length) {
    await proceedToGuildSelection(interaction, userId);
    return;
  }
  
  const currentImagine = config.battleImagines[currentImagineIndex];
  const totalSteps = getTotalSteps(currentState.type || 'main');
  
  const stepNum = 7 + currentImagineIndex;
  
  const title = `⚔️ Battle Imagine - ${currentImagine.name}`;
  
  const embed = createRegEmbed(
    stepNum, 
    totalSteps, 
    title,
    `Do you own ${currentImagine.name}?\nSelect the highest tier you own:`
  );
  
  const tierOptions = [
    {
      label: 'Skip / I don\'t own this',
      value: 'skip',
      description: 'I don\'t have this Battle Imagine',
      emoji: '⏭️'
    }
  ];
  
  for (const tier of TIERS) {
    const option = {
      label: tier,
      value: tier,
      description: tier === 'T5' ? 'Tier Five (Max)' : `Tier ${tier.substring(1)}`,
      emoji: currentImagine.logo ? { id: currentImagine.logo } : '⭐'
    };
    
    tierOptions.push(option);
  }
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_battle_imagine_${userId}`)
    .setPlaceholder(`Choose tier for ${currentImagine.name}`)
    .addOptions(tierOptions);
  
  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_battle_imagine_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);
  
  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);
  
  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleBattleImagine(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId} at battle imagine select, ignoring`);
    return;
  }
  
  setActiveInteraction(userId, interaction.id);
  
  const currentState = state.get(userId, 'reg');
  const selectedTier = interaction.values[0];
  const currentImagine = config.battleImagines[currentState.currentImagineIndex];
  
  if (selectedTier !== 'skip') {
    currentState.battleImagines.push({
      name: currentImagine.name,
      tier: selectedTier
    });
  }
  
  currentState.currentImagineIndex++;
  state.set(userId, 'reg', currentState);
  
  await showBattleImagineSelection(interaction, userId);
  
  clearActiveInteraction(userId);
}

async function proceedToGuildSelection(interaction, userId) {
  const currentState = state.get(userId, 'reg');
  const scoreLabel = ABILITY_SCORES.find(s => s.value === currentState.abilityScore)?.label || currentState.abilityScore;
  const totalSteps = getTotalSteps(currentState.type || 'main');
  
  const stepNum = totalSteps - 1;
  
  const embed = createRegEmbed(stepNum, totalSteps, '💕 Did you finally join iDolls?', `Score: ${scoreLabel}\n\nOr still in denial?`);

  const guildOptions = config.guilds.map(guild => ({
    label: guild.name,
    value: guild.name,
    description: 'Choose your guild',
    emoji: '🏰'
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_guild_${userId}`)
    .setPlaceholder('🏰 Pick your guild')
    .addOptions(guildOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_battle_imagine_${userId}`)
    .setLabel('◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleGuild(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId} at guild select, ignoring`);
    return;
  }
  
  setActiveInteraction(userId, interaction.id);
  
  const guild = interaction.values[0];
  const currentState = state.get(userId, 'reg');
  
  if (!currentState) {
    clearActiveInteraction(userId);
    await interaction.reply({
      content: '❌ Registration session expired. Please start over with `/character`.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }
  
  state.set(userId, 'reg', { ...currentState, guild });

  const modal = new ModalBuilder()
    .setCustomId(`ign_modal_${userId}`)
    .setTitle('🎮 Your character name?');

  const ignInput = new TextInputBuilder()
    .setCustomId('ign')
    .setLabel('In-Game Name (IGN)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Your character name')
    .setRequired(true)
    .setMaxLength(50);

  const uidInput = new TextInputBuilder()
    .setCustomId('uid')
    .setLabel('UID (User ID)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Your game UID (required)')
    .setRequired(true)
    .setMaxLength(50);

  const row1 = new ActionRowBuilder().addComponents(ignInput);
  const row2 = new ActionRowBuilder().addComponents(uidInput);
  modal.addComponents(row1, row2);

  await interaction.showModal(modal);
  
  clearActiveInteraction(userId);
}

export async function handleIGN(interaction, userId) {
  const ign = interaction.fields.getTextInputValue('ign');
  const uid = interaction.fields.getTextInputValue('uid').trim();
  const currentState = state.get(userId, 'reg');

  console.log('[REGISTRATION] IGN entered:', ign);
  console.log('[REGISTRATION] UID entered:', uid);
  console.log('[REGISTRATION] Final state:', JSON.stringify(currentState, null, 2));

  if (!/^\d+$/.test(uid)) {
    state.set(userId, 'reg', { 
      ...currentState, 
      lastIgnEntered: ign 
    });
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setDescription('# ❌ **Invalid UID**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n**UID must contain only numbers.**\n\nYou entered: `' + uid + '`\n\nPlease click the button below to try again with a valid numeric UID.');
    
    const retryButton = new ButtonBuilder()
      .setCustomId(`retry_ign_uid_${userId}`)
      .setLabel('✏️ Retry Registration')
      .setStyle(ButtonStyle.Danger);
    
    const row = new ActionRowBuilder().addComponents(retryButton);
    
    await interaction.reply({ 
      embeds: [errorEmbed], 
      components: [row],
      flags: MessageFlags.Ephemeral
    });
    
    return;
  }

  try {
    const character = await CharacterRepo.create({
      userId,
      ign,
      uid,
      className: currentState.class,
      subclass: currentState.subclass,
      abilityScore: currentState.abilityScore,
      guild: currentState.guild,
      characterType: 'main',
      parentId: null
    });
    
    if (currentState.battleImagines && currentState.battleImagines.length > 0) {
      for (const imagine of currentState.battleImagines) {
        await BattleImagineRepo.add(character.id, imagine.name, imagine.tier);
      }
      console.log(`[REGISTRATION] Saved ${currentState.battleImagines.length} Battle Imagines`);
    }
    
    if (config.sync.nicknameEnabled) {
      try {
        const result = await updateNickname(interaction.client, config.discord.guildId, userId, ign);
        if (result.success) {
          console.log(`✅ [REGISTRATION] Nickname synced: ${ign}`);
        } else {
          console.error(`❌ [REGISTRATION] Nickname sync failed: ${result.reason}`);
        }
      } catch (e) {
        console.error('[REGISTRATION] Nickname sync error:', e.message);
      }
    }

    // ✅ ADD CLASS ROLE
    await classRoleService.addClassRole(userId, currentState.class);

    if (currentState.guild === 'iDolls' && config.roles.guild1) {
      await applicationService.createApplication(userId, character.id, currentState.guild);
    } else {
      await assignRoles(interaction.client, userId, currentState.guild, character);
    }
    
    state.clear(userId, 'reg');

    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.reply({ 
      embeds: [embed], 
      components: buttons,
      flags: MessageFlags.Ephemeral
    });

    logger.register(interaction.user.username, 'main', ign, currentState.class);
  } catch (error) {
    console.error('[REGISTRATION ERROR]', error);
    logger.error('Registration', `Registration error: ${error.message}`, error);
    await interaction.reply({
      content: '❌ Something went wrong. Please try again!',
      flags: MessageFlags.Ephemeral
    });
  }
}

export async function handleDelete(interaction, userId, characterId) {
  try {
    const allChars = await CharacterRepo.findAllByUser(userId);
    const mainChars = allChars.filter(c => c.character_type === 'main');
    
    const charToDelete = allChars.find(c => c.id === characterId);
    
    if (charToDelete && charToDelete.character_type === 'main' && mainChars.length === 1) {
      await removeRoles(interaction.client, userId);
    }
    
  } catch (error) {
    console.error('[REGISTRATION] Error handling character deletion:', error.message);
  }
}

export async function retryIGN(interaction, userId) {
  const currentState = state.get(userId, 'reg');
  
  if (!currentState) {
    await interaction.reply({ 
      content: '❌ Registration session expired. Please start over with `/character`.', 
      flags: MessageFlags.Ephemeral
    });
    return;
  }
  
  const modal = new ModalBuilder()
    .setCustomId(`ign_modal_${userId}`)
    .setTitle('🎮 Your character name?');

  const ignInput = new TextInputBuilder()
    .setCustomId('ign')
    .setLabel('In-Game Name (IGN)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Your character name')
    .setRequired(true)
    .setMaxLength(50);
  
  if (currentState.lastIgnEntered) {
    ignInput.setValue(currentState.lastIgnEntered);
  }

  const uidInput = new TextInputBuilder()
    .setCustomId('uid')
    .setLabel('UID (User ID) - Numbers only!')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter numeric UID (e.g. 123456789)')
    .setRequired(true)
    .setMaxLength(50);

  const row1 = new ActionRowBuilder().addComponents(ignInput);
  const row2 = new ActionRowBuilder().addComponents(uidInput);
  modal.addComponents(row1, row2);

  await interaction.showModal(modal);
}

export async function backToRegion(interaction, userId) {
  await start(interaction, userId);
}

export async function backToCountry(interaction, userId) {
  const currentState = state.get(userId, 'reg');
  if (!currentState || !currentState.region) {
    await start(interaction, userId);
    return;
  }
  
  interaction.values = [currentState.region];
  await handleRegion(interaction, userId);
}

export async function backToTimezone(interaction, userId) {
  const currentState = state.get(userId, 'reg');
  if (!currentState || !currentState.country) {
    await start(interaction, userId);
    return;
  }
  
  interaction.values = [currentState.country];
  await handleCountry(interaction, userId);
}

export async function backToClass(interaction, userId) {
  const currentState = state.get(userId, 'reg');
  
  if (currentState?.type === 'subclass') {
    state.clear(userId, 'reg');
    return interaction.update({ 
      content: '❌ Subclass registration cancelled.',
      embeds: [],
      components: []
    });
  }
  
  if (!currentState || !currentState.timezone) {
    await start(interaction, userId);
    return;
  }
  
  interaction.values = [currentState.timezone];
  await handleTimezone(interaction, userId);
}

export async function backToSubclass(interaction, userId) {
  const currentState = state.get(userId, 'reg');
  if (!currentState || !currentState.class) {
    await start(interaction, userId);
    return;
  }
  
  interaction.values = [currentState.class];
  await handleClass(interaction, userId);
}

export async function backToScore(interaction, userId) {
  const currentState = state.get(userId, 'reg');
  if (!currentState || !currentState.subclass) {
    await start(interaction, userId);
    return;
  }
  
  interaction.values = [currentState.subclass];
  await handleSubclass(interaction, userId);
}

export async function backToBattleImagine(interaction, userId) {
  const currentState = state.get(userId, 'reg');
  
  if (!currentState) {
    await start(interaction, userId);
    return;
  }
  
  if (currentState.currentImagineIndex === 0) {
    interaction.values = [currentState.subclass];
    await handleSubclass(interaction, userId);
    return;
  }
  
  currentState.currentImagineIndex--;
  
  if (currentState.battleImagines && currentState.battleImagines.length > 0) {
    currentState.battleImagines.pop();
  }
  
  state.set(userId, 'reg', currentState);
  await showBattleImagineSelection(interaction, userId);
}

export default {
  start,
  handleRegion,
  handleCountry,
  handleTimezone,
  handleClass,
  handleSubclass,
  handleScore,
  handleBattleImagine,
  handleGuild,
  handleIGN,
  retryIGN,
  handleDelete,
  backToRegion,
  backToCountry,
  backToTimezone,
  backToClass,
  backToSubclass,
  backToScore,
  backToBattleImagine
};
