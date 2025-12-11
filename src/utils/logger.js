import { EmbedBuilder } from 'discord.js';

/**
 * Comprehensive Logging System
 * 
 * Features:
 * - Detailed Railway (console) logs with colored ANSI
 * - Discord logs with ANSI colors (NO EMBEDS - single line format)
 * - Configurable Discord logs with multiple levels
 * - Role ping support for errors and warnings (separate control)
 * - Full coverage of all bot operations
 * - Professional formatting and organization
 */

class Logger {
  constructor() {
    this.client = null;
    this.logChannelId = null;
    this.isReady = false;
    this.messageQueue = [];
    
    // Configuration from environment variables
    this.discordLogLevel = process.env.DISCORD_LOG_LEVEL || 'INFO';
    this.errorPingEnabled = process.env.ERROR_PING_ENABLED?.toLowerCase() === 'true';
    this.errorPingRoleId = process.env.ERROR_PING_ROLE_ID || null;
    this.warnPingEnabled = process.env.WARN_PING_ENABLED?.toLowerCase() === 'true';
    this.warnPingRoleId = process.env.WARN_PING_ROLE_ID || null;
    this.debugMode = process.env.DEBUG_MODE?.toLowerCase() === 'true';
    this.clearOnStart = process.env.CLEAR_LOG_ON_START?.toLowerCase() === 'true';
    
    // Log level hierarchy
    this.LOG_LEVELS = {
      ERROR_ONLY: 0,
      WARN_ERROR: 1,
      INFO: 2,
      VERBOSE: 3,
      DEBUG: 4,
      ALL: 5
    };
    
    // ANSI color codes
    this.COLORS = {
      RESET: '\x1b[0m',
      BRIGHT: '\x1b[1m',
      DIM: '\x1b[2m',
      
      // Foreground colors
      BLACK: '\x1b[30m',
      RED: '\x1b[31m',
      GREEN: '\x1b[32m',
      YELLOW: '\x1b[33m',
      BLUE: '\x1b[34m',
      MAGENTA: '\x1b[35m',
      CYAN: '\x1b[36m',
      WHITE: '\x1b[37m',
      GRAY: '\x1b[90m',
      
      // Background colors
      BG_RED: '\x1b[41m',
      BG_GREEN: '\x1b[42m',
      BG_YELLOW: '\x1b[43m',
      BG_BLUE: '\x1b[44m',
      BG_MAGENTA: '\x1b[45m',
      BG_CYAN: '\x1b[46m'
    };
    
    // Stats tracking
    this.stats = {
      errors: 0,
      warnings: 0,
      commands: 0,
      interactions: 0,
      registrations: 0,
      edits: 0,
      deletes: 0
    };
    
    this.startTime = Date.now();
  }

  /**
   * Initialize logger with Discord client
   */
  async setClient(client, logChannelId, clearOnStart = false) {
    this.client = client;
    this.logChannelId = logChannelId;
    
    console.log(this.COLORS.CYAN + '[LOGGER INIT] Setting up Discord logging...' + this.COLORS.RESET);
    console.log(this.COLORS.CYAN + '├─ Channel ID: ' + this.COLORS.YELLOW + (logChannelId || 'NOT SET') + this.COLORS.RESET);
    console.log(this.COLORS.CYAN + '├─ Log Level: ' + this.COLORS.YELLOW + this.discordLogLevel + this.COLORS.RESET);
    console.log(this.COLORS.CYAN + '├─ Error Ping: ' + (this.errorPingEnabled ? this.COLORS.GREEN + 'ENABLED' : this.COLORS.GRAY + 'DISABLED') + this.COLORS.RESET);
    console.log(this.COLORS.CYAN + '├─ Warn Ping: ' + (this.warnPingEnabled ? this.COLORS.GREEN + 'ENABLED' : this.COLORS.GRAY + 'DISABLED') + this.COLORS.RESET);
    console.log(this.COLORS.CYAN + '├─ Debug Mode: ' + (this.debugMode ? this.COLORS.GREEN + 'ENABLED' : this.COLORS.GRAY + 'DISABLED') + this.COLORS.RESET);
    console.log(this.COLORS.CYAN + '├─ Queued Messages: ' + this.COLORS.YELLOW + this.messageQueue.length + this.COLORS.RESET);
    
    if (!logChannelId) {
      console.error(this.COLORS.RED + '[LOGGER ERROR] No log channel ID provided! Discord logging will not work.' + this.COLORS.RESET);
      return;
    }
    
    if (clearOnStart && this.logChannelId) {
      try {
        const channel = await this.client.channels.fetch(this.logChannelId);
        if (channel) {
          // Clear last 100 messages
          const messages = await channel.messages.fetch({ limit: 100 });
          await channel.bulkDelete(messages, true);
          console.log(this.COLORS.CYAN + '[LOG] Cleared log channel' + this.COLORS.RESET);
        }
      } catch (error) {
        console.error(this.COLORS.RED + '[LOG ERROR] Failed to clear log channel: ' + error.message + this.COLORS.RESET);
      }
    }
    
    // Mark as ready
    this.isReady = true;
    
    // Flush queued messages
    if (this.messageQueue.length > 0) {
      console.log(this.COLORS.CYAN + `[LOGGER INIT] Flushing ${this.messageQueue.length} queued messages...` + this.COLORS.RESET);
      for (const { ansiMessage, pingRole } of this.messageQueue) {
        await this._sendToDiscordNow(ansiMessage, pingRole);
      }
      this.messageQueue = [];
    }
    
    console.log(this.COLORS.GREEN + '[LOGGER INIT] Discord logging initialized successfully!' + this.COLORS.RESET);
  }

