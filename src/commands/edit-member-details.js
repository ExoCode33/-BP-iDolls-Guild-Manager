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

    // Build professional embed
    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('📋 Character Management')
      .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
      .setTimestamp();

    // Header: Discord Name & Timezone
    const headerValue = [
      `**Discord:** ${interaction.user.tag}`,
      `**Timezone:** ${userTimezone?.timezone ? `🌍 ${userTimezone.timezone}` : '*Not set*'}`
    ].join('\n');

    embed.addFields({
      name: '👤 Profile Information',
      value: headerValue,
      inline: false
    });

    // Main Character Section
    if (mainChar) {
      const mainValue = [
        `**IGN:** ${mainChar.ign}`,
        `**Class:** ${mainChar.class} (${mainChar.subclass})`,
        `**Role:** ${mainChar.role}`,
        `**Ability Score:** ${mainChar.ability_score?.toLocaleString() || '*Not set*'}`,
        `**Guild:** ${mainChar.guild || '*Not set*'}`
      ].join('\n');

      embed.addFields({
        name: '⭐ Main Character',
        value: mainValue,
        inline: false
      });

      // Main Character Subclasses
      if (mainSubclasses.length > 0) {
        mainSubclasses.forEach((subclass, index) => {
          const subclassValue = [
            `**Class:** ${subclass.class} (${subclass.subclass})`,
            `**Ability Score:** ${subclass.ability_score?.toLocaleString() || '*Not set*'}`
          ].join('\n');

          embed.addFields({
            name: `  📌 Subclass ${index + 1}`,
            value: subclassValue,
            inline: true
          });
        });
      }
      
      // Spacer after main section if there are alts
      if (altsWithSubclasses.length > 0) {
        embed.addFields({ name: '\u200B', value: '\u200B', inline: false });
      }
    } else {
      embed.setDescription('**No main character registered yet!**\n\nGet started by adding your main character.');
    }

    // Alt Characters Section
    altsWithSubclasses.forEach((alt, altIndex) => {
      const altValue = [
        `**IGN:** ${alt.ign}`,
        `**Class:** ${alt.class} (${alt.subclass})`,
        `**Role:** ${alt.role}`,
        `**Ability Score:** ${alt.ability_score?.toLocaleString() || '*Not set*'}`,
        `**Guild:** ${alt.guild || '*Not set*'}`
      ].join('\n');

      embed.addFields({
        name: `📋 Alt Character ${altIndex + 1}`,
        value: altValue,
        inline: false
      });

      // Alt's Subclasses
      if (alt.subclasses.length > 0) {
        alt.subclasses.forEach((subclass, subIndex) => {
          const subclassValue = [
            `**Class:** ${subclass.class} (${subclass.subclass})`,
            `**Ability Score:** ${subclass.ability_score?.toLocaleString() || '*Not set*'}`
          ].join('\n');

          embed.addFields({
            name: `  📌 Subclass ${subIndex + 1}`,
            value: subclassValue,
            inline: true
          });
        });
      }

      // Spacer between alts
      if (altIndex < altsWithSubclasses.length - 1) {
        embed.addFields({ name: '\u200B', value: '\u200B', inline: false });
      }
    });

    // Footer
    const totalChars = allCharacters.length;
    embed.setFooter({ text: totalChars > 0 ? `Total: ${totalChars} character${totalChars !== 1 ? 's' : ''} | Select an action below` : 'Click "Add Main Character" to begin' });

    // Build button rows
    const rows = this.buildButtonRows(mainChar, mainSubclasses, altsWithSubclasses, interaction.user.id);

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

  buildButtonRows(mainChar, mainSubclasses, alts, userId) {
    const rows = [];

    if (!mainChar) {
      // No main character - only show "Add Main" button
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`char_add_main_${userId}`)
          .setLabel('Add Main Character')
          .setStyle(ButtonStyle.Success)
          .setEmoji('⭐')
      );
      rows.push(row1);
    } else {
      // Has main character - show main actions
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`char_edit_main_${userId}`)
          .setLabel('Edit Main')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✏️'),
        new ButtonBuilder()
          .setCustomId(`char_remove_main_${userId}`)
          .setLabel('Remove Main')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️'),
        new ButtonBuilder()
          .setCustomId(`subclass_add_to_main_${userId}`)
          .setLabel('Add Subclass to Main')
          .setStyle(ButtonStyle.Success)
          .setEmoji('📌')
      );
      rows.push(row1);

      // Alt actions
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`char_add_alt_${userId}`)
          .setLabel('Add Alt Character')
          .setStyle(ButtonStyle.Success)
          .setEmoji('➕')
      );

      if (alts.length > 0) {
        row2.addComponents(
          new ButtonBuilder()
            .setCustomId(`char_remove_alt_${userId}`)
            .setLabel('Remove Alt')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('➖'),
          new ButtonBuilder()
            .setCustomId(`subclass_add_to_alt_${userId}`)
            .setLabel('Add Subclass to Alt')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📌')
        );
      }

      rows.push(row2);

      // Subclass removal (if any exist)
      const totalSubclasses = mainSubclasses.length + alts.reduce((sum, alt) => sum + alt.subclasses.length, 0);
      if (totalSubclasses > 0) {
        const row3 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`subclass_remove_${userId}`)
            .setLabel('Remove Subclass')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️')
        );
        rows.push(row3);
      }
    }

    return rows;
  },

  async handleBackToMenu(interaction) {
    await this.showMainMenu(interaction, true);
  }
};
