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
import logger from '../utils/logger.js';
import db from '../services/database.js';
import { buildCharacterProfileEmbed } from '../components/embeds/characterProfile.js';
import { buildCharacterButtons } from '../components/buttons/characterButtons.js';
import gameData from '../utils/gameData.js';
import config from '../utils/config.js';
import { updateDiscordNickname } from '../utils/nicknameSync.js';

const stateManager = (await import('../utils/stateManager.js')).default;

// ✅ NEW: Track active interactions to prevent race conditions
const activeInteractions = new Map();

// ✅ NEW: Helper to check if user has active interaction
function hasActiveInteraction(userId, interactionId) {
  const active = activeInteractions.get(userId);
  if (!active) return false;
  
  // Clean up stale interactions (older than 3 seconds)
  if (Date.now() - active.timestamp > 3000) {
    activeInteractions.delete(userId);
    return false;
  }
  
  return active.id !== interactionId;
}

// ✅ NEW: Mark interaction as active
function setActiveInteraction(userId, interactionId) {
  activeInteractions.set(userId, {
    id: interactionId,
    timestamp: Date.now()
  });
}

// ✅ NEW: Clear active interaction
function clearActiveInteraction(userId) {
  activeInteractions.delete(userId);
}

// ✨ UPDATED: Helper to create centered, cute embeds with ANSI codes
function createRegEmbed(step, total, title, description) {
  const ansiText = [
    '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m',
    `\u001b[1;34m${title}\u001b[0m`,
    '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m',
    '',
    description,
    '',
    `\u001b[0;36m✨ Step ${step} of ${total}\u001b[0m`,
    '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m'
  ].join('\n');

  return new EmbedBuilder()
    .setColor('#EC4899')
    .setDescription(`\`\`\`ansi\n${ansiText}\n\`\`\``)
    .setTimestamp();
}

// Helper to get class icon emoji ID (hardcoded Discord emoji IDs)
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