  /**
   * Load settings from database
   */
  async loadSettingsFromDatabase(db) {
    try {
      const settings = await db.getAllBotSettings();
      
      // Update logger settings
      if (settings.log_level) {
        this.discordLogLevel = settings.log_level;
      }
      if (settings.debug_mode !== undefined) {
        this.debugMode = settings.debug_mode;
      }
      if (settings.error_ping_enabled !== undefined) {
        this.errorPingEnabled = settings.error_ping_enabled;
      }
      if (settings.error_ping_role_id) {
        this.errorPingRoleId = settings.error_ping_role_id;
      }
      if (settings.warn_ping_enabled !== undefined) {
        this.warnPingEnabled = settings.warn_ping_enabled;
      }
      if (settings.warn_ping_role_id) {
        this.warnPingRoleId = settings.warn_ping_role_id;
      }
      if (settings.log_channel_id) {
        this.logChannelId = settings.log_channel_id;
      }
      
      console.log(this.COLORS.CYAN + '[LOGGER] Settings loaded from database' + this.COLORS.RESET);
      console.log(this.COLORS.CYAN + '├─ Level: ' + this.COLORS.YELLOW + this.discordLogLevel + this.COLORS.RESET);
      console.log(this.COLORS.CYAN + '├─ Channel: ' + this.COLORS.YELLOW + (this.logChannelId || 'None') + this.COLORS.RESET);
      console.log(this.COLORS.CYAN + '├─ Error Ping: ' + (this.errorPingEnabled ? this.COLORS.GREEN + 'ENABLED' : this.COLORS.GRAY + 'DISABLED') + this.COLORS.RESET);
      console.log(this.COLORS.CYAN + '└─ Warn Ping: ' + (this.warnPingEnabled ? this.COLORS.GREEN + 'ENABLED' : this.COLORS.GRAY + 'DISABLED') + this.COLORS.RESET);
    } catch (error) {
      console.error(this.COLORS.RED + `[LOGGER ERROR] Failed to load settings from database: ${error.message}` + this.COLORS.RESET);
    }
  }

  /**
   * Get current log level value
   */
  getCurrentLogLevel() {
    return this.LOG_LEVELS[this.discordLogLevel] || this.LOG_LEVELS.INFO;
  }

  /**
   * Check if a message should be logged to Discord based on level
   */
  shouldLogToDiscord(requiredLevel) {
    return this.getCurrentLogLevel() >= this.LOG_LEVELS[requiredLevel];
  }

