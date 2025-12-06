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

    // Build professional embed with better layout
    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('📋 Character Profile')
      .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
      .setTimestamp();

    // === PROFILE INFO SECTION (Compact) ===
    const profileInfo = [
      `**👤 Discord:** ${interaction.user.tag}`,
      `**🌍 Timezone:** ${userTimezone?.timezone ? `${userTimezone.timezone}` : '*Not set*'}`
    ].join('\n');

    embed.addFields({
      name: '\u200B', // Invisible character for spacing
      value: profileInfo,
      inline: false
    });

    // === MAIN CHARACTER SECTION ===
    if (mainChar) {
      // Main character header with separator
      embed.addFields({
        name: '⭐ ━━━━━━━ MAIN CHARACTER ━━━━━━━',
        value: '\u200B',
        inline: false
      });

      // Main stats in 2 columns
      embed.addFields(
        { 
          name: '🎮 IGN', 
          value: `**${mainChar.ign}**`, 
          inline: true 
        },
        { 
          name: '🎭 Class', 
          value: `**${mainChar.class}**\n${mainChar.subclass}`, 
          inline: true 
        },
        { 
          name: '⚔️ Role', 
          value: `**${mainChar.role}**`, 
          inline: true 
        }
      );

      // Second row of stats
      embed.addFields(
        { 
          name: '💪 Ability Score', 
          value: mainChar.ability_score ? `**${mainChar.ability_score.toLocaleString()}**` : '*Not set*', 
          inline: true 
        },
        { 
          name: '🏰 Guild', 
          value: mainChar.guild ? `**${mainChar.guild}**` : '*Not set*', 
          inline: true 
        },
        {
          name: '\u200B', // Empty space for alignment
          value: '\u200B',
          inline: true
        }
      );

      // Main Character Subclasses (condensed)
      if (mainSubclasses.length > 0) {
        const subclassList = mainSubclasses.map((sc, i) => 
          `**${i + 1}.** ${sc.class} (${sc.subclass}) • ${sc.ability_score?.toLocaleString() || 'N/A'}`
        ).join('\n');

        embed.addFields({
          name: '📌 Main Subclasses',
          value: subclassList,
          inline: false
        });
      }
    } else {
      embed.setDescription('**No main character registered yet!**\n\n*Get started by adding your main character below.*');
    }

    // === ALT CHARACTERS SECTION ===
    if (altsWithSubclasses.length > 0) {
      embed.addFields({
        name: '📋 ━━━━━━━ ALT CHARACTERS ━━━━━━━',
        value: '\u200B',
        inline: false
      });

      altsWithSubclasses.forEach((alt, altIndex) => {
        const altInfo = [
          `**${alt.ign}** • ${alt.class} (${alt.subclass})`,
          `⚔️ ${alt.role} • 💪 ${alt.ability_score?.toLocaleString() || 'N/A'}`,
          alt.guild ? `🏰 ${alt.guild}` : ''
        ].filter(Boolean).join(' • ');

        embed.addFields({
          name: `${altIndex + 1}. Alt Character`,
          value: altInfo,
          inline: false
        });

        // Alt's Subclasses (condensed)
        if (alt.subclasses.length > 0) {
          const subclassList = alt.subclasses.map((sc, i) => 
            `  └ ${sc.class} (${sc.subclass}) • ${sc.ability_score?.toLocaleString() || 'N/A'}`
          ).join('\n');

          embed.addFields({
            name: '\u200B',
            value: subclassList,
            inline: false
          });
        }
      });
    }

    // Footer with total count
    const totalChars = allCharacters.length;
    if (totalChars > 0) {
      embed.setFooter({ text: `Total: ${totalChars} character${totalChars !== 1 ? 's' : ''} • Select an action below` });
    } else {
      embed.setFooter({ text: 'Click "Add Main Character" to begin' });
    }

    // === BUILD BUTTON ROWS (Improved Layout) ===
    const rows = this.buildImprovedButtonRows(mainChar, mainSubclasses, altsWithSubclasses, interaction.user.id);

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

  buildImprovedButtonRows(mainChar, mainSubclasses, alts, userId) {
    const rows = [];

    if (!mainChar) {
      // === NO MAIN CHARACTER - Single prominent button ===
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`char_add_main_${userId}`)
          .setLabel('Add Main Character')
          .setStyle(ButtonStyle.Success)
          .setEmoji('⭐')
      );
      rows.push(row1);
    } else {
      // === ROW 1: Primary Actions (Main Management) ===
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`char_edit_main_${userId}`)
          .setLabel('Edit Main')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✏️'),
        new ButtonBuilder()
          .setCustomId(`subclass_add_to_main_${userId}`)
          .setLabel('Add Subclass to Main')
          .setStyle(ButtonStyle.Success)
          .setEmoji('📌')
      );
      rows.push(row1);

      // === ROW 2: Alt Character Actions ===
      const row2 = new ActionRowBuilder();
      
      row2.addComponents(
        new ButtonBuilder()
          .setCustomId(`char_add_alt_${userId}`)
          .setLabel('Add Alt Character')
          .setStyle(ButtonStyle.Success)
          .setEmoji('➕')
      );

      if (alts.length > 0) {
        row2.addComponents(
          new ButtonBuilder()
            .setCustomId(`subclass_add_to_alt_${userId}`)
            .setLabel('Add Subclass to Alt')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📌')
        );
      }

      rows.push(row2);

      // === ROW 3: Removal Actions (Danger) ===
      const row3 = new ActionRowBuilder();
      
      // Check if there are any subclasses to remove
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

      rows.push(row3);
    }

    return rows;
  },

  async handleBackToMenu(interaction) {
    await this.showMainMenu(interaction, true);
  }
};
