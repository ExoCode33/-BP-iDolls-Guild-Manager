import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { GAME_DATA, getRoleFromClass } from '../config/gameData.js';
import { queries } from '../database/queries.js';
import googleSheets from '../services/googleSheets.js';

export default {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register your main character'),

  async execute(interaction) {
    try {
      // Check if user already has a main character
      const existingChar = await queries.getMainCharacter(interaction.user.id);
      
      if (existingChar) {
        return interaction.reply({
          content: '⚠️ You already have a main character registered! Use `/update` to modify your character or `/viewchar` to see your current registration.',
          ephemeral: true
        });
      }

      // Show class selection menu
      const classMenu = new StringSelectMenuBuilder()
        .setCustomId('class_select')
        .setPlaceholder('Select your main class')
        .addOptions(
          Object.keys(GAME_DATA.classes).map(className => ({
            label: className,
            description: `Role: ${GAME_DATA.classes[className].role}`,
            value: className
          }))
        );

      const row = new ActionRowBuilder().addComponents(classMenu);

      await interaction.reply({
        content: '🎮 **Character Registration**\n\nStep 1: Select your main class',
        components: [row],
        ephemeral: true
      });

      // Store registration state
      interaction.client.registrationStates = interaction.client.registrationStates || new Map();
      interaction.client.registrationStates.set(interaction.user.id, {
        step: 'class_selected',
        discordId: interaction.user.id,
        discordName: interaction.user.tag
      });

    } catch (error) {
      console.error('Error in register command:', error);
      await interaction.reply({
        content: '❌ An error occurred during registration. Please try again.',
        ephemeral: true
      });
    }
  },

  async handleClassSelect(interaction) {
    try {
      const selectedClass = interaction.values[0];
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/register` again.',
          components: []
        });
      }

      state.className = selectedClass;
      state.role = getRoleFromClass(selectedClass);

      // Show subclass selection
      const subclassMenu = new StringSelectMenuBuilder()
        .setCustomId('subclass_select')
        .setPlaceholder('Select your subclass')
        .addOptions(
          GAME_DATA.classes[selectedClass].subclasses.map(subclass => ({
            label: subclass,
            value: subclass
          }))
        );

      const row = new ActionRowBuilder().addComponents(subclassMenu);

      await interaction.update({
        content: `✅ Class: **${selectedClass}** (${state.role})\n\nStep 2: Select your subclass`,
        components: [row]
      });

    } catch (error) {
      console.error('Error handling class selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleSubclassSelect(interaction) {
    try {
      const selectedSubclass = interaction.values[0];
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/register` again.',
          components: []
        });
      }

      state.subclass = selectedSubclass;

      // Show guild selection
      const guildMenu = new StringSelectMenuBuilder()
        .setCustomId('guild_select')
        .setPlaceholder('Select your guild')
        .addOptions(
          GAME_DATA.guilds.map(guild => ({
            label: guild,
            value: guild
          }))
        );

      const row = new ActionRowBuilder().addComponents(guildMenu);

      await interaction.update({
        content: `✅ Class: **${state.className}** (${state.role})\n✅ Subclass: **${selectedSubclass}**\n\nStep 3: Select your guild`,
        components: [row]
      });

    } catch (error) {
      console.error('Error handling subclass selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleGuildSelect(interaction) {
    try {
      const selectedGuild = interaction.values[0];
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/register` again.',
          components: []
        });
      }

      state.guild = selectedGuild;

      // Show timezone selection
      const timezoneMenu = new StringSelectMenuBuilder()
        .setCustomId('timezone_select')
        .setPlaceholder('Select your timezone')
        .addOptions(
          GAME_DATA.timezones.map(tz => ({
            label: tz,
            value: tz
          }))
        );

      const row = new ActionRowBuilder().addComponents(timezoneMenu);

      await interaction.update({
        content: `✅ Class: **${state.className}** (${state.role})\n✅ Subclass: **${state.subclass}**\n✅ Guild: **${selectedGuild}**\n\nStep 4: Select your timezone`,
        components: [row]
      });

    } catch (error) {
      console.error('Error handling guild selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleTimezoneSelect(interaction) {
    try {
      const selectedTimezone = interaction.values[0];
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/register` again.',
          components: []
        });
      }

      state.timezone = selectedTimezone;

      // Show modal for IGN and Ability Score
      const modal = new ModalBuilder()
        .setCustomId('register_modal')
        .setTitle('Final Registration Details');

      const ignInput = new TextInputBuilder()
        .setCustomId('ign_input')
        .setLabel('In-Game Name (IGN)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

      const abilityScoreInput = new TextInputBuilder()
        .setCustomId('ability_score_input')
        .setLabel('Ability Score (Total CP/GS)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('e.g., 5000');

      const ignRow = new ActionRowBuilder().addComponents(ignInput);
      const abilityRow = new ActionRowBuilder().addComponents(abilityScoreInput);

      modal.addComponents(ignRow, abilityRow);

      await interaction.showModal(modal);

    } catch (error) {
      console.error('Error handling timezone selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleModalSubmit(interaction) {
    try {
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.reply({
          content: '❌ Registration session expired. Please use `/register` again.',
          ephemeral: true
        });
      }

      const ign = interaction.fields.getTextInputValue('ign_input');
      const abilityScoreStr = interaction.fields.getTextInputValue('ability_score_input');
      const abilityScore = abilityScoreStr ? parseInt(abilityScoreStr) : null;

      // Save to database
      const character = await queries.createCharacter({
        discordId: state.discordId,
        discordName: state.discordName,
        ign,
        role: state.role,
        className: state.className,
        subclass: state.subclass,
        abilityScore,
        timezone: state.timezone,
        guild: state.guild
      });

      // Update nickname
      try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        await member.setNickname(ign);
      } catch (nickError) {
        console.error('Could not update nickname:', nickError);
      }

      // Sync to Google Sheets
      try {
        const allCharacters = await queries.getAllCharacters();
        const allAlts = await queries.getAllAlts();
        await googleSheets.fullSync(allCharacters, allAlts);
      } catch (syncError) {
        console.error('Error syncing to Google Sheets:', syncError);
      }

      // Clean up registration state
      interaction.client.registrationStates.delete(interaction.user.id);

      await interaction.reply({
        content: `✅ **Registration Complete!**\n\n` +
          `👤 **Discord:** ${state.discordName}\n` +
          `🎮 **IGN:** ${ign}\n` +
          `⚔️ **Class:** ${state.className} (${state.subclass})\n` +
          `🛡️ **Role:** ${state.role}\n` +
          `💪 **Ability Score:** ${abilityScore || 'Not provided'}\n` +
          `🌍 **Timezone:** ${state.timezone}\n` +
          `🏰 **Guild:** ${state.guild}\n\n` +
          `Your nickname has been updated to your IGN!\n` +
          `Use \`/addalt\` to register alt characters.`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error handling modal submission:', error);
      await interaction.reply({
        content: '❌ An error occurred while saving your character. Please try again.',
        ephemeral: true
      });
    }
  }
};
