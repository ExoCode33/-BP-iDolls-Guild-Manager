import { SlashCommandBuilder } from 'discord.js';
import { startRegistrationFlow } from '../../handlers/registration.js';
import db from '../../services/database.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder().setName('register-user').setDescription('Register your main character'),
  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const mainChar = await db.getMainCharacter(userId);
      if (mainChar) return await interaction.reply({ content: '⚠️ Already have main! Use `/edit-user`.', ephemeral: true });
      await startRegistrationFlow(interaction, userId);
      logger.log(`User ${userId} started registration`);
    } catch (error) {
      logger.error(`Register error: ${error.message}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Error.', ephemeral: true });
      }
    }
  }
};
