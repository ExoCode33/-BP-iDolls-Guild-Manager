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

      // Get all user data
      const allCharacters = await queries.getAllCharactersWithSubclasses(targetUser.id);
      const userTimezone = await queries.getUserTimezone(targetUser.id);

      if (allCharacters.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('📋 No Characters Found')
          .setDescription(isOwnProfile 
            ? 'You haven\'t registered any characters yet!'
            : `**${targetUser.tag}** hasn't registered any characters yet.`)
          .addFields({ 
            name: '🎮 Get Started', 
            value: isOwnProfile ? 'Use `/edit-member-details` to register!' : 'They need to use `/edit-member-details` to get started.', 
            inline: false 
          })
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Organize characters by hierarchy
      const mainChar = allCharacters.find(c => c.character_type === 'main');
      const mainSubclasses = allCharacters.filter(c => c.character_type === 'main_subclass');
      const alts = allCharacters.filter(c => c.character_type === 'alt');
      
      // Get subclasses for each alt
      const altsWithSubclasses = alts.map(alt => ({
        ...alt,
        subclasses: allCharacters.filter(c => 
          c.character_type === 'alt_subclass' && c.parent_character_id === alt.id
        )
      }));

      // Build premium embed matching edit-member-details style
      const embed = new EmbedBuilder()
        .setColor(mainChar ? '#6640D9' : '#5865F2')
        .setAuthor({ 
          name: `${targetUser.tag}'s Character Profile`,
          iconURL: targetUser.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(targetUser.displayAvatarURL({ size: 512 }))
        .setTimestamp();

      if (!mainChar) {
        embed.setDescription('**No characters registered yet.**');
      } else {
        // === PROFILE HEADER ===
        let timezoneDisplay = '🌍 *No timezone set*';
        
        if (userTimezone?.timezone) {
          // Get timezone offset
          const timezoneOffsets = {
            'PST': -8, 'PDT': -7,
            'MST': -7, 'MDT': -6,
            'CST': -6, 'CDT': -5,
            'EST': -5, 'EDT': -4,
            'UTC': 0, 'GMT': 0,
            'CET': 1, 'CEST': 2,
            'JST': 9, 'KST': 9,
            'AEST': 10, 'AEDT': 11
          };
          
          const offset = timezoneOffsets[userTimezone.timezone] || 0;
          const now = new Date();
          const localTime = new Date(now.getTime() + (offset * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
          const hours = localTime.getHours();
          const minutes = localTime.getMinutes().toString().padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          
          timezoneDisplay = `🌍 ${userTimezone.timezone} • ${displayHours}:${minutes} ${ampm}`;
        }
        
        embed.setDescription(
          `${timezoneDisplay}\n`
        );

        // === MAIN CHARACTER CARD ===
        const mainRoleEmoji = this.getRoleEmoji(mainChar.role);
        const mainAbilityScore = this.formatAbilityScore(mainChar.ability_score);
        
        embed.addFields({
          name: '⭐ **MAIN CHARACTER**',
          value: 
            '```ansi\n' +
            `✨ \u001b[1;36mIGN:\u001b[0m       ${mainChar.ign}\n` +
            `\n` +
            `🏰 \u001b[1;34mGuild:\u001b[0m     ${mainChar.guild || 'None'}\n` +
            `🎭 \u001b[1;33mClass:\u001b[0m     ${mainChar.class}\n` +
            `🎯 \u001b[1;35mSubclass:\u001b[0m  ${mainChar.subclass}\n` +
            `${mainRoleEmoji} \u001b[1;32mRole:\u001b[0m      ${mainChar.role}\n` +
            `\n` +
            `💪 \u001b[1;31mAbility Score:\u001b[0m ${mainAbilityScore}\n` +
            '```',
          inline: false
        });

        // === MAIN SUBCLASSES (if any) ===
        if (mainSubclasses.length > 0) {
          const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
          
          const subclassText = mainSubclasses.map((sc, i) => {
            const numberEmoji = numberEmojis[i] || `${i + 1}.`;
            const scAbilityScore = this.formatAbilityScore(sc.ability_score);
            return (
              '```ansi\n' +
              `${numberEmoji} ${sc.class} › ${sc.subclass} › ${sc.role}\n` +
              `   \u001b[1;31mAS:\u001b[0m ${scAbilityScore}\n` +
              '```'
            );
          }).join('');

          embed.addFields({
            name: '📊 **SUBCLASSES**',
            value: subclassText,
            inline: false
          });
        }

        // === ALT CHARACTERS (if any) ===
        if (altsWithSubclasses.length > 0) {
          const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
          
          const allAltsText = altsWithSubclasses.map((alt, altIndex) => {
            const numberEmoji = numberEmojis[altIndex] || `${altIndex + 1}.`;
            const altAbilityScore = this.formatAbilityScore(alt.ability_score);
            
            return (
              '```ansi\n' +
              `${numberEmoji} \u001b[1;36mIGN:\u001b[0m ${alt.ign}  •  \u001b[1;34mGuild:\u001b[0m ${alt.guild || 'None'}\n` +
              `   ${alt.class} › ${alt.subclass} › ${alt.role}\n` +
              `   \u001b[1;31mAS:\u001b[0m ${altAbilityScore}\n` +
              '```'
            );
          }).join('');

          embed.addFields({
            name: '📋 **ALT CHARACTERS**',
            value: allAltsText,
            inline: false
          });
        }
      }

      // Footer
      const totalChars = allCharacters.length;
      if (totalChars > 0) {
        embed.setFooter({ 
          text: `${totalChars} character${totalChars !== 1 ? 's' : ''} registered • Last updated`,
        });
      } else {
        embed.setFooter({ text: 'No characters registered' });
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
  },

  // ✅ NEW: Format ability score to range display
  formatAbilityScore(score) {
    if (!score || score === '' || score === 0) return 'Not set';
    
    const numScore = parseInt(score);
    
    // Map stored values to display labels
    const scoreRanges = {
      10000: '≤10k',
      11000: '10-12k',
      13000: '12-14k',
      15000: '14-16k',
      17000: '16-18k',
      19000: '18-20k',
      21000: '20-22k',
      23000: '22-24k',
      25000: '24-26k',
      27000: '26-28k',
      29000: '28-30k',
      31000: '30-32k',
      33000: '32-34k',
      35000: '34-36k',
      37000: '36-38k',
      39000: '38-40k',
      41000: '40-42k',
      43000: '42-44k',
      45000: '44-46k',
      47000: '46-48k',
      49000: '48-50k',
      51000: '50-52k',
      53000: '52-54k',
      55000: '54-56k',
      57000: '56k+'
    };
    
    return scoreRanges[numScore] || `~${numScore.toLocaleString()}`;
  },

  // Helper: Get role emoji
  getRoleEmoji(role) {
    const roleEmojis = {
      'Tank': '🛡️',
      'DPS': '⚔️',
      'Support': '💚'
    };
    return roleEmojis[role] || '⭐';
  }
};