// Region → Countries → Timezones mapping
const REGIONS = {
  'North America': {
    '🇺🇸 United States': {
      'EST (Eastern)': 'America/New_York',
      'CST (Central)': 'America/Chicago',
      'MST (Mountain)': 'America/Denver',
      'PST (Pacific)': 'America/Los_Angeles',
      'AKST (Alaska)': 'America/Anchorage',
      'HST (Hawaii)': 'Pacific/Honolulu'
    },
    '🇨🇦 Canada': {
      'EST (Eastern)': 'America/Toronto',
      'CST (Central)': 'America/Winnipeg',
      'MST (Mountain)': 'America/Edmonton',
      'PST (Pacific)': 'America/Vancouver',
      'AST (Atlantic)': 'America/Halifax'
    },
    '🇲🇽 Mexico': {
      'CST (Central)': 'America/Mexico_City',
      'MST (Mountain)': 'America/Chihuahua',
      'PST (Pacific)': 'America/Tijuana'
    }
  },
  'South America': {
    '🇧🇷 Brazil': {
      'BRT (Brasília)': 'America/Sao_Paulo',
      'AMT (Amazon)': 'America/Manaus'
    },
    '🇦🇷 Argentina': { 'ART (Buenos Aires)': 'America/Buenos_Aires' },
    '🇨🇱 Chile': { 'CLT (Santiago)': 'America/Santiago' },
    '🇨🇴 Colombia': { 'COT (Bogotá)': 'America/Bogota' },
    '🇵🇪 Peru': { 'PET (Lima)': 'America/Lima' }
  },
  'Europe': {
    '🇬🇧 United Kingdom': { 'GMT (London)': 'Europe/London' },
    '🇫🇷 France': { 'CET (Paris)': 'Europe/Paris' },
    '🇩🇪 Germany': { 'CET (Berlin)': 'Europe/Berlin' },
    '🇮🇹 Italy': { 'CET (Rome)': 'Europe/Rome' },
    '🇪🇸 Spain': { 'CET (Madrid)': 'Europe/Madrid' },
    '🇳🇱 Netherlands': { 'CET (Amsterdam)': 'Europe/Amsterdam' },
    '🇧🇪 Belgium': { 'CET (Brussels)': 'Europe/Brussels' },
    '🇦🇹 Austria': { 'CET (Vienna)': 'Europe/Vienna' },
    '🇵🇱 Poland': { 'CET (Warsaw)': 'Europe/Warsaw' },
    '🇸🇪 Sweden': { 'CET (Stockholm)': 'Europe/Stockholm' },
    '🇬🇷 Greece': { 'EET (Athens)': 'Europe/Athens' },
    '🇹🇷 Turkey': { 'TRT (Istanbul)': 'Europe/Istanbul' },
    '🇷🇺 Russia': {
      'MSK (Moscow)': 'Europe/Moscow',
      'YEKT (Yekaterinburg)': 'Asia/Yekaterinburg',
      'NOVT (Novosibirsk)': 'Asia/Novosibirsk',
      'VLAT (Vladivostok)': 'Asia/Vladivostok'
    }
  },
  'Asia': {
    '🇯🇵 Japan': { 'JST (Tokyo)': 'Asia/Tokyo' },
    '🇰🇷 South Korea': { 'KST (Seoul)': 'Asia/Seoul' },
    '🇨🇳 China': { 'CST (Beijing)': 'Asia/Shanghai' },
    '🇭🇰 Hong Kong': { 'HKT (Hong Kong)': 'Asia/Hong_Kong' },
    '🇹🇼 Taiwan': { 'CST (Taipei)': 'Asia/Taipei' },
    '🇸🇬 Singapore': { 'SGT (Singapore)': 'Asia/Singapore' },
    '🇹🇭 Thailand': { 'ICT (Bangkok)': 'Asia/Bangkok' },
    '🇻🇳 Vietnam': { 'ICT (Ho Chi Minh)': 'Asia/Ho_Chi_Minh' },
    '🇵🇭 Philippines': { 'PST (Manila)': 'Asia/Manila' },
    '🇮🇩 Indonesia': {
      'WIB (Jakarta)': 'Asia/Jakarta',
      'WITA (Bali)': 'Asia/Makassar'
    },
    '🇮🇳 India': { 'IST (New Delhi)': 'Asia/Kolkata' },
    '🇦🇪 UAE': { 'GST (Dubai)': 'Asia/Dubai' },
    '🇸🇦 Saudi Arabia': { 'AST (Riyadh)': 'Asia/Riyadh' }
  },
  'Oceania': {
    '🇦🇺 Australia': {
      'AEDT (Sydney)': 'Australia/Sydney',
      'AEST (Brisbane)': 'Australia/Brisbane',
      'ACDT (Adelaide)': 'Australia/Adelaide',
      'AWST (Perth)': 'Australia/Perth',
      'ACST (Darwin)': 'Australia/Darwin'
    },
    '🇳🇿 New Zealand': { 'NZDT (Auckland)': 'Pacific/Auckland' },
    '🇫🇯 Fiji': { 'FJT (Suva)': 'Pacific/Fiji' }
  },
  'Africa': {
    '🇿🇦 South Africa': { 'SAST (Johannesburg)': 'Africa/Johannesburg' },
    '🇪🇬 Egypt': { 'EET (Cairo)': 'Africa/Cairo' },
    '🇳🇬 Nigeria': { 'WAT (Lagos)': 'Africa/Lagos' },
    '🇰🇪 Kenya': { 'EAT (Nairobi)': 'Africa/Nairobi' },
    '🇲🇦 Morocco': { 'WET (Casablanca)': 'Africa/Casablanca' }
  }
};

function getTimezoneAbbr(timezoneLabel) {
  const match = timezoneLabel.match(/^([A-Z]+)/);
  return match ? match[1] : timezoneLabel;
}

// Calculate total steps dynamically
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

