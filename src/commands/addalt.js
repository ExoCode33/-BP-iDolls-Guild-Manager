import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { GAME_DATA, getRoleFromClass } from '../config/gameData.js';
import { queries } from '../database/queries.js';
import googleSheets from '../services/googleSheets.js';

export default {
  data: new SlashCommandBuilder()
    .setName('addalt')
    .setDescription('Register an alt character'),

  async execute(interaction) {
    try {
      // Check if user has a main character
      const mainChar = await queries.getMainCharacter(interaction.user.id);
      
      if (!mainChar) {
        return interaction.reply({
          content: '⚠️ You need to register a main character first! Use `/register` to get started.',
          ephemeral: true
        });
      }

      // Show class selection menu
      const classMenu = new StringSelectMenuBuilder()
        .setCustomId('alt_class_select')
        .setPlaceholder('Select alt class')
        .addOptions(
          Object.keys(GAME_DATA.classes).map(className => ({
            label: className,
            description: `Role: ${GAME_DATA.classes[className].role}`,
            value: className
          }))
        );

      const row = new ActionRowBuilder().addComponents(classMenu);

      await interaction.reply({
        content: '🎮 **Alt Character Registration**\n\nStep 1: Select your alt\'s class',
        components: [row],
        ephemeral: true
      });

      // Store alt registration state
      interaction.client.altRegistrationStates = interaction.client.altRegistrationStates || new Map();
      interaction.client.altRegistrationStates.set(interaction.user.id, {
        step: 'class_selected',
        discordId: interaction.user.id,
        mainCharacterId: mainChar.id
      });

    } catch (error) {
      console.error('Error in addalt command:', error);
      await interaction.reply({
        content: '❌ An error occurred. Please try again.',
        ephemeral: true
      });
    }
  },

  async handleAltClassSelect(interaction) {
    try {
      const selectedClass = interaction.values[0];
      const state = interaction.client.altRegistrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/addalt` again.',
          components: []
        });
      }

      state.className = selectedClass;
      state.role = getRoleFromClass(selectedClass);

      // Show subclass selection
      const subclassMenu = new StringSelectMenuBuilder()
        .setCustomId('alt_subclass_select')
        .setPlaceholder('Select alt subclass')
        .addOptions(
          GAME_DATA.classes[selectedClass].subclasses.map(subclass => ({
            label: subclass,
            value: subclass
          }))
        );

      const row = new ActionRowBuilder().addComponents(subclassMenu);

      await interaction.update({
        content: `✅ Class: **${selectedClass}** (${state.role})\n\nStep 2: Select your alt's subclass`,
        components: [row]
      });

    } catch (error) {
      console.error('Error handling alt class selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleAltSubclassSelect(interaction) {
    try {
      const selectedSubclass = interaction.values[0];
      const state = interaction.client.altRegistrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/addalt` again.',
          components: []
        });
      }

      state.subclass = selectedSubclass;

      // Show modal for alt IGN
      const modal = new ModalBuilder()
        .setCustomId('alt_register_modal')
        .setTitle('Alt Character IGN');

      const ignInput = new TextInputBuilder()
        .setCustomId('alt_ign_input')
        .setLabel('Alt In-Game Name (IGN)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

      const ignRow = new ActionRowBuilder().addComponents(ignInput);
      modal.addComponents(ignRow);

      await interaction.showModal(modal);

    } catch (error) {
      console.error('Error handling alt subclass selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleAltModalSubmit(interaction) {
    try {
      const state = interaction.client.altRegistrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.reply({
          content: '❌ Registration session expired. Please use `/addalt` again.',
          ephemeral: true
        });
      }

      const ign = interaction.fields.getTextInputValue('alt_ign_input');

      // Save alt to database
      const altCharacter = await queries.createAltCharacter({
        discordId: state.discordId,
        mainCharacterId: state.mainCharacterId,
        ign,
        role: state.role,
        className: state.className,
        subclass: state.subclass
      });

      // Sync to Google Sheets
      try {
        const allCharacters = await queries.getAllCharacters();
        const allAlts = await queries.getAllAlts();
        await googleSheets.fullSync(allCharacters, allAlts);
      } catch (syncError) {
        console.error('Error syncing to Google Sheets:', syncError);
      }

      // Clean up registration state
      interaction.client.altRegistrationStates.delete(interaction.user.id);

      await interaction.reply({
        content: `✅ **Alt Character Added!**\n\n` +
          `🎮 **IGN:** ${ign}\n` +
          `⚔️ **Class:** ${state.className} (${state.subclass})\n` +
          `🛡️ **Role:** ${state.role}\n\n` +
          `Use \`/addalt\` to add more alts or \`/viewchar\` to see all your characters.`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error handling alt modal submission:', error);
      
      if (error.message && error.message.includes('duplicate')) {
        await interaction.reply({
          content: '❌ You already have an alt with this IGN. Please use a different name.',
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: '❌ An error occurred while saving your alt character. Please try again.',
          ephemeral: true
        });
      }
    }
  }
};
