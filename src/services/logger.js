import { EmbedBuilder } from 'discord.js';
import { LogSettingsRepo } from '../database/repositories.js';
import { LOG_CATEGORIES, DEFAULT_ENABLED } from '../config/logCategories.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSOLE ANSI COLORS
// ═══════════════════════════════════════════════════════════════════════════════

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  black: '\x1b[30m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m',
  brightBlack: '\x1b[90m', brightRed: '\x1b[91m', brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m', brightBlue: '\x1b[94m', brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m', brightWhite: '\x1b[97m',
  bgBlack: '\x1b[40m', bgRed: '\x1b[41m', bgGreen: '\x1b[42m', bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m', bgMagenta: '\x1b[45m', bgCyan: '\x1b[46m',
};

const styles = {
  startup: { icon: '🚀', label: 'STARTUP', bg: c.bgGreen, fg: c.black, accent: c.brightGreen },
  shutdown: { icon: '🔴', label: 'SHUTDOWN', bg: c.bgRed, fg: c.white, accent: c.brightRed },
  command: { icon: '⚡', label: 'COMMAND', bg: c.bgBlue, fg: c.white, accent: c.brightBlue },
  admin: { icon: '👑', label: 'ADMIN', bg: c.bgMagenta, fg: c.white, accent: c.brightMagenta },
  register: { icon: '📝', label: 'REGISTER', bg: c.bgGreen, fg: c.black, accent: c.brightGreen },
  edit: { icon: '✏️', label: 'EDIT', bg: c.bgYellow, fg: c.black, accent: c.brightYellow },
  delete: { icon: '🗑️', label: 'DELETE', bg: c.bgRed, fg: c.white, accent: c.brightRed },
  view: { icon: '👁️', label: 'VIEW', bg: c.bgCyan, fg: c.black, accent: c.brightCyan },
  button: { icon: '🖱️', label: 'BUTTON', bg: c.bgBlack, fg: c.white, accent: c.brightWhite },
  select: { icon: '📋', label: 'SELECT', bg: c.bgBlack, fg: c.white, accent: c.brightWhite },
  modal: { icon: '📝', label: 'MODAL', bg: c.bgBlack, fg: c.white, accent: c.brightWhite },
  sheets: { icon: '📊', label: 'SHEETS', bg: c.bgGreen, fg: c.black, accent: c.brightGreen },
  nickname: { icon: '🏷️', label: 'NICKNAME', bg: c.bgCyan, fg: c.black, accent: c.brightCyan },
  success: { icon: '✅', label: 'SUCCESS', bg: c.bgGreen, fg: c.black, accent: c.brightGreen },
  warning: { icon: '⚠️', label: 'WARNING', bg: c.bgYellow, fg: c.black, accent: c.brightYellow },
  error: { icon: '❌', label: 'ERROR', bg: c.bgRed, fg: c.white, accent: c.brightRed },
  info: { icon: 'ℹ️', label: 'INFO', bg: c.bgBlue, fg: c.white, accent: c.brightBlue },
  batch: { icon: '📦', label: 'BATCH', bg: c.bgMagenta, fg: c.white, accent: c.brightMagenta },
  deploy: { icon: '🚀', label: 'DEPLOY', bg: c.bgCyan, fg: c.black, accent: c.brightCyan },
  database: { icon: '🗄️', label: 'DATABASE', bg: c.bgBlue, fg: c.white, accent: c.brightBlue },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const timestamp = () => new Date().toLocaleTimeString('en-US', { hour12: false });

function consoleLog(type, ...args) {
  const style = styles[type] || styles.info;
  const time = `${c.dim}${timestamp()}${c.reset}`;
  const badge = `${style.bg}${style.fg}${c.bold} ${style.icon} ${style.label.padEnd(10)}${c.reset}`;
  const content = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
  console.log(`${time} ${badge} ${style.accent}${content}${c.reset}`);
}

function consoleStartupBanner(botTag, commandCount) {
  const line = '═'.repeat(56);
  const now = new Date();
  console.log('');
  console.log(`${c.brightMagenta}${c.bold}${line}${c.reset}`);
  console.log(`${c.brightMagenta}${c.bold}║${c.reset}${' '.repeat(10)}${c.brightCyan}${c.bold}🤖 DISCORD GUILD BOT${c.reset}${' '.repeat(24)}${c.brightMagenta}${c.bold}║${c.reset}`);
  console.log(`${c.brightMagenta}${c.bold}${line}${c.reset}`);
  console.log(`${c.brightMagenta}║${c.reset}                                                      ${c.brightMagenta}║${c.reset}`);
  console.log(`${c.brightMagenta}║${c.reset}  ${c.brightYellow}▸ Bot:${c.reset}        ${c.white}${botTag.padEnd(37)}${c.reset}${c.brightMagenta}║${c.reset}`);
  console.log(`${c.brightMagenta}║${c.reset}  ${c.brightYellow}▸ Commands:${c.reset}   ${c.white}${(commandCount + ' loaded').padEnd(37)}${c.reset}${c.brightMagenta}║${c.reset}`);
  console.log(`${c.brightMagenta}║${c.reset}  ${c.brightYellow}▸ Time:${c.reset}       ${c.white}${now.toLocaleString().padEnd(37)}${c.reset}${c.brightMagenta}║${c.reset}`);
  console.log(`${c.brightMagenta}║${c.reset}  ${c.brightYellow}▸ Node:${c.reset}       ${c.white}${process.version.padEnd(37)}${c.reset}${c.brightMagenta}║${c.reset}`);
  console.log(`${c.brightMagenta}║${c.reset}  ${c.brightYellow}▸ Memory:${c.reset}     ${c.white}${((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1) + ' MB').padEnd(37)}${c.reset}${c.brightMagenta}║${c.reset}`);
  console.log(`${c.brightMagenta}║${c.reset}                                                      ${c.brightMagenta}║${c.reset}`);
  console.log(`${c.brightMagenta}${c.bold}${line}${c.reset}`);
  console.log(`${c.brightMagenta}║${c.reset}  ${c.brightGreen}${c.bold}✓ STATUS: ONLINE${c.reset}${' '.repeat(36)}${c.brightMagenta}║${c.reset}`);
  console.log(`${c.brightMagenta}${c.bold}${line}${c.reset}`);
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMBED COLORS BY CATEGORY
// ═══════════════════════════════════════════════════════════════════════════════

const EMBED_COLORS = {
  startup: 0x00D26A,
  shutdown: 0xFF6B6B,
  errors: 0xFF4757,
  commands: 0x5865F2,
  adminCommands: 0xA855F7,
  registration: 0x10B981,
  editing: 0xF59E0B,
  deletion: 0xEF4444,
  profileViews: 0x06B6D4,
  interactions: 0x6366F1,
  sheetsSync: 0x22C55E,
  nicknameSync: 0x14B8A6,
  default: 0x5865F2
};

// ═══════════════════════════════════════════════════════════════════════════════
// DISCORD EMBED BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

function buildEmbed(category, data) {
  const cat = LOG_CATEGORIES[category];
  if (!cat) return null;
  
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS[category] || EMBED_COLORS.default)
    .setAuthor({ name: `${cat.emoji}  ${cat.name}` })
    .setTimestamp();

  const fields = [];
  
  if (data.user) fields.push({ name: '👤 User', value: `\`${data.user}\``, inline: true });
  if (data.target) fields.push({ name: '🎯 Target', value: `\`${data.target}\``, inline: true });
  if (data.command) fields.push({ name: '📝 Command', value: `\`${data.command}\``, inline: true });
  if (data.action) fields.push({ name: '⚡ Action', value: data.action, inline: true });
  if (data.details) fields.push({ name: '📋 Details', value: data.details, inline: true });
  if (data.duration) fields.push({ name: '⏱️ Duration', value: `\`${data.duration}\``, inline: true });
  if (data.count !== undefined) fields.push({ name: '📊 Count', value: `\`${data.count}\``, inline: true });
  
  if (data.oldValue !== undefined && data.newValue !== undefined) {
    fields.push({ name: '📝 Change', value: `\`${data.oldValue}\` → \`${data.newValue}\``, inline: false });
  }
  
  if (fields.length > 0) embed.addFields(fields);
  
  if (data.success !== undefined) {
    embed.setFooter({ text: data.success ? '✓ Success' : '✗ Failed' });
  }
  
  return embed;
}

function buildStartupEmbed(botTag, commandCount) {
  const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  
  return new EmbedBuilder()
    .setColor(0x00D26A)
    .setAuthor({ name: '🚀  Bot Started Successfully' })
    .setDescription('All systems initialized and ready.')
    .addFields(
      { name: '🤖 Bot', value: `\`${botTag}\``, inline: true },
      { name: '⚡ Commands', value: `\`${commandCount} loaded\``, inline: true },
      { name: '📦 Node', value: `\`${process.version}\``, inline: true },
      { name: '💾 Memory', value: `\`${mem} MB\``, inline: true },
      { name: '🖥️ Platform', value: `\`${process.platform}\``, inline: true },
      { name: '⏰ Started', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
    )
    .setFooter({ text: '✓ All Systems Operational' })
    .setTimestamp();
}

function buildErrorEmbed(title, error, context = {}) {
  const errorMsg = error?.message || String(error);
  const stack = error?.stack?.split('\n').slice(0, 3).join('\n') || '';
  
  const embed = new EmbedBuilder()
    .setColor(0xFF4757)
    .setAuthor({ name: '❌  Error Occurred' })
    .addFields(
      { name: '📍 Location', value: `\`${title}\``, inline: false },
      { name: '💬 Message', value: `\`\`\`${errorMsg.slice(0, 200)}\`\`\``, inline: false }
    )
    .setTimestamp();

  if (Object.keys(context).length > 0) {
    const ctxStr = Object.entries(context).map(([k, v]) => `**${k}:** \`${v}\``).join('\n');
    embed.addFields({ name: '📋 Context', value: ctxStr, inline: false });
  }
  
  if (stack) {
    embed.addFields({ name: '🔍 Stack', value: `\`\`\`${stack.slice(0, 300)}\`\`\``, inline: false });
  }
  
  embed.setFooter({ text: '⚠️ Requires Attention' });
  
  return embed;
}

function buildSyncEmbed(type, count, duration) {
  const emoji = type === 'Google Sheets' ? '📊' : '🏷️';
  
  return new EmbedBuilder()
    .setColor(0x22C55E)
    .setAuthor({ name: `${emoji}  ${type} Sync Complete` })
    .addFields(
      { name: '📊 Records', value: `\`${count}\``, inline: true },
      { name: '⏱️ Duration', value: `\`${duration}ms\``, inline: true },
      { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:T>`, inline: true }
    )
    .setFooter({ text: '✓ Sync Successful' })
    .setTimestamp();
}

function buildBatchEmbed(events) {
  const grouped = {};
  for (const evt of events) {
    if (!grouped[evt.category]) grouped[evt.category] = [];
    grouped[evt.category].push(evt);
  }
  
  const embed = new EmbedBuilder()
    .setColor(0x6366F1)
    .setAuthor({ name: '📦  Batched Activity Summary' })
    .setDescription(`**${events.length}** events in this batch`)
    .setTimestamp();

  const fields = [];
  
  for (const [category, catEvents] of Object.entries(grouped)) {
    const cat = LOG_CATEGORIES[category];
    if (!cat) continue;
    
    const aggregated = {};
    for (const evt of catEvents) {
      const key = evt.data.action || evt.data.command || 'event';
      if (!aggregated[key]) aggregated[key] = { count: 0, users: new Set() };
      aggregated[key].count++;
      if (evt.data.user) aggregated[key].users.add(evt.data.user);
    }
    
    const lines = Object.entries(aggregated).map(([key, agg]) => {
      const userCount = agg.users.size;
      return `\`${key}\` × ${agg.count}${userCount > 0 ? ` (${userCount} user${userCount > 1 ? 's' : ''})` : ''}`;
    });
    
    fields.push({
      name: `${cat.emoji} ${cat.name} (${catEvents.length})`,
      value: lines.join('\n') || 'No details',
      inline: true
    });
  }
  
  if (fields.length > 0) embed.addFields(fields);
  embed.setFooter({ text: 'Batch interval summary' });
  
  return embed;
}

function buildCommandEmbed(user, command, subcommand = null) {
  const cmd = subcommand ? `/${command} ${subcommand}` : `/${command}`;
  
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({ name: '⚡  Command Executed' })
    .addFields(
      { name: '👤 User', value: `\`${user}\``, inline: true },
      { name: '📝 Command', value: `\`${cmd}\``, inline: true }
    )
    .setTimestamp();
}

function buildRegistrationEmbed(user, type, ign, className) {
  return new EmbedBuilder()
    .setColor(0x10B981)
    .setAuthor({ name: '📝  Character Registered' })
    .addFields(
      { name: '👤 User', value: `\`${user}\``, inline: true },
      { name: '📋 Type', value: `\`${type}\``, inline: true },
      { name: '🎮 IGN', value: `\`${ign}\``, inline: true },
      { name: '⚔️ Class', value: `\`${className}\``, inline: true }
    )
    .setFooter({ text: '✓ Registration Complete' })
    .setTimestamp();
}

function buildEditEmbed(user, field, oldValue, newValue) {
  return new EmbedBuilder()
    .setColor(0xF59E0B)
    .setAuthor({ name: '✏️  Profile Updated' })
    .addFields(
      { name: '👤 User', value: `\`${user}\``, inline: true },
      { name: '📝 Field', value: `\`${field}\``, inline: true },
      { name: '📋 Change', value: `\`${oldValue}\` → \`${newValue}\``, inline: false }
    )
    .setFooter({ text: '✓ Update Complete' })
    .setTimestamp();
}

function buildDeleteEmbed(user, type, label) {
  return new EmbedBuilder()
    .setColor(0xEF4444)
    .setAuthor({ name: '🗑️  Character Deleted' })
    .addFields(
      { name: '👤 User', value: `\`${user}\``, inline: true },
      { name: '📋 Type', value: `\`${type}\``, inline: true },
      { name: '🎮 Character', value: `\`${label}\``, inline: true }
    )
    .setFooter({ text: '✓ Deletion Complete' })
    .setTimestamp();
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class Logger {
  constructor() {
    this.client = null;
    this.channel = null;
    this.guildId = null;
    this.enabledCategories = new Set(DEFAULT_ENABLED);
    this.batchInterval = 0;
    this.batchQueue = [];
    this.batchTimer = null;
  }

  async init(client) {
    this.client = client;
    const guild = client.guilds.cache.first();
    if (guild) {
      this.guildId = guild.id;
      await this.reloadSettings();
    }
  }

  async reloadSettings() {
    if (!this.guildId) return;
    
    try {
      const settings = await LogSettingsRepo.get(this.guildId);
      
      if (settings?.enabled_categories) {
        this.enabledCategories = new Set(settings.enabled_categories);
      }
      
      if (settings?.log_channel_id && this.client) {
        try {
          this.channel = await this.client.channels.fetch(settings.log_channel_id);
          consoleLog('success', 'Log channel connected:', this.channel.name);
        } catch (e) {
          consoleLog('warning', 'Could not fetch log channel:', e.message);
          this.channel = null;
        }
      } else {
        this.channel = null;
      }
      
      const newInterval = settings?.batch_interval || 0;
      if (newInterval !== this.batchInterval) {
        this.batchInterval = newInterval;
        this.setupBatchTimer();
      }
    } catch (e) {
      consoleLog('error', 'Failed to load log settings:', e.message);
    }
  }

  setupBatchTimer() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    
    if (this.batchInterval > 0) {
      const ms = this.batchInterval * 60 * 1000;
      this.batchTimer = setInterval(() => this.flushBatch(), ms);
      consoleLog('batch', `Batch mode: posting every ${this.batchInterval} minute(s)`);
    }
  }

  async flushBatch() {
    if (this.batchQueue.length === 0 || !this.channel) return;
    
    const events = [...this.batchQueue];
    this.batchQueue = [];
    
    consoleLog('batch', `Flushing ${events.length} batched events`);
    
    try {
      const embed = buildBatchEmbed(events);
      await this.channel.send({ embeds: [embed] });
    } catch (e) {
      consoleLog('error', 'Failed to send batched log:', e.message);
    }
  }

  isEnabled(category) {
    return this.enabledCategories.has(category);
  }

  async sendEmbed(category, embed, immediate = false) {
    if (!this.channel || !this.isEnabled(category)) return;
    
    const alwaysImmediate = ['startup', 'shutdown', 'errors'];
    if (immediate || this.batchInterval === 0 || alwaysImmediate.includes(category)) {
      try {
        await this.channel.send({ embeds: [embed] });
      } catch (e) {
        consoleLog('error', 'Failed to send log:', e.message);
      }
    }
  }

  queueOrSend(category, data, embed) {
    if (!this.channel || !this.isEnabled(category)) return;
    
    const alwaysImmediate = ['startup', 'shutdown', 'errors'];
    
    if (this.batchInterval === 0 || alwaysImmediate.includes(category)) {
      this.sendEmbed(category, embed, true);
    } else {
      this.batchQueue.push({ category, data, time: Date.now() });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC LOGGING METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  startup(botTag, commandCount) {
    consoleStartupBanner(botTag, commandCount);
    if (this.channel && this.isEnabled('startup')) {
      this.sendEmbed('startup', buildStartupEmbed(botTag, commandCount), true);
    }
  }

  shutdown(reason) {
    consoleLog('shutdown', `Bot shutting down: ${reason}`);
  }

  command(name, user, subcommand = null) {
    const cmd = subcommand ? `/${name} ${subcommand}` : `/${name}`;
    consoleLog('command', `${cmd} by ${user}`);
    
    const embed = buildCommandEmbed(user, name, subcommand);
    this.queueOrSend('commands', { user, command: cmd }, embed);
  }

  register(user, type, ign, className) {
    consoleLog('register', `${user} registered ${type}: ${ign} (${className})`);
    
    const embed = buildRegistrationEmbed(user, type, ign, className);
    this.queueOrSend('registration', { user, action: `Registered ${type}`, details: `${ign} - ${className}` }, embed);
  }

  edit(user, field, oldValue, newValue) {
    consoleLog('edit', `${user} changed ${field}: ${oldValue} → ${newValue}`);
    
    const embed = buildEditEmbed(user, field, oldValue, newValue);
    this.queueOrSend('editing', { user, action: `Edited ${field}`, oldValue, newValue }, embed);
  }

  delete(user, type, label) {
    consoleLog('delete', `${user} deleted ${type}: ${label}`);
    
    const embed = buildDeleteEmbed(user, type, label);
    this.queueOrSend('deletion', { user, action: `Deleted ${type}`, details: label }, embed);
  }

  viewProfile(user, target) {
    consoleLog('view', `${user} viewed ${target}'s profile`);
    
    const embed = buildEmbed('profileViews', { user, target, action: 'Viewed profile' });
    this.queueOrSend('profileViews', { user, target }, embed);
  }

  interaction(type, customId, user) {
    consoleLog(type, `${customId} by ${user}`);
    
    const embed = buildEmbed('interactions', { user, action: type, details: customId });
    this.queueOrSend('interactions', { user, action: type, details: customId }, embed);
  }

  sheetsSync(count, duration) {
    consoleLog('sheets', `Synced ${count} characters in ${duration}ms`);
    
    if (this.channel && this.isEnabled('sheetsSync')) {
      this.sendEmbed('sheetsSync', buildSyncEmbed('Google Sheets', count, duration), true);
    }
  }

  nicknameSync(updated, failed) {
    consoleLog('nickname', `Nicknames synced: ${updated} success, ${failed} failed`);
    
    if (this.channel && this.isEnabled('nicknameSync')) {
      this.sendEmbed('nicknameSync', buildSyncEmbed('Nickname', updated, 0), true);
    }
  }

  error(category, message, error = null, context = {}) {
    consoleLog('error', `[${category}] ${message}`, error?.message || '');
    
    if (this.channel && this.isEnabled('errors')) {
      this.sendEmbed('errors', buildErrorEmbed(`${category}: ${message}`, error, context), true);
    }
  }

  warning(category, message) {
    consoleLog('warning', `[${category}] ${message}`);
  }

  info(message, details = '') {
    consoleLog('info', message, details);
  }

  debug(message, data = null) {
    if (process.env.DEBUG) consoleLog('info', message, data || '');
  }
}

export default new Logger();
