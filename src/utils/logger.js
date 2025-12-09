// src/utils/logger.js
import dotenv from 'dotenv';
dotenv.config();

class Logger {
  constructor() {
    this.client = null;
    this.logChannelId = process.env.LOG_CHANNEL_ID;
    this.verboseMode = process.env.LOG_VERBOSE === 'true';
    this.logToDiscord = process.env.LOG_TO_DISCORD !== 'false'; // Default true
    
    // Track what's been logged to avoid duplicates
    this.startupLogs = {
      handlers: null,
      server: false,
      bot: false,
      commands: false
    };
  }

  // Initialize with Discord client
  init(client) {
    this.client = client;
    if (this.logChannelId && this.logToDiscord) {
      console.log('📡 Discord logging → enabled');
    }
  }

  // Send to Discord
  async toDiscord(message, level = 'INFO') {
    if (!this.logChannelId || !this.client || !this.logToDiscord) return;
    
    try {
      const channel = await this.client.channels.fetch(this.logChannelId);
      if (!channel) return;
      
      const icons = {
        'INFO': '🔵',
        'SUCCESS': '✅',
        'ERROR': '❌',
        'WARNING': '⚠️',
        'SYNC': '🔄'
      };
      
      const icon = icons[level] || '📝';
      const timestamp = new Date().toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
      
      await channel.send(`${icon} **[${level}]** ${timestamp}\n\`\`\`${message}\`\`\``);
    } catch (error) {
      // Silently fail
    }
  }

  // Core logging methods
  info(message, sendToDiscord = false) {
    console.log(message);
    if (sendToDiscord) this.toDiscord(message, 'INFO');
  }

  success(message, sendToDiscord = true) {
    console.log(message);
    if (sendToDiscord) this.toDiscord(message, 'SUCCESS');
  }

  error(message, sendToDiscord = true) {
    console.error(message);
    if (sendToDiscord) this.toDiscord(message, 'ERROR');
  }

  warning(message, sendToDiscord = false) {
    console.log(message);
    if (sendToDiscord) this.toDiscord(message, 'WARNING');
  }

  sync(message, sendToDiscord = true) {
    console.log(message);
    if (sendToDiscord) this.toDiscord(message, 'SYNC');
  }

  // Verbose logging (only if LOG_VERBOSE=true)
  verbose(message) {
    if (this.verboseMode) {
      console.log(`[VERBOSE] ${message}`);
    }
  }

  // Startup logs (compact)
  handlers(loaded, missing) {
    if (this.startupLogs.handlers) return; // Already logged
    
    if (loaded.length > 0) {
      this.info(`✅ Handlers: ${loaded.join(', ')}`);
    }
    if (missing.length > 0 && this.verboseMode) {
      this.info(`⚠️ Missing: ${missing.join(', ')}`);
    }
    
    this.startupLogs.handlers = true;
  }

  server(port) {
    if (this.startupLogs.server) return;
    this.info(`✅ Server: :${port}`);
    this.startupLogs.server = true;
  }

  botReady(username) {
    if (this.startupLogs.bot) return;
    this.success(`✅ Bot ready: ${username}`);
    this.startupLogs.bot = true;
  }

  commands(count) {
    if (this.startupLogs.commands) return;
    this.info(`✅ Commands: ${count} registered`);
    this.startupLogs.commands = true;
  }

  // Auto-sync logs
  syncStarted() {
    this.sync('🔄 Syncing to Sheets...');
  }

  syncComplete() {
    this.success('✅ Sync complete');
  }

  syncFailed(error) {
    this.error(`❌ Sync failed: ${error.message}`);
  }

  // Interaction logs (verbose only)
  interaction(type, customId) {
    this.verbose(`${type}: ${customId}`);
  }

  // Command execution
  commandExecuted(commandName, username) {
    this.verbose(`/${commandName} by ${username}`);
  }

  commandError(commandName, error) {
    this.error(`❌ /${commandName}: ${error.message}`);
  }

  // Shutdown
  shutdown() {
    this.info('🛑 Shutting down...');
  }
}

// Export singleton instance
const logger = new Logger();
export default logger;
