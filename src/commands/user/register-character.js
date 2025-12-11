import pkg from 'discord.js';
const { SlashCommandBuilder, EmbedBuilder } = pkg;
import db from '../../services/database.js';
import logger from '../../utils/logger.js';
import config from '../../utils/config.js';
import { buildCharacterButtons } from '../../components/buttons/characterButtons.js';

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
          content: '⚠️ You already have a main character registered! Use `/edit-character` to modify it.', 
          ephemeral: config.ephemeral.registerChar 
        });
      }
      
      // Show initial registration button
      const embed = new EmbedBuilder()
        .setColor('#EC4899')
        .setTitle('🎮 Character Registration')
        .setDescription('Click the button below to start registering your main character!')
        .setTimestamp();

      const buttons = buildCharacterButtons(null, 0, 0, userId);
      
      await interaction.reply({ 
        embeds: [embed], 
        components: buttons, 
        ephemeral: config.ephemeral.registerChar 
      });
      
      logger.logAction(interaction.user.tag, 'started registration');
    } catch (error) {
      logger.error(`Register error: ${error.message}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: '❌ Error starting registration. Please try again.', 
          ephemeral: config.ephemeral.registerChar 
        });
      }
    }
  }
};
