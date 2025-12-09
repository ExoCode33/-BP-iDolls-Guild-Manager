import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { GAME_DATA, getRoleFromClass, getSubclassesForClass, getTimezoneRegions, getCountriesInRegion, getTimezonesForCountry } from '../config/gameData.js';
import { queries } from '../database/queries.js';
import stateManager from '../utils/stateManager.js';

const EPHEMERAL_CONFIG = {
  admin: process.env.ADMIN_EPHEMERAL !== 'false',
  editMemberDetails: process.env.EDIT_MEMBER_DETAILS_EPHEMERAL !== 'false',
  viewChar: process.env.VIEW_CHAR_EPHEMERAL !== 'false',
};

console.log(`🔒 [CHARACTER] Ephemeral configuration:`);
console.log(`   /admin: ${EPHEMERAL_CONFIG.admin ? 'PRIVATE ✅' : 'PUBLIC ⚠️'}`);
console.log(`   /edit-member-details: ${EPHEMERAL_CONFIG.editMemberDetails ? 'PRIVATE ✅' : 'PUBLIC ⚠️'}`);
console.log(`   /view-char: ${EPHEMERAL_CONFIG.viewChar ? 'PRIVATE ✅' : 'PUBLIC ⚠️'}`);

function getEphemeralOptions(userId, interactionUserId) {
  const isAdminEdit = userId !== interactionUserId;
  const shouldBePrivate = isAdminEdit ? EPHEMERAL_CONFIG.admin : EPHEMERAL_CONFIG.editMemberDetails;
  return shouldBePrivate ? { flags: 64 } : {};
}

function getEphemeralFlag(userId, interactionUserId) {
  const isAdminEdit = userId !== interactionUserId;
  return isAdminEdit ? EPHEMERAL_CONFIG.admin : EPHEMERAL_CONFIG.editMemberDetails;
}

function extractUserIdFromCustomId(customId) {
  const parts = customId.split('_');
  return parts[parts.length - 1];
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

function getRegionEmoji(region) {
  const emojis = {
    'North America': '🌎',
    'Europe (West)': '🇪🇺',
    'Europe (North)': '❄️',
    'Europe (East & Other)': '🇪🇺',
    'Asia (East)': '🌏',
    'Asia (Southeast)': '🌏',
    'Asia (South & Central)': '🌏',
    'Middle East': '🕌',
    'Oceania': '🌏',
    'Africa': '🌍',
    'South America': '🌎',
    'Other': '🌐'
  };
  return emojis[region] || '🌐';
}

export async function handleAddMain(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    
    const existingMain = await queries.getMainCharacter(userId);
    if (existingMain) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ Already Registered')
        .setDescription('This user already has a main character registered!')
        .addFields({
          name: '💡 Tip',
          value: 'Use the **Edit Main** button to update the main character.',
          inline: false
        })
        .setTimestamp();
      
      return interaction.update({ 
        embeds: [embed], 
        components: []
      });
    }

    stateManager.setRegistrationState(userId, { 
      type: 'main',
      characterType: 'main',
      step: 'class',
      isAdminEdit: userId !== interaction.user.id
    });
    
    await showClassSelection(interaction, userId, 'main');
    
  } catch (error) {
    console.error('Error in handleAddMain:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Error')
      .setDescription('An error occurred. Please try again.')
      .setTimestamp();
    
    try {
      await interaction.update({ embeds: [errorEmbed], components: [] });
    } catch {
      await interaction.reply({ embeds: [errorEmbed], flags: 64 });
    }
  }
}

