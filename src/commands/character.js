import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import logger from '../services/logger.js';
import { isEphemeral } from '../services/ephemeral.js';
import { CharacterRepo } from '../database/repositories.js';
import { profileEmbed, errorEmbed } from '../ui/embeds.js';
import * as ui from '../ui/components.js';

const ephemeralFlag = (isEph) => isEph ? { flags: MessageFlags.Ephemeral } : {};

export const data = new SlashCommandBuilder()
  .setName('character')
  .setDescription('Manage your guild characters')
  .addSubcommand(sub => sub
    .setName('profile')
    .setDescription('View your character profile')
    .addUserOption(opt => opt
      .setName('user')
      .setDescription('View another user\'s profile')
      .setRequired(false)))
  .addSubcommand(sub => sub
    .setName('register')
    .setDescription('Register your main character'))
  .addSubcommand(sub => sub
    .setName('list')
    .setDescription('List all registered members'));

export async function execute(interaction) {
  let sub;
  try {
    sub = interaction.options.getSubcommand();
  } catch {
    sub = 'profile';
  }
  
  logger.command('character', interaction.user.username, sub);

  if (sub === 'profile') return handleProfile(interaction);
  if (sub === 'register') return handleRegister(interaction);
  if (sub === 'list') return handleList(interaction);
}

async function handleProfile(interaction) {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const isOwn = targetUser.id === interaction.user.id;

  const chars = await CharacterRepo.findAllByUser(targetUser.id);
  const main = chars.find(c => c.character_type === 'main');

  if (!main && !isOwn) {
    return interaction.reply({
      embeds: [errorEmbed(`${targetUser.username} hasn't registered yet.`)],
      flags: MessageFlags.Ephemeral
    });
  }

  const embed = await profileEmbed(targetUser, chars, interaction);
  const components = isOwn ? ui.profileButtons(targetUser.id, !!main) : [];
  
  const ephemeralType = isOwn ? 'register' : 'view';
  const isEph = await isEphemeral(interaction.guildId, ephemeralType);

  if (!isOwn) {
    logger.viewProfile(interaction.user.username, targetUser.username);
  }

  await interaction.reply({ embeds: [embed], components, ...ephemeralFlag(isEph) });
}

async function handleRegister(interaction) {
  const main = await CharacterRepo.findMain(interaction.user.id);
  const isEph = await isEphemeral(interaction.guildId, 'register');

  if (main) {
    const chars = await CharacterRepo.findAllByUser(interaction.user.id);
    const embed = await profileEmbed(interaction.user, chars, interaction);
    const components = ui.profileButtons(interaction.user.id, true);
    return interaction.reply({
      content: 'You already have a main character. Use the buttons to manage.',
      embeds: [embed],
      components,
      ...ephemeralFlag(isEph)
    });
  }

  const embed = await profileEmbed(interaction.user, [], interaction);
  const components = ui.profileButtons(interaction.user.id, false);
  await interaction.reply({ embeds: [embed], components, ...ephemeralFlag(isEph) });
}

async function handleList(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'list');
  await interaction.deferReply(ephemeralFlag(isEph));

  const allChars = await CharacterRepo.findAll();
  const userGroups = {};

  for (const char of allChars) {
    if (!userGroups[char.user_id]) userGroups[char.user_id] = [];
    userGroups[char.user_id].push(char);
  }

  const lines = [];
  for (const [userId, chars] of Object.entries(userGroups)) {
    const main = chars.find(c => c.character_type === 'main');
    if (!main) continue;

    let displayName = main.ign;
    try {
      const member = await interaction.guild.members.fetch(userId);
      displayName = member.nickname || member.user.username;
    } catch (e) {}

    const alts = chars.filter(c => c.character_type === 'alt').length;
    const subs = chars.filter(c => c.character_type.includes('subclass')).length;

    let extra = [];
    if (alts > 0) extra.push(`${alts} alt${alts > 1 ? 's' : ''}`);
    if (subs > 0) extra.push(`${subs} sub${subs > 1 ? 's' : ''}`);

    const extraStr = extra.length > 0 ? ` (${extra.join(', ')})` : '';
    lines.push(`• **${displayName}** - ${main.class}${extraStr}`);
  }

  if (lines.length === 0) {
    return interaction.editReply({ content: 'No members registered yet.' });
  }

  const content = `**Registered Members (${Object.keys(userGroups).length})**\n\n${lines.join('\n')}`;

  if (content.length > 2000) {
    const chunks = [];
    let current = `**Registered Members (${Object.keys(userGroups).length})**\n\n`;

    for (const line of lines) {
      if (current.length + line.length + 1 > 2000) {
        chunks.push(current);
        current = '';
      }
      current += line + '\n';
    }
    if (current) chunks.push(current);

    await interaction.editReply({ content: chunks[0] });
    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({ content: chunks[i], ...ephemeralFlag(isEph) });
    }
  } else {
    await interaction.editReply({ content });
  }
}
