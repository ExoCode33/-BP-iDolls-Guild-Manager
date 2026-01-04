import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from 'discord.js';
import { CharacterRepo, UserRepo, BattleImagineRepo, TimezoneRepo } from '../database/repositories.js';
import { updateNickname } from '../services/nickname.js';
import * as ui from '../ui/components.js';
import { profileEmbed } from '../ui/embeds.js';
import { CLASSES, ABILITY_SCORES, REGIONS, COLORS, TIERS } from '../config/game.js';
import config from '../config/index.js';
import logger from '../services/logger.js';
import * as classRoleService from '../services/classRoles.js';
import applicationService from '../services/applications.js';
import state from '../services/state.js';

// ═══════════════════════════════════════════════════════════════════
// RACE CONDITION PROTECTION
// ═══════════════════════════════════════════════════════════════════

const activeInteractions = new Map();
const INTERACTION_TIMEOUT = 3000;

function hasActiveInteraction(userId, currentInteractionId) {
  const active = activeInteractions.get(userId);
  if (!active) return false;
  if (active === currentInteractionId) return false;
  
  const timeSinceActive = Date.now() - (active.timestamp || 0);
  return timeSinceActive < INTERACTION_TIMEOUT;
}

function setActiveInteraction(userId, interactionId) {
  activeInteractions.set(userId, { id: interactionId, timestamp: Date.now() });
}

function clearActiveInteraction(userId) {
  activeInteractions.delete(userId);
}

// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

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

function getTotalSteps(characterType) {
  if (characterType === 'subclass' || characterType === 'main_subclass') {
    return 3; // Class, Subclass, Score
  }
  
  if (characterType === 'alt') {
    const battleImagineSteps = config.battleImagines.length;
    return 6 + battleImagineSteps; // Class, Subclass, Score, BIs, Guild, IGN/UID
  }
  
  // Main character
  const battleImagineSteps = config.battleImagines.length;
  return 10 + battleImagineSteps; // Region, Country, Timezone, Class, Subclass, Score, BIs, Guild, IGN/UID
}

async function assignRoles(client, userId, guildName, character) {
  try {
    const guild = await client.guilds.fetch(config.discord.guildId);
    const member = await guild.members.fetch(userId);
    
    if (guildName === 'Visitor' && config.roles.visitor) {
      const visitorRole = await guild.roles.fetch(config.roles.visitor);
      if (visitorRole && !member.roles.cache.has(visitorRole.id)) {
        await member.roles.add(visitorRole);
        console.log(`✅ [ROLES] Assigned Visitor role to ${member.user.username}`);
      }
    } else if (guildName !== 'iDolls' && config.roles[guildName.toLowerCase()]) {
      const guildRole = await guild.roles.fetch(config.roles[guildName.toLowerCase()]);
      if (guildRole && !member.roles.cache.has(guildRole.id)) {
        await member.roles.add(guildRole);
        console.log(`✅ [ROLES] Assigned ${guildName} role to ${member.user.username}`);
      }
    }
    
    if (config.roles.verified) {
      const verifiedRole = await guild.roles.fetch(config.roles.verified);
      if (verifiedRole && !member.roles.cache.has(verifiedRole.id)) {
        await member.roles.add(verifiedRole);
        console.log(`✅ [ROLES] Assigned Verified role to ${member.user.username}`);
      }
    }
  } catch (error) {
    console.error('[ROLES] Failed to assign roles:', error.message);
  }
}