export async function handleAddAlt(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    
    const mainChar = await queries.getMainCharacter(userId);
    if (!mainChar) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Main Character')
        .setDescription('This user needs to register a main character before adding alt characters!')
        .addFields({
          name: '💡 Next Step',
          value: 'Use the **Add Main Character** button first.',
          inline: false
        })
        .setTimestamp();
      
      return interaction.update({ 
        embeds: [embed], 
        components: []
      });
    }

    stateManager.setRegistrationState(userId, { 
      type: 'alt',
      characterType: 'alt',
      step: 'class',
      isAdminEdit: userId !== interaction.user.id
    });
    
    await showClassSelection(interaction, userId, 'alt');
    
  } catch (error) {
    console.error('Error in handleAddAlt:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Error')
      .setDescription('An error occurred. Please try again.')
      .setTimestamp();
    
    try {
      await interaction.update({ embeds: [errorEmbed], components: [] });
    } catch {
      await interaction.reply({ embeds: [errorEmbed], flags: 64 });
    }
  }
}

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

export async function handleClassSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedClass = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    stateManager.setRegistrationState(userId, {
      ...state,
      class: selectedClass,
      step: 'subclass'
    });

    await showSubclassSelection(interaction, userId, state.type, selectedClass);
    
  } catch (error) {
    console.error('Error in handleClassSelection:', error);
    const userId = extractUserIdFromCustomId(interaction.customId);
    stateManager.clearRegistrationState(userId);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ...getEphemeralOptions(userId, interaction.user.id)
    });
  }
}

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

export async function handleSubclassSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedSubclass = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    if (!state || !state.class) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    const role = getRoleFromClass(state.class);
    
    const updatedState = {
      ...state,
      subclass: selectedSubclass,
      role: role,
      step: 'ability_score'
    };
    
    stateManager.setRegistrationState(userId, updatedState);
    await showAbilityScoreSelection(interaction, userId, updatedState);
    
  } catch (error) {
    console.error('Error in handleSubclassSelection:', error);
    const userId = extractUserIdFromCustomId(interaction.customId);
    stateManager.clearRegistrationState(userId);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ...getEphemeralOptions(userId, interaction.user.id)
    });
  }
}

async function showAbilityScoreSelection(interaction, userId, state) {
  if (!state || !state.class || !state.subclass) {
    console.error('Invalid state in showAbilityScoreSelection:', state);
    return interaction.reply({
      content: '❌ Session data is incomplete. Please start over.',
      ...getEphemeralOptions(userId, interaction.user.id)
    });
  }

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
      { name: '🎭 Class', value: String(state.class), inline: true },
      { name: '🎯 Subclass', value: String(state.subclass), inline: true }
    )
    .setFooter({ text: '💪 Choose the range closest to your ability score' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleAbilityScoreSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedScore = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    stateManager.setRegistrationState(userId, {
      ...state,
      abilityScore: selectedScore,
      step: 'guild'
    });

    await showGuildSelection(interaction, userId, state);
    
  } catch (error) {
    console.error('Error in handleAbilityScoreSelection:', error);
    const userId = extractUserIdFromCustomId(interaction.customId);
    stateManager.clearRegistrationState(userId);
  }
}

