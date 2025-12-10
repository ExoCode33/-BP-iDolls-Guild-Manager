class Logger {
  constructor() {
    this.client = null;
    this.logChannelId = null;
  }

  setClient(client, logChannelId) {
    this.client = client;
    this.logChannelId = logChannelId;
  }

  async sendToChannel(message) {
    if (!this.client || !this.logChannelId) return;
    
    try {
      const channel = await this.client.channels.fetch(this.logChannelId);
      if (!channel) return;

      await channel.send(message);
    } catch (error) {
      console.error(`Failed to log to channel: ${error.message}`);
    }
  }

  getUTCTimestamp() {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = now.getUTCDate();
    const year = now.getUTCFullYear();
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    return `${month} ${day}, ${year} at ${hours}:${minutes}:${seconds} UTC`;
  }

  async logStartup(clientTag, port, commandCount) {
    const timestamp = this.getUTCTimestamp();
    const messages = [
      `\`\`\`ansi\n\u001b[0;32m[SYSTEM]\u001b[0m ${timestamp} - Bot initialized\n\`\`\``,
      `\`\`\`ansi\n\u001b[0;32m[SYSTEM]\u001b[0m ${timestamp} - Logged in as: \u001b[0;36m${clientTag}\u001b[0m\n\`\`\``,
      `\`\`\`ansi\n\u001b[0;32m[SYSTEM]\u001b[0m ${timestamp} - Server: \u001b[0;36mport ${port}\u001b[0m\n\`\`\``,
      `\`\`\`ansi\n\u001b[0;32m[SYSTEM]\u001b[0m ${timestamp} - Commands: \u001b[0;36m${commandCount} commands\u001b[0m\n\`\`\``,
      `\`\`\`ansi\n\u001b[0;32m[SYSTEM]\u001b[0m ${timestamp} - Activated Handlers: \u001b[0;36mcharacter, registration, update, subclass, remove\u001b[0m\n\`\`\``
    ];
    
    console.log('\x1b[32m[SYSTEM]\x1b[0m ' + timestamp + ' - Bot initialized');
    console.log('\x1b[32m[SYSTEM]\x1b[0m ' + timestamp + ' - Logged in as: \x1b[36m' + clientTag + '\x1b[0m');
    console.log('\x1b[32m[SYSTEM]\x1b[0m ' + timestamp + ' - Server: \x1b[36mport ' + port + '\x1b[0m');
    console.log('\x1b[32m[SYSTEM]\x1b[0m ' + timestamp + ' - Commands: \x1b[36m' + commandCount + ' commands\x1b[0m');
    console.log('\x1b[32m[SYSTEM]\x1b[0m ' + timestamp + ' - Activated Handlers: \x1b[36mcharacter, registration, update, subclass, remove\x1b[0m');
    
    for (const message of messages) {
      await this.sendToChannel(message);
    }
  }

  async logCommand(commandName, userTag, userId) {
    const timestamp = this.getUTCTimestamp();
    const message = `\`\`\`ansi
\u001b[0;35m[COMMAND]\u001b[0m ${timestamp} - /${commandName} by \u001b[0;36m${userTag}\u001b[0m
\`\`\``;
    
    console.log('\x1b[35m[COMMAND]\x1b[0m ' + timestamp + ' - /' + commandName + ' by \x1b[36m' + userTag + '\x1b[0m');
    
    await this.sendToChannel(message);
  }

  log(message) {
    const timestamp = this.getUTCTimestamp();
    const logMessage = `\`\`\`ansi
\u001b[0;34m[LOG]\u001b[0m ${timestamp} - ${message}
\`\`\``;
    console.log(`[LOG] ${new Date().toISOString()} - ${message}`);
    this.sendToChannel(logMessage);
  }

  error(message) {
    const timestamp = this.getUTCTimestamp();
    const errorMessage = `\`\`\`ansi
\u001b[0;31m[ERROR]\u001b[0m ${timestamp} - ${message}
\`\`\``;
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
    this.sendToChannel(errorMessage);
  }

  warn(message) {
    const timestamp = this.getUTCTimestamp();
    const warnMessage = `\`\`\`ansi
\u001b[0;33m[WARN]\u001b[0m ${timestamp} - ${message}
\`\`\``;
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
    this.sendToChannel(warnMessage);
  }

  success(message) {
    const timestamp = this.getUTCTimestamp();
    const successMessage = `\`\`\`ansi
\u001b[0;32m[SUCCESS]\u001b[0m ${timestamp} - ${message}
\`\`\``;
    console.log(`[SUCCESS] ${new Date().toISOString()} - ${message}`);
    this.sendToChannel(successMessage);
  }

  debug(message) {
    console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
  }

  async logAction(username, action, details = '') {
    const timestamp = this.getUTCTimestamp();
    const actionMessage = `\`\`\`ansi
\u001b[0;34m[LOG]\u001b[0m ${timestamp} - User \u001b[0;36m${username}\u001b[0m ${action}${details ? ` - ${details}` : ''}
\`\`\
