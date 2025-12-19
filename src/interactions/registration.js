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

// ✅ Track active interactions to prevent race conditions
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

// ✨ Create cute registration embeds with ANSI formatting
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

// Cute text suggestions for each step
const cuteTexts = {
  region: [
    "Where is your adventure taking you? 🌍",
    "Pick your home region, adventurer! 🗺️",
    "Which part of the world calls to you? 🌏",
    "Let's find your timezone! 🧭",
    "Ready to explore? Pick your region! 🚀",
    "Your adventure starts here! 🌎",
    "Where should we begin? 🎯",
    "Pick a region and let's go! ✨",
    "Which realm are you from? 🏰",
    "Your home awaits... 💫"
  ],
  country: [
    "Now, which country is home? 🏠",
    "Let's get more specific! Which country? 🗺️",
    "Pick your country, hero! 🌟",
    "Where do you call home? 🏡",
    "Choose your homeland! 🎨",
    "Which country speaks to your heart? 💖",
    "Your country of origin? 🌺",
    "Select where your journey begins! 🌸",
    "Pick your country! 🎭",
    "Which place feels like home? 🌷"
  ],
  timezone: [
    "What time is it where you are? 🕐",
    "Pick your timezone! ⏰",
    "When do you play? Choose your timezone! 🌙",
    "Your local time zone? 🕰️",
    "Where are you in the world right now? 🌍",
    "Pick when you play! ⭐",
    "Your timezone, please! 🎪",
    "What time zone are you in? 🎨",
    "Choose your timezone and let's sync! 💫",
    "Time to set your clock! 🕐"
  ],
  class: [
    "Which class calls to your soul? 🎭",
    "Pick a class and become a legend! ⚔️",
    "What's your fighting style? 🛡️",
    "Choose your path to power! 💪",
    "Which class will you master? 🌟",
    "Pick your role and shine! ✨",
    "What's your specialty? 🎯",
    "Choose wisely, adventurer! 🧙",
    "Your class awaits! 🏆",
    "Pick your power! 💥"
  ],
  subclass: [
    "Which subclass resonates with you? ✨",
    "Pick your specialty! 🎯",
    "Your subclass choice? 🌟",
    "Which path calls to you? 🛤️",
    "Choose your advanced path! 🚀",
    "Pick your subclass power! ⚡",
    "Which subclass suits you? 💖",
    "Your specialty awaits! 🎨",
    "Pick your unique power! 🔮",
    "Which subclass feels right? 🌈"
  ],
  score: [
    "How powerful are you? 💪",
    "What's your combat power? ⚔️",
    "Pick your ability score! 🌟",
    "Your power level? 🔥",
    "Choose your strength! 💎",
    "What's your combat potential? ✨",
    "Pick your power level! 🚀",
    "How strong do you fight? 💫",
    "Your combat power? 🏆",
    "Choose your might! ⚡"
  ],
  battleImagine: [
    "Do you own this Battle Imagine? ⚔️",
    "Which tier do you have? 🎯",
    "Your Battle Imagine tier? ✨",
    "Pick your highest tier! 🌟",
    "Do you have this power? 💫",
    "Select your battle strength! ⚡",
    "Which tier is yours? 🔥",
    "Your imagination tier? 🎨",
    "Battle power level? 💪",
    "Pick your tier! 👑"
  ],
  guild: [
    "Which guild will you join? 🏰",
    "Pick your guild home! 🎪",
    "Your guild choice? 🏆",
    "Which guild calls you? 👑",
    "Where do you belong? 🌟",
    "Pick your guild family! 💖",
    "Which guild feels right? ✨",
    "Your guild destiny? 🚀",
    "Join your guild! 🎯",
    "Pick your guild path! 🌈"
  ],
  ign: [
    "What's your in-game name? 🎮",
    "Your character's name? ✨",
    "What will they call you? 🌟",
    "Your hero's name? 💫",
    "Pick your IGN! 🎭",
    "What's your gaming alias? 🏆",
    "Your legendary name? 👑",
    "Choose your legend! ⭐",
    "Your character awaits! 🎨",
    "What's your power name? 💥"
  ]
};

// Get random cute text
function getRandomCute(type) {
  const texts = cuteTexts[type] || cuteTexts.region;
  return texts[Math.floor(Math.random() * texts.length)];
}