async function showGuildSelection(interaction, userId, state) {
  const guilds = GAME_DATA.guilds;
  
  if (guilds.length === 0) {
    stateManager.setRegistrationState(userId, {
      ...state,
      guild: null
    });
    
    if (state.type === 'main') {
      await showTimezoneRegionSelection(interaction, userId, state);
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

export async function handleGuildSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedGuild = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    stateManager.setRegistrationState(userId, {
      ...state,
      guild: selectedGuild,
      step: 'timezone_or_ign'
    });

    if (state.type === 'main') {
      await showTimezoneRegionSelection(interaction, userId, state);
    } else {
      await showIGNModal(interaction, userId, state.type);
    }
    
  } catch (error) {
    console.error('Error in handleGuildSelection:', error);
    const userId = extractUserIdFromCustomId(interaction.customId);
    stateManager.clearRegistrationState(userId);
  }
}

async function showTimezoneRegionSelection(interaction, userId, state) {
  const regions = getTimezoneRegions();
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_timezone_region_${userId}`)
    .setPlaceholder('🌍 Select your region (or skip)')
    .addOptions(
      [
        {
          label: '⏭️ Skip Timezone',
          value: 'SKIP_TIMEZONE',
          description: 'Continue without setting a timezone'
        },
        ...regions.map(region => ({
          label: region,
          value: region,
          emoji: getRegionEmoji(region)
        }))
      ]
    );

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
    .setDescription('**Step 5 (Optional):** Select your timezone region\n\n💡 You can skip this step or select a region below.')
    .setFooter({ text: '🌍 Timezone helps coordinate with guild members' })
    .setTimestamp();
  
  if (state.class) {
    embed.addFields({ name: '🎭 Class', value: state.class, inline: true });
  }
  if (state.subclass) {
    embed.addFields({ name: '🎯 Subclass', value: state.subclass, inline: true });
  }

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleTimezoneRegionSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedRegion = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    if (selectedRegion === 'SKIP_TIMEZONE') {
      stateManager.setRegistrationState(userId, {
        ...state,
        timezone: null
      });
      
      await showIGNModal(interaction, userId, 'main');
      return;
    }

    const countries = getCountriesInRegion(selectedRegion);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_timezone_country_${userId}`)
      .setPlaceholder('🌍 Select your country')
      .addOptions(
        countries.map(country => ({
          label: country,
          value: country
        }))
      );

    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_timezone_region_${userId}`)
      .setLabel('Back to Regions')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️');

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('⭐ Register Main Character')
      .setDescription('**Step:** Select your country')
      .addFields(
        { name: '🌍 Region', value: selectedRegion, inline: true }
      )
      .setFooter({ text: '💡 Choose your country or go back' })
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [row1, row2] });
    
    stateManager.setRegistrationState(userId, {
      ...state,
      selectedRegion: selectedRegion
    });
    
  } catch (error) {
    console.error('Error in handleTimezoneRegionSelection:', error);
    const userId = extractUserIdFromCustomId(interaction.customId);
    stateManager.clearRegistrationState(userId);
  }
}

export async function handleTimezoneCountrySelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedCountry = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    const timezones = getTimezonesForCountry(selectedCountry);
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_timezone_${userId}`)
      .setPlaceholder('🕐 Select your timezone')
      .addOptions(
        timezones.map(tz => ({
          label: tz.label,
          value: tz.value,
          description: tz.utc
        }))
      );

    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_timezone_country_${userId}`)
      .setLabel('Back to Countries')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️');

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('⭐ Register Main Character')
      .setDescription('**Step:** Select your specific timezone')
      .addFields(
        { name: '🌍 Country', value: selectedCountry, inline: true }
      )
      .setFooter({ text: '💡 Choose your timezone or go back' })
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [row1, row2] });
    
    stateManager.setRegistrationState(userId, {
      ...state,
      selectedCountry: selectedCountry
    });
    
  } catch (error) {
    console.error('Error in handleTimezoneCountrySelection:', error);
    const userId = extractUserIdFromCustomId(interaction.customId);
    stateManager.clearRegistrationState(userId);
  }
}

export async function handleTimezoneSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedTimezone = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    stateManager.setRegistrationState(userId, {
      ...state,
      timezone: selectedTimezone
    });

    await showIGNModal(interaction, userId, 'main');
    
  } catch (error) {
    console.error('Error in handleTimezoneSelection:', error);
    const userId = extractUserIdFromCustomId(interaction.customId);
    stateManager.clearRegistrationState(userId);
  }
}

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

export async function handleIGNModal(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const state = stateManager.getRegistrationState(userId);
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        ...getEphemeralOptions(userId, interaction.user.id)
      });
    }

    const ign = interaction.fields.getTextInputValue('ign');
    const type = state.type;
    
    const targetUser = await interaction.client.users.fetch(userId);

    if (type === 'main') {
      await saveMainCharacter(interaction, userId, targetUser, state, ign);
    } else {
      await saveAltCharacter(interaction, userId, targetUser, state, ign);
    }
    
  } catch (error) {
    console.error('Error in handleIGNModal:', error);
    const userId = extractUserIdFromCustomId(interaction.customId);
    stateManager.clearRegistrationState(userId);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      ...getEphemeralOptions(userId, interaction.user.id)
    });
  }
}

async function saveMainCharacter(interaction, userId, targetUser, state, ign) {
  try {
    await interaction.deferReply({ ...getEphemeralOptions(userId, interaction.user.id) });

    const characterData = {
      discordId: userId,
      discordName: targetUser.tag,
      ign: ign,
      role: state.role,
      className: state.class,
      subclass: state.subclass,
      abilityScore: state.abilityScore ? parseInt(state.abilityScore) : null,
      guild: state.guild || null,
      characterType: 'main'
    };

    await queries.createCharacter(characterData);

    if (state.timezone) {
      await queries.setUserTimezone(userId, targetUser.tag, state.timezone);
    }

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Main Character Registered!')
      .setDescription(`Main character has been successfully registered for **${targetUser.tag}**.`)
      .addFields(
        { name: '🎮 IGN', value: ign, inline: true },
        { name: '🎭 Class', value: `${state.class} (${state.subclass})`, inline: true },
        { name: '⚔️ Role', value: state.role, inline: true }
      )
      .setFooter({ text: '💡 Returning to profile...' })
      .setTimestamp();

    if (state.guild) {
      embed.addFields({ name: '🏰 Guild', value: state.guild, inline: true });
    }

    if (state.abilityScore) {
      embed.addFields({ name: '💪 Ability Score', value: `~${parseInt(state.abilityScore).toLocaleString()}`, inline: true });
    }

    if (state.timezone) {
      embed.addFields({ name: '🌍 Timezone', value: state.timezone, inline: true });
    }

    await interaction.editReply({ embeds: [embed] });
    
    stateManager.clearRegistrationState(userId);
    
    setTimeout(async () => {
      try {
        if (state.isAdminEdit) {
          await returnToAdminMenu(interaction, userId, targetUser);
        } else {
          await returnToUserMenu(interaction, userId);
        }
      } catch (error) {
        console.error('Error returning to menu after main registration:', error);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error saving main character:', error);
    stateManager.clearRegistrationState(userId);
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Registration Failed')
      .setDescription('An error occurred while saving the main character.')
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
}

async function saveAltCharacter(interaction, userId, targetUser, state, ign) {
  try {
    await interaction.deferReply({ ...getEphemeralOptions(userId, interaction.user.id) });

    const altData = {
      discordId: userId,
      discordName: targetUser.tag,
      ign: ign,
      role: state.role,
      className: state.class,
      subclass: state.subclass,
      abilityScore: state.abilityScore ? parseInt(state.abilityScore) : null,
      guild: state.guild || null,
      characterType: 'alt'
    };

    await queries.createCharacter(altData);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Alt Character Added!')
      .setDescription(`Alt character has been successfully registered for **${targetUser.tag}**.`)
      .addFields(
        { name: '🎮 IGN', value: ign, inline: true },
        { name: '🎭 Class', value: `${state.class} (${state.subclass})`, inline: true },
        { name: '⚔️ Role', value: state.role, inline: true }
      )
      .setFooter({ text: '💡 Returning to profile...' })
      .setTimestamp();

    if (state.abilityScore) {
      embed.addFields({ name: '💪 Ability Score', value: `~${parseInt(state.abilityScore).toLocaleString()}`, inline: true });
    }

    if (state.guild) {
      embed.addFields({ name: '🏰 Guild', value: state.guild, inline: true });
    }

    await interaction.editReply({ embeds: [embed] });
    
    stateManager.clearRegistrationState(userId);
    
    setTimeout(async () => {
      try {
        if (state.isAdminEdit) {
          await returnToAdminMenu(interaction, userId, targetUser);
        } else {
          await returnToUserMenu(interaction, userId);
        }
      } catch (error) {
        console.error('Error returning to menu after alt registration:', error);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error saving alt character:', error);
    stateManager.clearRegistrationState(userId);
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Registration Failed')
      .setDescription('An error occurred while saving the alt character.')
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
}

async function returnToUserMenu(interaction, userId) {
  try {
    const mainChar = await queries.getMainCharacter(userId);
    const allCharacters = mainChar ? await queries.getAllCharactersWithSubclasses(userId) : [];
    const alts = allCharacters.filter(char => char.character_type === 'alt');
    const mainSubclasses = allCharacters.filter(char => char.character_type === 'main_subclass');
    const altSubclasses = allCharacters.filter(char => char.character_type === 'alt_subclass');
    const totalSubclasses = mainSubclasses.length + altSubclasses.length;
    const userTimezone = await queries.getUserTimezone(userId);

    const embed = buildCharacterProfileEmbed(interaction.user, mainChar, allCharacters, alts, mainSubclasses, userTimezone);
    
    const editMemberDetails = await import('../commands/edit-member-details.js');
    const components = editMemberDetails.default.buildButtonRows(mainChar, alts.length, totalSubclasses, userId);

    await interaction.followUp({ 
      embeds: [embed], 
      components,
      ...getEphemeralOptions(userId, interaction.user.id)
    });
  } catch (error) {
    console.error('Error in returnToUserMenu:', error);
  }
}

async function returnToAdminMenu(interaction, targetUserId, targetUser) {
  try {
    const allCharacters = await queries.getAllCharactersWithSubclasses(targetUserId);
    const userTimezone = await queries.getUserTimezone(targetUserId);

    const mainChar = allCharacters.find(c => c.character_type === 'main');
    const mainSubclasses = allCharacters.filter(c => c.character_type === 'main_subclass');
    const alts = allCharacters.filter(c => c.character_type === 'alt');
    const altSubclasses = allCharacters.filter(c => c.character_type === 'alt_subclass');
    const totalSubclasses = mainSubclasses.length + altSubclasses.length;

    const embed = buildCharacterProfileEmbed(targetUser, mainChar, allCharacters, alts, mainSubclasses, userTimezone);
    
    const editMemberDetails = await import('../commands/edit-member-details.js');
    const components = editMemberDetails.default.buildButtonRows(mainChar, alts.length, totalSubclasses, targetUserId);

    await interaction.followUp({ 
      embeds: [embed], 
      components,
      ...getEphemeralOptions(targetUserId, interaction.user.id)
    });
  } catch (error) {
    console.error('Error in returnToAdminMenu:', error);
  }
}

function buildCharacterProfileEmbed(user, mainChar, allCharacters, alts, mainSubclasses, userTimezone) {
  const embed = new EmbedBuilder()
    .setColor(mainChar ? '#6640D9' : '#5865F2')
    .setAuthor({ 
      name: `${user.tag}'s Character Profile`,
      iconURL: user.displayAvatarURL({ dynamic: true })
    })
    .setThumbnail(user.displayAvatarURL({ size: 512 }))
    .setFooter({ text: '💡 Click buttons below to manage your characters' })
    .setTimestamp();

  if (!mainChar) {
    embed.setDescription('**No main character registered yet.**');
    return embed;
  }

  let timezoneDisplay = '🌍 *No timezone set*';
  if (userTimezone?.timezone) {
    const timezoneOffsets = {
      'PST': -8, 'PDT': -7, 'MST': -7, 'MDT': -6, 'CST': -6, 'CDT': -5,
      'EST': -5, 'EDT': -4, 'AST': -4, 'ADT': -3, 'NST': -3.5, 'NDT': -2.5,
      'AKST': -9, 'AKDT': -8, 'HST': -10, 'UTC': 0, 'GMT': 0,
      'WET': 0, 'WEST': 1, 'CET': 1, 'CEST': 2, 'EET': 2, 'EEST': 3,
      'TRT': 3, 'MSK': 3, 'GST': 4, 'IST': 5.5, 'ICT': 7, 'WIB': 7,
      'SGT': 8, 'HKT': 8, 'PHT': 8, 'MYT': 8, 'JST': 9, 'KST': 9,
      'AEST': 10, 'AEDT': 11, 'AWST': 8, 'NZDT': 13, 'NZST': 12
    };
    
    const timezoneAbbreviations = {
      'America/New_York': 'EST', 'America/Chicago': 'CST', 'America/Denver': 'MST',
      'America/Los_Angeles': 'PST', 'America/Toronto': 'EST', 'Europe/London': 'GMT',
      'Europe/Paris': 'CET', 'Asia/Tokyo': 'JST', 'Asia/Seoul': 'KST',
      'Australia/Sydney': 'AEDT', 'Pacific/Auckland': 'NZDT'
    };
    
    const abbrev = timezoneAbbreviations[userTimezone.timezone] || userTimezone.timezone;
    const offset = timezoneOffsets[abbrev] || 0;
    
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    
    let localHours = utcHours + offset;
    if (localHours >= 24) localHours -= 24;
    if (localHours < 0) localHours += 24;
    
    const ampm = localHours >= 12 ? 'PM' : 'AM';
    const displayHours = localHours % 12 || 12;
    const minutes = utcMinutes.toString().padStart(2, '0');
    
    timezoneDisplay = `🌍 ${userTimezone.timezone} • ${displayHours}:${minutes} ${ampm}`;
  }
  
  embed.setDescription(`${timezoneDisplay}\n`);

  const mainRoleEmoji = getRoleEmoji(mainChar.role);
  const formattedAbilityScore = formatAbilityScore(mainChar.ability_score);
  
  embed.addFields({
    name: '⭐ **MAIN CHARACTER**',
    value: 
      '```ansi\n' +
      `✨ \u001b[1;36mIGN:\u001b[0m       ${mainChar.ign}\n` +
      `\n` +
      `🏰 \u001b[1;34mGuild:\u001b[0m     ${mainChar.guild || 'None'}\n` +
      `🎭 \u001b[1;33mClass:\u001b[0m     ${mainChar.class}\n` +
      `🎯 \u001b[1;35mSubclass:\u001b[0m  ${mainChar.subclass}\n` +
      `${mainRoleEmoji} \u001b[1;32mRole:\u001b[0m      ${mainChar.role}\n` +
      `\n` +
      `💪 \u001b[1;31mAbility Score:\u001b[0m ${formattedAbilityScore}\n` +
      '```',
    inline: false
  });

  if (mainSubclasses.length > 0) {
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const subclassText = mainSubclasses.map((sc, i) => {
      const numberEmoji = numberEmojis[i] || `${i + 1}.`;
      const scAbilityScore = formatAbilityScore(sc.ability_score);
      return '```ansi\n' + `${numberEmoji} ${sc.class} › ${sc.subclass} › ${sc.role}\n` +
             `   \u001b[1;31mAbility Score:\u001b[0m ${scAbilityScore}\n` + '```';
    }).join('');
    embed.addFields({ name: '📊 **Subclasses**', value: subclassText, inline: false });
  }

  if (alts && alts.length > 0) {
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const altsText = alts.map((alt, i) => {
      const numberEmoji = numberEmojis[i] || `${i + 1}.`;
      const altAbilityScore = formatAbilityScore(alt.ability_score);
      return '```ansi\n' +
             `${numberEmoji} \u001b[1;36mIGN:\u001b[0m ${alt.ign}  •  \u001b[1;34mGuild:\u001b[0m ${alt.guild || 'None'}\n` +
             `   ${alt.class} › ${alt.subclass} › ${alt.role}\n` +
             `   \u001b[1;31mAbility Score:\u001b[0m ${altAbilityScore}\n` + '```';
    }).join('');
    embed.addFields({ name: `📋 **Alt**`, value: altsText, inline: false });
  }

  embed.addFields({
    name: '\u200B',
    value: `**${allCharacters.length} character${allCharacters.length !== 1 ? 's' : ''} registered • Last updated** •`,
    inline: false
  });

  return embed;
}

