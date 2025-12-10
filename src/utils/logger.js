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
