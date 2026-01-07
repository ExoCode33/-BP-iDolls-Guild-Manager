import { LogSettingsRepo } from '../database/repositories.js';
import { LOG_CATEGORIES, DEFAULT_ENABLED } from '../config/logCategories.js';
import config from '../config/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSOLE ANSI COLORS
// ═══════════════════════════════════════════════════════════════════════════════

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
};

// Discord ANSI
const d = {
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  gray: '\u001b[30m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  pink: '\u001b[35m',
  cyan: '\u001b[36m',
  white: '\u001b[37m',
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const timestamp = () => new Date().toLocaleTimeString('en-US', { hour12: false });
const shortTime = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

const CONSOLE_LINE = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
const DISCORD_LINE = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSOLE LOG BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

function consoleStartup(botTag, commandCount) {
  const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  const now = new Date();
  
  console.log('');
  console.log(`${c.brightGreen}${CONSOLE_LINE}${c.reset}`);
  console.log(`${c.brightGreen}${c.bold}🚀 BOT ONLINE${c.reset}`);
  console.log(`${c.white}Bot        ${c.reset}${c.brightCyan}${botTag}${c.reset}`);
  console.log(`${c.white}Commands   ${c.reset}${c.brightYellow}${commandCount} loaded${c.reset}`);
  console.log(`${c.white}Memory     ${c.reset}${c.brightYellow}${mem} MB${c.reset}`);
  console.log(`${c.white}Node       ${c.reset}${c.gray}${process.version}${c.reset}`);
  console.log(`${c.white}Time       ${c.reset}${c.gray}${now.toLocaleString()}${c.reset}`);
  console.log(`${c.white}Status     ${c.reset}${c.brightGreen}✓ All systems operational${c.reset}`);
  console.log(`${c.brightGreen}${CONSOLE_LINE}${c.reset}`);
  console.log('');
}

function consoleShutdown(reason) {
  console.log('');
  console.log(`${c.brightRed}${CONSOLE_LINE}${c.reset}`);
  console.log(`${c.brightRed}${c.bold}🔴 BOT SHUTDOWN${c.reset}`);
  console.log(`${c.white}Reason     ${c.reset}${c.brightYellow}${reason}${c.reset}`);
  console.log(`${c.white}Time       ${c.reset}${c.gray}${timestamp()}${c.reset}`);
  console.log(`${c.brightRed}${CONSOLE_LINE}${c.reset}`);
  console.log('');
}

function consoleCommand(user, command) {
  console.log('');
  console.log(`${c.brightBlue}${CONSOLE_LINE}${c.reset}`);
  console.log(`${c.brightBlue}${c.bold}⚡ COMMAND${c.reset}  ${c.gray}${timestamp()}${c.reset}`);
  console.log(`${c.white}User       ${c.reset}${c.brightYellow}${user}${c.reset}`);
  console.log(`${c.white}Command    ${c.reset}${c.brightCyan}${command}${c.reset}`);
  console.log(`${c.brightBlue}${CONSOLE_LINE}${c.reset}`);
  console.log('');
}

function consoleRegister(user, type, ign, className) {
  console.log('');
  console.log(`${c.brightGreen}${CONSOLE_LINE}${c.reset}`);
  console.log(`${c.brightGreen}${c.bold}📝 REGISTRATION${c.reset}  ${c.gray}${timestamp()}${c.reset}`);
  console.log(`${c.white}User       ${c.reset}${c.brightYellow}${user}${c.reset}`);
  console.log(`${c.white}Type       ${c.reset}${c.brightCyan}${type}${c.reset}`);
  console.log(`${c.white}IGN        ${c.reset}${c.brightWhite}${ign}${c.reset}`);
  console.log(`${c.white}Class      ${c.reset}${c.brightMagenta}${className}${c.reset}`);
  console.log(`${c.white}Status     ${c.reset}${c.brightGreen}✓ Complete${c.reset}`);
  console.log(`${c.brightGreen}${CONSOLE_LINE}${c.reset}`);
  console.log('');
}

function consoleEdit(user, field, oldVal, newVal) {
  console.log('');
  console.log(`${c.brightYellow}${CONSOLE_LINE}${c.reset}`);
  console.log(`${c.brightYellow}${c.bold}✏️ EDIT${c.reset}  ${c.gray}${timestamp()}${c.reset}`);
  console.log(`${c.white}User       ${c.reset}${c.brightYellow}${user}${c.reset}`);
  console.log(`${c.white}Field      ${c.reset}${c.brightCyan}${field}${c.reset}`);
  console.log(`${c.white}Before     ${c.reset}${c.brightRed}${oldVal}${c.reset}`);
  console.log(`${c.white}After      ${c.reset}${c.brightGreen}${newVal}${c.reset}`);
  console.log(`${c.brightYellow}${CONSOLE_LINE}${c.reset}`);
  console.log('');
}

function consoleDelete(user, type, label) {
  console.log('');
  console.log(`${c.brightRed}${CONSOLE_LINE}${c.reset}`);
  console.log(`${c.brightRed}${c.bold}🗑️ DELETION${c.reset}  ${c.gray}${timestamp()}${c.reset}`);
  console.log(`${c.white}User       ${c.reset}${c.brightYellow}${user}${c.reset}`);
  console.log(`${c.white}Type       ${c.reset}${c.brightCyan}${type}${c.reset}`);
  console.log(`${c.white}Character  ${c.reset}${c.brightWhite}${label}${c.reset}`);
  console.log(`${c.brightRed}${CONSOLE_LINE}${c.reset}`);
  console.log('');
}

function consoleView(user, target) {
  console.log('');
  console.log(`${c.brightCyan}${CONSOLE_LINE}${c.reset}`);
  console.log(`${c.brightCyan}${c.bold}👁️ PROFILE VIEW${c.reset}  ${c.gray}${timestamp()}${c.reset}`);
  console.log(`${c.white}User       ${c.reset}${c.brightYellow}${user}${c.reset}`);
  console.log(`${c.white}Viewed     ${c.reset}${c.brightCyan}${target}${c.reset}`);
  console.log(`${c.brightCyan}${CONSOLE_LINE}${c.reset}`);
  console.log('');
}

function consoleSync(type, count, duration) {
  const icon = type === 'sheets' ? '📊' : '🏷️';
  const title = type === 'sheets' ? 'SHEETS SYNC' : 'NICKNAME SYNC';
  
  console.log('');
  console.log(`${c.brightCyan}${CONSOLE_LINE}${c.reset}`);
  console.log(`${c.brightCyan}${c.bold}${icon} ${title}${c.reset}  ${c.gray}${timestamp()}${c.reset}`);
  console.log(`${c.white}Records    ${c.reset}${c.brightYellow}${count}${c.reset}`);
  console.log(`${c.white}Duration   ${c.reset}${c.brightYellow}${duration}ms${c.reset}`);
  console.log(`${c.white}Status     ${c.reset}${c.brightGreen}✓ Complete${c.reset}`);
  console.log(`${c.brightCyan}${CONSOLE_LINE}${c.reset}`);
  console.log('');
}

function consoleError(location, error, context = {}) {
  const errorMsg = error?.message || String(error);
  
  console.log('');
  console.log(`${c.brightRed}${CONSOLE_LINE}${c.reset}`);
  console.log(`${c.brightRed}${c.bold}❌ ERROR${c.reset}  ${c.gray}${timestamp()}${c.reset}`);
  console.log(`${c.white}Location   ${c.reset}${c.brightYellow}${location}${c.reset}`);
  console.log(`${c.white}Message    ${c.reset}${c.brightRed}${errorMsg.slice(0, 80)}${c.reset}`);
  
  for (const [key, val] of Object.entries(context)) {
    console.log(`${c.white}${key.padEnd(10)} ${c.reset}${c.gray}${String(val).slice(0, 50)}${c.reset}`);
  }
  
  console.log(`${c.brightRed}${CONSOLE_LINE}${c.reset}`);
  console.log('');
}

function consoleInteraction(type, customId, user) {
  console.log('');
  console.log(`${c.gray}${CONSOLE_LINE}${c.reset}`);
  console.log(`${c.gray}${c.bold}🖱️ ${type.toUpperCase()}${c.reset}  ${c.gray}${timestamp()}${c.reset}`);
  console.log(`${c.white}User       ${c.reset}${c.brightYellow}${user}${c.reset}`);
  console.log(`${c.white}Action     ${c.reset}${c.brightWhite}${customId.slice(0, 40)}${c.reset}`);
  console.log(`${c.gray}${CONSOLE_LINE}${c.reset}`);
  console.log('');
}

function consoleBatch(count) {
  console.log('');
  console.log(`${c.brightMagenta}${CONSOLE_LINE}${c.reset}`);
  console.log(`${c.brightMagenta}${c.bold}📦 BATCH FLUSH${c.reset}  ${c.gray}${timestamp()}${c.reset}`);
  console.log(`${c.white}Events     ${c.reset}${c.brightYellow}${count}${c.reset}`);
  console.log(`${c.white}Status     ${c.reset}${c.brightGreen}✓ Sent${c.reset}`);
  console.log(`${c.brightMagenta}${CONSOLE_LINE}${c.reset}`);
  console.log('');
}

function consoleInfo(message, details = '') {
  console.log('');
  console.log(`${c.brightBlue}${CONSOLE_LINE}${c.reset}`);
  console.log(`${c.brightBlue}${c.bold}ℹ️ INFO${c.reset}  ${c.gray}${timestamp()}${c.reset}`);
  console.log(`${c.white}Message    ${c.reset}${c.brightWhite}${message}${c.reset}`);
  if (details) console.log(`${c.white}Details    ${c.reset}${c.gray}${details}${c.reset}`);
  console.log(`${c.brightBlue}${CONSOLE_LINE}${c.reset}`);
  console.log('');
}

function consoleWarning(category, message) {
  console.log('');
  console.log(`${c.brightYellow}${CONSOLE_LINE}${c.reset}`);
  console.log(`${c.brightYellow}${c.bold}⚠️ WARNING${c.reset}  ${c.gray}${timestamp()}${c.reset}`);
  console.log(`${c.white}Category   ${c.reset}${c.brightCyan}${category}${c.reset}`);
  console.log(`${c.white}Message    ${c.reset}${c.brightYellow}${message}${c.reset}`);
  console.log(`${c.brightYellow}${CONSOLE_LINE}${c.reset}`);
  console.log('');
}

function consoleSuccess(message, details = '') {
  console.log('');
  console.log(`${c.brightGreen}${CONSOLE_LINE}${c.reset}`);
  console.log(`${c.brightGreen}${c.bold}✅ SUCCESS${c.reset}  ${c.gray}${timestamp()}${c.reset}`);
  console.log(`${c.white}Message    ${c.reset}${c.brightWhite}${message}${c.reset}`);
  if (details) console.log(`${c.white}Details    ${c.reset}${c.gray}${details}${c.reset}`);
  console.log(`${c.brightGreen}${CONSOLE_LINE}${c.reset}`);
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISCORD ANSI BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

function buildStartupLog(botTag, commandCount) {
  const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  
  let msg = '```ansi\n';
  msg += `${d.green}${DISCORD_LINE}${d.reset}\n`;
  msg += `${d.green}${d.bold}🚀 BOT ONLINE${d.reset}\n`;
  msg += `${d.white}Bot        ${d.reset}${d.cyan}${botTag}${d.reset}\n`;
  msg += `${d.white}Commands   ${d.reset}${d.yellow}${commandCount} loaded${d.reset}\n`;
  msg += `${d.white}Memory     ${d.reset}${d.yellow}${mem} MB${d.reset}\n`;
  msg += `${d.white}Node       ${d.reset}${d.gray}${process.version}${d.reset}\n`;
  msg += `${d.white}Status     ${d.reset}${d.green}✓ All systems operational${d.reset}\n`;
  msg += `${d.green}${DISCORD_LINE}${d.reset}\n`;
  msg += '```';
  return msg;
}

function buildShutdownLog(reason) {
  let msg = '```ansi\n';
  msg += `${d.red}${DISCORD_LINE}${d.reset}\n`;
  msg += `${d.red}${d.bold}🔴 BOT SHUTDOWN${d.reset}\n`;
  msg += `${d.white}Reason     ${d.reset}${d.yellow}${reason}${d.reset}\n`;
  msg += `${d.white}Time       ${d.reset}${d.gray}${shortTime()}${d.reset}\n`;
  msg += `${d.red}${DISCORD_LINE}${d.reset}\n`;
  msg += '```';
  return msg;
}

function buildCommandLog(user, command) {
  let msg = '```ansi\n';
  msg += `${d.blue}${DISCORD_LINE}${d.reset}\n`;
  msg += `${d.blue}${d.bold}⚡ COMMAND${d.reset}  ${d.gray}${shortTime()}${d.reset}\n`;
  msg += `${d.white}User       ${d.reset}${d.yellow}${user}${d.reset}\n`;
  msg += `${d.white}Command    ${d.reset}${d.cyan}${command}${d.reset}\n`;
  msg += `${d.blue}${DISCORD_LINE}${d.reset}\n`;
  msg += '```';
  return msg;
}

function buildRegisterLog(user, type, ign, className) {
  let msg = '```ansi\n';
  msg += `${d.green}${DISCORD_LINE}${d.reset}\n`;
  msg += `${d.green}${d.bold}📝 REGISTRATION${d.reset}  ${d.gray}${shortTime()}${d.reset}\n`;
  msg += `${d.white}User       ${d.reset}${d.yellow}${user}${d.reset}\n`;
  msg += `${d.white}Type       ${d.reset}${d.cyan}${type}${d.reset}\n`;
  msg += `${d.white}IGN        ${d.reset}${d.white}${ign}${d.reset}\n`;
  msg += `${d.white}Class      ${d.reset}${d.pink}${className}${d.reset}\n`;
  msg += `${d.white}Status     ${d.reset}${d.green}✓ Complete${d.reset}\n`;
  msg += `${d.green}${DISCORD_LINE}${d.reset}\n`;
  msg += '```';
  return msg;
}

function buildEditLog(user, field, oldVal, newVal) {
  let msg = '```ansi\n';
  msg += `${d.yellow}${DISCORD_LINE}${d.reset}\n`;
  msg += `${d.yellow}${d.bold}✏️ EDIT${d.reset}  ${d.gray}${shortTime()}${d.reset}\n`;
  msg += `${d.white}User       ${d.reset}${d.yellow}${user}${d.reset}\n`;
  msg += `${d.white}Field      ${d.reset}${d.cyan}${field}${d.reset}\n`;
  msg += `${d.white}Before     ${d.reset}${d.red}${oldVal}${d.reset}\n`;
  msg += `${d.white}After      ${d.reset}${d.green}${newVal}${d.reset}\n`;
  msg += `${d.yellow}${DISCORD_LINE}${d.reset}\n`;
  msg += '```';
  return msg;
}

function buildDeleteLog(user, type, label) {
  let msg = '```ansi\n';
  msg += `${d.red}${DISCORD_LINE}${d.reset}\n`;
  msg += `${d.red}${d.bold}🗑️ DELETION${d.reset}  ${d.gray}${shortTime()}${d.reset}\n`;
  msg += `${d.white}User       ${d.reset}${d.yellow}${user}${d.reset}\n`;
  msg += `${d.white}Type       ${d.reset}${d.cyan}${type}${d.reset}\n`;
  msg += `${d.white}Character  ${d.reset}${d.white}${label}${d.reset}\n`;
  msg += `${d.red}${DISCORD_LINE}${d.reset}\n`;
  msg += '```';
  return msg;
}

function buildViewLog(user, target) {
  let msg = '```ansi\n';
  msg += `${d.cyan}${DISCORD_LINE}${d.reset}\n`;
  msg += `${d.cyan}${d.bold}👁️ PROFILE VIEW${d.reset}  ${d.gray}${shortTime()}${d.reset}\n`;
  msg += `${d.white}User       ${d.reset}${d.yellow}${user}${d.reset}\n`;
  msg += `${d.white}Viewed     ${d.reset}${d.cyan}${target}${d.reset}\n`;
  msg += `${d.cyan}${DISCORD_LINE}${d.reset}\n`;
  msg += '```';
  return msg;
}

function buildSyncLog(type, count, duration) {
  const icon = type === 'sheets' ? '📊' : '🏷️';
  const title = type === 'sheets' ? 'SHEETS SYNC' : 'NICKNAME SYNC';
  
  let msg = '```ansi\n';
  msg += `${d.cyan}${DISCORD_LINE}${d.reset}\n`;
  msg += `${d.cyan}${d.bold}${icon} ${title}${d.reset}  ${d.gray}${shortTime()}${d.reset}\n`;
  msg += `${d.white}Records    ${d.reset}${d.yellow}${count}${d.reset}\n`;
  msg += `${d.white}Duration   ${d.reset}${d.yellow}${duration}ms${d.reset}\n`;
  msg += `${d.white}Status     ${d.reset}${d.green}✓ Complete${d.reset}\n`;
  msg += `${d.cyan}${DISCORD_LINE}${d.reset}\n`;
  msg += '```';
  return msg;
}

function buildErrorLog(location, error, context = {}) {
  const errorMsg = error?.message || String(error);
  
  let msg = '```ansi\n';
  msg += `${d.red}${DISCORD_LINE}${d.reset}\n`;
  msg += `${d.red}${d.bold}❌ ERROR${d.reset}  ${d.gray}${shortTime()}${d.reset}\n`;
  msg += `${d.white}Location   ${d.reset}${d.yellow}${location}${d.reset}\n`;
  msg += `${d.white}Message    ${d.reset}${d.red}${errorMsg.slice(0, 60)}${d.reset}\n`;
  
  for (const [key, val] of Object.entries(context)) {
    msg += `${d.white}${key.padEnd(10)} ${d.reset}${d.gray}${String(val).slice(0, 40)}${d.reset}\n`;
  }
  
  msg += `${d.red}${DISCORD_LINE}${d.reset}\n`;
  msg += '```';
  return msg;
}

// ✅ NEW: Detailed batch log showing individual events
function buildDetailedBatchLog(events) {
  const grouped = {};
  for (const evt of events) {
    if (!grouped[evt.category]) grouped[evt.category] = [];
    grouped[evt.category].push(evt);
  }
  
  let msg = '```ansi\n';
  msg += `${d.pink}${DISCORD_LINE}${d.reset}\n`;
  msg += `${d.pink}${d.bold}📦 ACTIVITY BATCH${d.reset}  ${d.gray}${shortTime()}${d.reset}\n`;
  msg += `${d.white}Total      ${d.reset}${d.yellow}${events.length} events${d.reset}\n`;
  msg += `\n`;
  
  for (const [category, catEvents] of Object.entries(grouped)) {
    const cat = LOG_CATEGORIES[category];
    if (!cat) continue;
    
    msg += `${d.yellow}${cat.emoji} ${cat.name}${d.reset} ${d.gray}(${catEvents.length})${d.reset}\n`;
    
    // Show individual events with details
    for (const evt of catEvents.slice(0, 15)) { // Limit to 15 per category to avoid message length issues
      const data = evt.data;
      
      // Format based on category type
      if (category === 'commands') {
        msg += `${d.white}   ${data.user}${d.reset} ${d.gray}→${d.reset} ${d.cyan}${data.command}${d.reset}\n`;
      } else if (category === 'registration') {
        msg += `${d.white}   ${data.user}${d.reset} ${d.gray}→${d.reset} ${d.green}${data.details}${d.reset}\n`;
      } else if (category === 'editing') {
        msg += `${d.white}   ${data.user}${d.reset} ${d.gray}→${d.reset} ${d.cyan}${data.action}${d.reset} ${d.gray}(${data.oldValue} → ${data.newValue})${d.reset}\n`;
      } else if (category === 'deletion') {
        msg += `${d.white}   ${data.user}${d.reset} ${d.gray}→${d.reset} ${d.red}${data.details}${d.reset}\n`;
      } else if (category === 'profileViews') {
        msg += `${d.white}   ${data.user}${d.reset} ${d.gray}viewed${d.reset} ${d.cyan}${data.target}${d.reset}\n`;
      } else if (category === 'interactions') {
        msg += `${d.white}   ${data.user}${d.reset} ${d.gray}→${d.reset} ${d.white}${data.details.slice(0, 30)}${d.reset}\n`;
      } else if (category === 'sheetsSync') {
        msg += `${d.white}   Synced ${data.count} records${d.reset} ${d.gray}(${data.duration}ms)${d.reset}\n`;
      } else if (category === 'nicknameSync') {
        msg += `${d.white}   Updated ${data.updated} nicknames${d.reset}${data.failed ? ` ${d.gray}(${data.failed} failed)${d.reset}` : ''}\n`;
      } else {
        // Generic format
        msg += `${d.white}   ${data.user || data.action || 'Event'}${d.reset}\n`;
      }
    }
    
    // Show "and X more..." if truncated
    if (catEvents.length > 15) {
      msg += `${d.gray}   ...and ${catEvents.length - 15} more${d.reset}\n`;
    }
    
    msg += `\n`;
  }
  
  msg += `${d.pink}${DISCORD_LINE}${d.reset}\n`;
  msg += '```';
  return msg;
}

function buildInteractionLog(type, customId, user) {
  let msg = '```ansi\n';
  msg += `${d.gray}${DISCORD_LINE}${d.reset}\n`;
  msg += `${d.gray}${d.bold}🖱️ ${type.toUpperCase()}${d.reset}  ${d.gray}${shortTime()}${d.reset}\n`;
  msg += `${d.white}User       ${d.reset}${d.yellow}${user}${d.reset}\n`;
  msg += `${d.white}Action     ${d.reset}${d.white}${customId.slice(0, 40)}${d.reset}\n`;
  msg += `${d.gray}${DISCORD_LINE}${d.reset}\n`;
  msg += '```';
  return msg;
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
    this.initialized = false;
    this.initRetries = 0;
    this.maxInitRetries = 5;
  }

  async init(client) {
    this.client = client;
    
    // Use guild ID from config instead of cache (more reliable)
    this.guildId = config.discord.guildId;
    
    if (!this.guildId) {
      // Fallback to first guild in cache
      const guild = client.guilds.cache.first();
      if (guild) {
        this.guildId = guild.id;
      }
    }
    
    if (this.guildId) {
      console.log(`[LOGGER] Initializing for guild: ${this.guildId}`);
      await this.reloadSettings();
      this.initialized = true;
    } else {
      console.warn('[LOGGER] ⚠️ No guild ID available - Discord logging disabled');
    }
  }

  async reloadSettings() {
    if (!this.guildId) {
      console.warn('[LOGGER] Cannot reload settings - no guild ID');
      return;
    }
    
    try {
      console.log(`[LOGGER] Loading settings for guild: ${this.guildId}`);
      const settings = await LogSettingsRepo.get(this.guildId);
      
      if (settings) {
        console.log('[LOGGER] Settings found:', {
          channelId: settings.log_channel_id || 'NOT SET',
          categories: settings.enabled_categories?.length || 0,
          batchInterval: settings.batch_interval || 0
        });
      } else {
        console.log('[LOGGER] No settings found in database - using defaults');
      }
      
      // Set enabled categories
      if (settings?.enabled_categories && Array.isArray(settings.enabled_categories)) {
        this.enabledCategories = new Set(settings.enabled_categories);
      } else {
        this.enabledCategories = new Set(DEFAULT_ENABLED);
      }
      
      // Set up log channel
      if (settings?.log_channel_id && this.client) {
        try {
          console.log(`[LOGGER] Fetching channel: ${settings.log_channel_id}`);
          this.channel = await this.client.channels.fetch(settings.log_channel_id);
          
          if (this.channel) {
            console.log(`[LOGGER] ✅ Connected to log channel: #${this.channel.name}`);
          } else {
            console.warn('[LOGGER] ⚠️ Channel fetch returned null');
            this.channel = null;
          }
        } catch (e) {
          console.error(`[LOGGER] ❌ Failed to fetch channel ${settings.log_channel_id}:`, e.message);
          this.channel = null;
        }
      } else {
        console.log('[LOGGER] No log channel configured');
        this.channel = null;
      }
      
      // Set up batch timer
      const newInterval = settings?.batch_interval || 0;
      if (newInterval !== this.batchInterval) {
        this.batchInterval = newInterval;
        this.setupBatchTimer();
      }
      
      console.log('[LOGGER] Settings reloaded successfully');
      console.log(`[LOGGER] - Enabled categories: ${this.enabledCategories.size}`);
      console.log(`[LOGGER] - Log channel: ${this.channel ? '#' + this.channel.name : 'NOT SET'}`);
      console.log(`[LOGGER] - Batch interval: ${this.batchInterval} minutes`);
      
    } catch (e) {
      console.error('[LOGGER] Error reloading settings:', e.message);
      consoleError('Logger Settings', { message: e.message });
    }
  }

  setupBatchTimer() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    
    if (this.batchInterval > 0) {
      const intervalMs = this.batchInterval * 60 * 1000;
      this.batchTimer = setInterval(() => this.flushBatch(), intervalMs);
      console.log(`[LOGGER] Batch mode enabled: ${this.batchInterval} minute intervals`);
    } else {
      console.log('[LOGGER] Batch mode disabled - sending logs immediately');
    }
  }

  async flushBatch() {
    if (this.batchQueue.length === 0) {
      return;
    }
    
    if (!this.channel) {
      console.warn('[LOGGER] Cannot flush batch - no channel configured');
      this.batchQueue = [];
      return;
    }
    
    const events = [...this.batchQueue];
    this.batchQueue = [];
    
    consoleBatch(events.length);
    
    try {
      // ✅ Use detailed batch log instead of summary
      await this.channel.send(buildDetailedBatchLog(events));
      console.log(`[LOGGER] ✅ Flushed ${events.length} events to Discord`);
    } catch (e) {
      console.error('[LOGGER] ❌ Failed to send batch:', e.message);
    }
  }

  isEnabled(cat) {
    return this.enabledCategories.has(cat);
  }

  async send(category, content) {
    // Check if category is enabled
    if (!this.isEnabled(category)) {
      return;
    }
    
    // Check if channel is available
    if (!this.channel) {
      // Try to reload settings if not initialized
      if (!this.initialized && this.initRetries < this.maxInitRetries) {
        this.initRetries++;
        console.log(`[LOGGER] Channel not ready, attempting reload (${this.initRetries}/${this.maxInitRetries})`);
        await this.reloadSettings();
      }
      
      if (!this.channel) {
        return;
      }
    }
    
    try {
      await this.channel.send(content);
    } catch (e) {
      console.error('[LOGGER] Failed to send to Discord:', e.message);
      
      // If channel became invalid, clear it
      if (e.code === 10003 || e.code === 50001) {
        console.warn('[LOGGER] Channel became invalid - clearing');
        this.channel = null;
      }
    }
  }

  queue(category, data) {
    if (!this.isEnabled(category)) {
      return false;
    }
    
    if (!this.channel) {
      return false;
    }
    
    // ✅ FIXED: Only startup, shutdown, and errors are immediate
    const immediate = ['startup', 'shutdown', 'errors'];
    if (this.batchInterval === 0 || immediate.includes(category)) {
      return false;
    }
    
    this.batchQueue.push({ category, data, time: Date.now() });
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  startup(botTag, commandCount) {
    consoleStartup(botTag, commandCount);
    this.send('startup', buildStartupLog(botTag, commandCount));
  }

  shutdown(reason) {
    consoleShutdown(reason);
    // Try to send shutdown log synchronously if possible
    if (this.channel && this.isEnabled('shutdown')) {
      this.channel.send(buildShutdownLog(reason)).catch(() => {});
    }
  }

  command(name, user, subcommand = null) {
    const cmd = subcommand ? `/${name} ${subcommand}` : `/${name}`;
    consoleCommand(user, cmd);
    
    const data = { user, command: cmd };
    if (!this.queue('commands', data)) {
      this.send('commands', buildCommandLog(user, cmd));
    }
  }

  register(user, type, ign, className) {
    consoleRegister(user, type, ign, className);
    
    const data = { user, action: `Registered ${type}`, details: `${ign} - ${className}` };
    if (!this.queue('registration', data)) {
      this.send('registration', buildRegisterLog(user, type, ign, className));
    }
  }

  edit(user, field, oldValue, newValue) {
    consoleEdit(user, field, oldValue, newValue);
    
    const data = { user, action: `Edited ${field}`, oldValue, newValue };
    if (!this.queue('editing', data)) {
      this.send('editing', buildEditLog(user, field, oldValue, newValue));
    }
  }

  delete(user, type, label) {
    consoleDelete(user, type, label);
    
    const data = { user, action: `Deleted ${type}`, details: label };
    if (!this.queue('deletion', data)) {
      this.send('deletion', buildDeleteLog(user, type, label));
    }
  }

  viewProfile(user, target) {
    consoleView(user, target);
    
    const data = { user, target };
    if (!this.queue('profileViews', data)) {
      this.send('profileViews', buildViewLog(user, target));
    }
  }

  interaction(type, customId, user) {
    consoleInteraction(type, customId, user);
    
    const data = { user, action: type, details: customId };
    if (!this.queue('interactions', data)) {
      this.send('interactions', buildInteractionLog(type, customId, user));
    }
  }

  // ✅ FIXED: Now uses queue() for batching
  sheetsSync(count, duration) {
    consoleSync('sheets', count, duration);
    
    const data = { action: 'Sheets Sync', count, duration };
    if (!this.queue('sheetsSync', data)) {
      this.send('sheetsSync', buildSyncLog('sheets', count, duration));
    }
  }

  // ✅ FIXED: Now uses queue() for batching
  nicknameSync(updated, failed) {
    consoleSync('nickname', updated, 0);
    
    const data = { action: 'Nickname Sync', updated, failed };
    if (!this.queue('nicknameSync', data)) {
      this.send('nicknameSync', buildSyncLog('nickname', updated, 0));
    }
  }

  error(category, message, error = null, context = {}) {
    consoleError(`${category}: ${message}`, error, context);
    this.send('errors', buildErrorLog(`${category}: ${message}`, error, context));
  }

  warning(category, message) {
    consoleWarning(category, message);
  }

  info(message, details = '') {
    consoleInfo(message, details);
  }

  debug(message, data = null) {
    if (process.env.DEBUG) {
      consoleInfo(message, data ? JSON.stringify(data) : '');
    }
  }
}

export default new Logger();