function formatAbilityScore(score) {
  if (!score || score === '' || score === 0) return 'Not set';
  const numScore = parseInt(score);
  const scoreRanges = {
    10000: '≤10k', 11000: '10-12k', 13000: '12-14k', 15000: '14-16k', 17000: '16-18k',
    19000: '18-20k', 21000: '20-22k', 23000: '22-24k', 25000: '24-26k', 27000: '26-28k',
    29000: '28-30k', 31000: '30-32k', 33000: '32-34k', 35000: '34-36k', 37000: '36-38k',
    39000: '38-40k', 41000: '40-42k', 43000: '42-44k', 45000: '44-46k', 47000: '46-48k',
    49000: '48-50k', 51000: '50-52k', 53000: '52-54k', 55000: '54-56k', 57000: '56k+'
  };
  return scoreRanges[numScore] || `~${numScore.toLocaleString()}`;
}

function getRoleEmoji(role) {
  const emojis = { 'Tank': '🛡️', 'DPS': '⚔️', 'Support': '💚' };
  return emojis[role] || '⭐';
}

export async function handleBackToMenu(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  
  if (userId !== interaction.user.id) {
    const targetUser = await interaction.client.users.fetch(userId);
    await showAdminEditMenu(interaction, userId, targetUser);
    return;
  }
  
  const editMemberDetails = await import('../commands/edit-member-details.js');
  await editMemberDetails.default.showMainMenu(interaction, true);
}

