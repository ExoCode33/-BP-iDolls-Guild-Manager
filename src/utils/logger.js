// src/utils/logger.js
import { EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

class Logger {
  constructor() {
    this.client = null;
    this.logChannelId = process.env.LOG_CHANNEL_ID;
    this.verboseMode = process.env.LOG_VERBOSE === 'true';
    this.logToDiscord = process.env.LOG_TO_DISCORD !== 'false';
    
    this.startup = {
      handlers: null,
      server: null,
      bot: null,
      commands: null
    };
  }

  init(client) {
    this.client = client;
    if (this.logChannelId && this.logToDiscord) {
      console.log('[INFO] Discord logging enabled');
      this.sendStartupSummary();
    }
  }

  async sendStartupSummary() {
    if (!this.startup.handlers || !this.startup.server || !this.startup.bot || !this.startup.commands) {
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('Bot Started')
      .addFields(
        { name: 'Bot', value: `\`${this.startup.bot}\``, inline: true },
        { name: 'Server', value: `\`${this.startup.server}\``, inline: true },
        { name: 'Commands', value: `\`${this.startup.commands}\``, inline: true },
        { name: 'Handlers', value: `\`${this.startup.handlers}\``, inline: false }
      )
      .setTimestamp();

    await this.sendEmbed(embed);
  }

  async sendEmbed(embed) {
    if (!this.logChannelId || !this.client || !this.logToDiscord) return;
    
    try {
      const channel = await this.client.channels.fetch(this.logChannelId);
      if (!channel) return;
      await channel.send({ embeds: [embed] });
    } catch (error) {
      // Silently fail
    }
  }

  async toDiscord(title, description, color) {
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp();
    
    await this.sendEmbed(embed);
  }

  // Console logging methods
  info(message, sendToDiscord = false) {
    console.log(`[INFO] ${message}`);
    if (sendToDiscord) this.toDiscord('Info', message, '#3498DB');
  }

  success(message, sendToDiscord = true) {
    console.log(`[SUCCESS] ${message}`);
    if (sendToDiscord) this.toDiscord('Success', message, '#00FF00');
  }

  error(message, sendToDiscord = true) {
    console.error(`[ERROR] ${message}`);
    if (sendToDiscord) this.toDiscord('Error', message, '#FF0000');
  }

  warning(message, sendToDiscord = true) {
    console.log(`[WARNING] ${message}`);
    if (sendToDiscord) this.toDiscord('Warning', message, '#FFA500');
  }

  command(message, sendToDiscord = true) {
    console.log(`[COMMAND] ${message}`);
    if (sendToDiscord) {
      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('Command Executed')
        .setDescription(`\`${message}\``)
        .setTimestamp();
      this.sendEmbed(embed);
    }
  }

  sync(message, sendToDiscord = true) {
    console.log(`[SYNC] ${message}`);
    if (sendToDiscord) this.toDiscord('Sync', message, '#3498DB');
  }

  verbose(message) {
    if (this.verboseMode) {
      console.log(`[VERBOSE] ${message}`);
    }
  }

  // Startup logs
  handlers(loaded, missing) {
    const loadedStr = loaded.length > 0 ? loaded.join(', ') : 'none';
    const msg = `Handlers loaded: ${loadedStr}`;
    this.info(msg);
    this.startup.handlers = loadedStr;
    if (missing.length > 0) {
      this.warning(`Missing handlers: ${missing.join(', ')}`, false);
    }
    this.sendStartupSummary();
  }

  server(port) {
    const msg = `Server running on port ${port}`;
    this.info(msg);
    this.startup.server = `port ${port}`;
    this.sendStartupSummary();
  }

  botReady(username) {
    const msg = `Bot ready: ${username}`;
    this.info(msg);
    this.startup.bot = username;
    this.sendStartupSummary();
  }

  commands(count) {
    const msg = `Commands registered: ${count}`;
    this.info(msg);
    this.startup.commands = `${count} commands`;
    this.sendStartupSummary();
  }

  // Command execution with clean embed
  commandExecuted(commandName, username) {
    const msg = `/${commandName} by ${username}`;
    this.verbose(msg);
    
    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('Command Executed')
      .addFields(
        { name: 'Command', value: `\`/${commandName}\``, inline: true },
        { name: 'User', value: `**${username}**`, inline: true }
      )
      .setTimestamp();
    
    this.sendEmbed(embed);
  }

  commandError(commandName, error) {
    const msg = `Command /${commandName} failed: ${error.message}`;
    this.error(msg, false);
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('Command Failed')
      .addFields(
        { name: 'Command', value: `\`/${commandName}\``, inline: true },
        { name: 'Error', value: `\`\`\`${error.message}\`\`\``, inline: false }
      )
      .setTimestamp();
    
    this.sendEmbed(embed);
  }

  interaction(type, customId) {
    const action = customId.split('_').slice(0, -1).join('_') || customId;
    this.verbose(`${type} interaction: ${action}`);
  }

  // Sync logs with embeds
  syncStarted() {
    console.log('[SYNC] Sync started');
    
    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('Sync Started')
      .setDescription('Syncing data to Google Sheets...')
      .setTimestamp();
    
    this.sendEmbed(embed);
  }

  syncComplete() {
    console.log('[SUCCESS] Sync completed');
    
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('Sync Complete')
      .setDescription('All data successfully synced to Google Sheets')
      .setTimestamp();
    
    this.sendEmbed(embed);
  }

  syncFailed(error) {
    console.error(`[ERROR] Sync failed: ${error.message}`);
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('Sync Failed')
      .setDescription(`\`\`\`${error.message}\`\`\``)
      .setTimestamp();
    
    this.sendEmbed(embed);
  }

  dbConnected() {
    this.verbose('Database connected');
  }

  shutdown() {
    console.log('[SHUTDOWN] Bot shutting down');
    this.warning('Bot shutting down');
  }
}

const logger = new Logger();
export default logger;
