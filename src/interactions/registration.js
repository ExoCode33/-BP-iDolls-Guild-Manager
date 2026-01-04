import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { CharacterRepo, UserRepo, BattleImagineRepo } from '../database/repositories.js';
import { updateNickname } from '../services/nickname.js';
import * as ui from '../ui/components.js';
import { profileEmbed } from '../ui/profile.js';
import { CLASSES, ABILITY_SCORES, REGIONS, COLORS } from '../utils/constants.js';
import { getClassIconId } from '../utils/classRoleMapping.js';
import config from '../config.js';
import logger from '../utils/logger.js';
import * as classRoleService from '../services/classRole.js';
import * as applicationService from '../services/application.js';

// ═══════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

const registrationState = new Map();
const STATE_TTL = 30 * 60 * 1000; // 30 minutes

const state = {
  set(userId, key, value) {
    const userState = registrationState.get(userId) || {};
    userState[key] = value;
    userState.lastUpdated = Date.now();
    registrationState.set(userId, userState);
    console.log(`[STATE] Set ${key} for user ${userId}:`, value);
  },

  get(userId, key) {
    const userState = registrationState.get(userId);
    if (!userState) return null;
    
    // Check if state has expired
    if (Date.now() - userState.lastUpdated > STATE_TTL) {
      console.log(`[STATE] Expired for user ${userId}, clearing`);
      registrationState.delete(userId);
      return null;
    }
    
    return userState[key];
  },

  clear(userId, key) {
    if (key) {
      const userState = registrationState.get(userId);
      if (userState) {
        delete userState[key];
        console.log(`[STATE] Cleared ${key} for user ${userId}`);
      }
    } else {
      registrationState.delete(userId);
      console.log(`[STATE] Cleared all state for user ${userId}`);
    }
  }
};

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