export async function handleRegisterMain(interaction, userId) {
  // ✅ NEW: Check for race condition
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId}, ignoring duplicate interaction`);
    return;
  }
  
  // ✅ NEW: Mark this interaction as active
  setActiveInteraction(userId, interaction.id);
  
  const state = stateManager.getRegistrationState(userId) || {};
  
  console.log('[REGISTRATION] Starting registration for user:', userId);
  console.log('[REGISTRATION] State:', JSON.stringify(state, null, 2));
  
  // Check if adding alt and user already has timezone
  const existingTimezone = await db.getUserTimezone(userId);
  const isAlt = state.characterType === 'alt';
  
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
    
    stateManager.setRegistrationState(userId, {
      ...state,
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
    const embed = createRegEmbed(1, totalSteps, '🎭 Choose Your Class', `**Timezone:** ${timezoneAbbr} • ${timeString}`);
    
    const classOptions = Object.keys(gameData.classes).map(className => {
      const iconId = getClassIconId(className);
      const option = {
        label: className,
        value: className,
        description: gameData.classes[className].role,
        emoji: iconId ? { id: iconId } : gameData.classes[className].emoji
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
    
    // ✅ NEW: Clear active interaction after successful update
    clearActiveInteraction(userId);
    return;
  }
  
  // Main character registration - start with region
  const totalSteps = getTotalSteps('main');
  const embed = createRegEmbed(1, totalSteps, '🌍 Choose Your Region', 'Where are you playing from?');

  const regionOptions = Object.keys(REGIONS).map(region => ({
    label: region,
    value: region,
    emoji: '🌍',
    description: 'Where you\'re playing from'
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

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  
  // ✅ NEW: Clear active interaction after successful update
  clearActiveInteraction(userId);
}

export async function handleRegionSelect(interaction, userId) {
  // ✅ NEW: Check for race condition
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId} at region select, ignoring`);
    return;
  }
  
  // ✅ NEW: Mark this interaction as active
  setActiveInteraction(userId, interaction.id);
  
  const region = interaction.values[0];
  const state = stateManager.getRegistrationState(userId) || {};
  stateManager.setRegistrationState(userId, { ...state, region });

  const totalSteps = getTotalSteps('main');
  const embed = createRegEmbed(2, totalSteps, '🏳️ Choose Your Country', `**Region:** ${region}`);

  const countries = Object.keys(REGIONS[region]);
  const countryOptions = countries.map(country => ({
    label: country,
    value: country,
    description: 'Select your location'
  }));

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
  
  // ✅ NEW: Clear active interaction after successful update
  clearActiveInteraction(userId);
}

