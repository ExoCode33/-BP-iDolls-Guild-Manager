import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { queries } from '../database/queries.js';

export default {
  data: new SlashCommandBuilder()
    .setName('edit-member-details')
    .setDescription('Manage your character registrations'),

  async execute(interaction) {
    try {
      await this.showMainMenu(interaction);
    } catch (error) {
      console.error('Error in edit-member-details command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred. Please try again.')
        .setTimestamp();
      
      const replyMethod = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
      await interaction[replyMethod]({ embeds: [errorEmbed], ephemeral: true });
    }
  },

  async showMainMenu(interaction, isUpdate = false) {
    // Get all user data
    const allCharacters = await queries.getAllCharactersWithSubclasses(interaction.user.id);
    const userTimezone = await queries.getUserTimezone(interaction.user.id);

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
        name: `${interaction.user.tag}'s Character Profile`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
      })
      .setThumbnail(interaction.user.displayAvatarURL({ size: 512 }))
      .setTimestamp();

    if (!mainChar) {
      // === NO MAIN CHARACTER - Welcome Screen ===
      embed.setDescription(
        '```ansi\n' +
        '\u001b[1;36m╔════════════════════════════════╗\n' +
        '\u001b[1;36m║   \u001b[1;33mWelcome to Registration!   \u001b[1;36m║\n' +
        '\u001b[1;36m╚════════════════════════════════╝\u001b[0m\n' +
        '```\n' +
        '> **Get started by registering your main character!**\n' +
        '> \n' +
        '> Click the button below to begin your journey.\n'
      );
      
      embed.addFields({
        name: '✨ What you can do:',
        value: '> • Register your **Main Character**\n> • Add **Alt Characters**\n> • Track **Subclasses**\n> • Manage your **Guild** membership',
        inline: false
      });
    } else {
      // === PROFILE HEADER ===
      const timezoneDisplay = userTimezone?.timezone 
        ? `🌍 ${userTimezone.timezone}` 
        : '🌍 *No timezone set*';
      
      embed.setDescription(
        `${timezoneDisplay}\n` +
        `📊 **Total Characters:** ${allCharacters.length}\n`
      );

      // === MAIN CHARACTER CARD ===
      const mainScoreBar = this.createSimpleScoreBar(mainChar.ability_score);
      const mainRoleEmoji = this.getRoleEmoji(mainChar.role);
      
      embed.addFields({
        name: '⭐ MAIN CHARACTER',
        value: 
          '```ansi\n' +
          `\u001b[1;37m╭─────────────────────────────────╮\n` +
          `\u001b[1;37m│ \u001b[1;36m${this.padText(mainChar.ign, 31)}\u001b[1;37m │\n` +
          `\u001b[1;37m├─────────────────────────────────┤\n` +
          `\u001b[1;37m│ \u001b[1;33mClass:\u001b[0m    ${this.padText(mainChar.class, 21)} \u001b[1;37m│\n` +
          `\u001b[1;37m│ \u001b[1;35mSubclass:\u001b[0m ${this.padText(mainChar.subclass, 21)} \u001b[1;37m│\n` +
          `\u001b[1;37m│ ${mainRoleEmoji} \u001b[1;32mRole:\u001b[0m     ${this.padText(mainChar.role, 21)} \u001b[1;37m│\n` +
          `\u001b[1;37m│ \u001b[1;34mGuild:\u001b[0m    ${this.padText(mainChar.guild || 'None', 21)} \u001b[1;37m│\n` +
          `\u001b[1;37m├─────────────────────────────────┤\n` +
          `\u001b[1;37m│ \u001b[1;31m⚡ Score:\u001b[0m  ${this.padText(mainChar.ability_score?.toLocaleString() || 'N/A', 21)} \u001b[1;37m│\n` +
          `\u001b[1;37m╰─────────────────────────────────╯\u001b[0m\n` +
          '```' +
          `${mainScoreBar}`,
        inline: false
      });

      // === MAIN SUBCLASSES (if any) ===
      if (mainSubclasses.length > 0) {
        const subclassText = mainSubclasses.map((sc, i) => {
          const scoreBar = this.createMiniScoreBar(sc.ability_score);
          return (
            `**${i + 1}.** \`${sc.class}\` › ${sc.subclass}\n` +
            `${scoreBar} **${sc.ability_score?.toLocaleString() || 'N/A'}**`
          );
        }).join('\n\n');

        embed.addFields({
          name: '📌 Main Subclasses',
          value: subclassText,
          inline: false
        });
      }

      // === ALT CHARACTERS (if any) ===
      if (altsWithSubclasses.length > 0) {
        embed.addFields({
          name: '\u200B',
          value: '```\n' + '─'.repeat(35) + '\n```',
          inline: false
        });

        altsWithSubclasses.forEach((alt, altIndex) => {
          const altScoreBar = this.createMiniScoreBar(alt.ability_score);
          const altRoleEmoji = this.getRoleEmoji(alt.role);
          
          let altValue = 
            '```ansi\n' +
            `\u001b[1;37m╭─────────────────────────────────╮\n` +
            `\u001b[1;37m│ \u001b[1;33m${this.padText(alt.ign, 31)}\u001b[1;37m │\n` +
            `\u001b[1;37m├─────────────────────────────────┤\n` +
            `\u001b[1;37m│ \u001b[1;36mClass:\u001b[0m ${this.padText(`${alt.class} (${alt.subclass})`, 24)} \u001b[1;37m│\n` +
            `\u001b[1;37m│ ${altRoleEmoji} ${this.padText(`${alt.role} • ${alt.guild || 'No Guild'}`, 29)} \u001b[1;37m│\n` +
            `\u001b[1;37m╰─────────────────────────────────╯\u001b[0m\n` +
            '```' +
            `${altScoreBar} **${alt.ability_score?.toLocaleString() || 'N/A'}**`;

          // Alt's Subclasses
          if (alt.subclasses.length > 0) {
            const altSubText = alt.subclasses.map((sc, i) => 
              `└ \`${sc.class}\` › ${sc.subclass} • **${sc.ability_score?.toLocaleString() || 'N/A'}**`
            ).join('\n');
            altValue += '\n' + altSubText;
          }

          embed.addFields({
            name: `📋 Alt Character ${altIndex + 1}`,
            value: altValue,
            inline: false
          });
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
      embed.setFooter({ text: 'Click "Add Main Character" to begin your adventure' });
    }

    // === BUILD PREMIUM BUTTON ROWS ===
    const rows = this.buildPremiumButtonRows(mainChar, mainSubclasses, altsWithSubclasses, interaction.user.id);

    if (isUpdate) {
      await interaction.update({ embeds: [embed], components: rows });
    } else {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [embed], components: rows, ephemeral: true });
      } else {
        await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
      }
    }
  },

  buildPremiumButtonRows(mainChar, mainSubclasses, alts, userId) {
    const rows = [];

    if (!mainChar) {
      // === NO MAIN CHARACTER - Single large button ===
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`char_add_main_${userId}`)
          .setLabel('⭐ Register Main Character')
          .setStyle(ButtonStyle.Success)
      );
      rows.push(row1);
    } else {
      // === ROW 1: Main Character Actions (2 buttons, equal width) ===
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`char_edit_main_${userId}`)
          .setLabel('Edit Main')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✏️'),
        new ButtonBuilder()
          .setCustomId(`subclass_add_to_main_${userId}`)
          .setLabel('Add Subclass')
          .setStyle(ButtonStyle.Success)
          .setEmoji('📌')
      );
      rows.push(row1);

      // === ROW 2: Alt Character Actions (2 buttons, equal width) ===
      const row2 = new ActionRowBuilder();
      
      row2.addComponents(
        new ButtonBuilder()
          .setCustomId(`char_add_alt_${userId}`)
          .setLabel('Add Alt')
          .setStyle(ButtonStyle.Success)
          .setEmoji('➕')
      );

      if (alts.length > 0) {
        row2.addComponents(
          new ButtonBuilder()
            .setCustomId(`subclass_add_to_alt_${userId}`)
            .setLabel('Add Alt Subclass')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📌')
        );
      }

      rows.push(row2);

      // === ROW 3: Removal Actions (Equal width, all danger red) ===
      const row3 = new ActionRowBuilder();
      
      const totalSubclasses = mainSubclasses.length + alts.reduce((sum, alt) => sum + alt.subclasses.length, 0);
      
      if (totalSubclasses > 0) {
        row3.addComponents(
          new ButtonBuilder()
            .setCustomId(`subclass_remove_${userId}`)
            .setLabel('Remove Subclass')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️')
        );
      }

      if (alts.length > 0) {
        row3.addComponents(
          new ButtonBuilder()
            .setCustomId(`char_remove_alt_${userId}`)
            .setLabel('Remove Alt')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('➖')
        );
      }

      row3.addComponents(
        new ButtonBuilder()
          .setCustomId(`char_remove_main_${userId}`)
          .setLabel('Remove Main')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️')
      );

      // Only add row 3 if it has buttons
      if (row3.components.length > 0) {
        rows.push(row3);
      }
    }

    return rows;
  },

  // Helper: Create simple score indicator
  createSimpleScoreBar(score) {
    if (!score) return '`No score set`';
    
    let color = '🟢'; // Green
    let tier = 'Beginner';
    
    if (score >= 40000) {
      color = '🟣';
      tier = 'Master';
    } else if (score >= 30000) {
      color = '🔴';
      tier = 'Expert';
    } else if (score >= 20000) {
      color = '🟡';
      tier = 'Advanced';
    } else if (score >= 10000) {
      color = '🟢';
      tier = 'Intermediate';
    }
    
    return `${color} **${tier}** Tier`;
  },

  // Helper: Create mini progress indicator
  createMiniScoreBar(score) {
    if (!score) return '⚪⚪⚪⚪⚪';
    
    const maxScore = 60000;
    const percentage = Math.min((score / maxScore) * 100, 100);
    const filledBlocks = Math.floor(percentage / 20); // 5 blocks total
    const emptyBlocks = 5 - filledBlocks;
    
    let color = '🟢';
    if (score >= 40000) color = '🟣';
    else if (score >= 30000) color = '🔴';
    else if (score >= 20000) color = '🟡';
    
    return color.repeat(filledBlocks) + '⚪'.repeat(emptyBlocks);
  },

  // Helper: Pad text to specific length
  padText(text, length) {
    const str = String(text);
    if (str.length >= length) return str.substring(0, length);
    return str + ' '.repeat(length - str.length);
  },

  // Helper: Get role emoji with ANSI color
  getRoleEmoji(role) {
    const roleEmojis = {
      'Tank': '🛡️',
      'DPS': '⚔️',
      'Support': '💚'
    };
    return roleEmojis[role] || '⭐';
  },

  async handleBackToMenu(interaction) {
    await this.showMainMenu(interaction, true);
  }
};import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { queries } from '../database/queries.js';

