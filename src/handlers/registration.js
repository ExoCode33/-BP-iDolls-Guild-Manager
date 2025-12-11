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

// Helper to create consistent embeds
function createRegEmbed(step, total, title, description) {
  return new EmbedBuilder()
    .setColor('#EC4899')
    .setDescription(`# **${title}**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${description}\n\n*Step ${step} of ${total}*`)
    .setTimestamp();
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

export async function handleRegisterMain(interaction, userId) {
  const state = stateManager.getRegistrationState(userId) || {};
  
  console.log('[REGISTRATION] Starting registration for user:', userId);
  console.log('[REGISTRATION] State:', JSON.stringify(state, null, 2));
  
  // Check if adding alt and user already has timezone
  const existingTimezone = await db.getUserTimezone(userId);
  const isAlt = state.characterType === 'alt';
  
  console.log('[REGISTRATION] Is Alt:', isAlt, '| Existing timezone:', existingTimezone);
  
  if (isAlt && existingTimezone) {
    // Skip region/country/timezone for alts - go straight to class
    console.log('[REGISTRATION] Skipping timezone for alt, going to class selection');
    
    let timezoneAbbr = '';
    // Find timezone abbreviation from existing timezone
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
    
    const embed = createRegEmbed(1, 4, '🎭 Choose Your Class', `**Timezone:** ${timezoneAbbr} • ${timeString}`);
    
    const classOptions = Object.keys(gameData.classes).map(className => ({
      label: className,
      value: className,
      emoji: gameData.classes[className].emoji
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
    
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ embeds: [embed], components: [row1, row2] });
    } else {
      await interaction.update({ embeds: [embed], components: [row1, row2] });
    }
    return;
  }
  
  // Main character registration - start with region
  const embed = createRegEmbed(1, 7, '🌍 Choose Your Region', 'Where are you playing from?');

  const regionOptions = Object.keys(REGIONS).map(region => ({
    label: region,
    value: region,
    emoji: '🌍'
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
}

export async function handleRegionSelect(interaction, userId) {
  const region = interaction.values[0];
  const state = stateManager.getRegistrationState(userId) || {};
  stateManager.setRegistrationState(userId, { ...state, region });

  const embed = createRegEmbed(2, 7, '🏳️ Choose Your Country', `**Region:** ${region}`);

  const countries = Object.keys(REGIONS[region]);
  const countryOptions = countries.map(country => ({
    label: country,
    value: country
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
}

export async function handleCountrySelect(interaction, userId) {
  const state = stateManager.getRegistrationState(userId);
  const country = interaction.values[0];
  stateManager.setRegistrationState(userId, { ...state, country });

  const embed = createRegEmbed(3, 7, '🕐 Choose Your Timezone', `**Country:** ${country}`);

  const timezones = REGIONS[state.region][country];
  const timezoneOptions = Object.keys(timezones).map(tzLabel => ({
    label: tzLabel,
    value: timezones[tzLabel]
  }));

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
}

export async function handleTimezoneSelect(interaction, userId) {
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

  const embed = createRegEmbed(4, 7, '🎭 Choose Your Class', `**Timezone:** ${timezoneAbbr} • ${timeString}`);

  const classOptions = Object.keys(gameData.classes).map(className => ({
    label: className,
    value: className,
    emoji: gameData.classes[className].emoji
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
}

export async function handleClassSelect(interaction, userId) {
  const className = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  stateManager.setRegistrationState(userId, { ...state, class: className });

  const subclasses = gameData.classes[className].subclasses;
  const classRole = gameData.classes[className].role;
  
  // Determine step numbers based on whether it's an alt or subclass
  const isAlt = state.characterType === 'alt';
  const isSubclass = state.type === 'subclass';
  const stepNum = isSubclass ? 1 : (isAlt ? 2 : 5);
  const totalSteps = isSubclass ? 2 : (isAlt ? 4 : 7);
  
  const embed = createRegEmbed(stepNum, totalSteps, '📋 Choose Your Subclass', `**Class:** ${className}`);

  const subclassOptions = subclasses.map(subclassName => {
    const roleEmoji = classRole === 'Tank' ? '🛡️' : classRole === 'DPS' ? '⚔️' : '💚';
    return {
      label: subclassName,
      value: subclassName,
      emoji: roleEmoji
    };
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
}

export async function handleSubclassSelect(interaction, userId) {
  const subclassName = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  stateManager.setRegistrationState(userId, { ...state, subclass: subclassName });
  
  // Determine step numbers based on whether it's an alt or subclass
  const isAlt = state.characterType === 'alt';
  const isSubclass = state.type === 'subclass';
  const stepNum = isSubclass ? 2 : (isAlt ? 3 : 6);
  const totalSteps = isSubclass ? 2 : (isAlt ? 4 : 7);
  
  const embed = createRegEmbed(stepNum, totalSteps, '💪 Choose Your Score', `**Subclass:** ${subclassName}`);

  const scoreOptions = gameData.abilityScores.map(score => ({
    label: score.label,
    value: score.value
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
}

export async function handleAbilityScoreSelect(interaction, userId) {
  const abilityScore = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  stateManager.setRegistrationState(userId, { ...state, abilityScore });

  // Check if this is a subclass registration
  const isSubclass = state.type === 'subclass';
  
  if (isSubclass) {
    // For subclasses, skip guild selection and complete registration
    try {
      // Get parent character to inherit guild and IGN
      const parentChar = await db.getCharacterById(state.parentId);
      
      if (!parentChar) {
        throw new Error('Parent character not found');
      }

      const characterData = {
        userId,
        ign: parentChar.ign, // Inherit parent's IGN
        uid: parentChar.uid, // Inherit parent's UID
        guild: parentChar.guild, // Inherit parent's guild
        class: state.class,
        subclass: state.subclass,
        abilityScore: abilityScore, // Use the variable directly, not from state
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
    } catch (error) {
      console.error('[REGISTRATION ERROR]', error);
      logger.error(`Subclass registration error: ${error.message}`, error);
      await interaction.update({
        content: '❌ Something went wrong. Please try again!',
        components: []
      });
    }
    return;
  }

  // Regular character flow continues with guild selection
  const scoreLabel = gameData.abilityScores.find(s => s.value === abilityScore)?.label || abilityScore;
  const isAlt = state.characterType === 'alt';
  const stepNum = isAlt ? 4 : 7;
  const totalSteps = isAlt ? 4 : 7;
  
  const embed = createRegEmbed(stepNum, totalSteps, '🏰 Choose Your Guild', `**Score:** ${scoreLabel}`);

  const guildOptions = config.guilds.map(guild => ({
    label: guild.name,
    value: guild.name
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_guild_${userId}`)
    .setPlaceholder('🏰 Pick your guild')
    .addOptions(guildOptions);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_ability_score_${userId}`)
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
}

export async function handleIGNModal(interaction, userId) {
  const ign = interaction.fields.getTextInputValue('ign');
  const uid = interaction.fields.getTextInputValue('uid').trim();
  const state = stateManager.getRegistrationState(userId);

  console.log('[REGISTRATION] IGN entered:', ign);
  console.log('[REGISTRATION] UID entered:', uid);
  console.log('[REGISTRATION] Final state:', JSON.stringify(state, null, 2));
  console.log('[REGISTRATION] Character type will be:', state.characterType || 'main');

  // ✅ Validate UID is numbers only
  if (!/^\d+$/.test(uid)) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setDescription('# ❌ **Invalid UID**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n**UID must contain only numbers.**\n\nYou entered: `' + uid + '`\n\nPlease try again with a valid numeric UID.')
      .setTimestamp();
    
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    stateManager.clearRegistrationState(userId);
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

    await db.createCharacter(characterData);
    
    // ✅ NEW: Update Discord nickname if this is a main character (and sync is enabled)
    if (characterData.characterType === 'main' && config.sync.nicknameSyncEnabled) {
      await updateDiscordNickname(interaction.client, config.discord.guildId, userId, ign);
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
  
  await handleRegionSelect(interaction, userId);
}

export async function handleBackToTimezone(interaction, userId) {
  const state = stateManager.getRegistrationState(userId);
  if (!state || !state.country) {
    await handleRegisterMain(interaction, userId);
    return;
  }
  
  // Simulate country selection
  interaction.values = [state.country];
  await handleCountrySelect(interaction, userId);
}

export async function handleBackToClass(interaction, userId) {
  const state = stateManager.getRegistrationState(userId);
  if (!state || !state.timezone) {
    await handleRegisterMain(interaction, userId);
    return;
  }
  
  // Simulate timezone selection
  interaction.values = [state.timezone];
  await handleTimezoneSelect(interaction, userId);
}

export async function handleBackToSubclass(interaction, userId) {
  const state = stateManager.getRegistrationState(userId);
  if (!state || !state.class) {
    await handleRegisterMain(interaction, userId);
    return;
  }
  
  // Simulate class selection
  interaction.values = [state.class];
  await handleClassSelect(interaction, userId);
}

export async function handleBackToAbilityScore(interaction, userId) {
  const state = stateManager.getRegistrationState(userId);
  if (!state || !state.subclass) {
    await handleRegisterMain(interaction, userId);
    return;
  }
  
  // Simulate subclass selection
  interaction.values = [state.subclass];
  await handleSubclassSelect(interaction, userId);
}

export default {
  handleRegisterMain,
  handleRegionSelect,
  handleCountrySelect,
  handleTimezoneSelect,
  handleClassSelect,
  handleSubclassSelect,
  handleAbilityScoreSelect,
  handleGuildSelect,
  handleIGNModal,
  handleBackToRegion,
  handleBackToCountry,
  handleBackToTimezone,
  handleBackToClass,
  handleBackToSubclass,
  handleBackToAbilityScore
};
