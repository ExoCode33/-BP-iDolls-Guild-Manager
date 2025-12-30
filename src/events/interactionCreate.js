import { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { errorEmbed, successEmbed } from '../ui/embeds.js';
import { BotLogger } from '../services/botLogger.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        const errorMessage = { embeds: [errorEmbed('There was an error executing this command.')], ephemeral: true };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'admin_general_logs') {
        const channelId = interaction.fields.getTextInputValue('channel_id');
        
        try {
          const channel = await interaction.guild.channels.fetch(channelId);
          if (!channel || !channel.isTextBased()) {
            return interaction.reply({ 
              embeds: [errorEmbed('Invalid channel ID or not a text channel.')], 
              ephemeral: true 
            });
          }

          await BotLogger.setGeneralLogChannel(interaction.guildId, channelId);
          await interaction.reply({ 
            embeds: [successEmbed(`General log channel set to <#${channelId}>`)], 
            ephemeral: true 
          });
        } catch (error) {
          await interaction.reply({ 
            embeds: [errorEmbed('Could not find that channel. Make sure the ID is correct.')], 
            ephemeral: true 
          });
        }
        return;
      }

      if (interaction.customId === 'admin_application_logs') {
        const channelId = interaction.fields.getTextInputValue('channel_id');
        
        try {
          const channel = await interaction.guild.channels.fetch(channelId);
          if (!channel || !channel.isTextBased()) {
            return interaction.reply({ 
              embeds: [errorEmbed('Invalid channel ID or not a text channel.')], 
              ephemeral: true 
            });
          }

          await BotLogger.setApplicationLogChannel(interaction.guildId, channelId);
          await interaction.reply({ 
            embeds: [successEmbed(`Application log channel set to <#${channelId}>`)], 
            ephemeral: true 
          });
        } catch (error) {
          await interaction.reply({ 
            embeds: [errorEmbed('Could not find that channel. Make sure the ID is correct.')], 
            ephemeral: true 
          });
        }
        return;
      }

      if (interaction.customId === 'log_grouping_window') {
        const minutes = parseInt(interaction.fields.getTextInputValue('window_minutes'));
        
        if (isNaN(minutes) || minutes < 1 || minutes > 60) {
          return interaction.reply({ 
            embeds: [errorEmbed('Window must be between 1 and 60 minutes.')], 
            ephemeral: true 
          });
        }

        await BotLogger.setGroupingWindow(interaction.guildId, minutes);
        await interaction.reply({ 
          embeds: [successEmbed(`Grouping window set to ${minutes} minutes`)], 
          ephemeral: true 
        });
        return;
      }

      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'admin_settings_menu') {
        const settingsCommand = await import('../commands/admin/settings.js');
        if (settingsCommand.default && settingsCommand.default.handleSelectMenu) {
          await settingsCommand.default.handleSelectMenu(interaction);
        }
        return;
      }

      if (interaction.customId === 'toggle_log_event') {
        const eventType = interaction.values[0];
        await BotLogger.toggleLogSetting(interaction.guildId, eventType);
        
        const config = await BotLogger.getLogSettings(interaction.guildId);
        const status = config.settings[eventType] ? 'enabled' : 'disabled';
        
        await interaction.reply({ 
          embeds: [successEmbed(`**${eventType}** logging ${status}`)], 
          ephemeral: true 
        });
        return;
      }

      if (interaction.customId === 'toggle_log_grouping') {
        const selection = interaction.values[0];
        
        if (selection === 'change_window') {
          const modal = new ModalBuilder()
            .setCustomId('log_grouping_window')
            .setTitle('Change Grouping Window');

          const windowInput = new TextInputBuilder()
            .setCustomId('window_minutes')
            .setLabel('Grouping Window (minutes)')
            .setPlaceholder('10')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          modal.addComponents(new ActionRowBuilder().addComponents(windowInput));
          await interaction.showModal(modal);
          return;
        }

        await BotLogger.toggleGroupingSetting(interaction.guildId, selection);
        const config = await BotLogger.getLogSettings(interaction.guildId);
        const status = config.grouping[selection] ? 'grouped' : 'instant';
        
        await interaction.reply({ 
          embeds: [successEmbed(`**${selection}** is now ${status}`)], 
          ephemeral: true 
        });
        return;
      }

      return;
    }

    if (interaction.isButton()) {
      return;
    }
  }
};
