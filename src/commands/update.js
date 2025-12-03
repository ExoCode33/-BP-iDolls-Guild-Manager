import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { GAME_DATA, getRoleFromClass } from '../config/gameData.js';
import { queries } from '../database/queries.js';
import googleSheets from '../services/googleSheets.js';

export default {
  data: new SlashCommandBuilder()
    .setName('update')
    .setDescription('Update your main character information')
    .addStringOption(option =>
      option.setName('field')
        .setDescription('What do you want to update?')
        .setRequired(true)
        .addChoices(
          { name: 'Class/Subclass', value: 'class' },
          { name: 'Ability Score', value: 'ability_score' },
          { name: 'Guild', value: 'guild' },
          { name: 'Timezone', value: 'timezone' }
        )
    ),

  async execute(interaction) {
    try {
      const mainChar = await queries.getMainCharacter(interaction.user.id);
      
      if (!mainChar) {
        return interaction.reply({
          content: '❌ You need to register a main character first! Use `/register` to get started.',
          ephemeral: true
        });
      }

      const field = interaction.options.getString('field');

      // Initialize update state
      interaction.client.updateStates = interaction.client.updateStates || new Map();
      interaction.client.updateStates.set(interaction.user.id, {
        field,
        discordId: interaction.user.id,
        mainCharIGN: mainChar.ign,
        currentValue: mainChar
      });

      switch (field) {
        case 'class':
          await this.handleClassUpdate(interaction);
          break;
        case 'ability_score':
          await this.handleAbilityScoreUpdate(interaction);
          break;
        case 'guild':
          await this.handleGuildUpdate(interaction);
          break;
        case 'timezone':
          await this.handleTimezoneUpdate(interaction);
          break;
      }

    } catch (error) {
      console.error('Error in update command:', error);
      await interaction.reply({
        content: '❌ An error occurred. Please try again.',
        ephemeral: true
      });
    }
  },

  async handleClassUpdate(interaction) {
    const classMenu = new StringSelectMenuBuilder()
      .setCustomId('update_class_select')
      .setPlaceholder('Select your new class')
      .addOptions(
        Object.keys(GAME_DATA.classes).map(className => ({
          label: className,
          description: `Role: ${GAME_DATA.classes[className].role}`,
          value: className
        }))
      );

    const row = new ActionRowBuilder().addComponents(classMenu);

    await interaction.reply({
      content: '🔄 **Updating Class**\n\nSelect your new class:',
      components: [row],
      ephemeral: true
    });
  },

  async handleAbilityScoreUpdate(interaction) {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
    
    const modal = new ModalBuilder()
      .setCustomId('update_ability_score_modal')
      .setTitle('Update Ability Score');

    const abilityScoreInput = new TextInputBuilder()
      .setCustomId('ability_score_input')
      .setLabel('New Ability Score')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('e.g., 5000');

    const row = new ActionRowBuilder().addComponents(abilityScoreInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },

  async handleGuildUpdate(interaction) {
    const guildMenu = new StringSelectMenuBuilder()
      .setCustomId('update_guild_select')
      .setPlaceholder('Select your new guild')
      .addOptions(
        GAME_DATA.guilds.map(guild => ({
          label: guild,
          value: guild
        }))
      );

    const row = new ActionRowBuilder().addComponents(guildMenu);

    await interaction.reply({
      content: '🔄 **Updating Guild**\n\nSelect your new guild:',
      components: [row],
      ephemeral: true
    });
  },

  async handleTimezoneUpdate(interaction) {
    const timezoneMenu = new StringSelectMenuBuilder()
      .setCustomId('update_timezone_select')
      .setPlaceholder('Select your new timezone')
      .addOptions(
        GAME_DATA.timezones.map(tz => ({
          label: tz,
          value: tz
        }))
      );

    const row = new ActionRowBuilder().addComponents(timezoneMenu);

    await interaction.reply({
      content: '🔄 **Updating Timezone**\n\nSelect your new timezone:',
      components: [row],
      ephemeral: true
    });
  },

  async handleUpdateClassSelect(interaction) {
    try {
      const selectedClass = interaction.values[0];
      const state = interaction.client.updateStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Update session expired. Please use `/update` again.',
          components: []
        });
      }

      state.newClass = selectedClass;
      state.newRole = getRoleFromClass(selectedClass);

      const subclassMenu = new StringSelectMenuBuilder()
        .setCustomId('update_subclass_select')
        .setPlaceholder('Select your new subclass')
        .addOptions(
          GAME_DATA.classes[selectedClass].subclasses.map(subclass => ({
            label: subclass,
            value: subclass
          }))
        );

      const row = new ActionRowBuilder().addComponents(subclassMenu);

      await interaction.update({
        content: `✅ New Class: **${selectedClass}** (${state.newRole})\n\nSelect your new subclass:`,
        components: [row]
      });

    } catch (error) {
      console.error('Error handling update class selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleUpdateSubclassSelect(interaction) {
    try {
      const selectedSubclass = interaction.values[0];
      const state = interaction.client.updateStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Update session expired. Please use `/update` again.',
          components: []
        });
      }

      // Update character in database
      await queries.updateCharacter(state.discordId, state.mainCharIGN, {
        class: state.newClass,
        subclass: selectedSubclass,
        role: state.newRole
      });

      // Sync to Google Sheets
      try {
        const allCharacters = await queries.getAllCharacters();
        const allAlts = await queries.getAllAlts();
        await googleSheets.fullSync(allCharacters, allAlts);
      } catch (syncError) {
        console.error('Error syncing to Google Sheets:', syncError);
      }

      interaction.client.updateStates.delete(interaction.user.id);

      await interaction.update({
        content: `✅ **Character Updated!**\n\n` +
          `⚔️ **New Class:** ${state.newClass} (${selectedSubclass})\n` +
          `🛡️ **New Role:** ${state.newRole}`,
        components: []
      });

    } catch (error) {
      console.error('Error handling update subclass selection:', error);
      await interaction.update({
        content: '❌ An error occurred while updating. Please try again.',
        components: []
      });
    }
  },

  async handleUpdateGuildSelect(interaction) {
    try {
      const selectedGuild = interaction.values[0];
      const state = interaction.client.updateStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Update session expired. Please use `/update` again.',
          components: []
        });
      }

      await queries.updateCharacter(state.discordId, state.mainCharIGN, {
        guild: selectedGuild
      });

      // Sync to Google Sheets
      try {
        const allCharacters = await queries.getAllCharacters();
        const allAlts = await queries.getAllAlts();
        await googleSheets.fullSync(allCharacters, allAlts);
      } catch (syncError) {
        console.error('Error syncing to Google Sheets:', syncError);
      }

      interaction.client.updateStates.delete(interaction.user.id);

      await interaction.update({
        content: `✅ **Guild Updated!**\n\n🏰 **New Guild:** ${selectedGuild}`,
        components: []
      });

    } catch (error) {
      console.error('Error handling guild update:', error);
      await interaction.update({
        content: '❌ An error occurred while updating. Please try again.',
        components: []
      });
    }
  },

  async handleUpdateTimezoneSelect(interaction) {
    try {
      const selectedTimezone = interaction.values[0];
      const state = interaction.client.updateStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Update session expired. Please use `/update` again.',
          components: []
        });
      }

      await queries.updateCharacter(state.discordId, state.mainCharIGN, {
        timezone: selectedTimezone
      });

      // Sync to Google Sheets
      try {
        const allCharacters = await queries.getAllCharacters();
        const allAlts = await queries.getAllAlts();
        await googleSheets.fullSync(allCharacters, allAlts);
      } catch (syncError) {
        console.error('Error syncing to Google Sheets:', syncError);
      }

      interaction.client.updateStates.delete(interaction.user.id);

      await interaction.update({
        content: `✅ **Timezone Updated!**\n\n🌍 **New Timezone:** ${selectedTimezone}`,
        components: []
      });

    } catch (error) {
      console.error('Error handling timezone update:', error);
      await interaction.update({
        content: '❌ An error occurred while updating. Please try again.',
        components: []
      });
    }
  },

  async handleAbilityScoreModalSubmit(interaction) {
    try {
      const state = interaction.client.updateStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.reply({
          content: '❌ Update session expired. Please use `/update` again.',
          ephemeral: true
        });
      }

      const abilityScoreStr = interaction.fields.getTextInputValue('ability_score_input');
      const abilityScore = parseInt(abilityScoreStr);

      if (isNaN(abilityScore)) {
        return interaction.reply({
          content: '❌ Please enter a valid number for ability score.',
          ephemeral: true
        });
      }

      await queries.updateCharacter(state.discordId, state.mainCharIGN, {
        ability_score: abilityScore
      });

      // Sync to Google Sheets
      try {
        const allCharacters = await queries.getAllCharacters();
        const allAlts = await queries.getAllAlts();
        await googleSheets.fullSync(allCharacters, allAlts);
      } catch (syncError) {
        console.error('Error syncing to Google Sheets:', syncError);
      }

      interaction.client.updateStates.delete(interaction.user.id);

      await interaction.reply({
        content: `✅ **Ability Score Updated!**\n\n💪 **New Ability Score:** ${abilityScore}`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error handling ability score update:', error);
      await interaction.reply({
        content: '❌ An error occurred while updating. Please try again.',
        ephemeral: true
      });
    }
  }
};
