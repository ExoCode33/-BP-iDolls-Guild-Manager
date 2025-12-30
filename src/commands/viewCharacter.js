import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import logger from '../services/logger.js';
import { isEphemeral } from '../services/ephemeral.js';
import { CharacterRepo } from '../database/repositories.js';
import { profileEmbed, errorEmbed } from '../ui/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('view-character')
  .setDescription('View a character profile')
  .addUserOption(opt => opt
    .setName('user')
    .setDescription('User to view (leave empty to view your own)')
    .setRequired(false));

export async function execute(interaction) {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const isOwn = targetUser.id === interaction.user.id;

  logger.command('view-character', interaction.user.username, isOwn ? 'self' : targetUser.username);

  const chars = await CharacterRepo.findAllByUser(targetUser.id);
  const main = chars.find(c => c.character_type === 'main');
  
  // ✅ USE VIEW EPHEMERAL SETTING (default: false for sharing)
  const isEph = await isEphemeral(interaction.guildId, 'view_character');
  const ephemeralFlag = isEph ? { flags: MessageFlags.Ephemeral } : {};

  // Check if user has no character
  if (!main && chars.length === 0) {
    return interaction.reply({
      embeds: [errorEmbed(`${targetUser.username} hasn't registered yet.`)],
      ...ephemeralFlag
    });
  }

  if (!isOwn) {
    logger.viewProfile(interaction.user.username, targetUser.username);
  }

  // View only - no buttons
  const embed = await profileEmbed(targetUser, chars, interaction);
  return interaction.reply({ embeds: [embed], components: [], ...ephemeralFlag });
}
