import { SlashCommandBuilder } from 'discord.js';
import { buildCharacterProfileEmbed } from '../../components/embeds/characterProfile.js';
import db from '../../services/database.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder().setName('view-character').setDescription('View character profile').addUserOption(option => option.setName('user').setDescription('User to view (leave empty for yourself)').setRequired(false)),
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const characters = await db.getAllCharactersWithSubclasses(targetUser.id);
      const embed = await buildCharacterProfileEmbed(targetUser, characters);
      
      await interaction.editReply({ embeds: [embed] });
      logger.log(`User ${interaction.user.id} viewed ${targetUser.id}`);
    } catch (error) {
      logger.error(`View error: ${error.message}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Error.', ephemeral: true });
      } else {
        await interaction.editReply({ content: '❌ Error.' });
      }
    }
  }
};
