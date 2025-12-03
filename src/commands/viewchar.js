import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { queries } from '../database/queries.js';

export default {
  data: new SlashCommandBuilder()
    .setName('viewchar')
    .setDescription('View your registered characters')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('View another user\'s characters (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const isOwnProfile = targetUser.id === interaction.user.id;

      // Get main character
      const mainChar = await queries.getMainCharacter(targetUser.id);
      
      if (!mainChar) {
        return interaction.reply({
          content: isOwnProfile 
            ? '❌ You haven\'t registered a character yet! Use `/register` to get started.'
            : `❌ ${targetUser.tag} hasn't registered a character yet.`,
          ephemeral: true
        });
      }

      // Get alt characters
      const alts = await queries.getAltCharacters(targetUser.id);

      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${targetUser.tag}'s Characters`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      // Main character section
      embed.addFields({
        name: '⭐ Main Character',
        value: 
          `**IGN:** ${mainChar.ign}\n` +
          `**Class:** ${mainChar.class} (${mainChar.subclass})\n` +
          `**Role:** ${mainChar.role}\n` +
          `**Ability Score:** ${mainChar.ability_score || 'Not provided'}\n` +
          `**Timezone:** ${mainChar.timezone || 'Not provided'}\n` +
          `**Guild:** ${mainChar.guild}`,
        inline: false
      });

      // Alt characters section
      if (alts.length > 0) {
        alts.forEach((alt, index) => {
          embed.addFields({
            name: `Alt Character ${index + 1}`,
            value: 
              `**IGN:** ${alt.ign}\n` +
              `**Class:** ${alt.class} (${alt.subclass})\n` +
              `**Role:** ${alt.role}`,
            inline: true
          });
        });
      } else {
        embed.addFields({
          name: '📋 Alt Characters',
          value: 'No alt characters registered',
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error('Error in viewchar command:', error);
      await interaction.reply({
        content: '❌ An error occurred while fetching character information.',
        ephemeral: true
      });
    }
  }
};
