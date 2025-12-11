import { SlashCommandBuilder, PermissionFlagBits } from 'discord.js';
import { buildCharacterProfileEmbed } from '../../components/embeds/characterProfile.js';
import { buildCharacterButtons } from '../../components/buttons/characterButtons.js';
import db from '../../services/database.js';
import logger from '../../utils/logger.js';
import config from '../../utils/config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin-edit-character')
    .setDescription('Edit a user\'s character')
    .setDefaultMemberPermissions(PermissionFlagBits.Administrator)
    .addUserOption(opt => 
      opt.setName('user')
        .setDescription('User whose character to edit')
        .setRequired(true)
    ),
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: config.ephemeral.admin });
      
      const targetUser = interaction.options.getUser('user');
      const characters = await db.getAllCharactersWithSubclasses(targetUser.id);
      
      if (characters.length === 0) {
        return await interaction.editReply({ 
          content: `❌ ${targetUser.username} has no registered characters.` 
        });
      }
      
      const mainChar = characters.find(c => c.character_type === 'main');
      const alts = characters.filter(c => c.character_type === 'alt');
      const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
      
      const embed = await buildCharacterProfileEmbed(targetUser, characters, interaction);
      const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, targetUser.id);
      
      await interaction.editReply({ embeds: [embed], components: buttons });
      
      // Log admin action
      await logger.logInfo(
        `Admin ${interaction.user.username} editing ${targetUser.username}'s character`,
        `Admin ID: ${interaction.user.id} | Target ID: ${targetUser.id}`
      );
      
    } catch (error) {
      logger.error(`Admin edit character error: ${error.message}`);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: '❌ Error occurred.', 
          ephemeral: config.ephemeral.admin 
        });
      } else {
        await interaction.editReply({ content: '❌ Error occurred.' });
      }
    }
  }
};