async function assignPendingRoles(client, userId) {
  try {
    const guild = await client.guilds.fetch(config.discord.guildId);
    const member = await guild.members.fetch(userId);
    
    if (config.roles.visitor) {
      const visitorRole = await guild.roles.fetch(config.roles.visitor);
      if (visitorRole && !member.roles.cache.has(visitorRole.id)) {
        await member.roles.add(visitorRole);
        console.log(`✅ [ROLES] Assigned Visitor role (pending) to ${member.user.username}`);
      }
    }
    
    if (config.roles.verified) {
      const verifiedRole = await guild.roles.fetch(config.roles.verified);
      if (verifiedRole && !member.roles.cache.has(verifiedRole.id)) {
        await member.roles.add(verifiedRole);
        console.log(`✅ [ROLES] Assigned Verified role to ${member.user.username}`);
      }
    }
  } catch (error) {
    console.error('[ROLES] Failed to assign pending roles:', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN CHARACTER REGISTRATION - START
// ═══════════════════════════════════════════════════════════════════

export async function start(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId}, ignoring duplicate interaction`);
    return;
  }
  
  setActiveInteraction(userId, interaction.id);
  
  console.log('[REGISTRATION] Starting registration for user:', userId);
  
  // Check if user already has a main character
  const existingMain = await CharacterRepo.findMain(userId);
  
  if (existingMain) {
    // ✅ NEW: Show edit character menu instead of replace warning
    const { showEditMenu } = await import('./editing.js');
    clearActiveInteraction(userId);
    await showEditMenu(interaction, userId);
    return;
  }
  
  // No existing main, proceed with registration
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

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({ 
    embeds: [embed], 
    components: [row],
    flags: MessageFlags.Ephemeral 
  });
  
  clearActiveInteraction(userId);
}

export async function confirmReplaceMain(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId}, ignoring duplicate interaction`);
    return;
  }
  
  setActiveInteraction(userId, interaction.id);
  
  console.log('[REGISTRATION] Confirmed replace main for user:', userId);
  
  try {
    const existingMain = await CharacterRepo.findMain(userId);
    
    if (!existingMain) {
      clearActiveInteraction(userId);
      await interaction.update({
        content: '❌ No main character found to replace.',
        embeds: [],
        components: []
      });
      return;
    }
    
    // Delete subclasses first
    await CharacterRepo.deleteSubclasses(existingMain.id);
    console.log('[REGISTRATION] Deleted subclasses for main:', existingMain.id);
    
    // Remove class roles that are no longer needed
    const alts = await CharacterRepo.findAlts(userId);
    const altClasses = new Set(alts.map(a => a.class));
    
    if (!altClasses.has(existingMain.class)) {
      await classRoleService.removeClassRole(userId, existingMain.class);
    }
    
    const subclasses = await CharacterRepo.findSubclasses(userId);
    for (const sub of subclasses) {
      if (!altClasses.has(sub.class)) {
        await classRoleService.removeClassRole(userId, sub.class);
      }
    }
    
    // Delete the main character
    await CharacterRepo.delete(existingMain.id);
    console.log('[REGISTRATION] Deleted main character:', existingMain.id);
    
    logger.register(interaction.user.username, 'replaced_main', existingMain.ign, existingMain.class);
    
    // Start fresh registration
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

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.update({ embeds: [embed], components: [row] });
    
    clearActiveInteraction(userId);
  } catch (error) {
    console.error('[REGISTRATION ERROR]', error);
    logger.error('Registration', `Replace main error: ${error.message}`, error);
    clearActiveInteraction(userId);
    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      embeds: [],
      components: []
    });
  }
}

export async function cancelReplaceMain(interaction, userId) {
  console.log('[REGISTRATION] Cancelled replace main for user:', userId);
  
  const cancelEmbed = new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setDescription(
      '# ✅ **Action Cancelled**\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      'Your main character was not replaced.\n\n' +
      'Use `/edit-character` to modify your character instead.'
    )
    .setTimestamp();
  
  await interaction.update({ embeds: [cancelEmbed], components: [] });
}

