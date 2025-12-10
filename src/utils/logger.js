class Logger {
  constructor() {
    this.client = null;
    this.logChannelId = null;
  }

  setClient(client, logChannelId) {
    this.client = client;
    this.logChannelId = logChannelId;
  }

  async sendToChannel(message, color = null) {
    if (!this.client || !this.logChannelId) return;
    
    try {
      const channel = await this.client.channels.fetch(this.logChannelId);
      if (!channel) return;

      const { EmbedBuilder } = await import('discord.js');
      const embed = new EmbedBuilder()
        .setDescription(message)
        .setTimestamp();

      if (color) embed.setColor(color);

      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(`Failed to log to channel: ${error.message}`);
    }
  }

  async logStartup(clientTag, port, commandCount) {
    const message = `\`\`\`ansi
\u001b[0;33m[BOT STARTED]\u001b[0m ${new Date().toLocaleTimeString()}
\u001b[0;33m[BOT STARTED]\u001b[0m Logged in as: \u001b[0;36m${clientTag}\u001b[0m
\u001b[0;33m[BOT STARTED]\u001b[0m Server: \u001b[0;36mport ${port}\u001b[0m
\u001b[0;33m[BOT STARTED]\u001b[0m Commands: \u001b[0;36m${commandCount} commands\u001b[0m
\u001b[0;33m[BOT STARTED]\u001b[0m Activated Handlers: \u001b[0;36mcharacter, registration, update, subclass, remove\u001b[0m
\`\`\``;
    
    console.log('\x1b[33m[BOT STARTED]\x1b[0m ' + new Date().toLocaleTimeString());
    console.log('\x1b[33m[BOT STARTED]\x1b[0m Logged in as: \x1b[36m' + clientTag + '\x1b[0m');
    console.log('\x1b[33m[BOT STARTED]\x1b[0m Server: \x1b[36mport ' + port + '\x1b[0m');
    console.log('\x1b[33m[BOT STARTED]\x1b[0m Commands: \x1b[36m' + commandCount + ' commands\x1b[0m');
    console.log('\x1b[33m[BOT STARTED]\x1b[0m Activated Handlers: \x1b[36mcharacter, registration, update, subclass, remove\x1b[0m');
    
    await this.sendToChannel(message);
  }

  async logCommand(commandName, userTag, userId) {
    const message = `\`\`\`ansi
\u001b[0;35m[COMMAND]\u001b[0m ${new Date().toLocaleTimeString()} - /${commandName} by \u001b[0;36m${userTag}\u001b[0m
\`\`\``;
    
    console.log('\x1b[35m[COMMAND]\x1b[0m ' + new Date().toLocaleTimeString() + ' - /' + commandName + ' by \x1b[36m' + userTag + '\x1b[0m');
    
    await this.sendToChannel(message);
  }

  log(message) {
    console.log(`[LOG] ${new Date().toISOString()} - ${message}`);
  }

  error(message) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
    this.sendToChannel(`❌ **Error:** ${message}`, '#FF0000');
  }

  warn(message) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
    this.sendToChannel(`⚠️ **Warning:** ${message}`, '#FFA500');
  }

  success(message) {
    console.log(`[SUCCESS] ${new Date().toISOString()} - ${message}`);
    this.sendToChannel(`✅ **Success:** ${message}`, '#00FF00');
  }

  debug(message) {
    console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
  }

  logAction(userId, action, details = '') {
    const message = `👤 <@${userId}> - ${action}${details ? ` - ${details}` : ''}`;
    console.log(`[ACTION] ${new Date().toISOString()} - ${message}`);
    this.sendToChannel(message, '#5865F2');
  }
}

export default new Logger();
