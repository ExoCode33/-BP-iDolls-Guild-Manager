import { Client, Events, GatewayIntentBits, Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from './utils/logger.js';
import performanceMonitor from './utils/performanceMonitor.js';
import db from './services/database.js';
import sheetsService from './services/sheets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// ============================================================================
// COMMAND LOADING
// ============================================================================

console.log('[STARTUP] Loading commands...');

// Load admin commands
const adminCommandsPath = join(__dirname, 'commands', 'admin');
const adminCommandFiles = readdirSync(adminCommandsPath).filter(file => file.endsWith('.js'));

for (const file of adminCommandFiles) {
  const filePath = join(adminCommandsPath, file);
  const command = await import(`file://${filePath}`);
  
  if ('data' in command.default && 'execute' in command.default) {
    client.commands.set(command.default.data.name, command.default);
    console.log(`[STARTUP] Loaded admin command: ${command.default.data.name}`);
  } else {
    console.warn(`[STARTUP] Warning: ${file} is missing required "data" or "execute" property`);
  }
}

// Load user commands
const userCommandsPath = join(__dirname, 'commands', 'user');
const userCommandFiles = readdirSync(userCommandsPath).filter(file => file.endsWith('.js'));

for (const file of userCommandFiles) {
  const filePath = join(userCommandsPath, file);
  const command = await import(`file://${filePath}`);
  
  if ('data' in command.default && 'execute' in command.default) {
    client.commands.set(command.default.data.name, command.default);
    console.log(`[STARTUP] Loaded user command: ${command.default.data.name}`);
  } else {
    console.warn(`[STARTUP] Warning: ${file} is missing required "data" or "execute" property`);
  }
}

console.log(`[STARTUP] Loaded ${client.commands.size} commands total`);

// ============================================================================
// CLIENT READY EVENT
// ============================================================================

client.once(Events.ClientReady, async () => {
  console.log(`[STARTUP] Bot logged in as ${client.user.tag}`);
  
  try {
    // ✅ 1. START PERFORMANCE MONITORING FIRST
    console.log('[STARTUP] Starting performance monitor...');
    performanceMonitor.startMonitoring(60000); // Check every 60 seconds
    console.log('[STARTUP] ✓ Performance monitor started');
    
    // ✅ 2. MAKE LOGGER AVAILABLE GLOBALLY (for performance monitor)
    global.logger = logger;
    
    // ✅ 3. INITIALIZE LOGGER WITH DISCORD CLIENT
    console.log('[STARTUP] Initializing logger...');
    await logger.setClient(
      client, 
      process.env.LOG_CHANNEL_ID,
      process.env.CLEAR_LOG_ON_START?.toLowerCase() === 'true'
    );
    console.log('[STARTUP] ✓ Logger initialized');
    
    // ✅ 4. LOAD LOGGER SETTINGS FROM DATABASE
    console.log('[STARTUP] Loading logger settings...');
    await logger.loadSettingsFromDatabase(db);
    console.log('[STARTUP] ✓ Logger settings loaded');
    
    // ✅ 5. INITIALIZE DATABASE
    console.log('[STARTUP] Connecting to database...');
    await db.initialize();
    console.log('[STARTUP] ✓ Database connected');
    
    // ✅ 6. INITIALIZE GOOGLE SHEETS SERVICE
    console.log('[STARTUP] Initializing Google Sheets...');
    await sheetsService.initialize();
    console.log('[STARTUP] ✓ Google Sheets service ready');
    
    // ✅ 7. START AUTO-SYNC (if enabled)
    const autoSyncInterval = parseInt(process.env.AUTO_SYNC_INTERVAL);
    if (autoSyncInterval && autoSyncInterval > 0) {
      console.log(`[STARTUP] Starting auto-sync (every ${autoSyncInterval/1000}s)...`);
      
      setInterval(async () => {
        try {
          console.log('[AUTO-SYNC] Starting...');
          const allChars = await db.getAllUsersWithCharacters();
          
          // Enrich with Discord names
          const enrichedChars = await Promise.all(
            allChars.map(async (char) => {
              let discordName = char.user_id;
              try {
                const user = await client.users.fetch(char.user_id);
                discordName = user.username;
                
                // Try to get nickname if in guild
                const guild = client.guilds.cache.first();
                if (guild) {
                  try {
                    const member = await guild.members.fetch(char.user_id);
                    if (member.nickname) discordName = member.nickname;
                  } catch (error) {
                    // Member not in guild
                  }
                }
              } catch (error) {
                // User not found
              }
              return { ...char, discord_name: discordName };
            })
          );
          
          await sheetsService.syncAllCharacters(enrichedChars);
          console.log(`[AUTO-SYNC] ✓ Synced ${enrichedChars.length} characters`);
          await logger.logInfo('Auto-sync completed', `${enrichedChars.length} characters`);
        } catch (error) {
          console.error('[AUTO-SYNC] Error:', error.message);
          await logger.logError('AutoSync', 'Auto-sync failed', error);
        }
      }, autoSyncInterval);
      
      console.log('[STARTUP] ✓ Auto-sync scheduled');
      await logger.logInfo('Auto-sync scheduled', `Every ${autoSyncInterval/1000}s`);
    }
    
    // ✅ 8. START NICKNAME SYNC (if enabled)
    const nicknameSyncEnabled = process.env.NICKNAME_SYNC_ENABLED?.toLowerCase() === 'true';
    if (nicknameSyncEnabled) {
      const nicknameSyncInterval = parseInt(process.env.NICKNAME_SYNC_INTERVAL) || 300000;
      console.log(`[STARTUP] Starting nickname sync (every ${nicknameSyncInterval/1000}s)...`);
      
      setInterval(async () => {
        try {
          console.log('[NICKNAME SYNC] Starting...');
          const guild = client.guilds.cache.first();
          if (!guild) return;
          
          const allUsers = await db.getAllUsersWithCharacters();
          let updated = 0;
          let failed = 0;
          
          for (const userData of allUsers) {
            try {
              const member = await guild.members.fetch(userData.user_id);
              const mainChar = userData.main_character;
              
              if (mainChar && mainChar.ign) {
                const newNickname = mainChar.ign;
                
                if (member.nickname !== newNickname) {
                  await member.setNickname(newNickname);
                  updated++;
                  console.log(`[NICKNAME SYNC] Updated ${userData.user_id} -> ${newNickname}`);
                }
              }
            } catch (error) {
              failed++;
              console.error(`[NICKNAME SYNC] Failed for ${userData.user_id}:`, error.message);
            }
          }
          
          console.log(`[NICKNAME SYNC] ✓ Complete: ${updated} updated, ${failed} failed`);
          await logger.logInfo(`Nickname sync complete: ${updated} updated, ${failed} failed`);
        } catch (error) {
          console.error('[NICKNAME SYNC] Error:', error.message);
          await logger.logError('NicknameSync', 'Nickname sync failed', error);
        }
      }, nicknameSyncInterval);
      
      console.log('[STARTUP] ✓ Nickname sync scheduled');
      await logger.logInfo('Nickname sync ENABLED', `Every ${nicknameSyncInterval/1000}s`);
    }
    
    // ✅ 9. LOG STARTUP SUCCESS
    await logger.logStartup(
      client.user.tag,
      process.env.PORT || 3000,
      client.commands.size
    );
    
    console.log('[STARTUP] ✓ Bot ready!');
    console.log('═'.repeat(80));
    
  } catch (error) {
    console.error('[STARTUP] Fatal error during initialization:', error);
    process.exit(1);
  }
});

// ============================================================================
// INTERACTION HANDLING
// ============================================================================

client.on(Events.InteractionCreate, async (interaction) => {
  // Handle commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    
    if (!command) {
      console.error(`[ERROR] No command matching ${interaction.commandName} was found.`);
      return;
    }
    
    try {
      await logger.logCommand(
        interaction.commandName,
        interaction.user.username,
        interaction.user.id,
        {
          guild: interaction.guild?.name,
          channel: interaction.channel?.name,
          subcommand: interaction.options?.getSubcommand?.(false)
        }
      );
      
      await command.execute(interaction);
    } catch (error) {
      console.error(`[ERROR] Error executing ${interaction.commandName}:`, error);
      await logger.logError('Command', `Failed to execute /${interaction.commandName}`, error, {
        user: interaction.user.id,
        guild: interaction.guild?.id
      });
      
      const errorMessage = { content: '❌ There was an error executing this command!', ephemeral: true };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }
  
  // Handle buttons
  else if (interaction.isButton()) {
    try {
      // Dynamic import of button handler
      const { handleButton } = await import('./handlers/interactions/buttons.js');
      await handleButton(interaction);
    } catch (error) {
      console.error('[ERROR] Button interaction error:', error);
      await logger.logError('Button', 'Button interaction failed', error, {
        customId: interaction.customId,
        user: interaction.user.id
      });
    }
  }
  
  // Handle select menus
  else if (interaction.isStringSelectMenu()) {
    try {
      // Dynamic import of select menu handler
      const { handleSelectMenu } = await import('./handlers/interactions/selectMenus.js');
      await handleSelectMenu(interaction);
    } catch (error) {
      console.error('[ERROR] Select menu interaction error:', error);
      await logger.logError('SelectMenu', 'Select menu interaction failed', error, {
        customId: interaction.customId,
        user: interaction.user.id
      });
    }
  }
  
  // Handle modals
  else if (interaction.isModalSubmit()) {
    try {
      // Dynamic import of modal handler
      const { handleModal } = await import('./handlers/interactions/modals.js');
      await handleModal(interaction);
    } catch (error) {
      console.error('[ERROR] Modal interaction error:', error);
      await logger.logError('Modal', 'Modal submission failed', error, {
        customId: interaction.customId,
        user: interaction.user.id
      });
    }
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

client.on(Events.Error, error => {
  console.error('[CLIENT ERROR]', error);
  if (global.logger) {
    logger.logError('Discord', 'Client error occurred', error);
  }
});

process.on('unhandledRejection', error => {
  console.error('[UNHANDLED REJECTION]', error);
  if (global.logger) {
    logger.logError('Process', 'Unhandled promise rejection', error);
  }
});

process.on('uncaughtException', error => {
  console.error('[UNCAUGHT EXCEPTION]', error);
  if (global.logger) {
    logger.logError('Process', 'Uncaught exception', error);
  }
  process.exit(1);
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function shutdown(signal) {
  console.log(`[SHUTDOWN] Received ${signal} signal`);
  
  try {
    // Stop performance monitoring
    if (performanceMonitor) {
      performanceMonitor.stopMonitoring();
      console.log('[SHUTDOWN] Performance monitor stopped');
    }
    
    // Stop logger cleanup
    if (logger) {
      logger.stopPeriodicCleanup();
      await logger.logShutdown(signal);
      console.log('[SHUTDOWN] Logger stopped');
    }
    
    // Close database connections
    if (db && db.close) {
      await db.close();
      console.log('[SHUTDOWN] Database closed');
    }
    
    // Destroy Discord client
    client.destroy();
    console.log('[SHUTDOWN] Client destroyed');
    
    process.exit(0);
  } catch (error) {
    console.error('[SHUTDOWN] Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ============================================================================
// LOGIN
// ============================================================================

client.login(process.env.DISCORD_TOKEN);