// ═══════════════════════════════════════════════════════════════════
// REGION, COUNTRY, TIMEZONE HANDLERS
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
// CLASS, SUBCLASS, SCORE HANDLERS
// ═══════════════════════════════════════════════════════════════════

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
  const isAlt = currentState.type === 'alt';
  const totalSteps = getTotalSteps(currentState.type || 'main');
  
  let stepNum;
  if (isSubclass) stepNum = 2;
  else if (isAlt) stepNum = 2;
  else stepNum = 5;
  
  const embed = createRegEmbed(stepNum, totalSteps, '✨ Subclass selection!', `Class: ${className}`);

  const subclassOptions = subclasses.map(subclassName => {
    const roleEmoji = classRole === 'Tank' ? '🛡️' : classRole === 'DPS' ? '⚔️' : '💚';
    const iconId = getClassIconId(className);
    
    return {
      label: subclassName,
      value: subclassName,
      description: classRole,
      emoji: iconId ? { id: iconId } : roleEmoji
    };
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
  const isAlt = currentState.type === 'alt';
  const totalSteps = getTotalSteps(currentState.type || 'main');
  
  let stepNum;
  if (isSubclass) stepNum = 3;
  else if (isAlt) stepNum = 3;
  else stepNum = 6;
  
  const embed = createRegEmbed(stepNum, totalSteps, '⚔️ Ability Score', `Subclass: ${subclassName}`);

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
  const isAlt = currentState.type === 'alt';
  
  // Handle subclass creation (immediate)
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

  // Continue to battle imagines for main/alt
  state.set(userId, 'reg', { 
    ...currentState, 
    abilityScore,
    battleImagines: [],
    currentImagineIndex: 0
  });
  
  await showBattleImagineSelection(interaction, userId);
  
  clearActiveInteraction(userId);
}

// ═══════════════════════════════════════════════════════════════════
// BATTLE IMAGINE HANDLERS
// ═══════════════════════════════════════════════════════════════════

async function showBattleImagineSelection(interaction, userId) {
  const currentState = state.get(userId, 'reg');
  const { currentImagineIndex, battleImagines } = currentState;
  
  if (currentImagineIndex >= config.battleImagines.length) {
    await showGuildSelection(interaction, userId);
    return;
  }
  
  const currentImagine = config.battleImagines[currentImagineIndex];
  const isAlt = currentState.type === 'alt';
  const totalSteps = getTotalSteps(currentState.type || 'main');
  
  let stepNum;
  if (isAlt) {
    stepNum = 4 + currentImagineIndex;
  } else {
    stepNum = 7 + currentImagineIndex;
  }
  
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
    console.log(`[REGISTRATION] Race condition detected for ${userId} at BI select, ignoring`);
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

// ═══════════════════════════════════════════════════════════════════
// GUILD SELECTION
// ═══════════════════════════════════════════════════════════════════

async function showGuildSelection(interaction, userId) {
  const currentState = state.get(userId, 'reg');
  const scoreLabel = ABILITY_SCORES.find(s => s.value === currentState.abilityScore)?.label || currentState.abilityScore;
  const isAlt = currentState.type === 'alt';
  const totalSteps = getTotalSteps(currentState.type || 'main');
  
  let stepNum = isAlt ? (4 + config.battleImagines.length) : (7 + config.battleImagines.length);
  
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
  
  const guildName = interaction.values[0];
  const currentState = state.get(userId, 'reg');
  state.set(userId, 'reg', { ...currentState, guild: guildName });

  // Show IGN/UID modal
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
    .setLabel('UID (User ID) - Numbers only!')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter numeric UID (e.g. 123456789)')
    .setRequired(true)
    .setMaxLength(50);

  const row1 = new ActionRowBuilder().addComponents(ignInput);
  const row2 = new ActionRowBuilder().addComponents(uidInput);

  modal.addComponents(row1, row2);

  clearActiveInteraction(userId);
  await interaction.showModal(modal);
}

// ═══════════════════════════════════════════════════════════════════
// IGN/UID SUBMISSION
// ═══════════════════════════════════════════════════════════════════

export async function handleIGN(interaction, userId) {
  const ign = interaction.fields.getTextInputValue('ign');
  const uid = interaction.fields.getTextInputValue('uid').trim();
  const currentState = state.get(userId, 'reg');

  console.log('[REGISTRATION] IGN entered:', ign);
  console.log('[REGISTRATION] UID entered:', uid);
  console.log('[REGISTRATION] Character type:', currentState?.type);

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
    
    await interaction.update({ 
      embeds: [errorEmbed], 
      components: [row]
    });
    
    return;
  }

  try {
    const characterType = currentState.type === 'alt' ? 'alt' : 'main';
    
    const character = await CharacterRepo.create({
      userId,
      ign,
      uid,
      className: currentState.class,
      subclass: currentState.subclass,
      abilityScore: currentState.abilityScore,
      guild: currentState.guild,
      characterType: characterType,
      parentId: null
    });
    
    console.log(`[REGISTRATION] Created ${characterType}:`, character.id);
    
    if (currentState.battleImagines && currentState.battleImagines.length > 0) {
      for (const imagine of currentState.battleImagines) {
        await BattleImagineRepo.add(character.id, imagine.name, imagine.tier);
      }
      console.log(`[REGISTRATION] Saved ${currentState.battleImagines.length} Battle Imagines`);
    }
    
    // Only sync nickname for main character
    if (characterType === 'main' && config.sync.nicknameEnabled) {
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

    // Add class role (for both main and alt)
    await classRoleService.addClassRole(userId, currentState.class);

    // Handle guild-specific logic
    if (currentState.guild === 'iDolls') {
      if (characterType === 'main') {
        await assignPendingRoles(interaction.client, userId);
      }
      
      // Create application if service is available
      try {
        if (applicationService && typeof applicationService.createApplication === 'function') {
          await applicationService.createApplication(userId, character.id, currentState.guild);
        } else if (applicationService && typeof applicationService === 'function') {
          await applicationService(userId, character.id, currentState.guild);
        }
      } catch (appError) {
        console.error('[REGISTRATION] Application service error:', appError.message);
      }
      
      const successEmbed = new EmbedBuilder()
        .setColor('#EC4899')
        .setDescription(
          '💕 **Registration Complete!** ≽^•⩊•^≼\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
          `✨ **Application to iDolls submitted!**\n\n` +
          (characterType === 'alt' ? `🎮 **Alt Character:** ${ign}\n\n` : '') +
          '📋 Talent Manager will validate soon\n' +
          (characterType === 'main' ? '💙 You have Verified server access\n\n' : '\n') +
          'Chat and explore in the meantime~\n\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          'Welcome! 💖'
        )
        .setTimestamp();
      
      await interaction.update({
        content: '',
        embeds: [successEmbed],
        components: []
      });
      
      logger.register(interaction.user.username, characterType, ign, currentState.class);
      state.clear(userId, 'reg');
      return;
    }
    
    // For other guilds
    if (characterType === 'main') {
      await assignRoles(interaction.client, userId, currentState.guild, character);
    }
    
    state.clear(userId, 'reg');

    const characters = await CharacterRepo.findAllByUser(userId);
    const main = characters.find(c => c.character_type === 'main');

    const embed = await profileEmbed(interaction.user, characters, interaction);
    const buttons = ui.profileButtons(userId, !!main);

    await interaction.update({ 
      embeds: [embed], 
      components: buttons
    });

    logger.register(interaction.user.username, characterType, ign, currentState.class);
    
  } catch (error) {
    console.error('[REGISTRATION ERROR]', error);
    logger.error('Registration', `Registration error: ${error.message}`, error);
    
    await interaction.update({
      content: '❌ Something went wrong. Please try again!',
      embeds: [],
      components: []
    });
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

// ═══════════════════════════════════════════════════════════════════
// SUBCLASS REGISTRATION (✅ FIXED - ALLOWS UP TO 3 SUBCLASSES)
// ═══════════════════════════════════════════════════════════════════

export async function startSubclassRegistration(interaction, userId, parentId) {
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId}, ignoring duplicate interaction`);
    return;
  }
  
  setActiveInteraction(userId, interaction.id);
  
  console.log(`[REG] Starting subclass registration for user ${userId}, parentId: ${parentId}`);
  
  // ✅ FIX: If parentId is a huge number (user ID), look up the actual main character ID
  let actualParentId = parentId;
  
  // Check if parentId looks like a Discord snowflake (user ID) - typically 17-19 digits
  if (parentId > 2147483647) {  // Max value for PostgreSQL INTEGER
    console.log(`[REG] parentId ${parentId} is too large (likely user ID), looking up main character...`);
    const mainChar = await CharacterRepo.findMain(userId);
    if (!mainChar) {
      clearActiveInteraction(userId);
      return interaction.reply({ 
        content: '❌ You need a main character before adding a subclass!', 
        ephemeral: true 
      });
    }
    actualParentId = mainChar.id;
    console.log(`[REG] Found main character ID: ${actualParentId}`);
  }

  // Rest of the function continues with actualParentId
  const main = await CharacterRepo.findById(actualParentId);
  if (!main) {
    clearActiveInteraction(userId);
    return interaction.reply({ 
      content: '❌ Main character not found!', 
      ephemeral: true 
    });
  }

  // ✅ FIXED: Check if they already have 3 subclasses (max limit)
  const existingSubs = await CharacterRepo.findSubclasses(userId);
  
  if (existingSubs.length >= 3) {
    clearActiveInteraction(userId);
    return interaction.update({
      content: '❌ You already have 3 subclasses! That\'s the maximum allowed. Delete a subclass if you want to add a new one.',
      components: []
    });
  }

  // Set initial state with the correct parent ID
  state.set(userId, 'reg', { 
    type: 'subclass', 
    parentId: actualParentId  // Use the actual character ID, not user ID
  });

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
  
  clearActiveInteraction(userId);
}

// ═══════════════════════════════════════════════════════════════════
// ALT CHARACTER REGISTRATION
// ═══════════════════════════════════════════════════════════════════

export async function startAltRegistration(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId}, ignoring duplicate interaction`);
    return;
  }
  
  setActiveInteraction(userId, interaction.id);
  
  console.log('[REGISTRATION] Starting alt registration for user:', userId);
  
  // Check if user has main
  const main = await CharacterRepo.findMain(userId);
  if (!main) {
    const errorEmbed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setDescription(
        '# ❌ **Main Required**\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '**You need a main character first!**\n\n' +
        'Please register your main character before adding alts.'
      )
      .setTimestamp();
    
    clearActiveInteraction(userId);
    await interaction.update({ embeds: [errorEmbed], components: [] });
    return;
  }
  
  // Check alt count
  const altCount = await CharacterRepo.countAlts(userId);
  if (altCount >= 3) {
    const errorEmbed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setDescription(
        '# ❌ **Maximum Alts Reached**\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '**You already have 3 alt characters!**\n\n' +
        'Maximum: 3 alts per user.\n' +
        'Delete an alt to add a new one.'
      )
      .setTimestamp();
    
    clearActiveInteraction(userId);
    await interaction.update({ embeds: [errorEmbed], components: [] });
    return;
  }
  
  // Initialize alt registration state
  state.set(userId, 'reg', { type: 'alt' });
  
  // Start with class selection (skip timezone)
  const totalSteps = getTotalSteps('alt');
  const embed = createRegEmbed(1, totalSteps, '🎭 Alt Character Class', 'Choose your alt\'s class');

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
  
  clearActiveInteraction(userId);
}

// ═══════════════════════════════════════════════════════════════════
// BACK BUTTON NAVIGATION
// ═══════════════════════════════════════════════════════════════════

export async function backToRegion(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) return;
  setActiveInteraction(userId, interaction.id);
  
  const currentState = state.get(userId, 'reg');
  const totalSteps = getTotalSteps(currentState.type || 'main');
  
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

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.update({ embeds: [embed], components: [row] });
  clearActiveInteraction(userId);
}

