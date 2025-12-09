import { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { GAME_DATA, getRoleFromClass, getSubclassesForClass } from '../config/gameData.js';
import { queries } from '../database/queries.js';
import stateManager from '../utils/stateManager.js';

// ✅ Extract userId from button customId
function extractUserIdFromCustomId(customId) {
  const parts = customId.split('_');
  return parts[parts.length - 1];
}

// ==================== ADD SUBCLASS TO MAIN ====================

export async function handleAddSubclassToMain(interaction) {
  try {
    // ✅ CRITICAL FIX: Extract userId from button customId
    const userId = extractUserIdFromCustomId(interaction.customId);
    
    // Check if they have a main character
    const mainChar = await queries.getMainCharacter(userId);
    if (!mainChar) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Main Character')
        .setDescription('This user needs a main character before adding subclasses!')
        .setTimestamp();
      
      // ✅ Use update for button interactions
      return interaction.update({ embeds: [embed], components: [] });
    }

    // Initialize state for subclass
    stateManager.setRegistrationState(userId, {
      type: 'subclass',
      characterType: 'main_subclass',
      parentCharacterId: mainChar.id,
      parentIGN: mainChar.ign,
      parentGuild: mainChar.guild,
      step: 'class',
      isAdminEdit: userId !== interaction.user.id
    });

    // Show class selection
    await showSubclassClassSelection(interaction, userId, 'main', mainChar.ign);
    
  } catch (error) {
    console.error('Error in handleAddSubclassToMain:', error);
    
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

// ==================== ADD SUBCLASS TO ALT ====================

export async function handleAddSubclassToAlt(interaction) {
  try {
    // ✅ CRITICAL FIX: Extract userId from button customId
    const userId = extractUserIdFromCustomId(interaction.customId);
    
    // Get all alts
    const alts = await queries.getAltCharacters(userId);
    if (alts.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Alt Characters')
        .setDescription('This user needs at least one alt character before adding subclasses to it!')
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (alts.length === 1) {
      // Only one alt, skip selection
      const alt = alts[0];
      
      stateManager.setRegistrationState(userId, {
        type: 'subclass',
        characterType: 'alt_subclass',
        parentCharacterId: alt.id,
        parentIGN: alt.ign,
        parentGuild: alt.guild,
        step: 'class',
        isAdminEdit: userId !== interaction.user.id
      });

      await showSubclassClassSelection(interaction, userId, 'alt', alt.ign);
    } else {
      // Multiple alts, show selection menu
      await showAltSelectionForSubclass(interaction, userId, alts);
    }
    
  } catch (error) {
    console.error('Error in handleAddSubclassToAlt:', error);
    await interaction.reply({
      content: '❌ An error occurred. Please try again.',
      flags: 64
    });
  }
}

// ==================== ALT SELECTION FOR SUBCLASS ====================

async function showAltSelectionForSubclass(interaction, userId, alts) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_alt_for_subclass_${userId}`)
    .setPlaceholder('📋 Select which alt to add subclass to')
    .addOptions(
      alts.map((alt, index) => ({
        label: `${alt.ign} (${alt.class})`,
        value: alt.id.toString(),
        description: `AS: ${alt.ability_score?.toLocaleString() || 'N/A'}`
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
    .setTitle('📌 Add Subclass to Alt')
    .setDescription('**Step 1:** Select which alt character to add a subclass to')
    .setFooter({ text: '💡 Choose the alt you want to add a subclass for' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

// ==================== ALT SELECTION HANDLER ====================

export async function handleAltSelectionForSubclass(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedAltId = parseInt(interaction.values[0]);
    
    // Get the selected alt
    const alts = await queries.getAltCharacters(userId);
    const selectedAlt = alts.find(alt => alt.id === selectedAltId);
    
    if (!selectedAlt) {
      return interaction.reply({
        content: '❌ Alt character not found. Please try again.',
        flags: 64
      });
    }

    // Initialize state for subclass
    stateManager.setRegistrationState(userId, {
      type: 'subclass',
      characterType: 'alt_subclass',
      parentCharacterId: selectedAlt.id,
      parentIGN: selectedAlt.ign,
      parentGuild: selectedAlt.guild,
      step: 'class',
      isAdminEdit: userId !== interaction.user.id
    });

    // Show class selection
    await showSubclassClassSelection(interaction, userId, 'alt', selectedAlt.ign);
    
  } catch (error) {
    console.error('Error in handleAltSelectionForSubclass:', error);
    stateManager.clearRegistrationState(extractUserIdFromCustomId(interaction.customId));
  }
}

// ==================== SUBCLASS CLASS SELECTION ====================

async function showSubclassClassSelection(interaction, userId, parentType, parentIGN) {
  const classes = Object.keys(GAME_DATA.classes);
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_subclass_class_${userId}`)
    .setPlaceholder('🎭 Choose subclass class')
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
    .setTitle(`📌 Add Subclass to ${parentType === 'main' ? 'Main' : 'Alt'}`)
    .setDescription(`**Step ${parentType === 'alt' ? '2' : '1'}:** Select the class for this subclass`)
    .addFields({
      name: '🎮 Parent Character',
      value: String(parentIGN),
      inline: true
    })
    .setFooter({ text: '💡 This subclass will be under ' + parentIGN })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

// ==================== SUBCLASS CLASS HANDLER ====================

export async function handleSubclassClassSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedClass = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    console.log('📊 [DEBUG] handleSubclassClassSelection - state:', JSON.stringify(state));
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        flags: 64
      });
    }

    // Update state
    stateManager.setRegistrationState(userId, {
      ...state,
      class: selectedClass,
      step: 'subclass'
    });

    // Show subclass selection
    await showSubclassSubclassSelection(interaction, userId, state, selectedClass);
    
  } catch (error) {
    console.error('Error in handleSubclassClassSelection:', error);
    stateManager.clearRegistrationState(extractUserIdFromCustomId(interaction.customId));
  }
}

