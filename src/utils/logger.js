// src/utils/logger.js
import dotenv from 'dotenv';
dotenv.config();

class Logger {
  constructor() {
    this.client = null;
    this.logChannelId = process.env.LOG_CHANNEL_ID;
    this.verboseMode = process.env.LOG_VERBOSE === 'true';
    this.logToDiscord = process.env.LOG_TO_DISCORD !== 'false'; // Default true
    
    // Track startup to send one summary
    this.startup = {
      handlers: null,
      server: null,
      bot: null,
      commands: null
    };
  }

  // Initialize with Discord client
  init(client) {
    this.client = client;
    if (this.logChannelId && this.logToDiscord) {
      console.log('📡 Discord logging → enabled');
      this.sendStartupSummary();
    }
  }

  // Send consolidated startup summary to Discord
  async sendStartupSummary() {
    if (!this.startup.handlers || !this.startup.server || !this.startup.bot || !this.startup.commands) {
      return; // Wait until all startup info is collected
    }

    const summary = [
      '**🚀 BOT STARTED**',
      `├─ 🤖 ${this.startup.bot}`,
      `├─ 🔧 ${this.startup.handlers}`,
      `├─ 📝 ${this.startup.commands}`,
      `└─ 🌐 ${this.startup.server}`
    ].join('\n');

    await this.toDiscord(summary, 'SUCCESS');
  }

  // Send to Discord with compact format
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
        'COMMAND': '⚡',
        'SYNC': '🔄'
      };
      
      const icon = icons[level] || '📝';
      const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      // Compact format: icon [time] message
      if (level === 'SUCCESS' || level === 'ERROR') {
        // Multi-line messages (like startup summary)
        await channel.send(`${icon} **[${timestamp}]**\n${message}`);
      } else {
        // Single line messages
        await channel.send(`${icon} **[${timestamp}]** ${message}`);
      }
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

  warning(message, sendToDiscord = true) {
    console.log(message);
    if (sendToDiscord) this.toDiscord(message, 'WARNING');
  }

  command(message, sendToDiscord = true) {
    console.log(message);
    if (sendToDiscord) this.toDiscord(message, 'COMMAND');
  }

  sync(message, sendToDiscord = true) {
    console.log(message);
    if (sendToDiscord) this.toDiscord(message, 'SYNC');
  }

  // Verbose logging (only console, never Discord)
  verbose(message) {
    if (this.verboseMode) {
      console.log(`[VERBOSE] ${message}`);
    }
  }

  // Startup logs (compact)
  handlers(loaded, missing) {
    const loadedStr = loaded.length > 0 ? loaded.join(', ') : 'none';
    const msg = `Handlers: ${loadedStr}`;
    this.info(`✅ ${msg}`);
    this.startup.handlers = msg;
    if (missing.length > 0) {
      this.warning(`Missing handlers: ${missing.join(', ')}`, false);
    }
    this.sendStartupSummary();
  }

  server(port) {
    const msg = `Server: port ${port}`;
    this.info(`✅ ${msg}`);
    this.startup.server = msg;
    this.sendStartupSummary();
  }

  botReady(username) {
    const msg = `Bot: ${username}`;
    this.info(`✅ ${msg}`);
    this.startup.bot = msg;
    this.sendStartupSummary();
  }

  commands(count) {
    const msg = `Commands: ${count} registered`;
    this.info(`✅ ${msg}`);
    this.startup.commands = msg;
    this.sendStartupSummary();
  }

  // Command execution (compact, to Discord)
  commandExecuted(commandName, username) {
    const msg = `\`/${commandName}\` by **${username}**`;
    this.command(msg);
    this.verbose(`/${commandName} by ${username}`);
  }

  commandError(commandName, error) {
    const msg = `**Command Failed:** \`/${commandName}\`\n└─ ${error.message}`;
    this.error(msg);
  }

  // Button/Select/Modal interactions (compact)
  interaction(type, customId) {
    // Extract just the action, not the full ID
    const action = customId.split('_').slice(0, -1).join('_') || customId;
    this.verbose(`${type}: ${action}`);
    
    // Only log important interactions to Discord
    if (type === 'Button' && (customId.includes('confirm') || customId.includes('remove'))) {
      this.command(`**${type}:** \`${action}\``);
    }
  }

  // Sync logs
  syncStarted() {
    this.sync('Syncing to Sheets...');
  }

  syncComplete() {
    this.success('Sync complete');
  }

  syncFailed(error) {
    this.error(`**Sync Failed:** ${error.message}`);
  }

  // Database connection
  dbConnected() {
    this.info('✅ Database connected', false);
  }

  // Shutdown
  shutdown() {
    const msg = 'Bot shutting down...';
    this.warning(msg);
    console.log('🛑 Shutting down...');
  }
}

// Export singleton instance
const logger = new Logger();
export default logger;