export async function backToCountry(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) return;
  setActiveInteraction(userId, interaction.id);
  
  const currentState = state.get(userId, 'reg');
  const region = currentState.region;
  const totalSteps = getTotalSteps(currentState.type || 'main');
  
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

export async function backToTimezone(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) return;
  setActiveInteraction(userId, interaction.id);
  
  const currentState = state.get(userId, 'reg');
  const totalSteps = getTotalSteps(currentState.type || 'main');
  const countryName = currentState.country.replace(/^[\u{1F1E6}-\u{1F1FF}]{2}\s*/u, '');
  
  const embed = createRegEmbed(3, totalSteps, '🕐 Choose Your Timezone', `Country: ${countryName}`);

  const timezones = REGIONS[currentState.region][currentState.country];
  
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

export async function backToClass(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) return;
  setActiveInteraction(userId, interaction.id);
  
  const currentState = state.get(userId, 'reg');
  const isSubclass = currentState.type === 'subclass';
  const isAlt = currentState.type === 'alt';
  const totalSteps = getTotalSteps(currentState.type || 'main');
  
  let stepNum;
  let description;
  
  if (isSubclass) {
    stepNum = 1;
    description = 'Choose your subclass';
  } else if (isAlt) {
    stepNum = 1;
    description = 'Choose your alt\'s class';
  } else {
    stepNum = 4;
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      timeZone: currentState.timezone, 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    description = `Timezone: ${currentState.timezoneAbbr} • ${timeString}`;
  }
  
  const embed = createRegEmbed(stepNum, totalSteps, '🎭 Which class speaks to you?', description);

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
    .setCustomId(isSubclass || isAlt ? `back_to_profile_${userId}` : `back_to_timezone_${userId}`)
    .setLabel(isSubclass || isAlt ? '❌ Cancel' : '◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  clearActiveInteraction(userId);
}