// ==================== SUBCLASS SUBCLASS SELECTION ====================

async function showSubclassSubclassSelection(interaction, userId, state, selectedClass) {
  const subclasses = getSubclassesForClass(selectedClass);
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_subclass_subclass_${userId}`)
    .setPlaceholder('🎯 Choose subclass specialization')
    .addOptions(
      subclasses.map(subclass => ({
        label: subclass,
        value: subclass
      }))
    );

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_subclass_class_${userId}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const parentType = state.characterType === 'main_subclass' ? 'Main' : 'Alt';

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle(`📌 Add Subclass to ${parentType}`)
    .setDescription(`**Step ${parentType === 'Alt' ? '3' : '2'}:** Select the subclass specialization`)
    .addFields(
      { name: '🎮 Parent Character', value: String(state.parentIGN), inline: true },
      { name: '🎭 Class', value: String(selectedClass), inline: true }
    )
    .setFooter({ text: '💡 Choose your specialization' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

// ==================== SUBCLASS SUBCLASS HANDLER ====================

export async function handleSubclassSubclassSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedSubclass = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    console.log('📊 [DEBUG] handleSubclassSubclassSelection - state:', JSON.stringify(state));
    console.log('📊 [DEBUG] handleSubclassSubclassSelection - selectedSubclass:', selectedSubclass);
    
    if (!state || !state.class) {
      console.log('❌ [DEBUG] State validation failed in handleSubclassSubclassSelection');
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        flags: 64
      });
    }

    const role = getRoleFromClass(state.class);
    
    // Update state with new values
    const updatedState = {
      ...state,
      subclass: selectedSubclass,
      role: role,
      step: 'ability_score'
    };
    
    console.log('📊 [DEBUG] handleSubclassSubclassSelection - updatedState:', JSON.stringify(updatedState));
    
    stateManager.setRegistrationState(userId, updatedState);

    // Show ability score selection with updated state
    await showSubclassAbilityScoreSelection(interaction, userId, updatedState);
    
  } catch (error) {
    console.error('Error in handleSubclassSubclassSelection:', error);
    stateManager.clearRegistrationState(extractUserIdFromCustomId(interaction.customId));
  }
}

// ==================== SUBCLASS ABILITY SCORE SELECTION ====================

async function showSubclassAbilityScoreSelection(interaction, userId, state) {
  // Validate state has required fields
  if (!state || !state.class || !state.subclass) {
    console.error('❌ Invalid state in showSubclassAbilityScoreSelection:', state);
    return interaction.reply({
      content: '❌ Session data is incomplete. Please start over.',
      flags: 64
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
    .setCustomId(`select_subclass_ability_score_${userId}`)
    .setPlaceholder('💪 Select ability score range')
    .addOptions(abilityScoreRanges);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_subclass_subclass_${userId}`)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  const parentType = state.characterType === 'main_subclass' ? 'Main' : 'Alt';

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle(`📌 Add Subclass to ${parentType}`)
    .setDescription(`**Step ${parentType === 'Alt' ? '4' : '3'}:** Select ability score for this subclass`)
    .addFields(
      { name: '🎮 Parent Character', value: String(state.parentIGN), inline: true },
      { name: '🎭 Class', value: String(state.class), inline: true },
      { name: '🎯 Subclass', value: String(state.subclass), inline: true }
    )
    .setFooter({ text: '💪 Choose the range closest to this subclass\'s ability score' })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