export default {
  data: new SlashCommandBuilder()
    .setName('edit-member-details')
    .setDescription('Manage your character registrations'),

  async execute(interaction) {
    try {
      await this.showMainMenu(interaction);
    } catch (error) {
      console.error('Error in edit-member-details command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred. Please try again.')
        .setTimestamp();
      
      const replyMethod = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
      await interaction[replyMethod]({ embeds: [errorEmbed], ephemeral: true });
    }
  },

  async showMainMenu(interaction, isUpdate = false) {
    // Get all user data
    const allCharacters = await queries.getAllCharactersWithSubclasses(interaction.user.id);
    const userTimezone = await queries.getUserTimezone(interaction.user.id);

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
        name: `${interaction.user.tag}'s Character Profile`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
      })
      .setThumbnail(interaction.user.displayAvatarURL({ size: 512 }))
      .setTimestamp();

    if (!mainChar) {
      // === NO MAIN CHARACTER - Welcome Screen ===
      embed.setDescription(
        '```ansi\n' +
        '\u001b[1;36m╔════════════════════════════════╗\n' +
        '\u001b[1;36m║   \u001b[1;33mWelcome to Registration!   \u001b[1;36m║\n' +
        '\u001b[1;36m╚════════════════════════════════╝\u001b[0m\n' +
        '```\n' +
        '> **Get started by registering your main character!**\n' +
        '> \n' +
        '> Click the button below to begin your journey.\n'
      );
      
      embed.addFields({
        name: '✨ What you can do:',
        value: '> • Register your **Main Character**\n> • Add **Alt Characters**\n> • Track **Subclasses**\n> • Manage your **Guild** membership',
        inline: false
      });
    } else {
      // === PROFILE HEADER ===
      const timezoneDisplay = userTimezone?.timezone 
        ? `🌍 ${userTimezone.timezone}` 
        : '🌍 *No timezone set*';
      
      embed.setDescription(
        `${timezoneDisplay}\n` +
        `📊 **Total Characters:** ${allCharacters.length}\n` +
        '```\n' + '═'.repeat(35) + '\n```'
      );

      // === MAIN CHARACTER CARD ===
      const mainScoreBar = this.createScoreBar(mainChar.ability_score);
      const mainRoleEmoji = this.getRoleEmoji(mainChar.role);
      
      embed.addFields({
        name: '⭐ MAIN CHARACTER',
        value: 
          '```ansi\n' +
          `\u001b[1;37m┌─ \u001b[1;36m${mainChar.ign}\u001b[1;37m ─────────────────────\n` +
          `\u001b[1;37m│\u001b[0m\n` +
          `\u001b[1;37m│ \u001b[1;33mClass:\u001b[0m    ${mainChar.class}\n` +
          `\u001b[1;37m│ \u001b[1;35mSubclass:\u001b[0m ${mainChar.subclass}\n` +
          `\u001b[1;37m│ ${mainRoleEmoji} \u001b[1;32mRole:\u001b[0m     ${mainChar.role}\n` +
          `\u001b[1;37m│ \u001b[1;34mGuild:\u001b[0m    ${mainChar.guild || 'None'}\n` +
          `\u001b[1;37m│\u001b[0m\n` +
          `\u001b[1;37m│ \u001b[1;31m⚡ Ability Score:\u001b[0m ${mainChar.ability_score?.toLocaleString() || 'N/A'}\n` +
          `\u001b[1;37m└──────────────────────────────\u001b[0m\n` +
          '```' +
          mainScoreBar,
        inline: false
      });

      // === MAIN SUBCLASSES (if any) ===
      if (mainSubclasses.length > 0) {
        const subclassText = mainSubclasses.map((sc, i) => {
          const scoreBar = this.createMiniScoreBar(sc.ability_score);
          return (
            `**${i + 1}.** \`${sc.class}\` **›** ${sc.subclass}\n` +
            `${scoreBar} ${sc.ability_score?.toLocaleString() || 'N/A'}`
          );
        }).join('\n\n');

        embed.addFields({
          name: '📌 Main Subclasses',
          value: subclassText,
          inline: false
        });
      }

      // === ALT CHARACTERS (if any) ===
      if (altsWithSubclasses.length > 0) {
        embed.addFields({
          name: '\u200B',
          value: '```\n' + '─'.repeat(35) + '\n```',
          inline: false
        });

        altsWithSubclasses.forEach((alt, altIndex) => {
          const altScoreBar = this.createMiniScoreBar(alt.ability_score);
          const altRoleEmoji = this.getRoleEmoji(alt.role);
          
          let altValue = 
            '```ansi\n' +
            `\u001b[1;37m┌─ \u001b[1;33m${alt.ign}\u001b[1;37m ─────────────────────\n` +
            `\u001b[1;37m│ \u001b[1;36mClass:\u001b[0m ${alt.class} (${alt.subclass})\n` +
            `\u001b[1;37m│ ${altRoleEmoji} ${alt.role} • ${alt.guild || 'No Guild'}\n` +
            `\u001b[1;37m└──────────────────────────────\u001b[0m\n` +
            '```' +
            `${altScoreBar} **${alt.ability_score?.toLocaleString() || 'N/A'}**`;

          // Alt's Subclasses
          if (alt.subclasses.length > 0) {
            const altSubText = alt.subclasses.map((sc, i) => 
              `  └ \`${sc.class}\` › ${sc.subclass} • ${sc.ability_score?.toLocaleString() || 'N/A'}`
            ).join('\n');
            altValue += '\n' + altSubText;
          }

          embed.addFields({
            name: `📋 Alt Character ${altIndex + 1}`,
            value: altValue,
            inline: false
          });
        });
      }
    }

    // Footer
    const totalChars = allCharacters.length;
    if (totalChars > 0) {
      embed.setFooter({ 
        text: `${totalChars} character${totalChars !== 1 ? 's' : ''} registered • Last updated`,
        iconURL: 'https://cdn.discordapp.com/emojis/1234567890123456789.png' // Optional: add a small icon
      });
    } else {
      embed.setFooter({ text: 'Click "Add Main Character" to begin your adventure' });
    }

    // === BUILD PREMIUM BUTTON ROWS ===
    const rows = this.buildPremiumButtonRows(mainChar, mainSubclasses, altsWithSubclasses, interaction.user.id);

    if (isUpdate) {
      await interaction.update({ embeds: [embed], components: rows });
    } else {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [embed], components: rows, ephemeral: true });
      } else {
        await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
      }
    }
  },

  buildPremiumButtonRows(mainChar, mainSubclasses, alts, userId) {
    const rows = [];

    if (!mainChar) {
      // === NO MAIN CHARACTER - Single large button ===
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`char_add_main_${userId}`)
          .setLabel('⭐ Register Main Character')
          .setStyle(ButtonStyle.Success)
      );
      rows.push(row1);
    } else {
      // === ROW 1: Main Character Actions (2 buttons, equal width) ===
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`char_edit_main_${userId}`)
          .setLabel('Edit Main')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✏️'),
        new ButtonBuilder()
          .setCustomId(`subclass_add_to_main_${userId}`)
          .setLabel('Add Subclass')
          .setStyle(ButtonStyle.Success)
          .setEmoji('📌')
      );
      rows.push(row1);

      // === ROW 2: Alt Character Actions (2 buttons, equal width) ===
      const row2 = new ActionRowBuilder();
      
      row2.addComponents(
        new ButtonBuilder()
          .setCustomId(`char_add_alt_${userId}`)
          .setLabel('Add Alt')
          .setStyle(ButtonStyle.Success)
          .setEmoji('➕')
      );

      if (alts.length > 0) {
        row2.addComponents(
          new ButtonBuilder()
            .setCustomId(`subclass_add_to_alt_${userId}`)
            .setLabel('Add Alt Subclass')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📌')
        );
      }

      rows.push(row2);

      // === ROW 3: Removal Actions (Equal width, all danger red) ===
      const row3 = new ActionRowBuilder();
      
      const totalSubclasses = mainSubclasses.length + alts.reduce((sum, alt) => sum + alt.subclasses.length, 0);
      
      if (totalSubclasses > 0) {
        row3.addComponents(
          new ButtonBuilder()
            .setCustomId(`subclass_remove_${userId}`)
            .setLabel('Remove Subclass')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️')
        );
      }

      if (alts.length > 0) {
        row3.addComponents(
          new ButtonBuilder()
            .setCustomId(`char_remove_alt_${userId}`)
            .setLabel('Remove Alt')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('➖')
        );
      }

      row3.addComponents(
        new ButtonBuilder()
          .setCustomId(`char_remove_main_${userId}`)
          .setLabel('Remove Main')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️')
      );

      // Only add row 3 if it has buttons
      if (row3.components.length > 0) {
        rows.push(row3);
      }
    }

    return rows;
  },

  // Helper: Create progress bar for ability score
  createScoreBar(score) {
    if (!score) return '';
    
    const maxScore = 60000;
    const percentage = Math.min((score / maxScore) * 100, 100);
    const filledBlocks = Math.floor(percentage / 5); // 20 blocks total
    const emptyBlocks = 20 - filledBlocks;
    
    let color = '🟩'; // Green
    if (score >= 40000) color = '🟪'; // Purple
    else if (score >= 30000) color = '🟥'; // Red
    else if (score >= 20000) color = '🟨'; // Yellow
    
    const bar = color.repeat(filledBlocks) + '⬜'.repeat(emptyBlocks);
    return `${bar} \`${percentage.toFixed(0)}%\``;
  },

  // Helper: Create mini progress bar
  createMiniScoreBar(score) {
    if (!score) return '⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜';
    
    const maxScore = 60000;
    const percentage = Math.min((score / maxScore) * 100, 100);
    const filledBlocks = Math.floor(percentage / 10); // 10 blocks total
    const emptyBlocks = 10 - filledBlocks;
    
    let color = '🟩';
    if (score >= 40000) color = '🟪';
    else if (score >= 30000) color = '🟥';
    else if (score >= 20000) color = '🟨';
    
    return color.repeat(filledBlocks) + '⬜'.repeat(emptyBlocks);
  },

  // Helper: Get role emoji with ANSI color
  getRoleEmoji(role) {
    const roleEmojis = {
      'Tank': '🛡️',
      'DPS': '⚔️',
      'Support': '💚'
    };
    return roleEmojis[role] || '⭐';
  },

  async handleBackToMenu(interaction) {
    await this.showMainMenu(interaction, true);
  }
};