export async function backToSubclass(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) return;
  setActiveInteraction(userId, interaction.id);
  
  const currentState = state.get(userId, 'reg');
  const className = currentState.class;
  const subclasses = CLASSES[className].subclasses;
  const classRole = CLASSES[className].role;
  
  const isSubclass = currentState.type === 'subclass';
  const isAlt = currentState.type === 'alt';
  const totalSteps = getTotalSteps(currentState.type || 'main');
  
  let stepNum;
  if (isSubclass) stepNum = 2;
  else if (isAlt) stepNum = 2;
  else stepNum = 5;
  
  const embed = createRegEmbed(stepNum, totalSteps, '✨ Subclass selection!', `Class: ${className}`);

  const subclassOptions = subclasses.map(subclassName => {
    const roleEmoji = classRole === 'Tank' ? '🛡️' : classRole === 'DPS' ? '⚔️' : '💚';
    const iconId = getClassIconId(className);
    
    return {
      label: subclassName,
      value: subclassName,
      description: classRole,
      emoji: iconId ? { id: iconId } : roleEmoji
    };
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

export async function backToScore(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) return;
  setActiveInteraction(userId, interaction.id);
  
  const currentState = state.get(userId, 'reg');
  const isSubclass = currentState.type === 'subclass';
  const isAlt = currentState.type === 'alt';
  const totalSteps = getTotalSteps(currentState.type || 'main');
  
  let stepNum;
  if (isSubclass) stepNum = 3;
  else if (isAlt) stepNum = 3;
  else stepNum = 6;
  
  const embed = createRegEmbed(stepNum, totalSteps, '⚔️ Ability Score', `Subclass: ${currentState.subclass}`);

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

export async function backToBattleImagine(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) return;
  setActiveInteraction(userId, interaction.id);
  
  const currentState = state.get(userId, 'reg');
  const imagineIndex = (currentState.currentImagineIndex || 0) - 1;
  
  if (imagineIndex < 0) {
    // Go back to score
    await backToScore(interaction, userId);
    return;
  }
  
  currentState.currentImagineIndex = imagineIndex;
  if (imagineIndex < currentState.battleImagines.length) {
    currentState.battleImagines = currentState.battleImagines.slice(0, imagineIndex);
  }
  state.set(userId, 'reg', currentState);
  
  await showBattleImagineSelection(interaction, userId);
  clearActiveInteraction(userId);
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export default {
  start,
  startSubclassRegistration,
  startAltRegistration,
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
  confirmReplaceMain,
  cancelReplaceMain,
  backToRegion,
  backToCountry,
  backToTimezone,
  backToClass,
  backToSubclass,
  backToScore,
  backToBattleImagine
};