// ==================== SUBCLASS ABILITY SCORE HANDLER ====================

export async function handleSubclassAbilityScoreSelection(interaction) {
  try {
    const userId = extractUserIdFromCustomId(interaction.customId);
    const selectedScore = interaction.values[0];
    const state = stateManager.getRegistrationState(userId);
    
    console.log('📊 [DEBUG] handleSubclassAbilityScoreSelection - state:', JSON.stringify(state));
    
    if (!state) {
      return interaction.reply({
        content: '❌ Session expired. Please start over.',
        flags: 64
      });
    }

    // Save the subclass
    await saveSubclass(interaction, userId, state, selectedScore);
    
  } catch (error) {
    console.error('Error in handleSubclassAbilityScoreSelection:', error);
    stateManager.clearRegistrationState(extractUserIdFromCustomId(interaction.customId));
  }
}

// ==================== SAVE SUBCLASS ====================

async function saveSubclass(interaction, userId, state, abilityScore) {
  try {
    await interaction.deferReply({ flags: 64 });

    // ✅ CRITICAL: Get the target user to save with correct discord_id
    const targetUser = await interaction.client.users.fetch(userId);

    // Create subclass
    const subclassData = {
      discordId: userId, // ✅ Use extracted userId
      discordName: targetUser.tag, // ✅ Use target user's tag
      parentCharacterId: state.parentCharacterId,
      className: state.class,
      subclass: state.subclass,
      role: state.role,
      abilityScore: parseInt(abilityScore),
      subclassType: state.characterType  // 'main_subclass' or 'alt_subclass'
    };

    console.log('📊 [DEBUG] saveSubclass - subclassData:', JSON.stringify(subclassData));

    await queries.createSubclass(subclassData);

    const parentType = state.characterType === 'main_subclass' ? 'Main' : 'Alt';

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Subclass Added!')
      .setDescription(`Subclass has been successfully added to the ${parentType.toLowerCase()} character for **${targetUser.tag}**.`)
      .addFields(
        { name: '🎮 Parent Character', value: String(state.parentIGN), inline: true },
        { name: '🎭 Class', value: `${state.class} (${state.subclass})`, inline: true },
        { name: '💪 Ability Score', value: formatAbilityScore(parseInt(abilityScore)), inline: true }
      )
      .setFooter({ text: '💡 Returning to profile...' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
    
    // Clear state
    stateManager.clearRegistrationState(userId);
    
    // ✅ Wait 2 seconds, then show the menu while keeping the success message visible
    setTimeout(async () => {
      try {
        if (state.isAdminEdit) {
          await returnToAdminMenu(interaction, userId, targetUser);
        } else {
          await returnToUserMenu(interaction, userId);
        }
      } catch (error) {
        console.error('Error returning to menu after subclass registration:', error);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error saving subclass:', error);
    stateManager.clearRegistrationState(userId);
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ Failed to Add Subclass')
      .setDescription('An error occurred while adding the subclass.')
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  }
}

// ==================== MENU RETURN HELPERS ====================

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
    // ✅ Fixed: Pass counts, not arrays, and include subclass count
    const components = editMemberDetails.default.buildButtonRows(mainChar, alts.length, totalSubclasses, userId);

    const shouldBePrivate = process.env.EDIT_MEMBER_DETAILS_EPHEMERAL !== 'false';
    const replyOptions = { embeds: [embed], components };
    if (shouldBePrivate) {
      replyOptions.flags = 64;
    }

    await interaction.followUp(replyOptions);
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
    const altSubclasses = allCharacters.filter(c => c.character_type === 'alt_subclass');
    const totalSubclasses = mainSubclasses.length + altSubclasses.length;
    const alts = allCharacters.filter(c => c.character_type === 'alt');

    const embed = buildCharacterProfileEmbed(targetUser, mainChar, allCharacters, alts, mainSubclasses, userTimezone);
    
    const editMemberDetails = await import('../commands/edit-member-details.js');
    // ✅ Fixed: Pass counts, not arrays, and include subclass count
    const components = editMemberDetails.default.buildButtonRows(mainChar, alts.length, totalSubclasses, targetUserId);

    const shouldBePrivate = process.env.ADMIN_EPHEMERAL !== 'false';
    const replyOptions = { embeds: [embed], components };
    if (shouldBePrivate) {
      replyOptions.flags = 64;
    }

    await interaction.followUp(replyOptions);
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

// ==================== UTILITY FUNCTIONS ====================

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
