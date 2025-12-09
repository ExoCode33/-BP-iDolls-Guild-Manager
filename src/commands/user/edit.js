import { SlashCommandBuilder } from 'discord.js';
import { buildCharacterProfileEmbed } from '../../components/embeds/characterProfile.js';
import { buildCharacterButtons } from '../../components/buttons/characterButtons.js';
import db from '../../services/database.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder().setName('edit-user').setDescription('Manage your characters'),
  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const characters = await db.getAllCharactersWithSubclasses(userId);
      const mainChar = characters.find(c => c.character_type === 'main');
      const alts = characters.filter(c => c.character_type === 'alt');
      const subclasses = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
      const embed = await buildCharacterProfileEmbed(interaction.user, characters);
      const buttons = buildCharacterButtons(mainChar, alts.length, subclasses.length, userId);
      await interaction.reply({ embeds: [embed], components: buttons, ephemeral: true });
      logger.log(`User ${userId} opened edit`);
    } catch (error) {
      logger.error(`Edit error: ${error.message}`);
      await interaction.reply({ content: '❌ Error.', ephemeral: true });
    }
  }
};
