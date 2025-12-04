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
    // Get user's current registration status
    const mainChar = await queries.getMainCharacter(interaction.user.id);
    const alts = mainChar ? await queries.getAltCharacters(interaction.user.id) : [];

    // ✅ IMPROVED: Create detailed embed like view-char
    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('📋 Member Details Management')
      .setAuthor({ 
        name: `${interaction.user.tag}'s Profile`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
      .setFooter({ text: '💡 Select an action below' })
      .setTimestamp();

    // Add current status with full details
    if (mainChar) {
      const classEmoji = this.getClassEmoji(mainChar.class);
      const roleEmoji = this.getRoleEmoji(mainChar.role);
      
      const mainCharValue = [
        `**IGN:** ${mainChar.ign}`,
        `**Class:** ${classEmoji} ${mainChar.class}`,
        `**Subclass:** ${mainChar.subclass}`,
        `**Role:** ${roleEmoji} ${mainChar.role}`,
        `**Ability Score:** ${mainChar.ability_score ? `💪 ${mainChar.ability_score.toLocaleString()}` : '*Not set*'}`,
        mainChar.guild ? `**Guild:** 🏰 ${mainChar.guild}` : '*No guild*',
        mainChar.timezone ? `**Timezone:** 🌍 ${mainChar.timezone}` : '*No timezone*',
        `**Registered:** 📅 ${new Date(mainChar.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      ].join('\n');

      embed.addFields({
        name: '⭐ Main Character',
        value: mainCharValue,
        inline: false
      });
      
      if (alts.length > 0) {
        // Show alts in groups of 3 for better layout
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
      } else {
        embed.addFields({
          name: '📋 Alt Characters',
          value: '*No alt characters registered*',
          inline: false
        });
      }
    } else {
      embed.setDescription('**No characters registered yet!**\nGet started by adding your main character below.');
      embed.addFields({
        name: '🎮 Ready to Begin?',
        value: 'Click **Add Main Character** to register your first character!',
        inline: false
      });
    }

    // Build button rows based on current state
    const rows = [];

    // Row 1: Main character actions
    const row1 = new ActionRowBuilder();
    
    if (!mainChar) {
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`edit_add_main_${interaction.user.id}`)
          .setLabel('Add Main Character')
          .setStyle(ButtonStyle.Success)
          .setEmoji('⭐')
      );
    } else {
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`edit_update_main_${interaction.user.id}`)
          .setLabel('Edit Main Character')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✏️'),
        new ButtonBuilder()
          .setCustomId(`edit_remove_main_${interaction.user.id}`)
          .setLabel('Remove Main Character')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️')
      );
    }
    
    rows.push(row1);

    // Row 2: Alt character actions (only if they have a main)
    if (mainChar) {
      const row2 = new ActionRowBuilder();
      
      row2.addComponents(
        new ButtonBuilder()
          .setCustomId(`edit_add_alt_${interaction.user.id}`)
          .setLabel('Add Alt Character')
          .setStyle(ButtonStyle.Success)
          .setEmoji('➕')
      );

      if (alts.length > 0) {
        row2.addComponents(
          new ButtonBuilder()
            .setCustomId(`edit_remove_alt_${interaction.user.id}`)
            .setLabel('Remove Alt Character')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('➖')
        );
      }
      
      rows.push(row2);
    }

    // Row 3: Close button only (removed View All Characters since we show everything now)
    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`edit_close_${interaction.user.id}`)
        .setLabel('Close')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌')
    );
    
    rows.push(row3);

    if (isUpdate) {
      await interaction.update({ embeds: [embed], components: rows });
    } else {
      await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    }
  },

  async handleViewChars(interaction) {
    // This is now redundant since main menu shows everything
    // But keeping it for backwards compatibility
    const viewChar = await import('./view-char.js');
    await viewChar.default.execute(interaction);
  },

  async handleBackToMenu(interaction) {
    await this.showMainMenu(interaction, true);
  },

  async handleClose(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('✅ Menu Closed')
      .setDescription('You can reopen this menu anytime with `/edit-member-details`')
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });
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
