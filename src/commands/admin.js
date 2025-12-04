import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { queries } from '../database/queries.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin commands for managing member registrations')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('manage-member')
        .setDescription('Manage a member\'s character registrations')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to manage')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view-member')
        .setDescription('View a member\'s character details')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to view')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list-all')
        .setDescription('List all registered members')
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
        case 'manage-member':
          await this.handleManageMember(interaction);
          break;
        case 'view-member':
          await this.handleViewMember(interaction);
          break;
        case 'list-all':
          await this.handleListAll(interaction);
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
      await interaction[replyMethod]({ embeds: [errorEmbed], ephemeral: true });
    }
  },

  async handleManageMember(interaction) {
    const targetUser = interaction.options.getUser('user');
    await this.showManagementMenu(interaction, targetUser);
  },

  async showManagementMenu(interaction, targetUser, isUpdate = false) {
    // Get target user's current registration status
    const mainChar = await queries.getMainCharacter(targetUser.id);
    const alts = mainChar ? await queries.getAltCharacters(targetUser.id) : [];

    const embed = new EmbedBuilder()
      .setColor('#FF6B00')
      .setTitle('🛡️ Admin: Member Management')
      .setDescription(`Managing **${targetUser.tag}**'s character registrations`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setFooter({ text: `Admin: ${interaction.user.tag}` })
      .setTimestamp();

    // Add current status
    if (mainChar) {
      embed.addFields(
        { 
          name: '⭐ Main Character', 
          value: `**${mainChar.ign}**\n${mainChar.class} (${mainChar.subclass})\n${mainChar.role}${mainChar.guild ? ` • ${mainChar.guild}` : ''}\n**Ability Score:** ${mainChar.ability_score || 'N/A'}`, 
          inline: true 
        }
      );
      
      if (alts.length > 0) {
        embed.addFields({
          name: '📋 Alt Characters',
          value: alts.map(alt => `• ${alt.ign} (${alt.class} - ${alt.subclass})`).join('\n'),
          inline: true
        });
      }
    } else {
      embed.addFields({
        name: '📝 Status',
        value: 'No main character registered',
        inline: false
      });
    }

    // Build button rows
    const rows = [];

    // Row 1: Main character actions
    const row1 = new ActionRowBuilder();
    
    if (!mainChar) {
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`admin_add_main_${targetUser.id}`)
          .setLabel('Add Main for User')
          .setStyle(ButtonStyle.Success)
          .setEmoji('⭐')
      );
    } else {
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`admin_remove_main_${targetUser.id}`)
          .setLabel('Remove Main')
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
          .setCustomId(`admin_add_alt_${targetUser.id}`)
          .setLabel('Add Alt for User')
          .setStyle(ButtonStyle.Success)
          .setEmoji('➕')
      );

      if (alts.length > 0) {
        row2.addComponents(
          new ButtonBuilder()
            .setCustomId(`admin_remove_alt_${targetUser.id}`)
            .setLabel('Remove Alt')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('➖')
        );
      }
      
      rows.push(row2);
    }

    // Row 3: View and Close buttons
    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_refresh_${targetUser.id}`)
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄'),
      new ButtonBuilder()
        .setCustomId(`admin_close_${targetUser.id}`)
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

  async handleViewMember(interaction) {
    const targetUser = interaction.options.getUser('user');
    const mainChar = await queries.getMainCharacter(targetUser.id);
    
    if (!mainChar) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ No Registration Found')
        .setDescription(`**${targetUser.tag}** has not registered any characters.`)
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const alts = await queries.getAltCharacters(targetUser.id);

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle(`📋 Character Details: ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setTimestamp();

    // Main character info
    const mainValue = [
      `**IGN:** ${mainChar.ign}`,
      `**Class:** ${mainChar.class} (${mainChar.subclass})`,
      `**Role:** ${mainChar.role}`,
      `**Ability Score:** ${mainChar.ability_score ? mainChar.ability_score.toLocaleString() : 'N/A'}`,
      mainChar.guild ? `**Guild:** ${mainChar.guild}` : null,
      mainChar.timezone ? `**Timezone:** ${mainChar.timezone}` : null,
      `**Registered:** ${new Date(mainChar.created_at).toLocaleDateString()}`
    ].filter(Boolean).join('\n');

    embed.addFields({
      name: '⭐ Main Character',
      value: mainValue,
      inline: false
    });

    // Alt characters
    if (alts.length > 0) {
      alts.forEach((alt, index) => {
        const altValue = [
          `**IGN:** ${alt.ign}`,
          `**Class:** ${alt.class} (${alt.subclass})`,
          `**Role:** ${alt.role}`
        ].join('\n');

        embed.addFields({
          name: `📋 Alt Character ${index + 1}`,
          value: altValue,
          inline: true
        });
      });
    }

    embed.setFooter({ text: `Total Characters: ${1 + alts.length}` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async handleListAll(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const allCharacters = await queries.getAllCharacters();
    
    if (allCharacters.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('📋 No Registrations')
        .setDescription('No members have registered yet.')
        .setTimestamp();
      
      return interaction.editReply({ embeds: [embed] });
    }

    // Group by guild
    const byGuild = {};
    const noGuild = [];

    for (const char of allCharacters) {
      if (char.guild) {
        if (!byGuild[char.guild]) byGuild[char.guild] = [];
        byGuild[char.guild].push(char);
      } else {
        noGuild.push(char);
      }
    }

    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('📋 All Registered Members')
      .setDescription(`Total: **${allCharacters.length}** members`)
      .setTimestamp();

    // Add guild sections
    for (const [guild, members] of Object.entries(byGuild)) {
      const memberList = members
        .map(m => `• ${m.discord_name} - ${m.ign} (${m.class} - ${m.role})`)
        .join('\n');
      
      embed.addFields({
        name: `🏰 ${guild} (${members.length})`,
        value: memberList.substring(0, 1024), // Discord field limit
        inline: false
      });
    }

    // Add no guild section
    if (noGuild.length > 0) {
      const memberList = noGuild
        .map(m => `• ${m.discord_name} - ${m.ign} (${m.class} - ${m.role})`)
        .join('\n');
      
      embed.addFields({
        name: `📝 No Guild (${noGuild.length})`,
        value: memberList.substring(0, 1024),
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },

  async handleSync(interaction) {
    const googleSheets = await import('../services/googleSheets.js');
    
    try {
      const startEmbed = new EmbedBuilder()
        .setColor('#6640D9')
        .setTitle('🔄 Starting Sync...')
        .setDescription('Syncing all character data to Google Sheets. This may take a moment.')
        .setTimestamp();
      
      await interaction.deferReply({ ephemeral: true });
      await interaction.editReply({ embeds: [startEmbed] });

      // Get all data
      const allCharacters = await queries.getAllCharacters();
      const allAlts = await queries.getAllAlts();

      // Sync to Google Sheets
      await googleSheets.default.fullSync(allCharacters, allAlts);

      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Sync Complete!')
        .setDescription('All character data has been successfully synced to Google Sheets.')
        .addFields(
          { name: '⭐ Main Characters', value: `${allCharacters.length} synced`, inline: true },
          { name: '📋 Alt Characters', value: `${allAlts.length} synced`, inline: true },
          { name: '📊 Total', value: `${allCharacters.length + allAlts.length} characters`, inline: true }
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

  async handleRefresh(interaction, targetUserId) {
    const targetUser = await interaction.client.users.fetch(targetUserId);
    await this.showManagementMenu(interaction, targetUser, true);
  },

  async handleClose(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('✅ Admin Panel Closed')
      .setDescription('Management session ended.')
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });
  }
};
