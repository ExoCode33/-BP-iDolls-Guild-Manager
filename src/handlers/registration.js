import { ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } from 'discord.js';
import { gameData, getClassEmoji, getSubclassesForClass, getRoleFromClass } from '../utils/gameData.js';
import db from '../services/database.js';
import sheetsService from '../services/sheets.js';
import stateManager from '../utils/stateManager.js';
import logger from '../utils/logger.js';
import config from '../utils/config.js';

export async function startRegistrationFlow(interaction, userId) {
  const state = stateManager.getRegistrationState(userId);
  if (!state) stateManager.setRegistrationState(userId, { step: 'class', type: 'main', characterType: 'main' });
  await showClassSelection(interaction, userId);
}

async function showClassSelection(interaction, userId) {
  const classes = Object.keys(gameData.classes);
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_class_${userId}`)
    .setPlaceholder('🎭 Choose your class')
    .addOptions(classes.map(className => ({ label: className, value: className, emoji: getClassEmoji(className), description: `${gameData.classes[className].role}` })));

  const row = new ActionRowBuilder().addComponents(selectMenu);
  const embed = new EmbedBuilder().setColor('#6640D9').setTitle('📝 Character Registration - Step 1').setDescription('Select your class:').setTimestamp();

  if (interaction.deferred || interaction.replied) await interaction.editReply({ embeds: [embed], components: [row] });
  else await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

export async function handleClassSelect(interaction, userId) {
  const selectedClass = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  if (!state) return await interaction.reply({ content: '❌ Session expired.', ephemeral: true });

  state.class = selectedClass;
  state.role = getRoleFromClass(selectedClass);
  state.step = 'subclass';
  stateManager.setRegistrationState(userId, state);

  const subclasses = getSubclassesForClass(selectedClass);
  const selectMenu = new StringSelectMenuBuilder().setCustomId(`select_subclass_${userId}`).setPlaceholder('📊 Choose your subclass').addOptions(subclasses.map(subclass => ({ label: subclass, value: subclass })));
  const row = new ActionRowBuilder().addComponents(selectMenu);
  const embed = new EmbedBuilder().setColor('#6640D9').setTitle('📝 Character Registration - Step 2').setDescription(`**Class:** ${selectedClass}\n\nSelect your subclass:`).setTimestamp();
  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleSubclassSelect(interaction, userId) {
  const selectedSubclass = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  if (!state) return await interaction.reply({ content: '❌ Session expired.', ephemeral: true });

  state.subclass = selectedSubclass;
  state.step = 'ability_score';
  stateManager.setRegistrationState(userId, state);

  const selectMenu = new StringSelectMenuBuilder().setCustomId(`select_ability_score_${userId}`).setPlaceholder('💪 Choose your ability score range').addOptions(gameData.abilityScores.map(score => ({ label: score.label, value: score.value })));
  const row = new ActionRowBuilder().addComponents(selectMenu);
  const embed = new EmbedBuilder().setColor('#6640D9').setTitle('📝 Character Registration - Step 3').setDescription(`**Class:** ${state.class}\n**Subclass:** ${selectedSubclass}\n\nSelect your ability score:`).setTimestamp();
  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleAbilityScoreSelect(interaction, userId) {
  const selectedScore = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  if (!state) return await interaction.reply({ content: '❌ Session expired.', ephemeral: true });

  state.abilityScore = selectedScore;
  state.step = 'guild';
  stateManager.setRegistrationState(userId, state);

  const selectMenu = new StringSelectMenuBuilder().setCustomId(`select_guild_${userId}`).setPlaceholder('🏰 Choose your guild').addOptions(config.guilds.map(guild => ({ label: guild.name, value: guild.name })));
  const row = new ActionRowBuilder().addComponents(selectMenu);
  const embed = new EmbedBuilder().setColor('#6640D9').setTitle('📝 Character Registration - Step 4').setDescription(`**Class:** ${state.class}\n**Subclass:** ${state.subclass}\n**Ability Score:** ${selectedScore}\n\nSelect your guild:`).setTimestamp();
  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleGuildSelect(interaction, userId) {
  const selectedGuild = interaction.values[0];
  const state = stateManager.getRegistrationState(userId);
  if (!state) return await interaction.reply({ content: '❌ Session expired.', ephemeral: true });

  state.guild = selectedGuild;
  state.step = 'ign';
  stateManager.setRegistrationState(userId, state);

  const modal = new ModalBuilder().setCustomId(`ign_modal_${userId}`).setTitle('Enter In-Game Name');
  const ignInput = new TextInputBuilder().setCustomId('ign_input').setLabel('In-Game Name (IGN)').setStyle(TextInputStyle.Short).setPlaceholder('Enter your IGN').setRequired(true).setMaxLength(50);
  const row = new ActionRowBuilder().addComponents(ignInput);
  modal.addComponents(row);
  await interaction.showModal(modal);
}

export async function handleIGNModal(interaction, userId) {
  const ign = interaction.fields.getTextInputValue('ign_input');
  const state = stateManager.getRegistrationState(userId);
  if (!state) return await interaction.reply({ content: '❌ Session expired.', ephemeral: true });

  await interaction.deferReply({ ephemeral: true });

  try {
    const characterData = {
      userId, ign,
      class: state.class,
      subclass: state.subclass,
      abilityScore: state.abilityScore,
      guild: state.guild,
      role: state.role,
      characterType: state.characterType || 'main',
      parentCharacterId: state.parentId || null
    };

    await db.createCharacter(characterData);
    const allChars = await db.getAllCharacters();
    await sheetsService.syncAllCharacters(allChars);

    const embed = new EmbedBuilder().setColor('#00FF00').setTitle('✅ Registration Complete!').setDescription(`**IGN:** ${ign}\n**Class:** ${state.class}\n**Subclass:** ${state.subclass}\n**Guild:** ${state.guild}`).setFooter({ text: 'Returning to profile...' }).setTimestamp();
    await interaction.editReply({ embeds: [embed], components: [] });
    stateManager.clearRegistrationState(userId);
    logger.success(`Character registered for user ${userId}`);
    logger.logAction(userId, 'Registered character', `${ign} - ${state.class}`);

    setTimeout(async () => {
      try {
        const { buildCharacterProfileEmbed } = await import('../components/embeds/characterProfile.js');
        const { buildCharacterButtons } = await import('../components/buttons/characterButtons.js');
        
        const characters = await db.getAllCharactersWithSubclasses(userId);
        const mainChar = characters.find(c => c.character_type === 'main');
        const alts = characters.filter(c => c.character_type === 'alt');
        const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
        
        const targetUser = await interaction.client.users.fetch(userId);
        const embed = await buildCharacterProfileEmbed(targetUser, characters);
        const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, userId);
        
        await interaction.followUp({ embeds: [embed], components: buttons, ephemeral: true });
      } catch (error) {
        logger.error(`Failed to return to profile: ${error.message}`);
      }
    }, 2000);
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    await interaction.editReply({ content: '❌ An error occurred.', ephemeral: true });
  }
}

export async function handleRegisterMain(interaction, userId) {
  const mainChar = await db.getMainCharacter(userId);
  if (mainChar) return await interaction.reply({ content: '⚠️ You already have a main character! Use `/edit-user` to manage it.', ephemeral: true });
  stateManager.setRegistrationState(userId, { step: 'class', type: 'main', characterType: 'main' });
  await startRegistrationFlow(interaction, userId);
}
