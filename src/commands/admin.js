import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { queries } from '../database/queries.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin commands for managing members')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit-character')
        .setDescription('Edit a member\'s character details')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to edit')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('sync')
        .setDescription('Manually sync all character data to Google Sheets')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'edit-character':
          await this.handleEditCharacter(interaction);
          break;
        case 'sync':
          await this.handleSync(interaction);
          break;
      }
    } catch (error) {
      console.error('Error in admin command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred. Please try again.')
        .setTimestamp();
      
      const replyMethod = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
      await interaction[replyMethod]({ embeds: [errorEmbed], flags: 64 });
    }
  },

  async handleEditCharacter(interaction) {
    const targetUser = interaction.options.getUser('user');
    
    // Import the edit-member-details module to use its showMainMenu function
    const editMemberDetails = await import('./edit-member-details.js');
    
    // Get all user data
    const allCharacters = await queries.getAllCharactersWithSubclasses(targetUser.id);
    const userTimezone = await queries.getUserTimezone(targetUser.id);

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

    // Build premium embed
    const embed = new EmbedBuilder()
      .setColor(mainChar ? '#6640D9' : '#5865F2')
      .setAuthor({ 
        name: `🛡️ Admin Edit: ${targetUser.tag}'s Character Profile`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true })
      })
      .setThumbnail(targetUser.displayAvatarURL({ size: 512 }))
      .setFooter({ text: `Admin: ${interaction.user.tag}` })
      .setTimestamp();

    if (!mainChar) {
      embed.setDescription('**No main character registered yet.**\n\nThis user needs to register a main character first.');
    } else {
      // === PROFILE HEADER ===
      let timezoneDisplay = '🌍 *No timezone set*';
      
      if (userTimezone?.timezone) {
        const timezoneOffsets = {
          'PST': -8, 'PDT': -7, 'MST': -7, 'MDT': -6, 'CST': -6, 'CDT': -5,
          'EST': -5, 'EDT': -4, 'AST': -4, 'ADT': -3, 'NST': -3.5, 'NDT': -2.5,
          'AKST': -9, 'AKDT': -8, 'HST': -10,
          'UTC': 0, 'GMT': 0, 'WET': 0, 'WEST': 1, 'CET': 1, 'CEST': 2,
          'EET': 2, 'EEST': 3, 'TRT': 3, 'MSK': 3, 'GST': 4, 'IST': 5.5,
          'ICT': 7, 'WIB': 7, 'SGT': 8, 'HKT': 8, 'PHT': 8, 'MYT': 8,
          'JST': 9, 'KST': 9, 'AEST': 10, 'AEDT': 11, 'AWST': 8,
          'NZDT': 13, 'NZST': 12
        };
        
        // Map full timezone names to abbreviations
        const timezoneAbbreviations = {
          'America/New_York': 'EST', 'America/Chicago': 'CST', 'America/Denver': 'MST',
          'America/Los_Angeles': 'PST', 'America/Phoenix': 'MST', 'America/Anchorage': 'AKST',
          'Pacific/Honolulu': 'HST', 'America/Toronto': 'EST', 'America/Vancouver': 'PST',
          'America/Halifax': 'AST', 'America/St_Johns': 'NST', 'America/Edmonton': 'MST',
          'America/Winnipeg': 'CST', 'Europe/London': 'GMT', 'Europe/Paris': 'CET',
          'Europe/Berlin': 'CET', 'Europe/Rome': 'CET', 'Europe/Madrid': 'CET',
          'Europe/Amsterdam': 'CET', 'Europe/Brussels': 'CET', 'Europe/Vienna': 'CET',
          'Europe/Stockholm': 'CET', 'Europe/Oslo': 'CET', 'Europe/Copenhagen': 'CET',
          'Europe/Helsinki': 'EET', 'Europe/Athens': 'EET', 'Europe/Istanbul': 'TRT',
          'Europe/Moscow': 'MSK', 'Europe/Zurich': 'CET', 'Europe/Dublin': 'GMT',
          'Europe/Lisbon': 'WET', 'Europe/Warsaw': 'CET', 'Asia/Tokyo': 'JST',
          'Asia/Seoul': 'KST', 'Asia/Shanghai': 'CST', 'Asia/Hong_Kong': 'HKT',
          'Asia/Singapore': 'SGT', 'Asia/Dubai': 'GST', 'Asia/Kolkata': 'IST',
          'Asia/Bangkok': 'ICT', 'Asia/Jakarta': 'WIB', 'Asia/Manila': 'PHT',
          'Asia/Kuala_Lumpur': 'MYT', 'Australia/Sydney': 'AEDT', 'Australia/Melbourne': 'AEDT',
          'Australia/Brisbane': 'AEST', 'Australia/Perth': 'AWST', 'Pacific/Auckland': 'NZDT'
        };
        
        const abbrev = timezoneAbbreviations[userTimezone.timezone] || userTimezone.timezone;
        const offset = timezoneOffsets[abbrev] || 0;
        
        // Calculate user's local time from UTC
        const now = new Date();
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        
        // Add offset to UTC to get user's local time
        let localHours = utcHours + offset;
        let localMinutes = utcMinutes;
        
        // Handle day overflow
        if (localHours >= 24) localHours -= 24;
        if (localHours < 0) localHours += 24;
        
        const ampm = localHours >= 12 ? 'PM' : 'AM';
        const displayHours = localHours % 12 || 12;
        const minutes = localMinutes.toString().padStart(2, '0');
        
        timezoneDisplay = `🌍 ${userTimezone.timezone} • ${displayHours}:${minutes} ${ampm}`;
      }
      
      embed.setDescription(
        `${timezoneDisplay}\n`
      );

      // === MAIN CHARACTER CARD ===
      const mainRoleEmoji = this.getRoleEmoji(mainChar.role);
      
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
          `💪 \u001b[1;31mAbility Score:\u001b[0m ${mainChar.ability_score?.toLocaleString() || 'N/A'}\n` +
          '```',
        inline: false
      });

      // === MAIN SUBCLASSES (if any) ===
      if (mainSubclasses.length > 0) {
        const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        
        const subclassText = mainSubclasses.map((sc, i) => {
          const numberEmoji = numberEmojis[i] || `${i + 1}.`;
          return (
            '```ansi\n' +
            `${numberEmoji} ${sc.class} › ${sc.subclass} › ${sc.role}\n` +
            `   \u001b[1;31mAS:\u001b[0m ${sc.ability_score?.toLocaleString() || 'N/A'}\n` +
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
          
          return (
            '```ansi\n' +
            `${numberEmoji} \u001b[1;36mIGN:\u001b[0m ${alt.ign}  •  \u001b[1;34mGuild:\u001b[0m ${alt.guild || 'None'}\n` +
            `   ${alt.class} › ${alt.subclass} › ${alt.role}\n` +
            `   \u001b[1;31mAS:\u001b[0m ${alt.ability_score?.toLocaleString() || 'N/A'}\n` +
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
        text: `${totalChars} character${totalChars !== 1 ? 's' : ''} registered • Admin: ${interaction.user.tag}`,
      });
    } else {
      embed.setFooter({ text: `Admin: ${interaction.user.tag}` });
    }

    // === BUILD BUTTON ROWS (same as edit-member-details) ===
    // ✅ CRITICAL FIX: Pass targetUser.id instead of interaction.user.id
    const rows = editMemberDetails.default.buildButtonRows(mainChar, alts, targetUser.id);

    await interaction.reply({ embeds: [embed], components: rows, flags: 64 });
  },

  async handleSync(interaction) {
    const googleSheets = await import('../services/googleSheets.js');
    
    try {
      const startEmbed = new EmbedBuilder()
        .setColor('#6640D9')
        .setTitle('🔄 Starting Sync...')
        .setDescription('Syncing all character data to Google Sheets. This may take a moment.')
        .setTimestamp();
      
      await interaction.deferReply({ flags: 64 });
      await interaction.editReply({ embeds: [startEmbed] });

      // Get all characters with subclasses
      const allChars = await queries.getAllCharacters();

      // Sync to Google Sheets
      await googleSheets.default.fullSync(allChars);

      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Sync Complete!')
        .setDescription('All character data has been successfully synced to Google Sheets.')
        .addFields(
          { name: '📊 Total Characters', value: `${allChars.length} synced`, inline: true }
        )
        .setFooter({ text: '📊 Data synchronized successfully' })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Error in admin sync command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Sync Failed')
        .setDescription('An error occurred while syncing to Google Sheets.')
        .addFields({ 
          name: '🔍 Error Details', 
          value: error.message || 'Unknown error', 
          inline: false 
        })
        .setFooter({ text: 'Please check the logs for more information' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [errorEmbed] });
    }
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
