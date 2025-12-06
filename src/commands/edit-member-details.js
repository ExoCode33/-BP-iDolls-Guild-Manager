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
      const mainRoleEmoji = this.getRoleEmoji(mainChar.role);
      
      embed.addFields({
        name: '⭐ MAIN CHARACTER',
        value: 
          '```ansi\n' +
          `\u001b[1;37m╭──────────────────────────────────╮\n` +
          `\u001b[1;37m│  \u001b[1;36m${mainChar.ign.padEnd(30)}\u001b[1;37m  │\n` +
          `\u001b[1;37m├──────────────────────────────────┤\n` +
          `\u001b[1;37m│  \u001b[1;33mClass:\u001b[0m    ${mainChar.class.padEnd(20)} \u001b[1;37m│\n` +
          `\u001b[1;37m│  \u001b[1;35mSubclass:\u001b[0m ${mainChar.subclass.padEnd(20)} \u001b[1;37m│\n` +
          `\u001b[1;37m│  ${mainRoleEmoji} \u001b[1;32mRole:\u001b[0m     ${mainChar.role.padEnd(20)} \u001b[1;37m│\n` +
          `\u001b[1;37m│  \u001b[1;34mGuild:\u001b[0m    ${(mainChar.guild || 'None').padEnd(20)} \u001b[1;37m│\n` +
          `\u001b[1;37m├──────────────────────────────────┤\n` +
          `\u001b[1;37m│  \u001b[1;31m⚡ Score:\u001b[0m  ${(mainChar.ability_score?.toLocaleString() || 'N/A').padEnd(20)} \u001b[1;37m│\n` +
          `\u001b[1;37m╰──────────────────────────────────╯\u001b[0m\n` +
          '```',
        inline: false
      });

      // === MAIN SUBCLASSES (if any) ===
      if (mainSubclasses.length > 0) {
        const subclassText = mainSubclasses.map((sc, i) => 
          `**${i + 1}.** \`${sc.class}\` › ${sc.subclass} • **${sc.ability_score?.toLocaleString() || 'N/A'}**`
        ).join('\n');

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
          const altRoleEmoji = this.getRoleEmoji(alt.role);
          
          let altValue = 
            '```ansi\n' +
            `\u001b[1;37m╭──────────────────────────────────╮\n` +
            `\u001b[1;37m│  \u001b[1;33m${alt.ign.padEnd(30)}\u001b[1;37m  │\n` +
            `\u001b[1;37m├──────────────────────────────────┤\n` +
            `\u001b[1;37m│  \u001b[1;36mClass:\u001b[0m ${`${alt.class} (${alt.subclass})`.padEnd(24)} \u001b[1;37m│\n` +
            `\u001b[1;37m│  ${altRoleEmoji} ${`${alt.role} • ${alt.guild || 'No Guild'}`.padEnd(28)} \u001b[1;37m│\n` +
            `\u001b[1;37m│  \u001b[1;31m⚡ Score:\u001b[0m  ${(alt.ability_score?.toLocaleString() || 'N/A').padEnd(18)} \u001b[1;37m│\n` +
            `\u001b[1;37m╰──────────────────────────────────╯\u001b[0m\n` +
            '```';

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

  // Helper: Get role emoji
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
