// /app/src/index.js

import { Client, GatewayIntentBits, Events, MessageFlags, REST, Routes } from 'discord.js';
import config from './config/index.js';
import db from './database/index.js';
import consoleLogger from './services/consoleLogger.js';
import discordLogger from './services/discordLogger.js';
import sheets from './services/sheets.js';
import applicationService from './services/applications.js';
import classRoleService from './services/classRoles.js';
import { VerificationSystem } from './services/verification.js';
import { loadCommands, getCommandData } from './commands/index.js';
import { route, routeSelectMenu, routeModal } from './interactions/router.js';
import { CharacterRepo } from './database/repositories.js';
import { syncAllNicknames } from './services/nickname.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

const commands = loadCommands();

async function deployCommands() {
  try {
    const rest = new REST().setToken(config.discord.token);
    const commandData = getCommandData();
    
    if (config.discord.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commandData }
      );
      consoleLogger.info('Deploy', `${commandData.length} commands deployed to guild`);
    } else {
      await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commandData }
      );
      consoleLogger.info('Deploy', `${commandData.length} commands deployed globally`);
    }
  } catch (e) {
    consoleLogger.error('Deploy', 'Command deployment failed', e);
  }
}

client.once(Events.ClientReady, async () => {
  // Initialize loggers
  await consoleLogger.init(client);
  discordLogger.init(client);
  
  // Print startup banner
  consoleLogger.startup(client.user.tag, commands.size);

  await deployCommands();
  
  // Database
  await db.initialize();
  consoleLogger.database('Connected and initialized');
  
  // Application service
  await applicationService.init(client);
  consoleLogger.info('Service', 'Application service initialized');
  
  // Class role service
  classRoleService.init(client);
  consoleLogger.info('Service', 'Class role service initialized');
  
  // Google Sheets
  const sheetsReady = await sheets.init();
  if (sheetsReady) {
    consoleLogger.sheets('Initialized successfully');
  } else {
    consoleLogger.warn('Sheets', 'Not configured or failed to initialize');
  }

  // Role validation
  consoleLogger.info('Startup', 'Starting role validation...');
  try {
    const allChars = await CharacterRepo.findAll();
    const userMap = new Map();
    
    allChars.forEach(char => {
      if (!userMap.has(char.userId)) {
        userMap.set(char.userId, []);
      }
      userMap.get(char.userId).push(char);
    });

    let totalFixed = 0;
    let totalChecked = 0;

    for (const [userId, characters] of userMap.entries()) {
      try {
        totalChecked++;
        const result = await classRoleService.syncUserClassRoles(userId, characters);
        
        if (result.success && (result.rolesAdded > 0 || result.rolesRemoved > 0)) {
          totalFixed++;
        }
      } catch (error) {
        consoleLogger.debug('Roles', `Failed for ${userId}: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    consoleLogger.roleValidation(totalChecked, totalFixed);
  } catch (error) {
    consoleLogger.error('Startup', 'Role validation error', error);
  }

  // Verification channel
  try {
    await VerificationSystem.setupVerificationChannel(client, config.discord.guildId);
    consoleLogger.verification('Channel setup complete');
  } catch (error) {
    consoleLogger.error('Verification', 'Setup error', error);
  }

  // Scheduled tasks
  if (config.sync.sheetsInterval > 0) {
    setInterval(async () => {
      const chars = await CharacterRepo.findAll();
      const start = Date.now();
      await sheets.sync(chars, client);
      consoleLogger.sheetsSync(chars.length, Date.now() - start);
    }, config.sync.sheetsInterval);
    consoleLogger.info('Scheduler', `Sheets sync every ${config.sync.sheetsInterval / 1000}s`);
  }

  if (config.sync.nicknameEnabled && config.sync.nicknameInterval > 0) {
    setInterval(async () => {
      const chars = await CharacterRepo.findAll();
      const mains = chars.filter(c => c.characterType === 'main');
      const result = await syncAllNicknames(client, config.discord.guildId, mains);
      consoleLogger.nicknameSync(result.updated, result.failed);
    }, config.sync.nicknameInterval);
    consoleLogger.info('Scheduler', `Nickname sync every ${config.sync.nicknameInterval / 1000}s`);
  }

  // Memory monitoring
  if (global.gc) {
    setInterval(() => {
      global.gc();
      const mem = process.memoryUsage();
      if (mem.heapUsed > 200 * 1024 * 1024) {
        consoleLogger.memory(mem.heapUsed, mem.heapTotal);
      }
    }, 300000);
  }

  // Ready!
  consoleLogger.ready(4);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = commands.get(interaction.commandName);
      if (cmd) {
        consoleLogger.command(interaction.commandName, interaction.user.username, interaction.options.getSubcommand?.(false));
        await cmd.execute(interaction);
      }
      return;
    }

    if (interaction.isButton()) {
      return route(interaction);
    }

    if (interaction.isAnySelectMenu()) {
      return routeSelectMenu(interaction);
    }

    if (interaction.isModalSubmit()) {
      return routeModal(interaction);
    }

    if (interaction.isAutocomplete()) {
      return;
    }
  } catch (e) {
    consoleLogger.error('Interaction', `Failed: ${interaction.customId || interaction.commandName}`, e);

    const reply = { content: 'Something went wrong.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

process.on('SIGINT', async () => {
  consoleLogger.shutdown('SIGINT');
  consoleLogger.printStats();
  await db.end?.();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  consoleLogger.shutdown('SIGTERM');
  consoleLogger.printStats();
  await db.end?.();
  process.exit(0);
});

process.on('unhandledRejection', (e) => {
  consoleLogger.error('Unhandled', 'Promise rejection', e);
});

client.login(config.discord.token);
