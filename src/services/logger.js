import { LogSettingsRepo } from '../database/repositories.js';
import { LOG_CATEGORIES, DEFAULT_ENABLED } from '../config/logCategories.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ANSI COLORS FOR CONSOLE
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
};

// Discord ANSI
const d = {
  reset: '\u001b[0m', bold: '\u001b[1m',
  gray: '\u001b[30m', red: '\u001b[31m', green: '\u001b[32m', yellow: '\u001b[33m',
  blue: '\u001b[34m', pink: '\u001b[35m', cyan: '\u001b[36m', white: '\u001b[37m',
  bgRed: '\u001b[41m',
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const timestamp = () => new Date().toLocaleTimeString('en-US', { hour12: false });
const datestamp = () => new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
const pad = (str, len) => String(str).slice(0, len).padEnd(len);

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
  console.log(`${c.brightMagenta}║${c.reset}  ${c.brightYellow}▸ Bot:${c.reset}        ${c.white}${pad(botTag, 37)}${c.reset}${c.brightMagenta}║${c.reset}`);
  console.log(`${c.brightMagenta}║${c.reset}  ${c.brightYellow}▸ Commands:${c.reset}   ${c.white}${pad(commandCount + ' loaded', 37)}${c.reset}${c.brightMagenta}║${c.reset}`);
  console.log(`${c.brightMagenta}║${c.reset}  ${c.brightYellow}▸ Time:${c.reset}       ${c.white}${pad(now.toLocaleString(), 37)}${c.reset}${c.brightMagenta}║${c.reset}`);
  console.log(`${c.brightMagenta}║${c.reset}  ${c.brightYellow}▸ Node:${c.reset}       ${c.white}${pad(process.version, 37)}${c.reset}${c.brightMagenta}║${c.reset}`);
  console.log(`${c.brightMagenta}║${c.reset}  ${c.brightYellow}▸ Memory:${c.reset}     ${c.white}${pad((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1) + ' MB', 37)}${c.reset}${c.brightMagenta}║${c.reset}`);
  console.log(`${c.brightMagenta}║${c.reset}                                                      ${c.brightMagenta}║${c.reset}`);
  console.log(`${c.brightMagenta}${c.bold}${line}${c.reset}`);
  console.log(`${c.brightMagenta}║${c.reset}  ${c.brightGreen}${c.bold}✓ STATUS: ONLINE${c.reset}${' '.repeat(36)}${c.brightMagenta}║${c.reset}`);
  console.log(`${c.brightMagenta}${c.bold}${line}${c.reset}`);
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISCORD LOG BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

function buildDiscordLog(category, data) {
  const cat = LOG_CATEGORIES[category];
  if (!cat) return null;
  
  let content = '```ansi\n';
  content += `${d.cyan}╔${'═'.repeat(50)}╗${d.reset}\n`;
  content += `${d.cyan}║${d.reset} ${cat.emoji} ${d.bold}${d.white}${pad(cat.name.toUpperCase(), 45)}${d.reset}${d.cyan}║${d.reset}\n`;
  content += `${d.cyan}╠${'═'.repeat(50)}╣${d.reset}\n`;
  content += `${d.cyan}║${d.reset} ${d.gray}📅 ${datestamp()}  ⏰ ${timestamp()}${' '.repeat(23)}${d.reset}${d.cyan}║${d.reset}\n`;
  content += `${d.cyan}╠${'═'.repeat(50)}╣${d.reset}\n`;
  
  if (data.user) content += `${d.cyan}║${d.reset} ${d.yellow}👤 User    ${d.gray}│${d.reset} ${d.white}${pad(data.user, 34)}${d.reset}${d.cyan}║${d.reset}\n`;
  if (data.target) content += `${d.cyan}║${d.reset} ${d.pink}🎯 Target  ${d.gray}│${d.reset} ${d.white}${pad(data.target, 34)}${d.reset}${d.cyan}║${d.reset}\n`;
  if (data.action) content += `${d.cyan}║${d.reset} ${d.green}⚡ Action  ${d.gray}│${d.reset} ${d.white}${pad(data.action, 34)}${d.reset}${d.cyan}║${d.reset}\n`;
  if (data.command) content += `${d.cyan}║${d.reset} ${d.blue}📝 Command ${d.gray}│${d.reset} ${d.white}${pad(data.command, 34)}${d.reset}${d.cyan}║${d.reset}\n`;
  if (data.details) content += `${d.cyan}║${d.reset} ${d.pink}📋 Details ${d.gray}│${d.reset} ${d.white}${pad(data.details, 34)}${d.reset}${d.cyan}║${d.reset}\n`;
  if (data.oldValue !== undefined) content += `${d.cyan}║${d.reset} ${d.red}◀ Old     ${d.gray}│${d.reset} ${d.white}${pad(data.oldValue, 34)}${d.reset}${d.cyan}║${d.reset}\n`;
  if (data.newValue !== undefined) content += `${d.cyan}║${d.reset} ${d.green}▶ New     ${d.gray}│${d.reset} ${d.white}${pad(data.newValue, 34)}${d.reset}${d.cyan}║${d.reset}\n`;
  if (data.count !== undefined) content += `${d.cyan}║${d.reset} ${d.cyan}📊 Count   ${d.gray}│${d.reset} ${d.white}${pad(String(data.count), 34)}${d.reset}${d.cyan}║${d.reset}\n`;
  if (data.duration) content += `${d.cyan}║${d.reset} ${d.yellow}⏱ Duration${d.gray}│${d.reset} ${d.white}${pad(data.duration, 34)}${d.reset}${d.cyan}║${d.reset}\n`;
  
  if (data.success !== undefined) {
    const status = data.success ? `${d.green}✓ SUCCESS` : `${d.red}✗ FAILED`;
    content += `${d.cyan}╠${'═'.repeat(50)}╣${d.reset}\n`;
    content += `${d.cyan}║${d.reset} ${status}${' '.repeat(39)}${d.reset}${d.cyan}║${d.reset}\n`;
  }
  
  content += `${d.cyan}╚${'═'.repeat(50)}╝${d.reset}\n`;
  content += '```';
  return content;
}

function buildBatchedLog(events) {
  const time = timestamp();
  const date = datestamp();
  
  // Group by category
  const grouped = {};
  for (const evt of events) {
    if (!grouped[evt.category]) grouped[evt.category] = [];
    grouped[evt.category].push(evt);
  }
  
  let content = '```ansi\n';
  content += `${d.cyan}╔${'═'.repeat(50)}╗${d.reset}\n`;
  content += `${d.cyan}║${d.reset} ${d.bold}${d.white}📦 BATCHED LOG SUMMARY${' '.repeat(26)}${d.reset}${d.cyan}║${d.reset}\n`;
  content += `${d.cyan}╠${'═'.repeat(50)}╣${d.reset}\n`;
  content += `${d.cyan}║${d.reset} ${d.gray}📅 ${date}  ⏰ ${time}${' '.repeat(23)}${d.reset}${d.cyan}║${d.reset}\n`;
  content += `${d.cyan}║${d.reset} ${d.gray}📊 Total Events: ${events.length}${' '.repeat(28)}${d.reset}${d.cyan}║${d.reset}\n`;
  content += `${d.cyan}╠${'═'.repeat(50)}╣${d.reset}\n`;
  
  for (const [category, catEvents] of Object.entries(grouped)) {
    const cat = LOG_CATEGORIES[category];
    if (!cat) continue;
    
    content += `${d.cyan}║${d.reset} ${cat.emoji} ${d.yellow}${pad(cat.name, 15)}${d.gray}│${d.reset} ${d.white}${pad(catEvents.length + ' events', 26)}${d.reset}${d.cyan}║${d.reset}\n`;
    
    // Aggregate similar events
    const aggregated = {};
    for (const evt of catEvents) {
      const key = evt.data.action || evt.data.command || 'event';
      if (!aggregated[key]) aggregated[key] = { count: 0, users: new Set() };
      aggregated[key].count++;
      if (evt.data.user) aggregated[key].users.add(evt.data.user);
    }
    
    for (const [key, agg] of Object.entries(aggregated)) {
      const userCount = agg.users.size;
      const detail = userCount > 0 ? `${agg.count}x by ${userCount} user${userCount > 1 ? 's' : ''}` : `${agg.count}x`;
      content += `${d.cyan}║${d.reset}   ${d.gray}└ ${pad(key, 13)}│${d.reset} ${d.white}${pad(detail, 26)}${d.reset}${d.cyan}║${d.reset}\n`;
    }
  }
  
  content += `${d.cyan}╚${'═'.repeat(50)}╝${d.reset}\n`;
  content += '```';
  return content;
}

function buildStartupLog(botTag, commandCount) {
  const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  
  let content = '```ansi\n';
  content += `${d.green}╔${'═'.repeat(50)}╗${d.reset}\n`;
  content += `${d.green}║${d.reset}${' '.repeat(12)}${d.bold}${d.green}🚀 BOT STARTUP${d.reset}${' '.repeat(24)}${d.green}║${d.reset}\n`;
  content += `${d.green}╠${'═'.repeat(50)}╣${d.reset}\n`;
  content += `${d.green}║${d.reset} ${d.gray}📅 ${datestamp()}  ⏰ ${timestamp()}${' '.repeat(23)}${d.reset}${d.green}║${d.reset}\n`;
  content += `${d.green}╠${'═'.repeat(50)}╣${d.reset}\n`;
  content += `${d.green}║${d.reset} ${d.yellow}🤖 Bot      ${d.gray}│${d.reset} ${d.white}${pad(botTag, 34)}${d.reset}${d.green}║${d.reset}\n`;
  content += `${d.green}║${d.reset} ${d.yellow}⚡ Commands ${d.gray}│${d.reset} ${d.white}${pad(commandCount + ' loaded', 34)}${d.reset}${d.green}║${d.reset}\n`;
  content += `${d.green}║${d.reset} ${d.yellow}💾 Memory   ${d.gray}│${d.reset} ${d.white}${pad(mem + ' MB', 34)}${d.reset}${d.green}║${d.reset}\n`;
  content += `${d.green}║${d.reset} ${d.yellow}📦 Node     ${d.gray}│${d.reset} ${d.white}${pad(process.version, 34)}${d.reset}${d.green}║${d.reset}\n`;
  content += `${d.green}╠${'═'.repeat(50)}╣${d.reset}\n`;
  content += `${d.green}║${d.reset} ${d.bold}${d.green}✓ STATUS: ALL SYSTEMS OPERATIONAL${d.reset}${' '.repeat(13)}${d.green}║${d.reset}\n`;
  content += `${d.green}╚${'═'.repeat(50)}╝${d.reset}\n`;
  content += '```';
  return content;
}

function buildErrorLog(title, error, context = {}) {
  const errorMsg = error?.message || String(error);
  
  let content = '```ansi\n';
  content += `${d.red}╔${'═'.repeat(50)}╗${d.reset}\n`;
  content += `${d.red}║${d.reset} ${d.bgRed}${d.white}${d.bold}  ❌ ERROR  ${d.reset}${' '.repeat(37)}${d.red}║${d.reset}\n`;
  content += `${d.red}╠${'═'.repeat(50)}╣${d.reset}\n`;
  content += `${d.red}║${d.reset} ${d.gray}📅 ${datestamp()}  ⏰ ${timestamp()}${' '.repeat(23)}${d.reset}${d.red}║${d.reset}\n`;
  content += `${d.red}╠${'═'.repeat(50)}╣${d.reset}\n`;
  content += `${d.red}║${d.reset} ${d.yellow}📍 Location${d.gray}│${d.reset} ${d.white}${pad(title, 34)}${d.reset}${d.red}║${d.reset}\n`;
  content += `${d.red}║${d.reset} ${d.red}💬 Message ${d.gray}│${d.reset} ${d.white}${pad(errorMsg.slice(0, 34), 34)}${d.reset}${d.red}║${d.reset}\n`;
  
  if (Object.keys(context).length > 0) {
    content += `${d.red}╠${'─'.repeat(50)}╣${d.reset}\n`;
    for (const [key, val] of Object.entries(context)) {
      content += `${d.red}║${d.reset} ${d.cyan}  ${pad(key, 8)} ${d.gray}│${d.reset} ${d.white}${pad(String(val).slice(0, 34), 34)}${d.reset}${d.red}║${d.reset}\n`;
    }
  }
  
  content += `${d.red}╚${'═'.repeat(50)}╝${d.reset}\n`;
  content += '```';
  return content;
}

function buildSyncLog(type, count, duration) {
  let content = '```ansi\n';
  content += `${d.cyan}╔${'═'.repeat(50)}╗${d.reset}\n`;
  content += `${d.cyan}║${d.reset} ${d.bold}${d.cyan}📊 ${type.toUpperCase()} SYNC${d.reset}${' '.repeat(30)}${d.cyan}║${d.reset}\n`;
  content += `${d.cyan}╠${'═'.repeat(50)}╣${d.reset}\n`;
  content += `${d.cyan}║${d.reset} ${d.yellow}⏰ Time     ${d.gray}│${d.reset} ${d.white}${pad(timestamp(), 34)}${d.reset}${d.cyan}║${d.reset}\n`;
  content += `${d.cyan}║${d.reset} ${d.yellow}📊 Records  ${d.gray}│${d.reset} ${d.white}${pad(count + ' synced', 34)}${d.reset}${d.cyan}║${d.reset}\n`;
  content += `${d.cyan}║${d.reset} ${d.yellow}⏱ Duration ${d.gray}│${d.reset} ${d.white}${pad(duration, 34)}${d.reset}${d.cyan}║${d.reset}\n`;
  content += `${d.cyan}╠${'═'.repeat(50)}╣${d.reset}\n`;
  content += `${d.cyan}║${d.reset} ${d.green}✓ SYNC COMPLETE${d.reset}${' '.repeat(33)}${d.cyan}║${d.reset}\n`;
  content += `${d.cyan}╚${'═'.repeat(50)}╝${d.reset}\n`;
  content += '```';
  return content;
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
    this.batchInterval = 0; // 0 = instant, otherwise minutes
    this.batchQueue = [];
    this.batchTimer = null;
  }

  async init(client) {
    this.client = client;
    
    // Try to get settings from first guild
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
      consoleLog('batch', `Batch mode enabled: posting every ${this.batchInterval} minute(s)`);
    }
  }

  async flushBatch() {
    if (this.batchQueue.length === 0 || !this.channel) return;
    
    const events = [...this.batchQueue];
    this.batchQueue = [];
    
    consoleLog('batch', `Flushing ${events.length} batched events`);
    
    try {
      const content = buildBatchedLog(events);
      await this.channel.send(content);
    } catch (e) {
      consoleLog('error', 'Failed to send batched log:', e.message);
    }
  }

  isEnabled(category) {
    return this.enabledCategories.has(category);
  }

  async send(category, content, immediate = false) {
    if (!this.channel || !this.isEnabled(category)) return;
    
    // Immediate categories (startup, shutdown, errors)
    const alwaysImmediate = ['startup', 'shutdown', 'errors'];
    if (immediate || this.batchInterval === 0 || alwaysImmediate.includes(category)) {
      try {
        await this.channel.send(content);
      } catch (e) {
        consoleLog('error', 'Failed to send log:', e.message);
      }
    }
  }

  queueOrSend(category, data) {
    if (!this.channel || !this.isEnabled(category)) return;
    
    const alwaysImmediate = ['startup', 'shutdown', 'errors'];
    
    if (this.batchInterval === 0 || alwaysImmediate.includes(category)) {
      const content = buildDiscordLog(category, data);
      if (content) this.send(category, content, true);
    } else {
      this.batchQueue.push({ category, data, time: Date.now() });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGGING METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  startup(botTag, commandCount) {
    consoleStartupBanner(botTag, commandCount);
    if (this.channel && this.isEnabled('startup')) {
      this.send('startup', buildStartupLog(botTag, commandCount), true);
    }
  }

  shutdown(reason) {
    consoleLog('shutdown', `Bot shutting down: ${reason}`);
  }

  command(name, user, subcommand = null) {
    const cmd = subcommand ? `/${name} ${subcommand}` : `/${name}`;
    consoleLog('command', `${cmd} by ${user}`);
    this.queueOrSend('commands', { user, command: cmd, action: 'Command executed' });
  }

  register(user, type, ign, className) {
    consoleLog('register', `${user} registered ${type}: ${ign} (${className})`);
    this.queueOrSend('registration', { user, action: `Registered ${type}`, details: `${ign} - ${className}`, success: true });
  }

  edit(user, field, oldValue, newValue) {
    consoleLog('edit', `${user} changed ${field}: ${oldValue} → ${newValue}`);
    this.queueOrSend('editing', { user, action: `Edited ${field}`, oldValue, newValue, success: true });
  }

  delete(user, type, label) {
    consoleLog('delete', `${user} deleted ${type}: ${label}`);
    this.queueOrSend('deletion', { user, action: `Deleted ${type}`, details: label, success: true });
  }

  viewProfile(user, target) {
    consoleLog('view', `${user} viewed ${target}'s profile`);
    this.queueOrSend('profileViews', { user, target, action: 'Viewed profile' });
  }

  interaction(type, customId, user) {
    consoleLog(type, `${customId} by ${user}`);
    this.queueOrSend('interactions', { user, action: type, details: customId });
  }

  sheetsSync(count, duration) {
    consoleLog('sheets', `Synced ${count} characters in ${duration}`);
    if (this.channel && this.isEnabled('sheetsSync')) {
      this.send('sheetsSync', buildSyncLog('Google Sheets', count, duration), true);
    }
  }

  nicknameSync(updated, failed) {
    consoleLog('nickname', `Nicknames synced: ${updated} success, ${failed} failed`);
    this.queueOrSend('nicknameSync', { action: 'Nickname Sync', details: `${updated} updated, ${failed} failed`, success: failed === 0 });
  }

  error(category, message, error = null, context = {}) {
    consoleLog('error', `[${category}] ${message}`, error?.message || '');
    if (this.channel && this.isEnabled('errors')) {
      this.send('errors', buildErrorLog(`${category}: ${message}`, error, context), true);
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