function createRegEmbed(step, totalSteps, title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      `# ${title}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${description}\n\n` +
      `**Step ${step}/${totalSteps}**`
    )
    .setTimestamp();
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
    // Show warning about replacing main
    const subclasses = await CharacterRepo.findSubclasses(userId);
    
    const warningEmbed = new EmbedBuilder()
      .setColor('#FF9900')
      .setDescription(
        '# ⚠️ **Replace Main Character?**\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '**You already have a main character!**\n\n' +
        `🎮 **Current Main:** ${existingMain.ign}\n` +
        `🆔 **UID:** ${existingMain.uid}\n` +
        `🎭 **Class:** ${existingMain.class} - ${existingMain.subclass}\n` +
        `💪 **Score:** ${existingMain.ability_score}\n` +
        `🏰 **Guild:** ${existingMain.guild}\n\n` +
        (subclasses.length > 0 
          ? `**⚠️ This will also delete ${subclasses.length} subclass${subclasses.length > 1 ? 'es' : ''}:**\n` +
            subclasses.map(s => `  • ${s.class} - ${s.subclass}`).join('\n') + '\n\n'
          : '') +
        '**This action cannot be undone!**\n' +
        'Consider using `/edit-character` instead.'
      )
      .setTimestamp();
    
    const confirmButton = new ButtonBuilder()
      .setCustomId(`confirm_replace_main_${userId}`)
      .setLabel('✅ Yes, Replace Main')
      .setStyle(ButtonStyle.Danger);
    
    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_replace_main_${userId}`)
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary);
    
    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
    
    clearActiveInteraction(userId);
    await interaction.update({ embeds: [warningEmbed], components: [row] });
    return;
  }
  
  // No existing main, proceed with registration
  state.set(userId, 'reg', { type: 'main' });
  
  const totalSteps = getTotalSteps('main');
  const embed = createRegEmbed(1, totalSteps, '🌎 Region Selection', 'Choose your region');

  const regionOptions = REGIONS.map(region => ({
    label: region.name,
    value: region.name,
    emoji: region.emoji
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_region_${userId}`)
    .setPlaceholder('🌎 Select your region')
    .addOptions(regionOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.update({ embeds: [embed], components: [row] });
  
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
    const embed = createRegEmbed(1, totalSteps, '🌎 Region Selection', 'Choose your region');

    const regionOptions = REGIONS.map(region => ({
      label: region.name,
      value: region.name,
      emoji: region.emoji
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_region_${userId}`)
      .setPlaceholder('🌎 Select your region')
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
  
  const regionName = interaction.values[0];
  const currentState = state.get(userId, 'reg');
  state.set(userId, 'reg', { ...currentState, region: regionName });

  const region = REGIONS.find(r => r.name === regionName);
  const totalSteps = getTotalSteps(currentState.type || 'main');
  
  const embed = createRegEmbed(2, totalSteps, '🏳️ Country Selection', `Region: ${regionName}`);

  const countryOptions = region.countries.map(country => ({
    label: country,
    value: country,
    emoji: '🏳️'
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_country_${userId}`)
    .setPlaceholder('🏳️ Select your country')
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
  
  const countryName = interaction.values[0];
  const currentState = state.get(userId, 'reg');
  state.set(userId, 'reg', { ...currentState, country: countryName });

  const totalSteps = getTotalSteps(currentState.type || 'main');
  const embed = createRegEmbed(3, totalSteps, '🕐 Timezone Selection', `Country: ${countryName}`);

  const timezones = [
    { label: 'UTC-12:00 (Baker Island)', value: 'UTC-12', emoji: '🕐' },
    { label: 'UTC-11:00 (American Samoa)', value: 'UTC-11', emoji: '🕐' },
    { label: 'UTC-10:00 (Hawaii)', value: 'UTC-10', emoji: '🕐' },
    { label: 'UTC-09:00 (Alaska)', value: 'UTC-9', emoji: '🕐' },
    { label: 'UTC-08:00 (PST/Los Angeles)', value: 'UTC-8', emoji: '🕐' },
    { label: 'UTC-07:00 (MST/Denver)', value: 'UTC-7', emoji: '🕐' },
    { label: 'UTC-06:00 (CST/Chicago)', value: 'UTC-6', emoji: '🕐' },
    { label: 'UTC-05:00 (EST/New York)', value: 'UTC-5', emoji: '🕐' },
    { label: 'UTC-04:00 (Atlantic/Halifax)', value: 'UTC-4', emoji: '🕐' },
    { label: 'UTC-03:00 (Brazil/Buenos Aires)', value: 'UTC-3', emoji: '🕐' },
    { label: 'UTC-02:00 (South Georgia)', value: 'UTC-2', emoji: '🕐' },
    { label: 'UTC-01:00 (Azores)', value: 'UTC-1', emoji: '🕐' },
    { label: 'UTC±00:00 (GMT/London)', value: 'UTC+0', emoji: '🕐' },
    { label: 'UTC+01:00 (Paris/Berlin)', value: 'UTC+1', emoji: '🕐' },
    { label: 'UTC+02:00 (Cairo/Athens)', value: 'UTC+2', emoji: '🕐' },
    { label: 'UTC+03:00 (Moscow/Istanbul)', value: 'UTC+3', emoji: '🕐' },
    { label: 'UTC+04:00 (Dubai/Baku)', value: 'UTC+4', emoji: '🕐' },
    { label: 'UTC+05:00 (Pakistan/Uzbekistan)', value: 'UTC+5', emoji: '🕐' },
    { label: 'UTC+06:00 (Bangladesh/Almaty)', value: 'UTC+6', emoji: '🕐' },
    { label: 'UTC+07:00 (Bangkok/Jakarta)', value: 'UTC+7', emoji: '🕐' },
    { label: 'UTC+08:00 (Singapore/Beijing)', value: 'UTC+8', emoji: '🕐' },
    { label: 'UTC+09:00 (Tokyo/Seoul)', value: 'UTC+9', emoji: '🕐' },
    { label: 'UTC+10:00 (Sydney/Vladivostok)', value: 'UTC+10', emoji: '🕐' },
    { label: 'UTC+11:00 (New Caledonia)', value: 'UTC+11', emoji: '🕐' },
    { label: 'UTC+12:00 (New Zealand)', value: 'UTC+12', emoji: '🕐' }
  ];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_timezone_${userId}`)
    .setPlaceholder('🕐 Select your timezone')
    .addOptions(timezones);

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
  
  const timezone = interaction.values[0];
  const currentState = state.get(userId, 'reg');
  state.set(userId, 'reg', { ...currentState, timezone });

  // Save timezone to user table
  await UserRepo.create(userId, timezone);
  console.log('[REGISTRATION] Saved timezone for user:', userId, timezone);

  const totalSteps = getTotalSteps(currentState.type || 'main');
  const embed = createRegEmbed(4, totalSteps, '🎭 Class Selection', `Timezone: ${timezone}`);

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
  
  const embed = createRegEmbed(stepNum, totalSteps, '✨ Subclass Selection', `Class: ${className}`);

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
  const imagineIndex = currentState.currentImagineIndex || 0;
  
  if (imagineIndex >= config.battleImagines.length) {
    // All battle imagines collected, move to guild selection
    await showGuildSelection(interaction, userId);
    return;
  }
  
  const currentImagine = config.battleImagines[imagineIndex];
  const isAlt = currentState.type === 'alt';
  const totalSteps = getTotalSteps(currentState.type || 'main');
  
  let stepNum;
  if (isAlt) {
    stepNum = 4 + imagineIndex;
  } else {
    stepNum = 7 + imagineIndex;
  }
  
  const embed = createRegEmbed(
    stepNum, 
    totalSteps, 
    `⚔️ ${currentImagine} Battle Imagine`, 
    `Select your ${currentImagine} tier (or None)`
  );

  const tierOptions = [
    { label: 'None', value: 'none', emoji: '❌', description: `No ${currentImagine}` },
    { label: 'Tier 1', value: 'T1', emoji: '1️⃣', description: 'Tier 1' },
    { label: 'Tier 2', value: 'T2', emoji: '2️⃣', description: 'Tier 2' },
    { label: 'Tier 3', value: 'T3', emoji: '3️⃣', description: 'Tier 3' },
    { label: 'Tier 4', value: 'T4', emoji: '4️⃣', description: 'Tier 4' },
    { label: 'Tier 5', value: 'T5', emoji: '5️⃣', description: 'Tier 5' }
  ];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_battle_imagine_${userId}`)
    .setPlaceholder(`⚔️ Select ${currentImagine} tier`)
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
  
  const tier = interaction.values[0];
  const currentState = state.get(userId, 'reg');
  const imagineIndex = currentState.currentImagineIndex || 0;
  const currentImagine = config.battleImagines[imagineIndex];
  
  // Save the battle imagine if not "none"
  if (tier !== 'none') {
    currentState.battleImagines.push({ name: currentImagine, tier });
  }
  
  // Move to next imagine
  currentState.currentImagineIndex = imagineIndex + 1;
  state.set(userId, 'reg', currentState);
  
  // Show next imagine or move to guild
  await showBattleImagineSelection(interaction, userId);
  
  clearActiveInteraction(userId);
}

// ═══════════════════════════════════════════════════════════════════
// GUILD SELECTION
// ═══════════════════════════════════════════════════════════════════

async function showGuildSelection(interaction, userId) {
  const currentState = state.get(userId, 'reg');
  const isAlt = currentState.type === 'alt';
  const totalSteps = getTotalSteps(currentState.type || 'main');
  
  let stepNum = isAlt ? (4 + config.battleImagines.length) : (7 + config.battleImagines.length);
  
  const embed = createRegEmbed(stepNum, totalSteps, '🏰 Guild Selection', 'Choose your guild');

  const guildOptions = [
    { label: 'iDolls', value: 'iDolls', emoji: '💖', description: 'Apply to iDolls' },
    { label: 'Visitor', value: 'Visitor', emoji: '👋', description: 'Guest/Visitor status' },
    { label: 'Allied', value: 'Allied', emoji: '🤝', description: 'Allied guild member' }
  ];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_guild_${userId}`)
    .setPlaceholder('🏰 Select your guild')
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
    .setTitle('Character Registration');

  const ignInput = new TextInputBuilder()
    .setCustomId('ign')
    .setLabel('In-Game Name (IGN)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter your IGN')
    .setRequired(true);

  const uidInput = new TextInputBuilder()
    .setCustomId('uid')
    .setLabel('User ID (UID)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter your numeric UID')
    .setRequired(true);

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
    if (currentState.guild === 'iDolls' && config.roles.guild1) {
      if (characterType === 'main') {
        await assignPendingRoles(interaction.client, userId);
      }
      await applicationService.createApplication(userId, character.id, currentState.guild);
      
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
  
  const modal = new ModalBuilder()
    .setCustomId(`ign_modal_${userId}`)
    .setTitle('Character Registration');

  const ignInput = new TextInputBuilder()
    .setCustomId('ign')
    .setLabel('In-Game Name (IGN)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter your IGN')
    .setValue(currentState.lastIgnEntered || '')
    .setRequired(true);

  const uidInput = new TextInputBuilder()
    .setCustomId('uid')
    .setLabel('User ID (UID)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter your numeric UID (numbers only)')
    .setRequired(true);

  const row1 = new ActionRowBuilder().addComponents(ignInput);
  const row2 = new ActionRowBuilder().addComponents(uidInput);

  modal.addComponents(row1, row2);

  await interaction.showModal(modal);
}

// ═══════════════════════════════════════════════════════════════════
// SUBCLASS REGISTRATION
// ═══════════════════════════════════════════════════════════════════

export async function startSubclassRegistration(interaction, userId, parentId) {
  if (hasActiveInteraction(userId, interaction.id)) {
    console.log(`[REGISTRATION] Race condition detected for ${userId}, ignoring duplicate interaction`);
    return;
  }
  
  setActiveInteraction(userId, interaction.id);
  
  console.log('[REGISTRATION] Starting subclass registration for user:', userId, 'parent:', parentId);
  
  // Initialize subclass registration state
  state.set(userId, 'reg', { type: 'subclass', parentId: parentId });
  
  const totalSteps = getTotalSteps('subclass');
  const embed = createRegEmbed(1, totalSteps, '🎭 Subclass Class', 'Choose your subclass class');

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
  
  const embed = createRegEmbed(1, totalSteps, '🌎 Region Selection', 'Choose your region');

  const regionOptions = REGIONS.map(region => ({
    label: region.name,
    value: region.name,
    emoji: region.emoji
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_region_${userId}`)
    .setPlaceholder('🌎 Select your region')
    .addOptions(regionOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.update({ embeds: [embed], components: [row] });
  clearActiveInteraction(userId);
}

export async function backToCountry(interaction, userId) {
  if (hasActiveInteraction(userId, interaction.id)) return;
  setActiveInteraction(userId, interaction.id);
  
  const currentState = state.get(userId, 'reg');
  const region = REGIONS.find(r => r.name === currentState.region);
  const totalSteps = getTotalSteps(currentState.type || 'main');
  
  const embed = createRegEmbed(2, totalSteps, '🏳️ Country Selection', `Region: ${currentState.region}`);

  const countryOptions = region.countries.map(country => ({
    label: country,
    value: country,
    emoji: '🏳️'
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_country_${userId}`)
    .setPlaceholder('🏳️ Select your country')
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
  
  const embed = createRegEmbed(3, totalSteps, '🕐 Timezone Selection', `Country: ${currentState.country}`);

  const timezones = [
    { label: 'UTC-12:00 (Baker Island)', value: 'UTC-12', emoji: '🕐' },
    { label: 'UTC-11:00 (American Samoa)', value: 'UTC-11', emoji: '🕐' },
    { label: 'UTC-10:00 (Hawaii)', value: 'UTC-10', emoji: '🕐' },
    { label: 'UTC-09:00 (Alaska)', value: 'UTC-9', emoji: '🕐' },
    { label: 'UTC-08:00 (PST/Los Angeles)', value: 'UTC-8', emoji: '🕐' },
    { label: 'UTC-07:00 (MST/Denver)', value: 'UTC-7', emoji: '🕐' },
    { label: 'UTC-06:00 (CST/Chicago)', value: 'UTC-6', emoji: '🕐' },
    { label: 'UTC-05:00 (EST/New York)', value: 'UTC-5', emoji: '🕐' },
    { label: 'UTC-04:00 (Atlantic/Halifax)', value: 'UTC-4', emoji: '🕐' },
    { label: 'UTC-03:00 (Brazil/Buenos Aires)', value: 'UTC-3', emoji: '🕐' },
    { label: 'UTC-02:00 (South Georgia)', value: 'UTC-2', emoji: '🕐' },
    { label: 'UTC-01:00 (Azores)', value: 'UTC-1', emoji: '🕐' },
    { label: 'UTC±00:00 (GMT/London)', value: 'UTC+0', emoji: '🕐' },
    { label: 'UTC+01:00 (Paris/Berlin)', value: 'UTC+1', emoji: '🕐' },
    { label: 'UTC+02:00 (Cairo/Athens)', value: 'UTC+2', emoji: '🕐' },
    { label: 'UTC+03:00 (Moscow/Istanbul)', value: 'UTC+3', emoji: '🕐' },
    { label: 'UTC+04:00 (Dubai/Baku)', value: 'UTC+4', emoji: '🕐' },
    { label: 'UTC+05:00 (Pakistan/Uzbekistan)', value: 'UTC+5', emoji: '🕐' },
    { label: 'UTC+06:00 (Bangladesh/Almaty)', value: 'UTC+6', emoji: '🕐' },
    { label: 'UTC+07:00 (Bangkok/Jakarta)', value: 'UTC+7', emoji: '🕐' },
    { label: 'UTC+08:00 (Singapore/Beijing)', value: 'UTC+8', emoji: '🕐' },
    { label: 'UTC+09:00 (Tokyo/Seoul)', value: 'UTC+9', emoji: '🕐' },
    { label: 'UTC+10:00 (Sydney/Vladivostok)', value: 'UTC+10', emoji: '🕐' },
    { label: 'UTC+11:00 (New Caledonia)', value: 'UTC+11', emoji: '🕐' },
    { label: 'UTC+12:00 (New Zealand)', value: 'UTC+12', emoji: '🕐' }
  ];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_timezone_${userId}`)
    .setPlaceholder('🕐 Select your timezone')
    .addOptions(timezones);

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
    description = 'Choose your subclass class';
  } else if (isAlt) {
    stepNum = 1;
    description = 'Choose your alt\'s class';
  } else {
    stepNum = 4;
    description = `Timezone: ${currentState.timezone}`;
  }
  
  const embed = createRegEmbed(stepNum, totalSteps, '🎭 Class Selection', description);

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
  
  const embed = createRegEmbed(stepNum, totalSteps, '✨ Subclass Selection', `Class: ${className}`);

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

