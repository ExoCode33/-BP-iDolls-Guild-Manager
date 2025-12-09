import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import { queries } from '../database/queries.js';

// ✅ Ephemeral configuration (matches character.js)
const EPHEMERAL_CONFIG = {
  editMemberDetails: process.env.EDIT_MEMBER_DETAILS_EPHEMERAL !== 'false',
};

export default {
  data: new SlashCommandBuilder()
    .setName('edit-member-details')
    .setDescription('Manage your character registrations'),

  async execute(interaction) {
    try {
      await this.showMainMenu(interaction, false);
    } catch (error) {
      console.error('Error in edit-member-details command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred. Please try again.')
        .setTimestamp();
      
      await interaction.reply({ embeds: [errorEmbed], flags: 64 }); // Private error message
    }
  },

  async showMainMenu(interaction, isUpdate = false) {
    const userId = interaction.user.id;
    const mainChar = await queries.getMainCharacter(userId);
    
    // Get ALL characters to properly count
    const allCharacters = mainChar ? await queries.getAllCharactersWithSubclasses(userId) : [];
    
    // Properly filter by character_type
    const alts = allCharacters.filter(char => char.character_type === 'alt');
    const mainSubclasses = allCharacters.filter(char => char.character_type === 'main_subclass');
    const altSubclasses = allCharacters.filter(char => char.character_type === 'alt_subclass');
    const totalSubclasses = mainSubclasses.length + altSubclasses.length;
    
    console.log('📊 Character counts:', {
      total: allCharacters.length,
      alts: alts.length,
      mainSubclasses: mainSubclasses.length,
      altSubclasses: altSubclasses.length,
      totalSubclasses
    });
    
    const userTimezone = await queries.getUserTimezone(userId);

    const embed = new EmbedBuilder()
      .setColor(mainChar ? '#6640D9' : '#5865F2')
      .setAuthor({ 
        name: `${interaction.user.tag}'s Character Profile`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
      })
      .setThumbnail(interaction.user.displayAvatarURL({ size: 512 }))
      .setFooter({ text: '💡 Click buttons below to manage your characters' })
      .setTimestamp();

    if (!mainChar) {
      embed.setDescription('**No main character registered yet.**\n\nUse the button below to register your first character!');
    } else {
      // ✅ Timezone display
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
        
        const now = new Date();
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        
        let localHours = utcHours + offset;
        let localMinutes = utcMinutes;
        
        if (localHours >= 24) localHours -= 24;
        if (localHours < 0) localHours += 24;
        
        const ampm = localHours >= 12 ? 'PM' : 'AM';
        const displayHours = localHours % 12 || 12;
        const minutes = localMinutes.toString().padStart(2, '0');
        
        timezoneDisplay = `🌍 ${userTimezone.timezone} • ${displayHours}:${minutes} ${ampm}`;
      }
      
      embed.setDescription(`${timezoneDisplay}\n`);

      const mainRoleEmoji = this.getRoleEmoji(mainChar.role);
      const mainClassEmoji = this.getClassEmoji(mainChar.class);
      
      // ✅ FIXED: Format ability score as range
      const formattedAbilityScore = this.formatAbilityScore(mainChar.ability_score);
      
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
          `💪 \u001b[1;31mAbility Score:\u001b[0m ${formattedAbilityScore}\n` +
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
            `   \u001b[1;31mAbility Score:\u001b[0m ${scAbilityScore}\n` +
            '```'
          );
        }).join('');

        embed.addFields({
          name: '📊 **Subclasses**',
          value: subclassText,
          inline: false
        });
      }

      // === ALT CHARACTERS (if any) ===
      if (alts.length > 0) {
        const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        
        const altsText = alts.map((alt, i) => {
          const numberEmoji = numberEmojis[i] || `${i + 1}.`;
          const altAbilityScore = this.formatAbilityScore(alt.ability_score);
          
          return (
            '```ansi\n' +
            `${numberEmoji} \u001b[1;36mIGN:\u001b[0m ${alt.ign}  •  \u001b[1;34mGuild:\u001b[0m ${alt.guild || 'None'}\n` +
            `   ${alt.class} › ${alt.subclass} › ${alt.role}\n` +
            `   \u001b[1;31mAbility Score:\u001b[0m ${altAbilityScore}\n` +
            '```'
          );
        }).join('');

        embed.addFields({
          name: `📋 **Alt**`,
          value: altsText,
          inline: false
        });
      }

      embed.addFields({
        name: '\u200B',
        value: `**${allCharacters.length} character${allCharacters.length !== 1 ? 's' : ''} registered • Last updated** •`,
        inline: false
      });
    }

    // ✅ Build buttons with proper counts
    const components = this.buildButtonRows(mainChar, alts.length, totalSubclasses, userId);

    // ✅ Use flags instead of ephemeral (Discord.js deprecation fix)
    const replyOptions = { embeds: [embed], components };
    if (EPHEMERAL_CONFIG.editMemberDetails) {
      replyOptions.flags = 64; // MessageFlags.Ephemeral
    }

    if (isUpdate) {
      await interaction.update(replyOptions);
    } else {
      await interaction.reply(replyOptions);
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
  },

  // ✅ COMPLETELY REWRITTEN: Single Edit button + smart disabling based on counts
  buildButtonRows(mainChar, altCount, subclassCount, userId) {
    const row1 = new ActionRowBuilder();
    const row2 = new ActionRowBuilder();

    if (mainChar) {
      console.log('🔧 Building buttons with counts:', { altCount, subclassCount });
      
      // Row 1: Edit button (always active) + Add buttons
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`show_edit_menu_${userId}`)
          .setLabel('✏️ Edit')
          .setStyle(ButtonStyle.Primary), // Always active - will show options
        new ButtonBuilder()
          .setCustomId(`add_subclass_${userId}`)
          .setLabel('➕ Add Subclass')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`add_alt_${userId}`)
          .setLabel('🎭 Add Alt')
          .setStyle(ButtonStyle.Success)
      );

      // Row 2: Remove buttons with smart disabling
      row2.addComponents(
        new ButtonBuilder()
          .setCustomId(`remove_alt_${userId}`)
          .setLabel('❌ Remove Alt')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(altCount === 0), // ✅ Disable if no alts
        new ButtonBuilder()
          .setCustomId(`remove_subclass_${userId}`)
          .setLabel('🗑️ Remove Subclass')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(subclassCount === 0), // ✅ Disable if no subclasses
        new ButtonBuilder()
          .setCustomId(`remove_main_${userId}`)
          .setLabel('⚠️ Remove Main')
          .setStyle(ButtonStyle.Danger)
      );

      return [row1, row2];
    } else {
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`register_main_${userId}`)
          .setLabel('⭐ Register Main Character')
          .setStyle(ButtonStyle.Success)
      );

      return [row1];
    }
  },

  // ✅ NEW: Show edit menu when Edit button is clicked
  async showEditMenu(interaction, userId) {
    const allCharacters = await queries.getAllCharactersWithSubclasses(userId);
    const mainChar = allCharacters.find(c => c.character_type === 'main');
    const alts = allCharacters.filter(c => c.character_type === 'alt');
    const totalSubclasses = allCharacters.filter(c => 
      c.character_type === 'main_subclass' || c.character_type === 'alt_subclass'
    ).length;

    const options = [];

    // Always add Main option
    options.push({
      label: 'Edit Main Character',
      value: 'edit_main',
      description: `${mainChar.ign} - ${mainChar.class}`,
      emoji: '⭐'
    });

    // Add Alt option if alts exist
    if (alts.length > 0) {
      options.push({
        label: `Edit Alt Character (${alts.length} available)`,
        value: 'edit_alt',
        description: 'Choose which alt to edit',
        emoji: '🎭'
      });
    }

    // Add Subclass option if subclasses exist
    if (totalSubclasses > 0) {
      options.push({
        label: `Edit Subclass (${totalSubclasses} available)`,
        value: 'edit_subclass',
        description: 'Choose which subclass to edit',
        emoji: '📊'
      });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`edit_type_select_${userId}`)
      .setPlaceholder('✏️ What would you like to edit?')
      .addOptions(options);

    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_menu_${userId}`)
      .setLabel('◀️ Back')
      .setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('✏️ Edit Characters')
      .setDescription('**Select what you want to edit:**')
      .addFields(
        { name: '⭐ Main Character', value: `${mainChar.ign} - ${mainChar.class}`, inline: false },
        { name: '🎭 Alt Characters', value: alts.length > 0 ? `${alts.length} alt(s)` : 'None', inline: true },
        { name: '📊 Subclasses', value: totalSubclasses > 0 ? `${totalSubclasses} subclass(es)` : 'None', inline: true }
      )
      .setFooter({ text: '💡 Only options with characters are available' })
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [row1, row2] });
  }
};
