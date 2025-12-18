import { Client, GatewayIntentBits, Events, MessageFlags, REST, Routes } from 'discord.js';
import config from './config/index.js';
import db from './database/index.js';
import logger from './services/logger.js';
import sheets from './services/sheets.js';
import { loadCommands, getCommandData } from './commands/index.js';
import { route, routeSelectMenu, routeModal } from './interactions/router.js';
import { handleLogSelect, handleLogChannelSelect, handleLogBatchSelect, handleLogCategoriesSelect, handleEphemeralSelect } from './commands/admin.js';
import { CharacterRepo } from './database/repositories.js';
import { syncAllNicknames } from './services/nickname.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const commands = loadCommands();

// Auto-deploy commands on startup
async function deployCommands() {
  try {
    const rest = new REST().setToken(config.discord.token);
    const commandData = getCommandData();
    
    if (config.discord.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commandData }
      );
      console.log(`[DEPLOY] ${commandData.length} commands deployed to guild`);
    } else {
      await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commandData }
      );
      console.log(`[DEPLOY] ${commandData.length} commands deployed globally`);
    }
  } catch (e) {
    console.error('[DEPLOY] Failed:', e.message);
  }
}

client.once(Events.ClientReady, async () => {
  console.log(`[BOT] Logged in as ${client.user.tag}`);

  await deployCommands();
  await db.initialize();
  await logger.init(client);
  await sheets.init();

  logger.startup(client.user.tag, commands.size);

  if (config.sync.sheetsInterval > 0) {
    setInterval(async () => {
      const chars = await CharacterRepo.findAll();
      sheets.sync(chars, client);
    }, config.sync.sheetsInterval);
  }

  if (config.sync.nicknameEnabled && config.sync.nicknameInterval > 0) {
    setInterval(async () => {
      const chars = await CharacterRepo.findAll();
      const mains = chars.filter(c => c.character_type === 'main');
      syncAllNicknames(client, config.discord.guildId, mains);
    }, config.sync.nicknameInterval);
  }

  if (global.gc) {
    setInterval(() => {
      global.gc();
      const mem = process.memoryUsage();
      if (mem.heapUsed > 200 * 1024 * 1024) {
        logger.send('memory', 'High memory usage', `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`);
      }
    }, 300000);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = commands.get(interaction.commandName);
      if (cmd) await cmd.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      return route(interaction);
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('admin_logs_channel_')) {
        return handleLogChannelSelect(interaction);
      }
      if (interaction.customId.startsWith('admin_logs_batch_')) {
        return handleLogBatchSelect(interaction);
      }
      if (interaction.customId.startsWith('admin_logs_categories_')) {
        return handleLogCategoriesSelect(interaction);
      }
      if (interaction.customId.startsWith('admin_logs_')) {
        return handleLogSelect(interaction);
      }
      if (interaction.customId.startsWith('admin_ephemeral_')) {
        return handleEphemeralSelect(interaction);
      }
      return routeSelectMenu(interaction);
    }

    if (interaction.isModalSubmit()) {
      return routeModal(interaction);
    }
  } catch (e) {
    logger.error('Interaction', `Failed: ${interaction.customId || interaction.commandName}`, e);

    const reply = { content: 'Something went wrong.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

process.on('SIGINT', async () => {
  logger.shutdown('SIGINT');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.shutdown('SIGTERM');
  await db.close();
  process.exit(0);
});

process.on('unhandledRejection', (e) => {
  logger.error('Unhandled', 'Promise rejection', e);
});

client.login(config.discord.token);
