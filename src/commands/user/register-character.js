import { SlashCommandBuilder } from 'discord.js';
import { startRegistrationFlow } from '../../handlers/registration.js';
import db from '../../services/database.js';
import logger from '../../utils/logger.js';
import config from '../../utils/config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('register-character')
    .setDescription('Register your main character'),
  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const mainChar = await db.getMainCharacter(userId);
      
      if (mainChar) {
        return await interaction.reply({ 
          content: '⚠️ Already have main! Use `/edit-character`.', 
          ephemeral: config.ephemeral.registerChar 
        });
      }
      
      await startRegistrationFlow(interaction, userId);
      logger.logAction(interaction.user.username, 'started registration');
    } catch (error) {
      logger.error(`Register error: ${error.message}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: '❌ Error.', 
          ephemeral: config.ephemeral.registerChar 
        });
      }
    }
  }
};
