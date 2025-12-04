import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { queries } from '../database/queries.js';

export default {
  data: new SlashCommandBuilder()
    .setName('view-char')
    .setDescription('View your registered characters')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('View another user\'s characters (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const targetUser = interaction.options?.getUser('user') || interaction.user;
      const isOwnProfile = targetUser.id === interaction.user.id;

      // Get main character
      const mainChar = await queries.getMainCharacter(targetUser.id);
      
      if (!mainChar) {
        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('📋 No Character Found')
          .setDescription(isOwnProfile 
            ? 'You haven\'t registered a character yet!'
            : `**${targetUser.tag}** hasn't registered a character yet.`)
          .addFields({ 
            name: '🎮 Get Started', 
            value: isOwnProfile ? 'Use `/edit-member-details` to register your character!' : 'They need to use `/edit-member-details` to get started.', 
            inline: false 
          })
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Get alt characters
      const alts = await queries.getAltCharacters(targetUser.id);
      
      // Get user's timezone
      const userTimezone = await queries.getUserTimezone(targetUser.id);

      // Professional embed with proper hierarchy
      const embed = new EmbedBuilder()
        .setColor('#6640D9')
        .setTitle('📋 Character Profile')
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .setTimestamp();

      // Header: Discord Name & Timezone
      const headerValue = [
        `**Discord:** ${targetUser.tag}`,
        `**Timezone:** ${userTimezone && userTimezone.timezone ? `🌍 ${userTimezone.timezone}` : '*Not set*'}`
      ].join('\n');

      embed.addFields({
        name: '👤 Profile Information',
        value: headerValue,
        inline: false
      });

      // Main Character Section
      const mainCharValue = [
        `**IGN:** ${mainChar.ign}`,
        `**Class:** ${mainChar.class} (${mainChar.subclass})`,
        `**Role:** ${mainChar.role}`,
        `**Ability Score:** ${mainChar.ability_score ? mainChar.ability_score.toLocaleString() : '*Not set*'}`,
        `**Guild:** ${mainChar.guild || '*Not set*'}`
      ].join('\n');

      embed.addFields({
        name: '⭐ Main Character',
        value: mainCharValue,
        inline: false
      });

      // Alt Characters Section
      if (alts.length > 0) {
        alts.forEach((alt, index) => {
          const altValue = [
            `**IGN:** ${alt.ign}`,
            `**Class:** ${alt.class} (${alt.subclass})`,
            `**Role:** ${alt.role}`,
            `**Ability Score:** ${alt.ability_score ? alt.ability_score.toLocaleString() : '*Not set*'}`,
            `**Guild:** ${alt.guild || '*Not set*'}`
          ].join('\n');

          embed.addFields({
            name: `📋 Alt Character ${index + 1}`,
            value: altValue,
            inline: false
          });
        });

        embed.setFooter({ text: `Total Characters: ${1 + alts.length}` });
      } else {
        embed.setFooter({ text: 'Main character only' });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error('Error in view-char command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred while fetching character information.')
        .setTimestamp();
      
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};