export async function handleBackToClass(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  const state = stateManager.getRegistrationState(userId);
  
  if (!state) {
    return interaction.reply({
      content: '❌ Session expired. Please start over.',
      ...getEphemeralOptions(userId, interaction.user.id)
    });
  }

  await showClassSelection(interaction, userId, state.type);
}

export async function handleBackToSubclass(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  const state = stateManager.getRegistrationState(userId);
  
  if (!state || !state.class) {
    return interaction.reply({
      content: '❌ Session expired. Please start over.',
      ...getEphemeralOptions(userId, interaction.user.id)
    });
  }

  await showSubclassSelection(interaction, userId, state.type, state.class);
}

export async function handleBackToAbility(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  const state = stateManager.getRegistrationState(userId);
  
  if (!state) {
    return interaction.reply({
      content: '❌ Session expired. Please start over.',
      ...getEphemeralOptions(userId, interaction.user.id)
    });
  }

  await showAbilityScoreSelection(interaction, userId, state);
}

export async function handleBackToGuild(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  const state = stateManager.getRegistrationState(userId);
  
  if (!state) {
    return interaction.reply({
      content: '❌ Session expired. Please start over.',
      ...getEphemeralOptions(userId, interaction.user.id)
    });
  }

  await showGuildSelection(interaction, userId, state);
}

