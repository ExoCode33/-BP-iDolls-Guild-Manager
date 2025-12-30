import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import logger from '../services/logger.js';
import { isEphemeral } from '../services/ephemeral.js';
import { CharacterRepo } from '../database/repositories.js';
import sheets from '../services/sheets.js';
import { syncAllNicknames } from '../services/nickname.js';
import { profileEmbed } from '../ui/embeds.js';
import * as ui from '../ui/components.js';
import config from '../config/index.js';
import * as adminSettings from '../services/adminSettings.js';

export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Admin commands')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub => sub.setName('settings').setDescription('Configure bot settings'))
  .addSubcommand(sub => sub.setName('sync').setDescription('Force sync to Google Sheets'))
  .addSubcommand(sub => sub.setName('nicknames').setDescription('Sync all member nicknames'))
  .addSubcommand(sub => sub.setName('stats').setDescription('View bot statistics'))
  .addSubcommand(sub => sub.setName('delete').setDescription('Delete a user\'s data').addUserOption(opt => opt.setName('user').setDescription('User to delete').setRequired(true)))
  .addSubcommand(sub => sub.setName('character').setDescription('View/edit another user\'s character').addUserOption(opt => opt.setName('user').setDescription('User to manage').setRequired(true)))
  .addSubcommand(sub => sub
    .setName('guild-assign')
    .setDescription('Assign a user to a guild')
    .addUserOption(opt => opt
      .setName('user')
      .setDescription('User to assign')
      .setRequired(true))
    .addStringOption(opt => {
      const option = opt
        .setName('guild')
        .setDescription('Guild to assign them to')
        .setRequired(true);
      
      if (config.guilds && Array.isArray(config.guilds)) {
        config.guilds.forEach(guild => {
          option.addChoices({ name: guild.name, value: guild.name });
        });
      }
      
      return option;
    }))
  .addSubcommand(sub => sub
    .setName('guild-remove')
    .setDescription('Remove a user from their current guild')
    .addUserOption(opt => opt
      .setName('user')
      .setDescription('User to remove from guild')
      .setRequired(true)));

function embed(title, description) {
  return new EmbedBuilder().setColor('#EC4899').setDescription(`# ${title}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${description}`).setTimestamp();
}

// ═══════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════

async function showStatistics(interaction) {
  const chars = await CharacterRepo.findAll();
  const users = new Set(chars.map(c => c.userId)).size;
  const mains = chars.filter(c => c.characterType === 'main').length;
  const subs = chars.filter(c => c.characterType === 'main_subclass').length;
  
  const classes = {};
  chars.filter(c => c.characterType === 'main').forEach(c => { 
    classes[c.className] = (classes[c.className] || 0) + 1; 
  });
  const topClasses = Object.entries(classes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `• ${name}: **${count}**`)
    .join('\n') || '*No data*';
  
  const mem = process.memoryUsage();
  const uptime = process.uptime();
  
  const e = new EmbedBuilder()
    .setColor('#EC4899')
    .setTitle('📊 Bot Statistics')
    .addFields(
      { 
        name: '👥 Characters', 
        value: `Users: **${users}**\nMain: **${mains}**\nSubclasses: **${subs}**`, 
        inline: true 
      },
      { 
        name: '🏆 Top Classes', 
        value: topClasses, 
        inline: true 
      },
      { 
        name: '💻 System', 
        value: `Memory: **${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB**\nUptime: **${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m**\nNode: **${process.version}**`, 
        inline: false 
      }
    )
    .setTimestamp();
  
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  await interaction.reply({ 
    embeds: [e], 
    flags: isEph ? MessageFlags.Ephemeral : undefined 
  });
}

// ═══════════════════════════════════════════════════════════════════
// GUILD MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

async function handleGuildAssign(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  const targetUser = interaction.options.getUser('user');
  const guildName = interaction.options.getString('guild');
  
  try {
    const mainChar = await CharacterRepo.findMain(targetUser.id);
    
    if (!mainChar) {
      return interaction.reply({
        embeds: [embed('❌ Error', `**${targetUser.username}** has no registered character.`)],
        flags: isEph ? MessageFlags.Ephemeral : undefined
      });
    }
    
    await CharacterRepo.update(mainChar.id, { guild: guildName });
    await updateGuildRoles(interaction.client, targetUser.id, guildName);
    
    logger.info('Guild Assigned', `${targetUser.username} → ${guildName}`);
    
    return interaction.reply({
      embeds: [embed(
        '✅ Guild Assigned',
        `**${targetUser.username}** has been assigned to **${guildName}**!\n\n` +
        `• Character: ${mainChar.ign}\n` +
        `• UID: ${mainChar.uid}\n` +
        `• New Guild: ${guildName}`
      )],
      flags: isEph ? MessageFlags.Ephemeral : undefined
    });
    
  } catch (error) {
    logger.error('Guild Assign', error.message);
    return interaction.reply({
      embeds: [embed('❌ Error', `Failed to assign guild: ${error.message}`)],
      flags: isEph ? MessageFlags.Ephemeral : undefined
    });
  }
}

