import { Client, GatewayIntentBits, Events, Collection } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import config from './utils/config.js';
import logger from './utils/logger.js';
import db from './services/database.js';
import { startAutoMaintenance } from './utils/logMaintenance.js';
import { handleButtonInteraction, handleSelectMenuInteraction, handleModalSubmit } from './handlers/interactions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

// Load commands
client.commands = new Collection();
const commandsPath = join(__dirname, 'commands');

async function loadCommands() {
  const commandFolders = ['user', 'admin'];
  for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder);
    const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = join(folderPath, file);
      const command = await import(`file://${filePath}`);
      if (command.default && 'data' in command.default) {
        client.commands.set(command.default.data.name, command.default);
        console.log(`✅ Loaded: ${command.default.data.name}`);
      }
    }
  }
}

// Load commands before bot starts
await loadCommands();

// Store maintenance interval for clean shutdown
let maintenanceInterval = null;

// Bot ready event
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  
  // Initialize database
  try {
    await db.initialize();
    console.log('[DATABASE] ✅ Initialized successfully');
  } catch (error) {
    console.error('[DATABASE] ❌ Initialization failed:', error);
    await logger.logError('Database', 'Database initialization failed', error);
  }
  
  // Initialize logger with Discord client
  try {
    await logger.loadSettingsFromDatabase(db);
    await logger.setClient(client, config.channels.log, config.logging.clearOnStart);
  } catch (error) {
    console.error('[LOGGER] ❌ Failed to initialize:', error);
  }
  
  // Start automatic log maintenance
  if (config.logging.autoMaintenance && config.channels.log) {
    maintenanceInterval = startAutoMaintenance(client, config);
  }
  
  // Log startup to Discord
  await logger.logStartup(
    client.user.tag,
    process.env.PORT || 8080,
    client.commands.size
  );
  
  console.log('[STARTUP] ✅ Bot is ready!');
});

// Command interactions
client.on(Events.InteractionCreate, async interaction => {
  try {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      
      if (!command) {
        console.error(`[COMMAND] No command matching ${interaction.commandName}`);
        return;
      }
      
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`[COMMAND ERROR] ${interaction.commandName}:`, error);
        await logger.logError('Command', `Command error: ${interaction.commandName}`, error);
        
        const errorMessage = '❌ Error occurred.';
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      }
    }
    
    // Button interactions
    else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    }
    
    // Select menu interactions
    else if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(interaction);
    }
    
    // Modal submissions
    else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    }
    
  } catch (error) {
    console.error('[INTERACTION ERROR]:', error);
    await logger.logError('Interaction', 'Interaction error', error);
    
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
      }
    } catch (replyError) {
      console.error('[INTERACTION] Failed to send error reply:', replyError);
    }
  }
});

// Error handling
client.on(Events.Error, async error => {
  console.error('[CLIENT ERROR]:', error);
  await logger.logError('Discord Client', 'Discord client error', error);
});

client.on(Events.Warn, async warning => {
  console.warn('[CLIENT WARNING]:', warning);
  await logger.logWarning('Discord Client', warning);
});

process.on('unhandledRejection', async error => {
  console.error('[UNHANDLED REJECTION]:', error);
  await logger.logError('Unhandled Rejection', 'Unhandled promise rejection', error);
});

process.on('uncaughtException', async error => {
  console.error('[UNCAUGHT EXCEPTION]:', error);
  await logger.logError('Uncaught Exception', 'Uncaught exception', error);
  process.exit(1);
});

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('\n[SHUTDOWN] Received SIGINT, shutting down gracefully...');
  
  if (maintenanceInterval) {
    console.log('[SHUTDOWN] Stopping log maintenance...');
    clearInterval(maintenanceInterval);
  }
  
  await logger.logShutdown('SIGINT received');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[SHUTDOWN] Received SIGTERM, shutting down gracefully...');
  
  if (maintenanceInterval) {
    console.log('[SHUTDOWN] Stopping log maintenance...');
    clearInterval(maintenanceInterval);
  }
  
  await logger.logShutdown('SIGTERM received');
  client.destroy();
  process.exit(0);
});

// Health check server (for Railway/Docker)
import http from 'http';
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = process.env.PORT || 8080;
healthServer.listen(PORT, async () => {
  console.log(`[HEALTH] Server listening on port ${PORT}`);
  // Don't log to Discord here as logger isn't ready yet
});

// Login
client.login(config.discord.token);
