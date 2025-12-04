import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { queries } from '../database/queries.js';
import googleSheets from '../services/googleSheets.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Manually sync all character data to Google Sheets (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
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
      await googleSheets.fullSync(allCharacters, allAlts);

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
      console.error('Error in sync command:', error);
      
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
  }
};