async function handleGuildRemove(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  const targetUser = interaction.options.getUser('user');
  
  try {
    const mainChar = await CharacterRepo.findMain(targetUser.id);
    
    if (!mainChar) {
      return interaction.reply({
        embeds: [embed('❌ Error', `**${targetUser.username}** has no registered character.`)],
        flags: isEph ? MessageFlags.Ephemeral : undefined
      });
    }
    
    const previousGuild = mainChar.guild;
    
    await CharacterRepo.update(mainChar.id, { guild: 'Visitor' });
    await removeGuildRoles(interaction.client, targetUser.id);
    
    logger.info('Guild Removed', `${targetUser.username} from ${previousGuild}`);
    
    return interaction.reply({
      embeds: [embed(
        '✅ Guild Removed',
        `**${targetUser.username}** has been removed from **${previousGuild}**!\n\n` +
        `• Character: ${mainChar.ign}\n` +
        `• UID: ${mainChar.uid}\n` +
        `• Status: Visitor`
      )],
      flags: isEph ? MessageFlags.Ephemeral : undefined
    });
    
  } catch (error) {
    logger.error('Guild Remove', error.message);
    return interaction.reply({
      embeds: [embed('❌ Error', `Failed to remove guild: ${error.message}`)],
      flags: isEph ? MessageFlags.Ephemeral : undefined
    });
  }
}

async function updateGuildRoles(client, userId, guildName) {
  if (!config.discord?.guildId) {
    console.log('[GUILD-MANAGE] Guild ID not configured');
    return;
  }

  try {
    const guild = await client.guilds.fetch(config.discord.guildId);
    const member = await guild.members.fetch(userId);

    for (let i = 1; i <= 5; i++) {
      const roleId = config.roles[`guild${i}`];
      if (roleId && member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        console.log(`[GUILD-MANAGE] Removed guild${i} role from ${userId}`);
      }
    }
    
    if (config.roles.visitor && member.roles.cache.has(config.roles.visitor)) {
      await member.roles.remove(config.roles.visitor);
      console.log(`[GUILD-MANAGE] Removed Visitor role from ${userId}`);
    }

    const guildConfig = config.guilds.find(g => g.name === guildName);
    
    if (guildConfig && guildConfig.roleId) {
      await member.roles.add(guildConfig.roleId);
      console.log(`[GUILD-MANAGE] Added ${guildName} role to ${userId}`);
    } else if (guildName === 'Visitor' && config.roles.visitor) {
      await member.roles.add(config.roles.visitor);
      console.log(`[GUILD-MANAGE] Added Visitor role to ${userId}`);
    }

    if (config.roles.verified && !member.roles.cache.has(config.roles.verified)) {
      await member.roles.add(config.roles.verified);
      console.log(`[GUILD-MANAGE] Added Verified role to ${userId}`);
    }

  } catch (error) {
    console.error('[GUILD-MANAGE] Role update error:', error.message);
  }
}

