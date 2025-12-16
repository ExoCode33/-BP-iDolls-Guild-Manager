import { Client, GatewayIntentBits, Events, Collection } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import config from './utils/config.js';
import logger from './utils/logger.js';
import db from './services/database.js';
import { startAutoMaintenance } from './utils/logMaintenance.js'; // ✅ NEW
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
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    logger.logInfo(`Loaded: ${command.data.name}`);
  }
}

// ✅ Store maintenance interval for clean shutdown
let maintenanceInterval = null;

// Bot ready event
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  logger.logInfo(`Bot ready: ${client.user.tag}`);
  
  // Initialize database
  try {
    await db.initialize();
    console.log('[DATABASE] ✅ Initialized successfully');
  } catch (error) {
    console.error('[DATABASE] ❌ Initialization failed:', error);
    logger.error('Database initialization failed', error);
  }
  
  // ✅ Start automatic log maintenance
  if (config.logging.autoMaintenance && config.channels.log) {
    maintenanceInterval = startAutoMaintenance(client, config);
  }
  
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
        logger.error(`Command error: ${interaction.commandName}`, error);
        
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
    logger.error('Interaction error', error);
    
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
client.on(Events.Error, error => {
  console.error('[CLIENT ERROR]:', error);
  logger.error('Discord client error', error);
});

client.on(Events.Warn, warning => {
  console.warn('[CLIENT WARNING]:', warning);
  logger.logWarn(warning);
});

process.on('unhandledRejection', error => {
  console.error('[UNHANDLED REJECTION]:', error);
  logger.error('Unhandled rejection', error);
});

process.on('uncaughtException', error => {
  console.error('[UNCAUGHT EXCEPTION]:', error);
  logger.error('Uncaught exception', error);
  process.exit(1);
});

// ✅ Graceful shutdown handlers
process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] Received SIGINT, shutting down gracefully...');
  
  if (maintenanceInterval) {
    console.log('[SHUTDOWN] Stopping log maintenance...');
    clearInterval(maintenanceInterval);
  }
  
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[SHUTDOWN] Received SIGTERM, shutting down gracefully...');
  
  if (maintenanceInterval) {
    console.log('[SHUTDOWN] Stopping log maintenance...');
    clearInterval(maintenanceInterval);
  }
  
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
healthServer.listen(PORT, () => {
  console.log(`[HEALTH] Server listening on port ${PORT}`);
  logger.logInfo(`Health server on port ${PORT}`);
});

// Login
client.login(config.discord.token);
