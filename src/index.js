import { Client, Events, GatewayIntentBits, Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from './utils/logger.js';
import db from './services/database.js';
import sheetsService from './services/sheets.js';
import config from './utils/config.js';
import { updateDiscordNickname } from './utils/nicknameSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// ✅ EMBEDDED MEMORY LEAK PREVENTION (No separate file needed)
// ============================================================================

class MemoryMonitor {
  constructor() {
    this.gcThreshold = parseInt(process.env.MEMORY_GC_THRESHOLD) || 150; // MB
    this.criticalThreshold = parseInt(process.env.MEMORY_CRITICAL_THRESHOLD) || 200; // MB
    this.checkInterval = null;
    this.gcCount = 0;
    this.lastGC = 0;
  }

  start(intervalMs = 60000) {
    console.log(`[MEMORY] Starting monitor (GC at ${this.gcThreshold}MB, Critical at ${this.criticalThreshold}MB)`);
    
    this.checkInterval = setInterval(() => {
      const heapUsedMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      
      // Critical - force GC immediately
      if (heapUsedMB >= this.criticalThreshold) {
        console.error(`[MEMORY] 🔴 CRITICAL: ${heapUsedMB}MB - forcing GC`);
        this.forceGC('critical');
      }
      // High - trigger GC if we haven't done one recently
      else if (heapUsedMB >= this.gcThreshold) {
        const timeSinceLastGC = Date.now() - this.lastGC;
        if (timeSinceLastGC > 60000) { // Max once per minute
          console.warn(`[MEMORY] ⚠️  High: ${heapUsedMB}MB - triggering GC`);
          this.forceGC('preventive');
        }
      }
    }, intervalMs);
  }

  forceGC(reason) {
    if (!global.gc) {
      console.warn('[MEMORY] GC not available (start with --expose-gc)');
      return;
    }

    const before = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    
    try {
      global.gc();
      const after = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      const freed = before - after;
      
      this.gcCount++;
      this.lastGC = Date.now();
      
      console.log(`[MEMORY] ♻️  GC (${reason}): ${before}MB → ${after}MB (freed ${freed}MB)`);
    } catch (error) {
      console.error(`[MEMORY] GC failed: ${error.message}`);
    }
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[MEMORY] Monitor stopped');
    }
  }
}

