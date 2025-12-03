import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { queries } from '../database/queries.js';
import googleSheets from '../services/googleSheets.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Manually sync all character data to Google Sheets (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      // Get all data
      const allCharacters = await queries.getAllCharacters();
      const allAlts = await queries.getAllAlts();

      // Sync to Google Sheets
      await googleSheets.fullSync(allCharacters, allAlts);

      await interaction.editReply({
        content: `✅ **Sync Complete!**\n\n` +
          `📊 Synced ${allCharacters.length} main characters\n` +
          `📋 Synced ${allAlts.length} alt characters\n\n` +
          `Data has been updated in Google Sheets.`
      });

    } catch (error) {
      console.error('Error in sync command:', error);
      await interaction.editReply({
        content: '❌ An error occurred while syncing to Google Sheets. Please check the logs.'
      });
    }
  }
};
