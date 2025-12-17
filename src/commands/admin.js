import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../config/index.js';
import logger from '../services/logger.js';
import { CharacterRepo, EphemeralRepo } from '../database/repositories.js';
import { LOG_CATEGORIES, CATEGORY_GROUPS } from '../config/logCategories.js';
import { embed, successEmbed, errorEmbed } from '../ui/embeds.js';
import { syncAllNicknames } from '../services/nickname.js';
import sheets from '../services/sheets.js';
import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

const EPHEMERAL_OPTIONS = [
  { id: 'register', label: 'Register Character', emoji: '📝' },
  { id: 'edit', label: 'Edit Character', emoji: '✏️' },
  { id: 'view', label: 'View Profile', emoji: '👁️' },
  { id: 'admin', label: 'Admin Commands', emoji: '🔧' },
  { id: 'list', label: 'Member List', emoji: '📋' }
];

export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Admin commands')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub => sub
    .setName('sync')
    .setDescription('Force sync to Google Sheets'))
  .addSubcommand(sub => sub
    .setName('nicknames')
    .setDescription('Sync all nicknames to IGN'))
  .addSubcommand(sub => sub
    .setName('logs')
    .setDescription('Configure log categories'))
  .addSubcommand(sub => sub
    .setName('ephemeral')
    .setDescription('Configure which responses are ephemeral (private)'))
  .addSubcommand(sub => sub
    .setName('stats')
    .setDescription('View bot statistics'))
  .addSubcommand(sub => sub
    .setName('delete')
    .setDescription('Delete a user\'s data')
    .addUserOption(opt => opt
      .setName('user')
      .setDescription('User to delete')
      .setRequired(true)));

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  logger.command('admin', interaction.user.username, sub);

  if (sub === 'sync') return handleSync(interaction);
  if (sub === 'nicknames') return handleNicknames(interaction);
  if (sub === 'logs') return handleLogs(interaction);
  if (sub === 'ephemeral') return handleEphemeral(interaction);
  if (sub === 'stats') return handleStats(interaction);
  if (sub === 'delete') return handleDelete(interaction);
}

async function handleSync(interaction) {
  await interaction.deferReply({ ephemeral: config.ephemeral.admin });

  try {
    const chars = await CharacterRepo.findAll();
    await sheets.sync(chars, interaction.client);
    await interaction.editReply({ embeds: [successEmbed(`Synced ${chars.length} characters to Google Sheets.`)] });
  } catch (e) {
    logger.error('Admin', 'Sync failed', e);
    await interaction.editReply({ embeds: [errorEmbed('Sync failed. Check logs.')] });
  }
}

async function handleNicknames(interaction) {
  await interaction.deferReply({ ephemeral: config.ephemeral.admin });

  try {
    const chars = await CharacterRepo.findAll();
    const mains = chars.filter(c => c.character_type === 'main');
    const result = await syncAllNicknames(interaction.client, config.discord.guildId, mains);

    let msg = `Updated: ${result.updated}, Failed: ${result.failed}`;
    if (result.failures.length > 0) {
      const failList = result.failures.slice(0, 5).map(f => `• ${f.ign}: ${f.reason}`).join('\n');
      msg += `\n\n**Failures:**\n${failList}`;
      if (result.failures.length > 5) msg += `\n...and ${result.failures.length - 5} more`;
    }

    await interaction.editReply({ embeds: [successEmbed(msg)] });
  } catch (e) {
    logger.error('Admin', 'Nickname sync failed', e);
    await interaction.editReply({ embeds: [errorEmbed('Nickname sync failed.')] });
  }
}