  /**
   * Get formatted timestamp
   */
  getTimestamp() {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' });
    const day = now.getDate();
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${month} ${day}, ${year} ${hours}:${minutes}:${seconds}.${ms}`;
  }

  /**
   * Get short timestamp for Discord
   */
  getShortTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Format user as "username (userId)"
   */
  formatUser(username, userId) {
    return `${username} (${userId})`;
  }

  /**
   * Send ANSI colored message to Discord (in code block)
   * Queues messages if client not ready yet
   */
  async sendToDiscord(ansiMessage, pingRole = null) {
    if (!this.isReady) {
      // Queue message until client is ready
      this.messageQueue.push({ ansiMessage, pingRole });
      return;
    }
    
    await this._sendToDiscordNow(ansiMessage, pingRole);
  }

  /**
   * Internal method to actually send to Discord
   */
  async _sendToDiscordNow(ansiMessage, pingRole = null) {
    if (!this.client || !this.logChannelId) {
      console.error(this.COLORS.RED + '[LOG ERROR] Cannot send to Discord: client or channel ID not set' + this.COLORS.RESET);
      return;
    }
    
    try {
      const channel = await this.client.channels.fetch(this.logChannelId);
      if (!channel) {
        console.error(this.COLORS.RED + `[LOG ERROR] Could not fetch channel with ID: ${this.logChannelId}` + this.COLORS.RESET);
        return;
      }

      // Put ping INSIDE the ANSI block for cleaner appearance
      let fullMessage = ansiMessage;
      if (pingRole) {
        fullMessage = `${this.COLORS.RED}[@${this.COLORS.RESET}<@&${pingRole}>${this.COLORS.RED}]${this.COLORS.RESET} ${ansiMessage}`;
      }
      
      const message = `\`\`\`ansi\n${fullMessage}\n\`\`\``;
      
      await channel.send(message);
    } catch (error) {
      console.error(this.COLORS.RED + `[LOG ERROR] Failed to send to Discord: ${error.message}` + this.COLORS.RESET);
      console.error(this.COLORS.RED + `[LOG ERROR] Channel ID: ${this.logChannelId}` + this.COLORS.RESET);
      if (this.debugMode) {
        console.error(this.COLORS.RED + `[LOG ERROR] Error details: ${error.stack}` + this.COLORS.RESET);
      }
    }
  }

  /**
   * Format uptime duration
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // ============================================================================
  // SYSTEM LOGS
  // ============================================================================

  /**
   * Log system startup
   */
  async logStartup(clientTag, port, commandCount) {
    const timestamp = this.getTimestamp();
    const nodeVersion = process.version;
    const platform = process.platform;
    const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    
    // Railway log (detailed)
    console.log(this.COLORS.GREEN + '═'.repeat(80) + this.COLORS.RESET);
    console.log(this.COLORS.BRIGHT + this.COLORS.GREEN + '[SYSTEM STARTUP] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '═'.repeat(80) + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'Status: ' + this.COLORS.BRIGHT + this.COLORS.GREEN + '✓ ONLINE' + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'Bot: ' + this.COLORS.CYAN + clientTag + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'Port: ' + this.COLORS.CYAN + port + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'Commands: ' + this.COLORS.CYAN + commandCount + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'Node: ' + this.COLORS.CYAN + nodeVersion + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'Platform: ' + this.COLORS.CYAN + platform + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'Memory: ' + this.COLORS.CYAN + memory + 'MB' + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'Discord Log Level: ' + this.COLORS.YELLOW + this.discordLogLevel + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'Error Ping: ' + (this.errorPingEnabled ? this.COLORS.GREEN + 'ENABLED' : this.COLORS.GRAY + 'DISABLED') + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '└─ ' + this.COLORS.RESET + 'Warn Ping: ' + (this.warnPingEnabled ? this.COLORS.GREEN + 'ENABLED' : this.COLORS.GRAY + 'DISABLED') + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '═'.repeat(80) + this.COLORS.RESET);
    
    // Discord log (if INFO or higher) - ANSI colored single line
    if (this.shouldLogToDiscord('INFO')) {
      const time = this.getShortTimestamp();
      const ansiMsg = `${this.COLORS.GREEN}[${time}] 🚀 SYSTEM STARTUP${this.COLORS.RESET} - Bot: ${this.COLORS.CYAN}${clientTag}${this.COLORS.RESET} | Commands: ${this.COLORS.CYAN}${commandCount}${this.COLORS.RESET} | Log Level: ${this.COLORS.YELLOW}${this.discordLogLevel}${this.COLORS.RESET}`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  /**
   * Log system shutdown
   */
  async logShutdown(reason = 'Manual shutdown') {
    const timestamp = this.getTimestamp();
    const uptime = Date.now() - this.startTime;
    const uptimeStr = this.formatUptime(uptime);
    
    // Railway log
    console.log(this.COLORS.YELLOW + '═'.repeat(80) + this.COLORS.RESET);
    console.log(this.COLORS.BRIGHT + this.COLORS.YELLOW + '[SYSTEM SHUTDOWN] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '═'.repeat(80) + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Reason: ' + this.COLORS.CYAN + reason + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Uptime: ' + this.COLORS.CYAN + uptimeStr + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Total Commands: ' + this.COLORS.CYAN + this.stats.commands + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Total Interactions: ' + this.COLORS.CYAN + this.stats.interactions + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Errors: ' + this.COLORS.RED + this.stats.errors + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '└─ ' + this.COLORS.RESET + 'Warnings: ' + this.COLORS.YELLOW + this.stats.warnings + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '═'.repeat(80) + this.COLORS.RESET);
    
    // Discord log (if INFO or higher)
    if (this.shouldLogToDiscord('INFO')) {
      const time = this.getShortTimestamp();
      const ansiMsg = `${this.COLORS.YELLOW}[${time}] 🛑 SYSTEM SHUTDOWN${this.COLORS.RESET} - Reason: ${this.COLORS.CYAN}${reason}${this.COLORS.RESET} | Uptime: ${this.COLORS.CYAN}${uptimeStr}${this.COLORS.RESET} | Errors: ${this.COLORS.RED}${this.stats.errors}${this.COLORS.RESET}`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  // ============================================================================
  // COMMAND LOGS
  // ============================================================================

  /**
   * Log command execution
   */
  async logCommand(commandName, username, userId, options = {}) {
    this.stats.commands++;
    const timestamp = this.getTimestamp();
    const user = this.formatUser(username, userId);
    
    // Railway log
    console.log('');
    console.log(this.COLORS.MAGENTA + '[COMMAND] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.MAGENTA + '├─ ' + this.COLORS.RESET + 'Command: ' + this.COLORS.CYAN + '/' + commandName + this.COLORS.RESET);
    console.log(this.COLORS.MAGENTA + '├─ ' + this.COLORS.RESET + 'User: ' + this.COLORS.CYAN + user + this.COLORS.RESET);
    
    if (options.guild) {
      console.log(this.COLORS.MAGENTA + '├─ ' + this.COLORS.RESET + 'Guild: ' + this.COLORS.CYAN + options.guild + this.COLORS.RESET);
    }
    if (options.channel) {
      console.log(this.COLORS.MAGENTA + '├─ ' + this.COLORS.RESET + 'Channel: ' + this.COLORS.CYAN + options.channel + this.COLORS.RESET);
    }
    if (options.subcommand) {
      console.log(this.COLORS.MAGENTA + '├─ ' + this.COLORS.RESET + 'Subcommand: ' + this.COLORS.CYAN + options.subcommand + this.COLORS.RESET);
    }
    if (options.parameters) {
      console.log(this.COLORS.MAGENTA + '├─ ' + this.COLORS.RESET + 'Parameters:');
      for (const [key, value] of Object.entries(options.parameters)) {
        console.log(this.COLORS.MAGENTA + '├─   ' + this.COLORS.RESET + key + ': ' + this.COLORS.MAGENTA + value + this.COLORS.RESET);
      }
    }
    console.log(this.COLORS.MAGENTA + '└─ ' + this.COLORS.RESET + 'Status: ' + this.COLORS.GREEN + '✓ Executed' + this.COLORS.RESET);
    
    // Discord log (if VERBOSE or higher) - ANSI single line
    if (this.shouldLogToDiscord('VERBOSE')) {
      const time = this.getShortTimestamp();
      const subCmd = options.subcommand ? ` ${options.subcommand}` : '';
      const ansiMsg = `${this.COLORS.MAGENTA}[${time}] ⚡ CMD${this.COLORS.RESET} /${this.COLORS.CYAN}${commandName}${subCmd}${this.COLORS.RESET} by ${this.COLORS.CYAN}${username}${this.COLORS.RESET}`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  // ============================================================================
  // INTERACTION LOGS
  // ============================================================================

  /**
   * Log button interaction
   */
  async logButton(customId, username, userId, details = {}) {
    this.stats.interactions++;
    const timestamp = this.getTimestamp();
    const user = this.formatUser(username, userId);
    
    // Railway log
    console.log('');
    console.log(this.COLORS.BLUE + '[BUTTON] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.BLUE + '├─ ' + this.COLORS.RESET + 'Custom ID: ' + this.COLORS.CYAN + customId + this.COLORS.RESET);
    console.log(this.COLORS.BLUE + '├─ ' + this.COLORS.RESET + 'User: ' + this.COLORS.CYAN + user + this.COLORS.RESET);
    if (details.action) {
      console.log(this.COLORS.BLUE + '├─ ' + this.COLORS.RESET + 'Action: ' + this.COLORS.MAGENTA + details.action + this.COLORS.RESET);
    }
    console.log(this.COLORS.BLUE + '└─ ' + this.COLORS.RESET + 'Status: ' + this.COLORS.GREEN + '✓ Handled' + this.COLORS.RESET);
    
    // Discord log (if DEBUG or higher) - ANSI single line
    if (this.shouldLogToDiscord('DEBUG')) {
      const time = this.getShortTimestamp();
      const action = details.action ? ` [${details.action}]` : '';
      const ansiMsg = `${this.COLORS.BLUE}[${time}] 🔘 BUTTON${this.COLORS.RESET} ${this.COLORS.CYAN}${customId}${this.COLORS.RESET}${action} by ${this.COLORS.CYAN}${username}${this.COLORS.RESET}`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  /**
   * Log select menu interaction
   */
  async logSelectMenu(customId, username, userId, selected, details = {}) {
    this.stats.interactions++;
    const timestamp = this.getTimestamp();
    const user = this.formatUser(username, userId);
    
    // Railway log
    console.log('');
    console.log(this.COLORS.BLUE + '[SELECT MENU] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.BLUE + '├─ ' + this.COLORS.RESET + 'Custom ID: ' + this.COLORS.CYAN + customId + this.COLORS.RESET);
    console.log(this.COLORS.BLUE + '├─ ' + this.COLORS.RESET + 'User: ' + this.COLORS.CYAN + user + this.COLORS.RESET);
    console.log(this.COLORS.BLUE + '├─ ' + this.COLORS.RESET + 'Selected: ' + this.COLORS.MAGENTA + selected + this.COLORS.RESET);
    console.log(this.COLORS.BLUE + '└─ ' + this.COLORS.RESET + 'Status: ' + this.COLORS.GREEN + '✓ Handled' + this.COLORS.RESET);
    
    // Discord log (if DEBUG or higher) - ANSI single line
    if (this.shouldLogToDiscord('DEBUG')) {
      const time = this.getShortTimestamp();
      const ansiMsg = `${this.COLORS.BLUE}[${time}] 📋 MENU${this.COLORS.RESET} ${this.COLORS.CYAN}${customId}${this.COLORS.RESET} → ${this.COLORS.MAGENTA}${selected}${this.COLORS.RESET} by ${this.COLORS.CYAN}${username}${this.COLORS.RESET}`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  /**
   * Log modal submission
   */
  async logModal(customId, username, userId, fields = {}) {
    this.stats.interactions++;
    const timestamp = this.getTimestamp();
    const user = this.formatUser(username, userId);
    
    // Railway log
    console.log('');
    console.log(this.COLORS.BLUE + '[MODAL] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.BLUE + '├─ ' + this.COLORS.RESET + 'Custom ID: ' + this.COLORS.CYAN + customId + this.COLORS.RESET);
    console.log(this.COLORS.BLUE + '├─ ' + this.COLORS.RESET + 'User: ' + this.COLORS.CYAN + user + this.COLORS.RESET);
    if (Object.keys(fields).length > 0) {
      console.log(this.COLORS.BLUE + '├─ ' + this.COLORS.RESET + 'Fields:');
      for (const [key, value] of Object.entries(fields)) {
        console.log(this.COLORS.BLUE + '├─   ' + this.COLORS.RESET + key + ': ' + this.COLORS.MAGENTA + value + this.COLORS.RESET);
      }
    }
    console.log(this.COLORS.BLUE + '└─ ' + this.COLORS.RESET + 'Status: ' + this.COLORS.GREEN + '✓ Handled' + this.COLORS.RESET);
    
    // Discord log (if DEBUG or higher) - ANSI single line
    if (this.shouldLogToDiscord('DEBUG')) {
      const time = this.getShortTimestamp();
      const ansiMsg = `${this.COLORS.BLUE}[${time}] 📝 MODAL${this.COLORS.RESET} ${this.COLORS.CYAN}${customId}${this.COLORS.RESET} by ${this.COLORS.CYAN}${username}${this.COLORS.RESET}`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  // ============================================================================
  // CHARACTER ACTION LOGS
  // ============================================================================

  /**
   * Log character registration
   */
  async logRegistration(username, userId, characterType, characterData) {
    this.stats.registrations++;
    const timestamp = this.getTimestamp();
    const user = this.formatUser(username, userId);
    
    // Railway log
    console.log('');
    console.log(this.COLORS.GREEN + '[REGISTRATION] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'User: ' + this.COLORS.CYAN + user + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'Type: ' + this.COLORS.YELLOW + characterType + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'IGN: ' + this.COLORS.MAGENTA + characterData.ign + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'UID: ' + this.COLORS.MAGENTA + characterData.uid + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'Class: ' + this.COLORS.MAGENTA + characterData.class + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'Subclass: ' + this.COLORS.MAGENTA + characterData.subclass + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'Score: ' + this.COLORS.MAGENTA + characterData.abilityScore + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'Guild: ' + this.COLORS.MAGENTA + (characterData.guild || 'None') + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '└─ ' + this.COLORS.RESET + 'Status: ' + this.COLORS.GREEN + '✓ Registered' + this.COLORS.RESET);
    
    // Discord log (if VERBOSE or higher) - ANSI single line
    if (this.shouldLogToDiscord('VERBOSE')) {
      const time = this.getShortTimestamp();
      const ansiMsg = `${this.COLORS.GREEN}[${time}] 📝 REGISTER${this.COLORS.RESET} ${this.COLORS.YELLOW}${characterType}${this.COLORS.RESET} | ${this.COLORS.MAGENTA}${characterData.ign}${this.COLORS.RESET} (${characterData.uid}) | ${characterData.class}/${characterData.subclass} | ${this.COLORS.CYAN}${username}${this.COLORS.RESET}`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  /**
   * Log character edit
   */
  async logEdit(username, userId, characterType, field, oldValue, newValue, characterId = null) {
    this.stats.edits++;
    const timestamp = this.getTimestamp();
    const user = this.formatUser(username, userId);
    
    // Railway log
    console.log('');
    console.log(this.COLORS.YELLOW + '[EDIT] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'User: ' + this.COLORS.CYAN + user + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Type: ' + this.COLORS.YELLOW + characterType + this.COLORS.RESET);
    if (characterId) {
      console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Character ID: ' + this.COLORS.CYAN + characterId + this.COLORS.RESET);
    }
    console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Field: ' + this.COLORS.MAGENTA + field + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Old: ' + this.COLORS.RED + oldValue + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'New: ' + this.COLORS.GREEN + newValue + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '└─ ' + this.COLORS.RESET + 'Status: ' + this.COLORS.GREEN + '✓ Updated' + this.COLORS.RESET);
    
    // Discord log (if VERBOSE or higher) - ANSI single line
    if (this.shouldLogToDiscord('VERBOSE')) {
      const time = this.getShortTimestamp();
      const ansiMsg = `${this.COLORS.YELLOW}[${time}] ✏️ EDIT${this.COLORS.RESET} ${this.COLORS.YELLOW}${characterType}${this.COLORS.RESET} | ${this.COLORS.MAGENTA}${field}${this.COLORS.RESET}: ${this.COLORS.RED}${oldValue}${this.COLORS.RESET} → ${this.COLORS.GREEN}${newValue}${this.COLORS.RESET} | ${this.COLORS.CYAN}${username}${this.COLORS.RESET}`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  /**
   * Log character deletion
   */
  async logDelete(username, userId, characterType, characterData) {
    this.stats.deletes++;
    const timestamp = this.getTimestamp();
    const user = this.formatUser(username, userId);
    
    // Railway log
    console.log('');
    console.log(this.COLORS.RED + '[DELETE] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.RED + '├─ ' + this.COLORS.RESET + 'User: ' + this.COLORS.CYAN + user + this.COLORS.RESET);
    console.log(this.COLORS.RED + '├─ ' + this.COLORS.RESET + 'Type: ' + this.COLORS.YELLOW + characterType + this.COLORS.RESET);
    console.log(this.COLORS.RED + '├─ ' + this.COLORS.RESET + 'IGN: ' + this.COLORS.MAGENTA + characterData.ign + this.COLORS.RESET);
    console.log(this.COLORS.RED + '├─ ' + this.COLORS.RESET + 'Class: ' + this.COLORS.MAGENTA + characterData.class + this.COLORS.RESET);
    console.log(this.COLORS.RED + '└─ ' + this.COLORS.RESET + 'Status: ' + this.COLORS.RED + '✓ Deleted' + this.COLORS.RESET);
    
    // Discord log (if VERBOSE or higher) - ANSI single line
    if (this.shouldLogToDiscord('VERBOSE')) {
      const time = this.getShortTimestamp();
      const ansiMsg = `${this.COLORS.RED}[${time}] 🗑️ DELETE${this.COLORS.RESET} ${this.COLORS.YELLOW}${characterType}${this.COLORS.RESET} | ${this.COLORS.MAGENTA}${characterData.ign}${this.COLORS.RESET} (${characterData.class}) | ${this.COLORS.CYAN}${username}${this.COLORS.RESET}`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  /**
   * Log character view/profile access
   */
  async logView(viewerUsername, viewerUserId, targetUsername, targetUserId) {
    const timestamp = this.getTimestamp();
    const viewer = this.formatUser(viewerUsername, viewerUserId);
    const target = this.formatUser(targetUsername, targetUserId);
    
    // Railway log
    console.log('');
    console.log(this.COLORS.BLUE + '[VIEW] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.BLUE + '├─ ' + this.COLORS.RESET + 'Viewer: ' + this.COLORS.CYAN + viewer + this.COLORS.RESET);
    console.log(this.COLORS.BLUE + '├─ ' + this.COLORS.RESET + 'Target: ' + this.COLORS.CYAN + target + this.COLORS.RESET);
    console.log(this.COLORS.BLUE + '└─ ' + this.COLORS.RESET + 'Status: ' + this.COLORS.GREEN + '✓ Viewed' + this.COLORS.RESET);
    
    // Discord log (if ALL level only) - ANSI single line
    if (this.shouldLogToDiscord('ALL')) {
      const time = this.getShortTimestamp();
      const ansiMsg = `${this.COLORS.BLUE}[${time}] 👁️ VIEW${this.COLORS.RESET} ${this.COLORS.CYAN}${viewerUsername}${this.COLORS.RESET} viewed ${this.COLORS.CYAN}${targetUsername}${this.COLORS.RESET}'s profile`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  // ============================================================================
  // DATABASE LOGS
  // ============================================================================

  /**
   * Log database query
   */
  async logDatabaseQuery(operation, table, duration, success = true, details = '') {
    const timestamp = this.getTimestamp();
    
    // Railway log
    console.log('');
    console.log(this.COLORS.CYAN + '[DATABASE] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.CYAN + '├─ ' + this.COLORS.RESET + 'Operation: ' + this.COLORS.MAGENTA + operation + this.COLORS.RESET);
    console.log(this.COLORS.CYAN + '├─ ' + this.COLORS.RESET + 'Table: ' + this.COLORS.MAGENTA + table + this.COLORS.RESET);
    console.log(this.COLORS.CYAN + '├─ ' + this.COLORS.RESET + 'Duration: ' + this.COLORS.YELLOW + duration + 'ms' + this.COLORS.RESET);
    if (details) {
      console.log(this.COLORS.CYAN + '├─ ' + this.COLORS.RESET + 'Details: ' + this.COLORS.GRAY + details + this.COLORS.RESET);
    }
    console.log(this.COLORS.CYAN + '└─ ' + this.COLORS.RESET + 'Status: ' + (success ? this.COLORS.GREEN + '✓ Success' : this.COLORS.RED + '✗ Failed') + this.COLORS.RESET);
    
    // Discord log (if DEBUG or higher) - ANSI single line
    if (this.shouldLogToDiscord('DEBUG')) {
      const time = this.getShortTimestamp();
      const status = success ? this.COLORS.GREEN + '✓' : this.COLORS.RED + '✗';
      const ansiMsg = `${this.COLORS.CYAN}[${time}] 💾 DB${this.COLORS.RESET} ${this.COLORS.MAGENTA}${operation}${this.COLORS.RESET} on ${this.COLORS.MAGENTA}${table}${this.COLORS.RESET} (${duration}ms) ${status}${this.COLORS.RESET}`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  /**
   * Log database connection status
   */
  async logDatabaseConnection(status, details = '') {
    const timestamp = this.getTimestamp();
    
    // Railway log
    console.log('');
    console.log(this.COLORS.CYAN + '[DATABASE CONNECTION] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.CYAN + '├─ ' + this.COLORS.RESET + 'Status: ' + (status === 'connected' ? this.COLORS.GREEN : this.COLORS.RED) + status.toUpperCase() + this.COLORS.RESET);
    if (details) {
      console.log(this.COLORS.CYAN + '├─ ' + this.COLORS.RESET + 'Details: ' + this.COLORS.GRAY + details + this.COLORS.RESET);
    }
    console.log(this.COLORS.CYAN + '└─ ' + this.COLORS.RESET + 'Time: ' + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    
    // Discord log (if INFO or higher) - ANSI single line
    if (this.shouldLogToDiscord('INFO')) {
      const time = this.getShortTimestamp();
      const statusColor = status === 'connected' ? this.COLORS.GREEN : this.COLORS.RED;
      const ansiMsg = `${this.COLORS.CYAN}[${time}] 💾 DB CONNECTION${this.COLORS.RESET} ${statusColor}${status.toUpperCase()}${this.COLORS.RESET}`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  // ============================================================================
  // SHEETS SYNC LOGS
  // ============================================================================

  /**
   * Log sheets sync operation
   */
  async logSheetsSync(type, count, duration, success = true, details = '') {
    const timestamp = this.getTimestamp();
    
    // Railway log
    console.log('');
    console.log(this.COLORS.YELLOW + '[SHEETS SYNC] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Type: ' + this.COLORS.MAGENTA + type + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Count: ' + this.COLORS.CYAN + count + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Duration: ' + this.COLORS.YELLOW + duration + 'ms' + this.COLORS.RESET);
    if (details) {
      console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Details: ' + this.COLORS.GRAY + details + this.COLORS.RESET);
    }
    console.log(this.COLORS.YELLOW + '└─ ' + this.COLORS.RESET + 'Status: ' + (success ? this.COLORS.GREEN + '✓ Success' : this.COLORS.RED + '✗ Failed') + this.COLORS.RESET);
    
    // Discord log (if VERBOSE or higher) - ANSI single line
    if (this.shouldLogToDiscord('VERBOSE')) {
      const time = this.getShortTimestamp();
      const status = success ? this.COLORS.GREEN + '✓' : this.COLORS.RED + '✗';
      const ansiMsg = `${this.COLORS.YELLOW}[${time}] 📊 SHEETS SYNC${this.COLORS.RESET} ${this.COLORS.MAGENTA}${type}${this.COLORS.RESET} | ${count} rows (${duration}ms) ${status}${this.COLORS.RESET}`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  /**
   * Log sheets rate limit
   */
  async logSheetsRateLimit(retryAfter, requestType = 'sync') {
    const timestamp = this.getTimestamp();
    
    // Railway log
    console.log('');
    console.log(this.COLORS.YELLOW + '[SHEETS RATE LIMIT] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Request Type: ' + this.COLORS.MAGENTA + requestType + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Retry After: ' + this.COLORS.RED + retryAfter + 'ms' + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '└─ ' + this.COLORS.RESET + 'Status: ' + this.COLORS.YELLOW + '⚠ Rate Limited' + this.COLORS.RESET);
    
    // Discord log (if WARN_ERROR or higher) - ANSI single line with role ping
    if (this.shouldLogToDiscord('WARN_ERROR')) {
      const time = this.getShortTimestamp();
      const roleId = this.warnPingEnabled ? this.warnPingRoleId : null;
      const ansiMsg = `${this.COLORS.YELLOW}[${time}] ⚠️ SHEETS RATE LIMIT${this.COLORS.RESET} ${this.COLORS.MAGENTA}${requestType}${this.COLORS.RESET} | Retry: ${this.COLORS.RED}${retryAfter}ms${this.COLORS.RESET}`;
      await this.sendToDiscord(ansiMsg, roleId);
    }
  }

  // ============================================================================
  // NICKNAME SYNC LOGS
  // ============================================================================

  /**
   * Log nickname sync batch operation
   */
  async logNicknameSync(totalUsers, updated, failed, failedUsers = []) {
    const timestamp = this.getTimestamp();
    
    // Railway log
    console.log('');
    console.log(this.COLORS.MAGENTA + '[NICKNAME SYNC] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.MAGENTA + '├─ ' + this.COLORS.RESET + 'Total Users: ' + this.COLORS.CYAN + totalUsers + this.COLORS.RESET);
    console.log(this.COLORS.MAGENTA + '├─ ' + this.COLORS.RESET + 'Updated: ' + this.COLORS.GREEN + updated + this.COLORS.RESET);
    console.log(this.COLORS.MAGENTA + '├─ ' + this.COLORS.RESET + 'Failed: ' + this.COLORS.RED + failed + this.COLORS.RESET);
    
    if (failedUsers.length > 0) {
      console.log(this.COLORS.MAGENTA + '├─ ' + this.COLORS.RESET + 'Failed Users:');
      failedUsers.forEach(user => {
        console.log(this.COLORS.MAGENTA + '├─   ' + this.COLORS.RESET + this.COLORS.CYAN + user.userId + this.COLORS.RESET + ' - ' + this.COLORS.RED + user.reason + this.COLORS.RESET);
      });
    }
    
    console.log(this.COLORS.MAGENTA + '└─ ' + this.COLORS.RESET + 'Status: ' + this.COLORS.GREEN + '✓ Complete' + this.COLORS.RESET);
    
    // Discord log (if VERBOSE or higher) - ANSI single line
    if (this.shouldLogToDiscord('VERBOSE')) {
      const time = this.getShortTimestamp();
      const ansiMsg = `${this.COLORS.MAGENTA}[${time}] 🏷️ NICKNAME SYNC${this.COLORS.RESET} Total: ${this.COLORS.CYAN}${totalUsers}${this.COLORS.RESET} | Updated: ${this.COLORS.GREEN}${updated}${this.COLORS.RESET} | Failed: ${this.COLORS.RED}${failed}${this.COLORS.RESET}`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  /**
   * Log individual nickname update
   */
  async logNicknameUpdate(username, userId, oldNickname, newNickname, success = true, reason = '') {
    const timestamp = this.getTimestamp();
    const user = this.formatUser(username, userId);
    
    // Railway log
    console.log('');
    console.log(this.COLORS.MAGENTA + '[NICKNAME UPDATE] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.MAGENTA + '├─ ' + this.COLORS.RESET + 'User: ' + this.COLORS.CYAN + user + this.COLORS.RESET);
    console.log(this.COLORS.MAGENTA + '├─ ' + this.COLORS.RESET + 'Old: ' + this.COLORS.RED + (oldNickname || 'None') + this.COLORS.RESET);
    console.log(this.COLORS.MAGENTA + '├─ ' + this.COLORS.RESET + 'New: ' + this.COLORS.GREEN + newNickname + this.COLORS.RESET);
    if (reason) {
      console.log(this.COLORS.MAGENTA + '├─ ' + this.COLORS.RESET + 'Reason: ' + this.COLORS.YELLOW + reason + this.COLORS.RESET);
    }
    console.log(this.COLORS.MAGENTA + '└─ ' + this.COLORS.RESET + 'Status: ' + (success ? this.COLORS.GREEN + '✓ Updated' : this.COLORS.RED + '✗ Failed') + this.COLORS.RESET);
    
    // Discord log (if DEBUG or higher) - ANSI single line
    if (this.shouldLogToDiscord('DEBUG')) {
      const time = this.getShortTimestamp();
      const status = success ? this.COLORS.GREEN + '✓' : this.COLORS.RED + '✗';
      const ansiMsg = `${this.COLORS.MAGENTA}[${time}] 🏷️ NICKNAME${this.COLORS.RESET} ${this.COLORS.CYAN}${username}${this.COLORS.RESET}: ${this.COLORS.RED}${oldNickname || 'None'}${this.COLORS.RESET} → ${this.COLORS.GREEN}${newNickname}${this.COLORS.RESET} ${status}${this.COLORS.RESET}`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  // ============================================================================
  // ERROR & WARNING LOGS
  // ============================================================================

  /**
   * Log error with full details
   */
  async logError(category, message, error = null, context = {}) {
    this.stats.errors++;
    const timestamp = this.getTimestamp();
    
    // Railway log (detailed)
    console.log('');
    console.log(this.COLORS.RED + '═'.repeat(80) + this.COLORS.RESET);
    console.log(this.COLORS.BRIGHT + this.COLORS.RED + '[ERROR] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.RED + '═'.repeat(80) + this.COLORS.RESET);
    console.log(this.COLORS.RED + '├─ ' + this.COLORS.RESET + 'Category: ' + this.COLORS.YELLOW + category + this.COLORS.RESET);
    console.log(this.COLORS.RED + '├─ ' + this.COLORS.RESET + 'Message: ' + this.COLORS.WHITE + message + this.COLORS.RESET);
    
    if (error) {
      console.log(this.COLORS.RED + '├─ ' + this.COLORS.RESET + 'Error Name: ' + this.COLORS.MAGENTA + error.name + this.COLORS.RESET);
      console.log(this.COLORS.RED + '├─ ' + this.COLORS.RESET + 'Error Message: ' + this.COLORS.WHITE + error.message + this.COLORS.RESET);
      
      if (error.code) {
        console.log(this.COLORS.RED + '├─ ' + this.COLORS.RESET + 'Error Code: ' + this.COLORS.YELLOW + error.code + this.COLORS.RESET);
      }
      
      if (error.stack) {
        console.log(this.COLORS.RED + '├─ ' + this.COLORS.RESET + 'Stack Trace:');
        const stackLines = error.stack.split('\n').slice(0, 10);
        stackLines.forEach((line, index) => {
          const prefix = index === stackLines.length - 1 ? '└─   ' : '├─   ';
          console.log(this.COLORS.RED + prefix + this.COLORS.RESET + this.COLORS.GRAY + line.trim() + this.COLORS.RESET);
        });
      }
    }
    
    if (Object.keys(context).length > 0) {
      console.log(this.COLORS.RED + '└─ ' + this.COLORS.RESET + 'Context:');
      for (const [key, value] of Object.entries(context)) {
        console.log(this.COLORS.RED + '    └─ ' + this.COLORS.RESET + key + ': ' + this.COLORS.CYAN + JSON.stringify(value) + this.COLORS.RESET);
      }
    } else {
      console.log(this.COLORS.RED + '└─ ' + this.COLORS.RESET + 'No additional context');
    }
    console.log(this.COLORS.RED + '═'.repeat(80) + this.COLORS.RESET);
    
    // Discord log (if ERROR_ONLY or higher) - ANSI single/multi line with role ping
    if (this.shouldLogToDiscord('ERROR_ONLY')) {
      const time = this.getShortTimestamp();
      const roleId = this.errorPingEnabled ? this.errorPingRoleId : null;
      let ansiMsg = `${this.COLORS.RED}[${time}] ❌ ERROR${this.COLORS.RESET} [${this.COLORS.YELLOW}${category}${this.COLORS.RESET}] ${this.COLORS.WHITE}${message}${this.COLORS.RESET}`;
      
      if (error) {
        ansiMsg += `\n${this.COLORS.RED}└─${this.COLORS.RESET} ${error.name}: ${error.message}${error.code ? ` (${error.code})` : ''}`;
      }
      
      await this.sendToDiscord(ansiMsg, roleId);
    }
  }

  /**
   * Log warning
   */
  async logWarning(category, message, details = '') {
    this.stats.warnings++;
    const timestamp = this.getTimestamp();
    
    // Railway log
    console.log('');
    console.log(this.COLORS.YELLOW + '[WARNING] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Category: ' + this.COLORS.MAGENTA + category + this.COLORS.RESET);
    console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Message: ' + this.COLORS.WHITE + message + this.COLORS.RESET);
    if (details) {
      console.log(this.COLORS.YELLOW + '├─ ' + this.COLORS.RESET + 'Details: ' + this.COLORS.GRAY + details + this.COLORS.RESET);
    }
    console.log(this.COLORS.YELLOW + '└─ ' + this.COLORS.RESET + 'Time: ' + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    
    // Discord log (if WARN_ERROR or higher) - ANSI single line with role ping
    if (this.shouldLogToDiscord('WARN_ERROR')) {
      const time = this.getShortTimestamp();
      const roleId = this.warnPingEnabled ? this.warnPingRoleId : null;
      const ansiMsg = `${this.COLORS.YELLOW}[${time}] ⚠️ WARNING${this.COLORS.RESET} [${this.COLORS.MAGENTA}${category}${this.COLORS.RESET}] ${this.COLORS.WHITE}${message}${this.COLORS.RESET}${details ? ` | ${details}` : ''}`;
      await this.sendToDiscord(ansiMsg, roleId);
    }
  }

  // ============================================================================
  // GENERAL LOGS
  // ============================================================================

  /**
   * Log general info
   */
  async logInfo(message, details = '') {
    const timestamp = this.getTimestamp();
    
    // Railway log
    console.log('');
    console.log(this.COLORS.BLUE + '[INFO] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.BLUE + '├─ ' + this.COLORS.RESET + 'Message: ' + this.COLORS.WHITE + message + this.COLORS.RESET);
    if (details) {
      console.log(this.COLORS.BLUE + '├─ ' + this.COLORS.RESET + 'Details: ' + this.COLORS.GRAY + details + this.COLORS.RESET);
    }
    console.log(this.COLORS.BLUE + '└─ ' + this.COLORS.RESET + 'Time: ' + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    
    // Discord log (if INFO or higher) - ANSI single line
    if (this.shouldLogToDiscord('INFO')) {
      const time = this.getShortTimestamp();
      const ansiMsg = `${this.COLORS.BLUE}[${time}] ℹ️ INFO${this.COLORS.RESET} ${this.COLORS.WHITE}${message}${this.COLORS.RESET}${details ? ` | ${details}` : ''}`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  /**
   * Log success
   */
  async logSuccess(message, details = '') {
    const timestamp = this.getTimestamp();
    
    // Railway log
    console.log('');
    console.log(this.COLORS.GREEN + '[SUCCESS] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'Message: ' + this.COLORS.WHITE + message + this.COLORS.RESET);
    if (details) {
      console.log(this.COLORS.GREEN + '├─ ' + this.COLORS.RESET + 'Details: ' + this.COLORS.GRAY + details + this.COLORS.RESET);
    }
    console.log(this.COLORS.GREEN + '└─ ' + this.COLORS.RESET + 'Time: ' + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    
    // Discord log (if INFO or higher) - ANSI single line
    if (this.shouldLogToDiscord('INFO')) {
      const time = this.getShortTimestamp();
      const ansiMsg = `${this.COLORS.GREEN}[${time}] ✅ SUCCESS${this.COLORS.RESET} ${this.COLORS.WHITE}${message}${this.COLORS.RESET}${details ? ` | ${details}` : ''}`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  /**
   * Log debug information
   */
  async logDebug(message, data = null) {
    if (!this.debugMode) return;
    
    const timestamp = this.getTimestamp();
    
    // Railway log
    console.log('');
    console.log(this.COLORS.CYAN + '[DEBUG] ' + this.COLORS.RESET + this.COLORS.GRAY + timestamp + this.COLORS.RESET);
    console.log(this.COLORS.CYAN + '├─ ' + this.COLORS.RESET + 'Message: ' + this.COLORS.WHITE + message + this.COLORS.RESET);
    if (data) {
      console.log(this.COLORS.CYAN + '└─ ' + this.COLORS.RESET + 'Data:');
      console.log(this.COLORS.GRAY + JSON.stringify(data, null, 2) + this.COLORS.RESET);
    } else {
      console.log(this.COLORS.CYAN + '└─ ' + this.COLORS.RESET + 'No data');
    }
    
    // Discord log (if DEBUG or higher) - ANSI single line
    if (this.shouldLogToDiscord('DEBUG')) {
      const time = this.getShortTimestamp();
      const dataStr = data ? ` | ${JSON.stringify(data).substring(0, 100)}` : '';
      const ansiMsg = `${this.COLORS.CYAN}[${time}] 🐛 DEBUG${this.COLORS.RESET} ${this.COLORS.WHITE}${message}${this.COLORS.RESET}${dataStr}`;
      await this.sendToDiscord(ansiMsg);
    }
  }

  // ============================================================================
  // LEGACY COMPATIBILITY
  // ============================================================================

  /**
   * Legacy: Simple log
   */
  log(message) {
    this.logInfo(message);
  }

  /**
   * Legacy: Simple error
   */
  error(message, error = null) {
    this.logError('General', message, error);
  }

  /**
   * Legacy: Simple warning
   */
  warn(message) {
    this.logWarning('General', message);
  }

  /**
   * Legacy: Simple success
   */
  success(message) {
    this.logSuccess(message);
  }

  /**
   * Legacy: Simple debug
   */
  debug(message, data = null) {
    this.logDebug(message, data);
  }

  /**
   * Legacy: Log action
   */
  async logAction(username, action, details = '') {
    this.logInfo(`User ${username} ${action}`, details);
  }

  /**
   * Legacy: Log interaction error
   */
  async logInteractionError(interactionType, userId, error, interaction = null) {
    const context = {
      interactionType,
      userId,
      customId: interaction?.customId || 'N/A',
      guild: interaction?.guild?.name || 'DM',
      channel: interaction?.channel?.name || 'DM'
    };
    
    this.logError('Interaction', `Failed to handle ${interactionType}`, error, context);
  }

  /**
   * Legacy: Log database
   */
  async logDatabase(operation, table, duration, success = true, details = '') {
    this.logDatabaseQuery(operation, table, duration, success, details);
  }

  /**
   * Legacy: Log sync
   */
  async logSync(type, count, duration, success = true, error = null) {
    if (error) {
      this.logError('Sync', `${type} sync failed`, error, { count, duration });
    } else {
      this.logSheetsSync(type, count, duration, success);
    }
  }
}

export default new Logger();
