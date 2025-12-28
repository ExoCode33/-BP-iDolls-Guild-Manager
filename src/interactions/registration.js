import { 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
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
  
  const ansiText = [
    '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m',
    `\u001b[1;34m${titleLine}\u001b[0m`,
    '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m',
    '',
    ...descLines.map(line => `\u001b[0;37m${line}\u001b[0m`),
    '',
    `\u001b[0;36m${centerText('✨ Step ' + step + ' of ' + total)}\u001b[0m`,
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
  const baseSteps = {
    'main': 7,
    'alt': 4,
    'subclass': 2
  };
  
  const battleImagineSteps = config.battleImagines.length;
  
  if (characterType === 'subclass' || characterType === 'main_subclass' || characterType === 'alt_subclass') {
    return baseSteps.subclass;
  }
  
  const type = characterType === 'alt' ? 'alt' : 'main';
  return baseSteps[type] + battleImagineSteps;
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

async function assignRoles(client, userId, guildName) {
  if (!config.roles?.registered || !config.discord?.guildId) {
    console.log('[REGISTRATION] Role assignment not configured');
    return;
  }

  try {
    const guild = await client.guilds.fetch(config.discord.guildId);
    const member = await guild.members.fetch(userId);

    // Add Registered role
    if (config.roles.registered) {
      await member.roles.add(config.roles.registered);
      console.log(`[REGISTRATION] Added Registered role to ${userId}`);
    }

    // Remove Visitor role if they have it
    if (config.roles.visitor && member.roles.cache.has(config.roles.visitor)) {
      await member.roles.remove(config.roles.visitor);
      console.log(`[REGISTRATION] Removed Visitor role from ${userId}`);
    }

    // Check if guild is iDolls and add guild role
    if (guildName === 'iDolls' && config.roles.guild1) {
      await notifyAdminForGuildRole(client, member, guildName);
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

    // Remove Registered role
    if (config.roles.registered && member.roles.cache.has(config.roles.registered)) {
      await member.roles.remove(config.roles.registered);
      console.log(`[REGISTRATION] Removed Registered role from ${userId}`);
    }

    // Add Visitor role
    if (config.roles.visitor) {
      await member.roles.add(config.roles.visitor);
      console.log(`[REGISTRATION] Added Visitor role to ${userId}`);
    }

  } catch (error) {
    console.error('[REGISTRATION] Role removal error:', error.message);
  }
}

async function notifyAdminForGuildRole(client, member, guildName) {
  if (!config.channels?.admin) {
    console.log('[REGISTRATION] Admin channel not configured');
    return;
  }

  try {
    const adminChannel = await client.channels.fetch(config.channels.admin);
    
    const embed = new EmbedBuilder()
      .setColor('#EC4899')
      .setTitle('🏰 New Guild Member Needs Role')
      .setDescription(`**${member.user.username}** (${member.user.tag}) has registered and chosen **${guildName}**.\n\nPlease assign the guild role: <@&${config.roles.guild1}>`)
      .addFields(
        { name: 'User', value: `<@${member.id}>`, inline: true },
        { name: 'Guild', value: guildName, inline: true }
      )
      .setTimestamp();

    await adminChannel.send({ 
      content: `<@&${config.roles.guild1}> role needed for <@${member.id}>`,
      embeds: [embed] 
    });

    console.log(`[REGISTRATION] Notified admins about guild role for ${member.user.username}`);
  } catch (error) {
    console.error('[REGISTRATION] Admin notification error:', error.message);
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
  console.log('[REGISTRATION] State:', JSON.stringify(currentState, null, 2));
  
  const existingTimezone = await TimezoneRepo.get(userId);
  const isAlt = characterType === 'alt' || currentState.characterType === 'alt';
  
  console.log('[REGISTRATION] Is Alt:', isAlt, '| Existing timezone:', existingTimezone);
  
  if (isAlt && existingTimezone) {
    console.log('[REGISTRATION] Skipping timezone for alt, going to class selection');
    
    let timezoneAbbr = '';
    outer: for (const region of Object.keys(REGIONS)) {
      for (const country of Object.keys(REGIONS[region])) {
        for (const [label, tz] of Object.entries(REGIONS[region][country])) {
          if (tz === existingTimezone) {
            timezoneAbbr = getTimezoneAbbr(label);
            break outer;
          }
        }
      }
    }
    
    state.set(userId, 'reg', {
      ...currentState,
      timezone: existingTimezone,
      timezoneAbbr,
      characterType: 'alt'
    });
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      timeZone: existingTimezone, 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    const totalSteps = getTotalSteps('alt');
    const embed = createRegEmbed(1, totalSteps, '🎭 Which class speaks to you?', `Timezone: ${timezoneAbbr} • ${timeString}`);
    
    const classOptions = Object.keys(CLASSES).map(className => {
      const iconId = getClassIconId(className);
      const option = {
        label: className,
        value: className,
        description: CLASSES[className].role,
        emoji: iconId ? { id: iconId } : CLASSES[className].emoji
      };
      
      return option;
    });
    
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
    
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ embeds: [embed], components: [row1, row2] });
    } else {
      await interaction.update({ embeds: [embed], components: [row1, row2] });
    }
    
    clearActiveInteraction(userId);
    return;
  }
  
  state.set(userId, 'reg', { characterType });
  
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

  const classOptions = Object.keys(CLASSES).map(className => {
    const iconId = getClassIconId(className);
    const option = {
      label: className,
      value: className,
      description: CLASSES[className].role,
      emoji: iconId ? { id: iconId } : CLASSES[className].emoji
    };
    
    return option;
  });

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
  
  const isAlt = currentState.characterType === 'alt';
  const isSubclass = currentState.type === 'subclass';
  const totalSteps = getTotalSteps(currentState.characterType || 'main');
  
  let stepNum;
  if (isSubclass) {
    stepNum = 1;
  } else if (isAlt) {
    stepNum = 2;
  } else {
    stepNum = 5;
  }
  
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
  
  const isAlt = currentState.characterType === 'alt';
  const isSubclass = currentState.type === 'subclass';
  const totalSteps = getTotalSteps(currentState.characterType || 'main');
  
  let stepNum;
  if (isSubclass) {
    stepNum = 2;
  } else if (isAlt) {
    stepNum = 3;
  } else {
    stepNum = 6;
  }
  
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
        characterType: currentState.characterType,
        parentId: currentState.parentId
      });

      console.log('[REGISTRATION] Created subclass:', character.id);

      const characters = await CharacterRepo.findAllByUser(userId);
      const main = characters.find(c => c.character_type === 'main');
      
      const embed = await profileEmbed(interaction.user, characters, interaction);
      const buttons = ui.profileButtons(userId, !!main);

      await interaction.update({ 
        embeds: [embed], 
        components: buttons
      });

      logger.register(interaction.user.username, currentState.characterType, parentChar.ign, `${currentState.class} - ${currentState.subclass}`);
      
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
  const isAlt = currentState.characterType === 'alt';
  const totalSteps = getTotalSteps(currentState.characterType || 'main');
  
  let baseStep;
  if (isAlt) {
    baseStep = 4;
  } else {
    baseStep = 7;
  }
  const stepNum = baseStep + currentImagineIndex;
  
  const titleEmoji = currentImagine.logo ? `<:bi:${currentImagine.logo}>` : '⚔️';
  
  const embed = createRegEmbed(
    stepNum, 
    totalSteps, 
    `${titleEmoji} Battle Imagine - ${currentImagine.name}`, 
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
  const isAlt = currentState.characterType === 'alt';
  const totalSteps = getTotalSteps(currentState.characterType || 'main');
  
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
      ephemeral: true
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
      ephemeral: true 
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
      characterType: currentState.characterType || 'main',
      parentId: null
    });
    
    if (currentState.battleImagines && currentState.battleImagines.length > 0) {
      for (const imagine of currentState.battleImagines) {
        await BattleImagineRepo.add(character.id, imagine.name, imagine.tier);
      }
      console.log(`[REGISTRATION] Saved ${currentState.battleImagines.length} Battle Imagines`);
    }
    
    if (currentState.characterType === 'main' && config.sync.nicknameEnabled) {
      try {
        await updateNickname(interaction.client, config.discord.guildId, userId, ign);
      } catch (e) {
        console.error('[REGISTRATION] Nickname sync warning:', e.message);
      }
    }

    // Assign roles after successful registration
    await assignRoles(interaction.client, userId, currentState.guild);
    
    state.clear(userId, 'reg');

    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.reply({ 
      embeds: [embed], 
      components: buttons,
      ephemeral: false
    });

    logger.register(interaction.user.username, currentState.characterType || 'main', ign, currentState.class);
  } catch (error) {
    console.error('[REGISTRATION ERROR]', error);
    logger.error('Registration', `Registration error: ${error.message}`, error);
    await interaction.reply({
      content: '❌ Something went wrong. Please try again!',
      ephemeral: true
    });
  }
}

export async function handleDelete(interaction, userId, characterId) {
  try {
    // Check if this is the user's last main character
    const allChars = await CharacterRepo.findAllByUser(userId);
    const mainChars = allChars.filter(c => c.character_type === 'main');
    
    const charToDelete = allChars.find(c => c.id === characterId);
    
    // If deleting the last main character, remove registered role and add visitor role
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
      ephemeral: true 
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