export async function handleBackToTimezoneRegion(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  const state = stateManager.getRegistrationState(userId);
  
  if (!state) {
    return interaction.reply({
      content: '❌ Session expired. Please start over.',
      ...getEphemeralOptions(userId, interaction.user.id)
    });
  }

  await showTimezoneRegionSelection(interaction, userId, state);
}

export async function handleBackToTimezoneCountry(interaction) {
  const userId = extractUserIdFromCustomId(interaction.customId);
  const state = stateManager.getRegistrationState(userId);
  
  if (!state || !state.selectedRegion) {
    return interaction.reply({
      content: '❌ Session expired. Please start over.',
      ...getEphemeralOptions(userId, interaction.user.id)
    });
  }

  const countries = getCountriesInRegion(state.selectedRegion);
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_timezone_country_${userId}`)
    .setPlaceholder('🌍 Select your country')
    .addOptions(
      countries.map(country => ({
        label: country,
        value: country
      }))
    );

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_timezone_region_${userId}`)
    .setLabel('Back to Regions')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('⭐ Register Main Character')
    .setDescription('**Step:** Select your country')
    .addFields(
      { name: '🌍 Region', value: state.selectedRegion, inline: true }
    )
    .setFooter({ text: '💡 Choose your country or go back' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

async function showAdminEditMenu(interaction, userId, targetUser) {
  const editMemberDetails = await import('../commands/edit-member-details.js');
  await editMemberDetails.default.showMainMenu(interaction, true);
}
