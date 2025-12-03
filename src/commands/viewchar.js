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
        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('📋 No Character Found')
          .setDescription(isOwnProfile 
            ? 'You haven\'t registered a character yet!'
            : `**${targetUser.tag}** hasn't registered a character yet.`)
          .addFields({ 
            name: '🎮 Get Started', 
            value: isOwnProfile ? 'Use `/register` to register your main character!' : 'They need to use `/register` to get started.', 
            inline: false 
          })
          .setFooter({ text: '✨ Join the adventure' })
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Get alt characters
      const alts = await queries.getAltCharacters(targetUser.id);

      // Get class and role emojis
      const classEmoji = this.getClassEmoji(mainChar.class);
      const roleEmoji = this.getRoleEmoji(mainChar.role);

      // Create main embed
      const embed = new EmbedBuilder()
        .setColor('#6640D9')
        .setAuthor({ 
          name: `${targetUser.tag}'s Characters`,
          iconURL: targetUser.displayAvatarURL()
        })
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .setDescription(`**Character Profile** • ${isOwnProfile ? 'Your' : 'Their'} registered character${alts.length > 0 ? 's' : ''}`)
        .setTimestamp();

      // Main character section with better formatting
      const mainCharValue = [
        `**IGN:** ${mainChar.ign}`,
        `**Class:** ${classEmoji} ${mainChar.class}`,
        `**Subclass:** ${mainChar.subclass}`,
        `**Role:** ${roleEmoji} ${mainChar.role}`,
        `**Ability Score:** ${mainChar.ability_score ? `💪 ${mainChar.ability_score.toLocaleString()}` : '*Not provided*'}`,
        mainChar.guild ? `**Guild:** 🏰 ${mainChar.guild}` : null,
        mainChar.timezone ? `**Timezone:** 🌍 ${mainChar.timezone}` : null,
        `**Registered:** 📅 ${new Date(mainChar.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      ].filter(Boolean).join('\n');

      embed.addFields({
        name: '⭐ Main Character',
        value: mainCharValue,
        inline: false
      });

      // Alt characters section with improved layout
      if (alts.length > 0) {
        // Group alts in groups of 3 for better layout
        for (let i = 0; i < alts.length; i += 3) {
          const altGroup = alts.slice(i, i + 3);
          
          altGroup.forEach((alt, idx) => {
            const altClassEmoji = this.getClassEmoji(alt.class);
            const altRoleEmoji = this.getRoleEmoji(alt.role);
            
            const altValue = [
              `**IGN:** ${alt.ign}`,
              `**Class:** ${altClassEmoji} ${alt.class}`,
              `**Subclass:** ${alt.subclass}`,
              `**Role:** ${altRoleEmoji} ${alt.role}`
            ].join('\n');

            embed.addFields({
              name: `📋 Alt Character ${i + idx + 1}`,
              value: altValue,
              inline: true
            });
          });
          
          // Add spacer if we have more alts coming
          if (i + 3 < alts.length) {
            embed.addFields({ name: '\u200B', value: '\u200B', inline: false });
          }
        }

        embed.setFooter({ text: `${alts.length} alt character${alts.length !== 1 ? 's' : ''} registered` });
      } else {
        embed.addFields({
          name: '📋 Alt Characters',
          value: isOwnProfile 
            ? '*No alt characters registered*\nUse `/addalt` to register alt characters!' 
            : '*No alt characters registered*',
          inline: false
        });
        
        embed.setFooter({ text: isOwnProfile ? '💡 Tip: Use /addalt to add more characters' : 'Character Profile' });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error('Error in viewchar command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred while fetching character information.')
        .setFooter({ text: 'Please try again' })
        .setTimestamp();
      
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },

  getClassEmoji(className) {
    const emojis = {
      'Beat Performer': '🎵',
      'Frost Mage': '❄️',
      'Heavy Guardian': '🛡️',
      'Marksman': '🏹',
      'Shield Knight': '⚔️',
      'Stormblade': '⚡',
      'Verdant Oracle': '🌿',
      'Wind Knight': '💨'
    };
    return emojis[className] || '⭐';
  },

  getRoleEmoji(role) {
    const emojis = {
      'Tank': '🛡️',
      'DPS': '⚔️',
      'Support': '💚'
    };
    return emojis[role] || '⭐';
  }
};