// Get class icon emoji ID
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
    const cuteText = getRandomCute('class');
    const embed = createRegEmbed(1, totalSteps, '🎭 Choose Your Class', `**${timezoneAbbr}** ${timeString}\n\n${cuteText}`);
    
    const classOptions = Object.keys(CLASSES).map(className => {
      const iconId = getClassIconId(className);
      return {
        label: className,
        value: className,
        description: CLASSES[className].role,
        emoji: iconId ? { id: iconId } : CLASSES[className].emoji
      };
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
  const cuteText = getRandomCute('region');
  const embed = createRegEmbed(1, totalSteps, '🌍 Choose Your Region', cuteText);

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

  if (interaction.replied || interaction.deferred) {
    await interaction.editReply({ embeds: [embed], components: [row1, row2] });
  } else {
    await interaction.update({ embeds: [embed], components: [row1, row2] });
  }
  
  clearActiveInteraction(userId);
}

export async function handleRegion(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) return;
  setActiveInteraction(userId, interaction.id);
  
  const region = interaction.values[0];
  const currentState = state.get(userId, 'reg') || {};
  state.set(userId, 'reg', { ...currentState, region });

  const totalSteps = getTotalSteps('main');
  const cuteText = getRandomCute('country');
  const embed = createRegEmbed(2, totalSteps, '🏳️ Choose Your Country', `**${region}**\n\n${cuteText}`);

  const countries = Object.keys(REGIONS[region]);
  const countryOptions = countries.map(country => {
    // Extract flag emoji from country name (e.g., "🇺🇸 United States" -> "🇺🇸")
    const flag = country.split(' ')[0] || '🏳️';
    return {
      label: country,
      value: country,
      description: `${country.substring(0, 50)}`,
      emoji: flag
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
  const cuteText = getRandomCute('timezone');
  const embed = createRegEmbed(3, totalSteps, '🕐 Choose Your Timezone', `**${country}**\n\n${cuteText}`);

  const timezones = REGIONS[currentState.region][country];
  
  const timezoneOptions = Object.keys(timezones).map(tzLabel => ({
    label: tzLabel,
    value: timezones[tzLabel],
    description: tzLabel.split('(')[1]?.replace(')', '') || 'Timezone',
    emoji: '🕐'
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
  const cuteText = getRandomCute('class');
  const embed = createRegEmbed(4, totalSteps, '🎭 Choose Your Class', `**${timezoneAbbr}** ${timeString}\n\n${cuteText}`);

  const classOptions = Object.keys(CLASSES).map(className => {
    const iconId = getClassIconId(className);
    return {
      label: className,
      value: className,
      description: CLASSES[className].role,
      emoji: iconId ? { id: iconId } : CLASSES[className].emoji
    };
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
  if (hasActiveInteraction(userId, interaction.id)) return;
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
  
  const cuteText = getRandomCute('subclass');
  const embed = createRegEmbed(stepNum, totalSteps, '📋 Choose Your Subclass', `**${className}**\n\n${cuteText}`);

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
  if (hasActiveInteraction(userId, interaction.id)) return;
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
  
  const cuteText = getRandomCute('score');
  const embed = createRegEmbed(stepNum, totalSteps, '💪 Choose Your Combat Power', `**${currentState.class}** - ${subclassName}\n\n${cuteText}`);

  const scoreOptions = ABILITY_SCORES.map(score => ({
    label: score.label,
    value: score.value,
    description: 'Your combat power range',
    emoji: '💪'
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_ability_score_${userId}`)
    .setPlaceholder('💪 Pick your power')
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
  if (hasActiveInteraction(userId, interaction.id)) return;
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
  
  const cuteText = getRandomCute('battleImagine');
  const titleEmoji = currentImagine.logo ? `<:bi:${currentImagine.logo}>` : '⚔️';
  
  const embed = createRegEmbed(
    stepNum, 
    totalSteps, 
    `${titleEmoji} ${currentImagine.name}`, 
    `${cuteText}\n\nSelect your highest tier:`
  );
  
  const tierOptions = [
    {
      label: 'Skip / I don\'t own this',
      value: 'skip',
      description: 'Don\'t have this one',
      emoji: '⏭️'
    }
  ];
  
  for (const tier of TIERS) {
    const option = {
      label: tier,
      value: tier,
      description: tier === 'T5' ? 'Maximum tier!' : `Level ${tier.substring(1)}`,
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
  if (hasActiveInteraction(userId, interaction.id)) return;
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
  const totalSteps = getTotalSteps(currentState.characterType || 'main');
  
  const stepNum = totalSteps - 1;
  
  const cuteText = getRandomCute('guild');
  const embed = createRegEmbed(stepNum, totalSteps, '🏰 Choose Your Guild', `**Power:** ${scoreLabel}\n\n${cuteText}`);

  const guildOptions = config.guilds.map(guild => ({
    label: guild.name,
    value: guild.name,
    description: 'Choose your family',
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
  if (hasActiveInteraction(userId, interaction.id)) return;
  setActiveInteraction(userId, interaction.id);
  
  const guild = interaction.values[0];
  const currentState = state.get(userId, 'reg');
  state.set(userId, 'reg', { ...currentState, guild });

  const modal = new ModalBuilder()
    .setCustomId(`ign_modal_${userId}`)
    .setTitle('Character Details');

  const ignInput = new TextInputBuilder()
    .setCustomId('ign')
    .setLabel('In-Game Name (IGN)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Your character name')
    .setRequired(true)
    .setMaxLength(50);

  const uidInput = new TextInputBuilder()
    .setCustomId('uid')
    .setLabel('UID (Numbers only)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Your game UID')
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
      .setDescription('# ❌ **Invalid UID**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n**UID must contain only numbers.**\n\nYou entered: `' + uid + '`\n\n✨ Please try again with a numeric UID!');
    
    const retryButton = new ButtonBuilder()
      .setCustomId(`retry_ign_uid_${userId}`)
      .setLabel('✏️ Retry')
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
    .setTitle('Character Details');

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
    .setLabel('UID (Numbers only)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter numeric UID')
    .setRequired(true)
    .setMaxLength(50);

  const row1 = new ActionRowBuilder().addComponents(ignInput);
  const row2 = new ActionRowBuilder().addComponents(uidInput);
  modal.addComponents(row1, row2);

  await interaction.showModal(modal);
}

// Back button handlers
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
    interaction.values = [currentState.abilityScore];
    await handleScore(interaction, userId);
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
  backToRegion,
  backToCountry,
  backToTimezone,
  backToClass,
  backToSubclass,
  backToScore,
  backToBattleImagine
};
