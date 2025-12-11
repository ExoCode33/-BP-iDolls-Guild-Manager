import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import config from './utils/config.js';
import logger from './utils/logger.js';
import db from './services/database.js';
import sheetsService from './services/sheets.js';
import * as interactionHandlers from './handlers/interactions.js';
import { syncAllNicknames } from './utils/nicknameSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] });
client.commands = new Collection();

async function loadCommands() {
  const commandFolders = ['user', 'admin'];
  for (const folder of commandFolders) {
    const commandsPath = join(__dirname, 'commands', folder);
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const command = await import(`file://${filePath}`);
      if (command.default && 'data' in command.default && 'execute' in command.default) {
        client.commands.set(command.default.data.name, command.default);
      }
    }
  }
}

client.once(Events.ClientReady, async () => {
  // Initialize logger with Discord client and clear option
  if (config.channels.log && config.logging.toChannel) {
    await logger.setClient(client, config.channels.log, config.logging.clearOnStart);
  }
  
  // Log startup to console and Discord
  await logger.logStartup(client.user.tag, process.env.PORT || 3000, client.commands.size);
  
  // ✅ Initialize database
  try {
    await db.initializeDatabase();
    logger.success('Database ready');
  } catch (error) {
    logger.error(`Database init failed: ${error.message}`);
  }
  
  // ✅ Initialize Google Sheets service
  try {
    const sheetsInitialized = await sheetsService.initialize();
    if (sheetsInitialized) {
      logger.success('Google Sheets service ready');
    } else {
      logger.warn('Google Sheets service disabled (credentials not configured)');
    }
  } catch (error) {
    logger.error(`Google Sheets init failed: ${error.message}`);
  }
  
  // ✅ Setup auto-sync interval
  setInterval(async () => {
    try {
      // Get all characters with subclasses for all users
      const allChars = await db.getAllUsersWithCharacters();
      
      // Enrich with Discord usernames
      const enrichedChars = await Promise.all(
        allChars.map(async (char) => {
          let discordName = char.user_id; // Fallback to user ID
          
          try {
            const user = await client.users.fetch(char.user_id);
            discordName = user.username;
            
            // Try to get server nickname if in guild
            const guild = client.guilds.cache.get(config.discord.guildId);
            if (guild) {
              try {
                const member = await guild.members.fetch(char.user_id);
                if (member.nickname) {
                  discordName = member.nickname;
                }
              } catch (error) {
                // User not in guild, use username
              }
            }
          } catch (error) {
            // User not found, use user ID as fallback
          }
          
          return {
            ...char,
            discord_name: discordName
          };
        })
      );
      
      await sheetsService.syncAllCharacters(enrichedChars);
      logger.log('Auto-sync done');
    } catch (error) {
      logger.error(`Auto-sync failed: ${error.message}`);
    }
  }, config.sync.autoSyncInterval);
  logger.log('Auto-sync scheduled');
  
  // ✅ NEW: Setup nickname sync interval (if enabled)
  if (config.sync.nicknameSyncEnabled) {
    setInterval(async () => {
      try {
        await syncAllNicknames(client, config.discord.guildId, db);
      } catch (error) {
        logger.error(`Nickname sync failed: ${error.message}`);
      }
    }, config.sync.nicknameSyncInterval);
    logger.log(`Nickname sync ENABLED - scheduled every ${config.sync.nicknameSyncInterval/1000}s`);
  } else {
    logger.log('Nickname sync DISABLED');
  }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        logger.error(`Command not found: ${interaction.commandName}`);
        return;
      }
      
      // Log command usage to console and Discord
      await logger.logCommand(interaction.commandName, interaction.user.tag, interaction.user.id);
      
      await command.execute(interaction);
    }
    else if (interaction.isButton()) await interactionHandlers.handleButtonInteraction(interaction);
    else if (interaction.isStringSelectMenu()) await interactionHandlers.handleSelectMenuInteraction(interaction);
    else if (interaction.isModalSubmit()) await interactionHandlers.handleModalSubmit(interaction);
  } catch (error) {
    logger.error(`Interaction error: ${error.message}`);
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
  }
});

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/health', (req, res) => { res.status(200).json({ status: 'ok', uptime: process.uptime() }); });
app.listen(PORT, () => { logger.log(`Health server on port ${PORT}`); });

async function start() {
  try {
    await loadCommands();
    await client.login(config.discord.token);
  } catch (error) {
    logger.error(`Startup failed: ${error.message}`);
    process.exit(1);
  }
}

process.on('SIGINT', async () => { logger.log('Shutting down...'); await client.destroy(); process.exit(0); });
process.on('SIGTERM', async () => { logger.log('Shutting down...'); await client.destroy(); process.exit(0); });

start();
