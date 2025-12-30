import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import logger from '../services/logger.js';
import { isEphemeral } from '../services/ephemeral.js';
import { CharacterRepo } from '../database/repositories.js';
import { profileEmbed, errorEmbed } from '../ui/embeds.js';
import * as ui from '../ui/components.js';

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
    // ✅ If viewing your OWN profile → redirect to edit-character flow with register button
    if (isOwn) {
      const embed = await profileEmbed(interaction.user, chars, interaction);
      const components = ui.profileButtons(interaction.user.id, false); // false = no main, shows register button
      return interaction.reply({ embeds: [embed], components, ...ephemeralFlag });
    }
    
    // If viewing someone else's profile → show error
    return interaction.reply({
      embeds: [errorEmbed(`${targetUser.username} hasn't registered yet.`)],
      ...ephemeralFlag
    });
  }

  if (!isOwn) {
    logger.viewProfile(interaction.user.username, targetUser.username);
  }

  // View only - no buttons for other users' profiles
  const embed = await profileEmbed(targetUser, chars, interaction);
  return interaction.reply({ embeds: [embed], components: [], ...ephemeralFlag });
}
