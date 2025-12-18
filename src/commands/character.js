import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import logger from '../services/logger.js';
import { isEphemeral } from '../services/ephemeral.js';
import { CharacterRepo } from '../database/repositories.js';
import { profileEmbed, errorEmbed } from '../ui/embeds.js';
import * as ui from '../ui/components.js';

export const data = new SlashCommandBuilder()
  .setName('character')
  .setDescription('Manage your character profile')
  .addUserOption(opt => opt
    .setName('user')
    .setDescription('View another user\'s profile')
    .setRequired(false));

export async function execute(interaction) {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const isOwn = targetUser.id === interaction.user.id;

  logger.command('character', interaction.user.username, isOwn ? 'self' : 'view');

  const chars = await CharacterRepo.findAllByUser(targetUser.id);
  const main = chars.find(c => c.character_type === 'main');
  const isEph = await isEphemeral(interaction.guildId, 'character');
  const ephemeralFlag = isEph ? { flags: MessageFlags.Ephemeral } : {};

  // Viewing someone else - no buttons, just view
  if (!isOwn) {
    if (!main && chars.length === 0) {
      return interaction.reply({
        embeds: [errorEmbed(`${targetUser.username} hasn't registered yet.`)],
        ...ephemeralFlag
      });
    }

    logger.viewProfile(interaction.user.username, targetUser.username);
    const embed = await profileEmbed(targetUser, chars, interaction);
    return interaction.reply({ embeds: [embed], components: [], ...ephemeralFlag });
  }

  // Own profile - show with buttons
  const embed = await profileEmbed(targetUser, chars, interaction);
  const components = ui.profileButtons(targetUser.id, !!main);

  await interaction.reply({ embeds: [embed], components, ...ephemeralFlag });
}