const memoryMonitor = new MemoryMonitor();

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
    // ✅ 1. START MEMORY MONITORING FIRST
    console.log('[STARTUP] Starting memory monitor...');
    memoryMonitor.start(60000); // Check every 60 seconds
    console.log('[STARTUP] ✓ Memory monitor started');
    
    // ✅ 2. MAKE LOGGER AVAILABLE GLOBALLY
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
    
    // ✅ 8. START NICKNAME SYNC (if enabled) - WITH FIXED MISMATCH DETECTION
    if (config.sync.nicknameSyncEnabled) {
      const nicknameSyncInterval = config.sync.nicknameSyncInterval || 300000;
      console.log(`[STARTUP] Starting nickname sync (every ${nicknameSyncInterval/1000}s)...`);
      
      setInterval(async () => {
        try {
          console.log('[NICKNAME SYNC] Starting periodic sync...');
          const guild = await client.guilds.fetch(config.discord.guildId);
          if (!guild) {
            console.error('[NICKNAME SYNC] Guild not found');
            return;
          }

          // ✅ FIXED: Get all characters and filter to main only
          const allChars = await db.getAllCharacters();
          const mainChars = allChars.filter(c => c.character_type === 'main');
          
          console.log(`[NICKNAME SYNC] Found ${mainChars.length} main characters to check`);

          let updated = 0;
          let skipped = 0;
          let failed = 0;
          const failedUsers = [];

          for (const mainChar of mainChars) {
            try {
              const member = await guild.members.fetch(mainChar.user_id);
              if (!member) {
                console.log(`[NICKNAME SYNC] ⚠️ Member ${mainChar.user_id} not found in guild`);
                continue;
              }

              // ✅ CRITICAL FIX: Check actual display name (nickname OR username)
              const currentDisplayName = member.nickname || member.user.username;
              const expectedIGN = mainChar.ign;

              console.log(`[NICKNAME SYNC] Checking ${member.user.username}: "${currentDisplayName}" vs "${expectedIGN}"`);

              // Check if already matches
              if (currentDisplayName === expectedIGN) {
                skipped++;
                console.log(`[NICKNAME SYNC] ✅ ${member.user.username} already correct: ${expectedIGN}`);
                continue;
              }

              // ✅ MISMATCH DETECTED - Attempt to sync
              console.log(`[NICKNAME SYNC] 🔄 MISMATCH: "${currentDisplayName}" → "${expectedIGN}"`);
              
              const result = await updateDiscordNickname(
                client,
                config.discord.guildId,
                mainChar.user_id,
                expectedIGN
              );

              if (result.success) {
                updated++;
                console.log(`[NICKNAME SYNC] ✅ Updated ${member.user.username} → ${expectedIGN}`);
              } else {
                failed++;
                failedUsers.push({
                  userId: mainChar.user_id,
                  username: member.user.username,
                  ign: expectedIGN,
                  currentNickname: currentDisplayName,
                  reason: result.reason
                });
                console.log(`[NICKNAME SYNC] ❌ Failed for ${member.user.username}: ${result.reason}`);
              }

              // Small delay to avoid rate limits
              await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
              console.error(`[NICKNAME SYNC] ❌ Error for ${mainChar.user_id}:`, error.message);
              failed++;
              failedUsers.push({
                userId: mainChar.user_id,
                ign: mainChar.ign,
                reason: error.message
              });
            }
          }

          // Log summary
          console.log(`[NICKNAME SYNC] Complete: ${updated} updated, ${skipped} already correct, ${failed} failed`);

          if (failedUsers.length > 0) {
            console.log(`[NICKNAME SYNC] Failed users:`, failedUsers);
            
            // ✅ FIXED: Log to Discord with role ping for nickname sync failures
            const failureDetails = failedUsers
              .slice(0, 10) // Limit to first 10 to avoid message length issues
              .map(f => `• <@${f.userId}> (${f.username || 'Unknown'}) - IGN: ${f.ign} - Current: ${f.currentNickname || 'None'} - Reason: ${f.reason}`)
              .join('\n');

            // Get admin role from environment variable
            const adminRoleId = process.env.ADMIN_ROLE_ID;
            
            if (adminRoleId) {
              // Send direct Discord message with role ping and role name
              try {
                const logChannel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
                if (logChannel && logChannel.isTextBased()) {
                  // Fetch the role to get its name
                  const role = await guild.roles.fetch(adminRoleId);
                  const roleName = role ? role.name : 'Admin';
                  
                  await logChannel.send({
                    content: `<@&${adminRoleId}> ⚠️ **[@${roleName}] Nickname Sync Alert**\n\n**${failed} nickname sync failure${failed > 1 ? 's' : ''} detected:**\n${failureDetails}${failedUsers.length > 10 ? `\n\n...and ${failedUsers.length - 10} more` : ''}`
                  });
                }
              } catch (error) {
                console.error('[NICKNAME SYNC] Failed to send Discord ping:', error.message);
              }
            }
            
            // Also log through logger for console/records
            await logger.logWarning(
              'Periodic Nickname Sync',
              `${failed} nickname sync failure${failed > 1 ? 's' : ''} detected`,
              failureDetails
            );
          }

          if (updated > 0) {
            await logger.logInfo(
              'Periodic Nickname Sync',
              `Successfully synced ${updated} nickname${updated > 1 ? 's' : ''}`,
              `${skipped} already correct, ${failed} failed`
            );
          }

        } catch (error) {
          console.error('[NICKNAME SYNC] Periodic sync error:', error);
          await logger.logError(
            'Periodic Nickname Sync',
            'Periodic nickname sync encountered an error',
            error
          );
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
      const { handleButtonInteraction } = await import('./handlers/interactions.js');
      await handleButtonInteraction(interaction);
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
      const { handleSelectMenuInteraction } = await import('./handlers/interactions.js');
      await handleSelectMenuInteraction(interaction);
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
      const { handleModalSubmit } = await import('./handlers/interactions.js');
      await handleModalSubmit(interaction);
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
    // Stop memory monitoring
    memoryMonitor.stop();
    console.log('[SHUTDOWN] Memory monitor stopped');
    
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