export async function handleCountrySelect(interaction, userId) {
  // ✅ NEW: Check for race condition
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId} at country select, ignoring`);
    return;
  }
  
  // ✅ NEW: Mark this interaction as active
  setActiveInteraction(userId, interaction.id);
  
  const state = stateManager.getRegistrationState(userId);
  const country = interaction.values[0];
  stateManager.setRegistrationState(userId, { ...state, country });

  const totalSteps = getTotalSteps('main');
  const embed = createRegEmbed(3, totalSteps, '🕐 Choose Your Timezone', `**Country:** ${country}`);

  const timezones = REGIONS[state.region][country];
  
  const timezoneOptions = Object.keys(timezones).map(tzLabel => {
    const tzValue = timezones[tzLabel];
    
    const cityExamples = {
      'America/New_York': '🇺🇸 New York, Miami, Boston',
      'America/Chicago': '🇺🇸 Chicago, Houston, Dallas',
      'America/Denver': '🇺🇸 Denver, Phoenix, Salt Lake City',
      'America/Los_Angeles': '🇺🇸 Los Angeles, San Francisco, Seattle',
      'America/Anchorage': '🇺🇸 Anchorage, Juneau',
      'Pacific/Honolulu': '🇺🇸 Honolulu, Hilo',
      'America/Toronto': '🇨🇦 Toronto, Montreal, Ottawa',
      'America/Winnipeg': '🇨🇦 Winnipeg, Regina',
      'America/Edmonton': '🇨🇦 Edmonton, Calgary',
      'America/Vancouver': '🇨🇦 Vancouver, Victoria',
      'America/Halifax': '🇨🇦 Halifax, Moncton',
      'America/Mexico_City': '🇲🇽 Mexico City, Guadalajara',
      'America/Chihuahua': '🇲🇽 Chihuahua, Hermosillo',
      'America/Tijuana': '🇲🇽 Tijuana, Mexicali',
      'America/Sao_Paulo': '🇧🇷 São Paulo, Rio de Janeiro',
      'America/Manaus': '🇧🇷 Manaus, Porto Velho',
      'America/Buenos_Aires': '🇦🇷 Buenos Aires, Córdoba',
      'America/Santiago': '🇨🇱 Santiago, Valparaíso',
      'America/Bogota': '🇨🇴 Bogotá, Medellín',
      'America/Lima': '🇵🇪 Lima, Arequipa',
      'Europe/London': '🇬🇧 London, Manchester, Birmingham',
      'Europe/Paris': '🇫🇷 Paris, Lyon, Marseille',
      'Europe/Berlin': '🇩🇪 Berlin, Munich, Hamburg',
      'Europe/Rome': '🇮🇹 Rome, Milan, Naples',
      'Europe/Madrid': '🇪🇸 Madrid, Barcelona, Valencia',
      'Europe/Amsterdam': '🇳🇱 Amsterdam, Rotterdam',
      'Europe/Brussels': '🇧🇪 Brussels, Antwerp',
      'Europe/Vienna': '🇦🇹 Vienna, Graz',
      'Europe/Warsaw': '🇵🇱 Warsaw, Kraków',
      'Europe/Stockholm': '🇸🇪 Stockholm, Gothenburg',
      'Europe/Athens': '🇬🇷 Athens, Thessaloniki',
      'Europe/Istanbul': '🇹🇷 Istanbul, Ankara',
      'Europe/Moscow': '🇷🇺 Moscow, Saint Petersburg',
      'Asia/Yekaterinburg': '🇷🇺 Yekaterinburg, Chelyabinsk',
      'Asia/Novosibirsk': '🇷🇺 Novosibirsk, Omsk',
      'Asia/Vladivostok': '🇷🇺 Vladivostok, Khabarovsk',
      'Asia/Tokyo': '🇯🇵 Tokyo, Osaka, Kyoto',
      'Asia/Seoul': '🇰🇷 Seoul, Busan, Incheon',
      'Asia/Shanghai': '🇨🇳 Beijing, Shanghai, Shenzhen',
      'Asia/Hong_Kong': '🇭🇰 Hong Kong',
      'Asia/Taipei': '🇹🇼 Taipei, Kaohsiung',
      'Asia/Singapore': '🇸🇬 Singapore',
      'Asia/Bangkok': '🇹🇭 Bangkok, Chiang Mai',
      'Asia/Ho_Chi_Minh': '🇻🇳 Ho Chi Minh City, Hanoi',
      'Asia/Manila': '🇵🇭 Manila, Cebu',
      'Asia/Jakarta': '🇮🇩 Jakarta, Bandung',
      'Asia/Makassar': '🇮🇩 Bali, Makassar',
      'Asia/Kolkata': '🇮🇳 Mumbai, Delhi, Bangalore',
      'Asia/Dubai': '🇦🇪 Dubai, Abu Dhabi',
      'Asia/Riyadh': '🇸🇦 Riyadh, Jeddah',
      'Australia/Sydney': '🇦🇺 Sydney, Canberra',
      'Australia/Brisbane': '🇦🇺 Brisbane, Gold Coast',
      'Australia/Adelaide': '🇦🇺 Adelaide',
      'Australia/Perth': '🇦🇺 Perth',
      'Australia/Darwin': '🇦🇺 Darwin',
      'Pacific/Auckland': '🇳🇿 Auckland, Wellington',
      'Pacific/Fiji': '🇫🇯 Suva, Nadi',
      'Africa/Johannesburg': '🇿🇦 Johannesburg, Cape Town',
      'Africa/Cairo': '🇪🇬 Cairo, Alexandria',
      'Africa/Lagos': '🇳🇬 Lagos, Abuja',
      'Africa/Nairobi': '🇰🇪 Nairobi, Mombasa',
      'Africa/Casablanca': '🇲🇦 Casablanca, Rabat'
    };
    
    const description = cityExamples[tzValue] || tzLabel;
    
    return {
      label: tzLabel,
      value: tzValue,
      description: description,
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
  
  // ✅ NEW: Clear active interaction after successful update
  clearActiveInteraction(userId);
}

export async function handleTimezoneSelect(interaction, userId) {
  // ✅ NEW: Check for race condition
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId} at timezone select, ignoring`);
    return;
  }
  
  // ✅ NEW: Mark this interaction as active
  setActiveInteraction(userId, interaction.id);
  
  const state = stateManager.getRegistrationState(userId);
  const timezone = interaction.values[0];
  
  let timezoneAbbr = '';
  const timezones = REGIONS[state.region][state.country];
  for (const [label, tz] of Object.entries(timezones)) {
    if (tz === timezone) {
      timezoneAbbr = getTimezoneAbbr(label);
      break;
    }
  }
  
  await db.setUserTimezone(userId, timezone);
  stateManager.setRegistrationState(userId, { ...state, timezone, timezoneAbbr });

  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { 
    timeZone: timezone, 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  const totalSteps = getTotalSteps('main');
  const embed = createRegEmbed(4, totalSteps, '🎭 Choose Your Class', `**Timezone:** ${timezoneAbbr} • ${timeString}`);

  const classOptions = Object.keys(gameData.classes).map(className => {
    const iconId = getClassIconId(className);
    const option = {
      label: className,
      value: className,
      description: gameData.classes[className].role,
      emoji: iconId ? { id: iconId } : gameData.classes[className].emoji
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
  
  // ✅ NEW: Clear active interaction after successful update
  clearActiveInteraction(userId);
}

export async function handleClassSelect(interaction, userId) {
  // ✅ NEW: Check for race condition
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId} at class select, ignoring`);
    return;
  }
  
  // ✅ NEW: Mark this interaction as active
  setActiveInteraction(userId, interaction.id);
  
  const className = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  stateManager.setRegistrationState(userId, { ...state, class: className });

  const subclasses = gameData.classes[className].subclasses;
  const classRole = gameData.classes[className].role;
  
  // Determine step numbers based on whether it's an alt or subclass
  const isAlt = state.characterType === 'alt';
  const isSubclass = state.type === 'subclass';
  const totalSteps = getTotalSteps(state.characterType || 'main');
  
  let stepNum;
  if (isSubclass) {
    stepNum = 1;
  } else if (isAlt) {
    stepNum = 2;
  } else {
    stepNum = 5;
  }
  
  const embed = createRegEmbed(stepNum, totalSteps, '📋 Choose Your Subclass', `**Class:** ${className}`);

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
    .setCustomId(isSubclass ? `back_to_profile_${userId}` : (isAlt ? `back_to_profile_${userId}` : `back_to_class_${userId}`))
    .setLabel(isSubclass || isAlt ? '❌ Cancel' : '◀️ Back')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
  
  // ✅ NEW: Clear active interaction after successful update
  clearActiveInteraction(userId);
}

export async function handleSubclassSelect(interaction, userId) {
  // ✅ NEW: Check for race condition
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId} at subclass select, ignoring`);
    return;
  }
  
  // ✅ NEW: Mark this interaction as active
  setActiveInteraction(userId, interaction.id);
  
  const subclassName = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  stateManager.setRegistrationState(userId, { ...state, subclass: subclassName });
  
  // Determine step numbers based on whether it's an alt or subclass
  const isAlt = state.characterType === 'alt';
  const isSubclass = state.type === 'subclass';
  const totalSteps = getTotalSteps(state.characterType || 'main');
  
  let stepNum;
  if (isSubclass) {
    stepNum = 2;
  } else if (isAlt) {
    stepNum = 3;
  } else {
    stepNum = 6;
  }
  
  const embed = createRegEmbed(stepNum, totalSteps, '💪 Choose Your Score', `**Subclass:** ${subclassName}`);

  const scoreOptions = gameData.abilityScores.map(score => ({
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
  
  // ✅ NEW: Clear active interaction after successful update
  clearActiveInteraction(userId);
}

export async function handleAbilityScoreSelect(interaction, userId) {
  // ✅ NEW: Check for race condition
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId} at ability score select, ignoring`);
    return;
  }
  
  // ✅ NEW: Mark this interaction as active
  setActiveInteraction(userId, interaction.id);
  
  const abilityScore = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  stateManager.setRegistrationState(userId, { ...state, abilityScore });

  // Check if this is a subclass registration
  const isSubclass = state.type === 'subclass';
  
  if (isSubclass) {
    // For subclasses, skip battle imagines and guild selection, complete registration
    try {
      const parentChar = await db.getCharacterById(state.parentId);
      
      if (!parentChar) {
        clearActiveInteraction(userId);
        throw new Error('Parent character not found');
      }

      const characterData = {
        userId,
        ign: parentChar.ign,
        uid: parentChar.uid,
        guild: parentChar.guild,
        class: state.class,
        subclass: state.subclass,
        abilityScore: abilityScore,
        characterType: state.characterType,
        parentCharacterId: state.parentId
      };

      console.log('[REGISTRATION] Creating subclass with data:', JSON.stringify(characterData, null, 2));

      await db.createCharacter(characterData);
      stateManager.clearRegistrationState(userId);

      const characters = await db.getAllCharactersWithSubclasses(userId);
      const mainChar = characters.find(c => c.character_type === 'main');
      const alts = characters.filter(c => c.character_type === 'alt');
      const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

      const profileEmbed = await buildCharacterProfileEmbed(interaction.user, characters, interaction);
      const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);

      await interaction.update({ 
        embeds: [profileEmbed], 
        components: buttons
      });

      logger.logAction(interaction.user.tag, `registered ${state.characterType} subclass`, `${state.class} - ${state.subclass}`);
      
      // ✅ NEW: Clear active interaction after successful update
      clearActiveInteraction(userId);
    } catch (error) {
      console.error('[REGISTRATION ERROR]', error);
      logger.error(`Subclass registration error: ${error.message}`, error);
      clearActiveInteraction(userId);
      await interaction.update({
        content: '❌ Something went wrong. Please try again!',
        components: []
      });
    }
    return;
  }

  // For main/alt characters, proceed to Battle Imagines
  stateManager.setRegistrationState(userId, { 
    ...state, 
    abilityScore,
    battleImagines: [],
    currentImagineIndex: 0
  });
  
  // Start Battle Imagine flow
  await showBattleImagineSelection(interaction, userId);
  
  // ✅ NEW: Clear active interaction after successful update
  clearActiveInteraction(userId);
}

// Show Battle Imagine selection for current imagine
async function showBattleImagineSelection(interaction, userId) {
  const state = stateManager.getRegistrationState(userId);
  const { currentImagineIndex, battleImagines } = state;
  
  // Check if we've shown all battle imagines
  if (currentImagineIndex >= config.battleImagines.length) {
    // All battle imagines done, proceed to guild selection
    await proceedToGuildSelection(interaction, userId);
    return;
  }
  
  const currentImagine = config.battleImagines[currentImagineIndex];
  const isAlt = state.characterType === 'alt';
  const totalSteps = getTotalSteps(state.characterType || 'main');
  
  // Calculate step number
  let baseStep;
  if (isAlt) {
    baseStep = 4;
  } else {
    baseStep = 7;
  }
  const stepNum = baseStep + currentImagineIndex;
  
  // Use custom emoji in title if available
  const titleEmoji = currentImagine.logo ? `<:bi:${currentImagine.logo}>` : '⚔️';
  
  const embed = createRegEmbed(
    stepNum, 
    totalSteps, 
    `${titleEmoji} Battle Imagine - ${currentImagine.name}`, 
    `Do you own **${currentImagine.name}**?\\n\\nSelect the highest tier you own:`
  );
  
  // Build tier options with custom emoji
  const tierOptions = [
    {
      label: 'Skip / I don\'t own this',
      value: 'skip',
      description: 'I don\'t have this Battle Imagine',
      emoji: '⏭️'
    }
  ];
  
  // Add tier options T0-T5 with custom emoji
  const tiers = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5'];
  const tierDescriptions = {
    'T0': 'Base tier',
    'T1': 'Tier One',
    'T2': 'Tier Two',
    'T3': 'Tier Three',
    'T4': 'Tier Four',
    'T5': 'Tier Five (Max)'
  };
  
  for (const tier of tiers) {
    const option = {
      label: tier,
      value: tier,
      description: tierDescriptions[tier],
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

export async function handleBattleImagineSelect(interaction, userId) {
  // ✅ NEW: Check for race condition
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId} at battle imagine select, ignoring`);
    return;
  }
  
  // ✅ NEW: Mark this interaction as active
  setActiveInteraction(userId, interaction.id);
  
  const state = stateManager.getRegistrationState(userId);
  const selectedTier = interaction.values[0];
  const currentImagine = config.battleImagines[state.currentImagineIndex];
  
  // If not skipped, add to battle imagines array
  if (selectedTier !== 'skip') {
    state.battleImagines.push({
      name: currentImagine.name,
      tier: selectedTier
    });
  }
  
  // Move to next imagine
  state.currentImagineIndex++;
  stateManager.setRegistrationState(userId, state);
  
  // Show next imagine or proceed to guild
  await showBattleImagineSelection(interaction, userId);
  
  // ✅ NEW: Clear active interaction after successful update
  clearActiveInteraction(userId);
}

