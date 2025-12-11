import discord from 'discord.js';
const { SlashCommandBuilder } = discord;
import { buildCharacterProfileEmbed } from '../../components/embeds/characterProfile.js';
import db from '../../services/database.js';
import logger from '../../utils/logger.js';
import config from '../../utils/config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('view-character')
    .setDescription('View a character profile')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to view (leave empty for yourself)')
        .setRequired(false)
    ),
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: config.ephemeral.viewChar });
      
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const userId = targetUser.id;
      
      const characters = await db.getAllCharactersWithSubclasses(userId);
      
      const embed = await buildCharacterProfileEmbed(targetUser, characters, interaction);
      
      await interaction.editReply({ embeds: [embed] });
      logger.logAction(interaction.user.username, `viewed ${targetUser.username}`);
    } catch (error) {
      logger.error(`View error: ${error.message}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: '❌ Error occurred.', 
          ephemeral: config.ephemeral.viewChar 
        });
      } else {
        await interaction.editReply({ content: '❌ Error occurred.' });
      }
    }
  }
};
