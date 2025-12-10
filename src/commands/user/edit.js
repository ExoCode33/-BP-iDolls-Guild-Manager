import { SlashCommandBuilder } from 'discord.js';
import { buildCharacterProfileEmbed } from '../../components/embeds/characterProfile.js';
import { buildCharacterButtons } from '../../components/buttons/characterButtons.js';
import db from '../../services/database.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder().setName('edit-user').setDescription('Manage your characters'),
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      
      const userId = interaction.user.id;
      const characters = await db.getAllCharactersWithSubclasses(userId);
      const mainChar = characters.find(c => c.character_type === 'main');
      const alts = characters.filter(c => c.character_type === 'alt');
      const subclasses = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
      const embed = await buildCharacterProfileEmbed(interaction.user, characters);
      const buttons = buildCharacterButtons(mainChar, alts.length, subclasses.length, userId);
      
      await interaction.editReply({ embeds: [embed], components: buttons });
      logger.logAction(interaction.user.username, 'opened edit');
    } catch (error) {
      logger.error(`Edit error: ${error.message}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Error.', ephemeral: true });
      } else {
        await interaction.editReply({ content: '❌ Error.' });
      }
    }
  }
};