// Proceed to guild selection after battle imagines
async function proceedToGuildSelection(interaction, userId) {
  const state = stateManager.getRegistrationState(userId);
  const scoreLabel = gameData.abilityScores.find(s => s.value === state.abilityScore)?.label || state.abilityScore;
  const isAlt = state.characterType === 'alt';
  const totalSteps = getTotalSteps(state.characterType || 'main');
  
  // Calculate step number (after all battle imagines)
  const stepNum = totalSteps - 1;
  
  const embed = createRegEmbed(stepNum, totalSteps, '🏰 Choose Your Guild', `**Score:** ${scoreLabel}`);

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

function formatAbilityScore(score) {
  const num = parseInt(score);
  const scoreRanges = {
    10000: '≤10k', 11000: '10-12k', 13000: '12-14k', 15000: '14-16k',
    17000: '16-18k', 19000: '18-20k', 21000: '20-22k', 23000: '22-24k',
    25000: '24-26k', 27000: '26-28k', 29000: '28-30k', 31000: '30-32k',
    33000: '32-34k', 35000: '34-36k', 37000: '36-38k', 39000: '38-40k',
    41000: '40-42k', 43000: '42-44k', 45000: '44-46k', 47000: '46-48k',
    49000: '48-50k', 51000: '50-52k', 53000: '52-54k', 55000: '54-56k',
    57000: '56k+'
  };
  return scoreRanges[num] || num.toLocaleString();
}

export async function handleGuildSelect(interaction, userId) {
  // ✅ NEW: Check for race condition
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId} at guild select, ignoring`);
    return;
  }
  
  // ✅ NEW: Mark this interaction as active
  setActiveInteraction(userId, interaction.id);
  
  const guild = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  stateManager.setRegistrationState(userId, { ...state, guild });

  const modal = new ModalBuilder()
    .setCustomId(`ign_modal_${userId}`)
    .setTitle('Enter Character Details');

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
  
  // ✅ NEW: Clear active interaction after showing modal
  clearActiveInteraction(userId);
}

export async function handleIGNModal(interaction, userId) {
  const ign = interaction.fields.getTextInputValue('ign');
  const uid = interaction.fields.getTextInputValue('uid').trim();
  const state = stateManager.getRegistrationState(userId);

  console.log('[REGISTRATION] IGN entered:', ign);
  console.log('[REGISTRATION] UID entered:', uid);
  console.log('[REGISTRATION] Final state:', JSON.stringify(state, null, 2));
  console.log('[REGISTRATION] Character type will be:', state.characterType || 'main');

  // Validate UID is numbers only
  if (!/^\d+$/.test(uid)) {
    stateManager.setRegistrationState(userId, { 
      ...state, 
      lastIgnEntered: ign 
    });
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setDescription('# ❌ **Invalid UID**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n**UID must contain only numbers.**\n\nYou entered: `' + uid + '`\n\nPlease click the button below to try again with a valid numeric UID.')
      .setTimestamp();
    
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
    const characterData = {
      userId,
      ign,
      uid,
      guild: state.guild,
      class: state.class,
      subclass: state.subclass,
      abilityScore: state.abilityScore,
      characterType: state.characterType || 'main'
    };

    console.log('[REGISTRATION] Creating character with data:', JSON.stringify(characterData, null, 2));

    const newCharacter = await db.createCharacter(characterData);
    
    // Save Battle Imagines if any were selected
    if (state.battleImagines && state.battleImagines.length > 0) {
      for (const imagine of state.battleImagines) {
        await db.addBattleImagine(newCharacter.id, imagine.name, imagine.tier);
      }
      console.log(`[REGISTRATION] Saved ${state.battleImagines.length} Battle Imagines`);
    }
    
    // ✅ FIXED: Improved nickname sync with proper error handling
    if (characterData.characterType === 'main' && config.sync.nicknameSyncEnabled) {
      console.log(`[REGISTRATION] Attempting to sync nickname for main character: ${ign}`);
      
      try {
        const result = await updateDiscordNickname(interaction.client, config.discord.guildId, userId, ign);
        
        if (result.success) {
          console.log(`[REGISTRATION] ✅ Nickname synced successfully: ${ign}`);
        } else {
          console.log(`[REGISTRATION] ⚠️ Nickname sync failed: ${result.reason}`);
          
          // ✅ FIXED: Use proper logger methods - only alert for real issues
          const shouldAlert = result.reason !== 'Server owner (Discord limitation)';
          
          if (shouldAlert) {
            // Log warning for permission/role issues
            await logger.logWarning(
              'Nickname Sync',
              `Failed to sync nickname for ${interaction.user.username} (${userId})`,
              `Reason: ${result.reason} | IGN: ${ign}`
            );
          } else {
            // Just log info for server owner (can't be changed)
            logger.logInfo(
              'Nickname Sync Skipped',
              `Cannot change server owner nickname | User: ${userId} | IGN: ${ign}`
            );
          }
        }
      } catch (error) {
        console.error(`[REGISTRATION] ❌ Nickname sync error:`, error);
        
        // ✅ FIXED: Log actual errors with full context
        await logger.logError(
          'Nickname Sync',
          `Nickname sync threw unexpected error for ${interaction.user.username}`,
          error,
          { ign, userId, guild: config.discord.guildId }
        );
      }
    } else if (characterData.characterType === 'main') {
      console.log(`[REGISTRATION] Nickname sync is disabled in config`);
    } else {
      console.log(`[REGISTRATION] Skipping nickname sync for non-main character`);
    }
    
    stateManager.clearRegistrationState(userId);

    const characters = await db.getAllCharactersWithSubclasses(userId);
    const mainChar = characters.find(c => c.character_type === 'main');
    const alts = characters.filter(c => c.character_type === 'alt');
    const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

    console.log('[REGISTRATION] After creation - Main:', mainChar?.ign, '| Alts:', alts.length, '| Subs:', subs.length);

    const embed = await buildCharacterProfileEmbed(interaction.user, characters, interaction);
    const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);

    await interaction.reply({ 
      embeds: [embed], 
      components: buttons,
      ephemeral: config.ephemeral.registerChar
    });

    const charType = characterData.characterType;
    logger.logAction(interaction.user.tag, `registered ${charType} character`, `${ign} - ${state.class}`);
  } catch (error) {
    console.error('[REGISTRATION ERROR]', error);
    logger.error(`Registration error: ${error.message}`, error);
    await interaction.reply({
      content: '❌ Something went wrong. Please try again!',
      ephemeral: true
    });
  }
}

export async function handleRetryIGNUID(interaction, userId) {
  const state = stateManager.getRegistrationState(userId);
  
  if (!state) {
    await interaction.reply({ 
      content: '❌ Registration session expired. Please start over with `/character`.', 
      ephemeral: true 
    });
    return;
  }
  
  const modal = new ModalBuilder()
    .setCustomId(`ign_modal_${userId}`)
    .setTitle('Enter Character Details');

  const ignInput = new TextInputBuilder()
    .setCustomId('ign')
    .setLabel('In-Game Name (IGN)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Your character name')
    .setRequired(true)
    .setMaxLength(50);
  
  if (state.lastIgnEntered) {
    ignInput.setValue(state.lastIgnEntered);
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

// Back button handlers
export async function handleBackToRegion(interaction, userId) {
  await handleRegisterMain(interaction, userId);
}

export async function handleBackToCountry(interaction, userId) {
  const state = stateManager.getRegistrationState(userId);
  if (!state || !state.region) {
    await handleRegisterMain(interaction, userId);
    return;
  }
  
  interaction.values = [state.region];
  await handleRegionSelect(interaction, userId);
}

export async function handleBackToTimezone(interaction, userId) {
  const state = stateManager.getRegistrationState(userId);
  if (!state || !state.country) {
    await handleRegisterMain(interaction, userId);
    return;
  }
  
  interaction.values = [state.country];
  await handleCountrySelect(interaction, userId);
}

export async function handleBackToClass(interaction, userId) {
  const state = stateManager.getRegistrationState(userId);
  if (!state || !state.timezone) {
    await handleRegisterMain(interaction, userId);
    return;
  }
  
  interaction.values = [state.timezone];
  await handleTimezoneSelect(interaction, userId);
}

export async function handleBackToSubclass(interaction, userId) {
  const state = stateManager.getRegistrationState(userId);
  if (!state || !state.class) {
    await handleRegisterMain(interaction, userId);
    return;
  }
  
  interaction.values = [state.class];
  await handleClassSelect(interaction, userId);
}

export async function handleBackToAbilityScore(interaction, userId) {
  const state = stateManager.getRegistrationState(userId);
  if (!state || !state.subclass) {
    await handleRegisterMain(interaction, userId);
    return;
  }
  
  interaction.values = [state.subclass];
  await handleSubclassSelect(interaction, userId);
}

export async function handleBackToBattleImagine(interaction, userId) {
  const state = stateManager.getRegistrationState(userId);
  
  if (!state) {
    await handleRegisterMain(interaction, userId);
    return;
  }
  
  // If we're at the first battle imagine, go back to ability score
  if (state.currentImagineIndex === 0) {
    interaction.values = [state.subclass];
    await handleSubclassSelect(interaction, userId);
    return;
  }
  
  // Otherwise, go back to previous battle imagine
  state.currentImagineIndex--;
  
  // Remove the last added imagine if user is going back
  if (state.battleImagines && state.battleImagines.length > 0) {
    state.battleImagines.pop();
  }
  
  stateManager.setRegistrationState(userId, state);
  await showBattleImagineSelection(interaction, userId);
}

export default {
  handleRegisterMain,
  handleRegionSelect,
  handleCountrySelect,
  handleTimezoneSelect,
  handleClassSelect,
  handleSubclassSelect,
  handleAbilityScoreSelect,
  handleBattleImagineSelect,
  handleGuildSelect,
  handleIGNModal,
  handleRetryIGNUID,
  handleBackToRegion,
  handleBackToCountry,
  handleBackToTimezone,
  handleBackToClass,
  handleBackToSubclass,
  handleBackToAbilityScore,
  handleBackToBattleImagine
};
