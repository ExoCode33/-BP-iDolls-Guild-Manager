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
    
    // Get user's timezone separately
    const userTimezone = await queries.getUserTimezone(interaction.user.id);

    // Professional embed with proper hierarchy
    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('📋 Member Details Management')
      .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
      .setTimestamp();

    // Header: Discord Name & Timezone
    const headerValue = [
      `**Discord:** ${interaction.user.tag}`,
      `**Timezone:** ${userTimezone && userTimezone.timezone ? `🌍 ${userTimezone.timezone}` : '*Not set*'}`
    ].join('\n');

    embed.addFields({
      name: '👤 Profile Information',
      value: headerValue,
      inline: false
    });

    // Main Character Section
    if (mainChar) {
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
      }
      
      embed.setFooter({ text: `Total Characters: ${1 + alts.length} | Select an action below` });
    } else {
      embed.setDescription('**No characters registered yet!**\n\nGet started by adding your main character.');
      embed.setFooter({ text: 'Click "Add Main Character" to begin' });
    }

    // Build button rows
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

  async handleBackToMenu(interaction) {
    await this.showMainMenu(interaction, true);
  }
};