async function handleLogs(interaction) {
  const enabled = logger.getEnabledCategories();

  const options = Object.values(LOG_CATEGORIES).map(cat => ({
    label: cat.label,
    value: cat.id,
    emoji: cat.emoji,
    description: cat.group,
    default: enabled.includes(cat.id)
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`admin_logs_${interaction.user.id}`)
      .setPlaceholder('Select log categories')
      .setMinValues(0)
      .setMaxValues(options.length)
      .addOptions(options)
  );

  const e = embed('📋 Log Settings', 
    `Currently logging: **${enabled.length}** categories\n\nSelect which events to log:`);

  await interaction.reply({ embeds: [e], components: [row], ephemeral: true });
}

async function handleEphemeral(interaction) {
  const enabled = await EphemeralRepo.get(interaction.guildId);

  const options = EPHEMERAL_OPTIONS.map(opt => ({
    label: opt.label,
    value: opt.id,
    emoji: opt.emoji,
    default: enabled.includes(opt.id)
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`admin_ephemeral_${interaction.user.id}`)
      .setPlaceholder('Select ephemeral responses')
      .setMinValues(0)
      .setMaxValues(options.length)
      .addOptions(options)
  );

  const currentList = enabled.length > 0 
    ? enabled.map(id => EPHEMERAL_OPTIONS.find(o => o.id === id)?.label || id).join(', ')
    : 'None';

  const e = embed('👁️ Ephemeral Settings', 
    `**Currently private:** ${currentList}\n\nSelect which responses should be ephemeral (only visible to the user):`);

  await interaction.reply({ embeds: [e], components: [row], ephemeral: true });
}

async function handleStats(interaction) {
  const chars = await CharacterRepo.findAll();
  const mains = chars.filter(c => c.character_type === 'main').length;
  const alts = chars.filter(c => c.character_type === 'alt').length;
  const subs = chars.filter(c => c.character_type.includes('subclass')).length;

  const uniqueUsers = new Set(chars.map(c => c.user_id)).size;

  const classCounts = {};
  for (const char of chars.filter(c => c.character_type === 'main')) {
    classCounts[char.class] = (classCounts[char.class] || 0) + 1;
  }

  const topClasses = Object.entries(classCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cls, count]) => `• ${cls}: ${count}`)
    .join('\n');

  const mem = process.memoryUsage();
  const memMB = (mem.heapUsed / 1024 / 1024).toFixed(1);

  const statsText = `
**📊 Character Stats**
• Total Users: ${uniqueUsers}
• Main Characters: ${mains}
• Alt Characters: ${alts}
• Subclasses: ${subs}

**🎭 Top Classes**
${topClasses || 'No data'}

**💾 System**
• Memory: ${memMB} MB
• Uptime: ${formatUptime(process.uptime())}
`;

  await interaction.reply({ embeds: [embed('Bot Statistics', statsText)], ephemeral: config.ephemeral.admin });
}

async function handleDelete(interaction) {
  const user = interaction.options.getUser('user');
  const chars = await CharacterRepo.findAllByUser(user.id);

  if (chars.length === 0) {
    return interaction.reply({ embeds: [errorEmbed(`${user.username} has no registered characters.`)], ephemeral: true });
  }

  await CharacterRepo.deleteAllByUser(user.id);
  logger.delete(interaction.user.username, 'admin', `All data for ${user.username}`);

  await interaction.reply({
    embeds: [successEmbed(`Deleted all data for ${user.username} (${chars.length} characters).`)],
    ephemeral: config.ephemeral.admin
  });

  sheets.sync(await CharacterRepo.findAll(), interaction.client);
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export async function handleLogSelect(interaction) {
  const selected = interaction.values;
  logger.setCategories(selected);

  await interaction.update({
    embeds: [successEmbed(`Now logging **${selected.length}** categories.`)],
    components: []
  });
}

export async function handleEphemeralSelect(interaction) {
  const selected = interaction.values;
  await EphemeralRepo.set(interaction.guildId, selected);

  const labels = selected.map(id => EPHEMERAL_OPTIONS.find(o => o.id === id)?.label || id);
  const msg = selected.length > 0 
    ? `Now ephemeral: **${labels.join(', ')}**`
    : 'All responses are now **public**.';

  await interaction.update({
    embeds: [successEmbed(msg)],
    components: []
  });
}
