import { LOG_CATEGORIES, DEFAULT_ENABLED } from '../config/logCategories.js';
import { LogSettingsRepo } from '../database/repositories.js';
import config from '../config/index.js';

class Logger {
  constructor() {
    this.client = null;
    this.channel = null;
    this.enabledCategories = new Set(DEFAULT_ENABLED);
    this.pingRoleId = null;
    this.pingOnError = false;
    this.queue = [];
    this.sending = false;
  }

  async init(client) {
    this.client = client;
    
    if (config.logging.channelId) {
      try {
        this.channel = await client.channels.fetch(config.logging.channelId);
      } catch (e) {
        console.error('[LOG] Failed to fetch log channel:', e.message);
      }
    }

    await this.loadSettings();
    this.startCleanup();
  }

  async loadSettings() {
    if (!config.discord.guildId) return;
    
    try {
      const settings = await LogSettingsRepo.get(config.discord.guildId);
      if (settings) {
        this.enabledCategories = new Set(settings.enabled_categories || DEFAULT_ENABLED);
        this.pingRoleId = settings.ping_role_id;
        this.pingOnError = settings.ping_on_error;
      }
    } catch (e) {
      console.error('[LOG] Failed to load settings:', e.message);
    }
  }

  async saveSettings() {
    if (!config.discord.guildId) return;
    
    await LogSettingsRepo.upsert(config.discord.guildId, {
      enabledCategories: Array.from(this.enabledCategories),
      pingRoleId: this.pingRoleId,
      pingOnError: this.pingOnError
    });
  }

  setCategories(categories) {
    this.enabledCategories = new Set(categories);
    this.saveSettings();
  }

  getEnabledCategories() {
    return Array.from(this.enabledCategories);
  }

  isEnabled(categoryId) {
    return this.enabledCategories.has(categoryId);
  }

  timestamp() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
  }

  async send(categoryId, message, details = null, forceError = false) {
    const cat = Object.values(LOG_CATEGORIES).find(c => c.id === categoryId);
    if (!cat) return;

    const time = this.timestamp();
    const consoleMsg = `[${time}] ${cat.emoji} [${cat.label}] ${message}${details ? ` | ${details}` : ''}`;
    
    if (forceError || categoryId === 'error') {
      console.error(consoleMsg);
    } else if (categoryId === 'warning') {
      console.warn(consoleMsg);
    } else {
      console.log(consoleMsg);
    }

    if (!this.channel || !this.isEnabled(categoryId)) return;

    const shouldPing = forceError && this.pingOnError && this.pingRoleId;
    const ping = shouldPing ? `<@&${this.pingRoleId}> ` : '';
    const discordMsg = `${ping}\`[${time}]\` ${cat.emoji} **${cat.label}** │ ${message}${details ? `\n> ${details}` : ''}`;

    this.queue.push(discordMsg);
    this.processQueue();
  }

  async processQueue() {
    if (this.sending || this.queue.length === 0) return;
    this.sending = true;

    while (this.queue.length > 0) {
      const msg = this.queue.shift();
      try {
        await this.channel.send(msg);
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        console.error('[LOG] Discord send failed:', e.message);
      }
    }

    this.sending = false;
  }

  startCleanup() {
    setInterval(() => this.cleanup(), config.logging.cleanupInterval);
  }

  async cleanup() {
    if (!this.channel) return;

    try {
      let messages = [];
      let lastId = null;

      while (true) {
        const batch = await this.channel.messages.fetch({ limit: 100, before: lastId });
        if (batch.size === 0) break;
        messages.push(...batch.values());
        lastId = batch.last().id;
        if (batch.size < 100) break;
      }

      const excess = messages.length - config.logging.maxMessages;
      if (excess <= 0) return;

      const toDelete = messages.slice(-excess);
      const recent = toDelete.filter(m => Date.now() - m.createdTimestamp < 1209600000);
      const old = toDelete.filter(m => Date.now() - m.createdTimestamp >= 1209600000);

      if (recent.length > 1) {
        await this.channel.bulkDelete(recent, true);
      }

      for (const msg of old) {
        try {
          await msg.delete();
          await new Promise(r => setTimeout(r, 100));
        } catch (e) {}
      }

      console.log(`[LOG] Cleaned ${toDelete.length} messages`);
    } catch (e) {
      console.error('[LOG] Cleanup failed:', e.message);
    }
  }

  startup(tag, commands) {
    this.send('startup', `Bot online: **${tag}**`, `${commands} commands loaded`);
  }

  shutdown(reason) {
    this.send('shutdown', `Bot shutting down`, reason);
  }

  command(name, user, subcommand = null) {
    const cat = name === 'admin' ? 'cmd_admin' : 'cmd_character';
    const sub = subcommand ? ` ${subcommand}` : '';
    this.send(cat, `/${name}${sub}`, `by ${user}`);
  }

  regStart(user) {
    this.send('reg_start', 'Registration started', `by ${user}`);
  }

  regComplete(user, type, ign, className) {
    this.send('reg_complete', `${type} registered: **${ign}**`, `${className} | by ${user}`);
  }

  edit(user, field, oldVal, newVal) {
    this.send('edit_character', `Edited ${field}`, `${oldVal} → ${newVal} | by ${user}`);
  }

  delete(user, type, ign) {
    this.send('delete_character', `${type} deleted: **${ign}**`, `by ${user}`);
  }

  syncSheets(count, duration) {
    this.send('sync_sheets', `Synced ${count} characters`, `${duration}ms`);
  }

  syncNickname(updated, failed) {
    this.send('sync_nickname', `Nicknames synced`, `${updated} updated, ${failed} failed`);
  }

  dbQuery(operation, table, duration) {
    this.send('db_query', `${operation} on ${table}`, `${duration}ms`);
  }

  dbError(operation, error) {
    this.send('db_error', `DB ${operation} failed`, error.message, true);
  }

  error(context, message, error = null) {
    const details = error ? `${message}: ${error.message}` : message;
    this.send('error', context, details, true);
  }

  warning(context, message) {
    this.send('warning', context, message);
  }

  viewProfile(viewer, target) {
    this.send('view_profile', `Profile viewed`, `${viewer} → ${target}`);
  }

  interaction(type, customId, user) {
    this.send('interaction', `${type}: ${customId}`, `by ${user}`);
  }
}

export default new Logger();