async function removeGuildRoles(client, userId) {
  if (!config.discord?.guildId) {
    console.log('[GUILD-MANAGE] Guild ID not configured');
    return;
  }

  try {
    const guild = await client.guilds.fetch(config.discord.guildId);
    const member = await guild.members.fetch(userId);

    for (let i = 1; i <= 5; i++) {
      const roleId = config.roles[`guild${i}`];
      if (roleId && member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        console.log(`[GUILD-MANAGE] Removed guild${i} role from ${userId}`);
      }
    }

    if (config.roles.visitor && !member.roles.cache.has(config.roles.visitor)) {
      await member.roles.add(config.roles.visitor);
      console.log(`[GUILD-MANAGE] Added Visitor role to ${userId}`);
    }

  } catch (error) {
    console.error('[GUILD-MANAGE] Role removal error:', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════════

async function handleSync(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  await interaction.deferReply({ flags: isEph ? MessageFlags.Ephemeral : undefined });
  const start = Date.now();
  const chars = await CharacterRepo.findAll();
  await sheets.sync(chars, interaction.client);
  await interaction.editReply({ 
    embeds: [embed('✅ Sync Complete', `Synced **${chars.length}** characters.\n⏱️ Duration: **${Date.now() - start}ms**`)] 
  });
}

async function handleNicknames(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  await interaction.deferReply({ flags: isEph ? MessageFlags.Ephemeral : undefined });
  const chars = await CharacterRepo.findAll();
  const mains = chars.filter(c => c.characterType === 'main');
  const results = await syncAllNicknames(interaction.client, config.discord.guildId, mains);
  let desc = `**Updated:** ${results.success}\n**Failed:** ${results.failed}`;
  if (results.failures.length > 0) {
    desc += `\n\n**Failures:**\n${results.failures.slice(0, 10).map(f => `• \`${f.ign}\`: ${f.reason}`).join('\n')}`;
  }
  await interaction.editReply({ 
    embeds: [embed(results.failed === 0 ? '✅ Success' : '⚠️ Completed', desc)] 
  });
}

async function handleDelete(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  const target = interaction.options.getUser('user');
  const chars = await CharacterRepo.findAllByUser(target.id);
  if (chars.length === 0) {
    return interaction.reply({ 
      embeds: [embed('❌ No Data', `**${target.username}** has no characters.`)], 
      flags: isEph ? MessageFlags.Ephemeral : undefined 
    });
  }
  await CharacterRepo.deleteAllByUser(target.id);
  logger.delete(interaction.user.username, 'admin', `All data for ${target.username}`);
  await interaction.reply({ 
    embeds: [embed('✅ Deleted', `Removed **${chars.length}** character(s) for **${target.username}**.`)], 
    flags: isEph ? MessageFlags.Ephemeral : undefined 
  });
  sheets.sync(await CharacterRepo.findAll(), interaction.client);
}

async function handleCharacter(interaction) {
  const isEph = await isEphemeral(interaction.guildId, 'admin');
  const target = interaction.options.getUser('user');
  const chars = await CharacterRepo.findAllByUser(target.id);
  const main = chars.find(c => c.characterType === 'main');
  if (!main && chars.length === 0) {
    return interaction.reply({ 
      embeds: [embed('❌ No Character', `**${target.username}** hasn't registered.`)], 
      flags: isEph ? MessageFlags.Ephemeral : undefined 
    });
  }
  const profileEmb = await profileEmbed(target, chars, interaction);
  await interaction.reply({ 
    embeds: [profileEmb], 
    components: ui.adminProfileButtons(target.id, !!main), 
    flags: isEph ? MessageFlags.Ephemeral : undefined 
  });
}

// ═══════════════════════════════════════════════════════════════════
// MAIN EXECUTE
// ═══════════════════════════════════════════════════════════════════

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  logger.command('admin', interaction.user.username, sub);
  
  try {
    switch (sub) {
      case 'settings': return await adminSettings.showSettingsMenu(interaction);
      case 'sync': return await handleSync(interaction);
      case 'nicknames': return await handleNicknames(interaction);
      case 'stats': return await showStatistics(interaction);
      case 'delete': return await handleDelete(interaction);
      case 'character': return await handleCharacter(interaction);
      case 'guild-assign': return await handleGuildAssign(interaction);
      case 'guild-remove': return await handleGuildRemove(interaction);
    }
  } catch (e) {
    logger.error('Admin', `${sub} failed`, e);
    const isEph = await isEphemeral(interaction.guildId, 'admin');
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ 
        content: '❌ Command failed.', 
        flags: isEph ? MessageFlags.Ephemeral : undefined 
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT HANDLERS FROM ADMIN SETTINGS SERVICE
// ═══════════════════════════════════════════════════════════════════

export const handleSettingsMenuSelect = adminSettings.handleSettingsMenuSelect;
export const handleSettingsBackButton = adminSettings.handleSettingsBackButton;
export const handleVerificationChannelSelect = adminSettings.handleVerificationChannelSelect;
export const handleLogChannelSelect = adminSettings.handleLogChannelSelect;
export const handleLogBatchSelect = adminSettings.handleLogBatchSelect;
export const handleLogCategoriesSelect = adminSettings.handleLogCategoriesSelect;
export const handleEphemeralSelect = adminSettings.handleEphemeralSelect;
export const handleLogSelect = adminSettings.handleLogCategoriesSelect;
