import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import logger from '../services/logger.js';
import { isEphemeral } from '../services/ephemeral.js';
import { CharacterRepo } from '../database/repositories.js';
import { profileEmbed } from '../ui/embeds.js';
import * as ui from '../ui/components.js';

export const data = new SlashCommandBuilder()
  .setName('edit-character')
  .setDescription('Edit and manage your character profile');

export async function execute(interaction) {
  const userId = interaction.user.id;
  
  logger.command('edit', interaction.user.username, 'self');

  const chars = await CharacterRepo.findAllByUser(userId);
  const main = chars.find(c => c.character_type === 'main');
  
  // ✅ USE EDIT EPHEMERAL SETTING (default: true for privacy)
  const isEph = await isEphemeral(interaction.guildId, 'edit_character');
  const ephemeralFlag = isEph ? { flags: MessageFlags.Ephemeral } : {};

  // Show profile with edit buttons
  const embed = await profileEmbed(interaction.user, chars, interaction);
  const components = ui.profileButtons(userId, !!main);

  await interaction.reply({ embeds: [embed], components, ...ephemeralFlag });
}
