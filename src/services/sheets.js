import { google } from 'googleapis';
import config from '../config/index.js';
import { TIMEZONE_ABBR, CLASSES } from '../config/game.js';
import { TimezoneRepo, BattleImagineRepo } from '../database/repositories.js';
import logger from './logger.js';

// ═══════════════════════════════════════════════════════════════════
// ✅ TIMEZONE FIX - DYNAMIC HELPERS (DST-AWARE)
// These functions automatically handle Daylight Saving Time
// ═══════════════════════════════════════════════════════════════════

// Regional abbreviation mappings for better UX (prefers "EST" over "GMT-5")
const REGIONAL_ABBR_MAP = {
  'America/New_York': { winter: 'EST', summer: 'EDT' },
  'America/Chicago': { winter: 'CST', summer: 'CDT' },
  'America/Denver': { winter: 'MST', summer: 'MDT' },
  'America/Los_Angeles': { winter: 'PST', summer: 'PDT' },
  'America/Phoenix': { winter: 'MST', summer: 'MST' },
  'America/Anchorage': { winter: 'AKST', summer: 'AKDT' },
  'Pacific/Honolulu': { winter: 'HST', summer: 'HST' },
  'America/Toronto': { winter: 'EST', summer: 'EDT' },
  'America/Vancouver': { winter: 'PST', summer: 'PDT' },
  'America/Halifax': { winter: 'AST', summer: 'ADT' },
  'America/Winnipeg': { winter: 'CST', summer: 'CDT' },
  'America/Edmonton': { winter: 'MST', summer: 'MDT' },
  'America/Mexico_City': { winter: 'CST', summer: 'CDT' },
  'America/Chihuahua': { winter: 'MST', summer: 'MDT' },
  'America/Tijuana': { winter: 'PST', summer: 'PDT' },
  'Europe/London': { winter: 'GMT', summer: 'BST' },
  'Europe/Paris': { winter: 'CET', summer: 'CEST' },
  'Europe/Berlin': { winter: 'CET', summer: 'CEST' },
  'Europe/Rome': { winter: 'CET', summer: 'CEST' },
  'Europe/Madrid': { winter: 'CET', summer: 'CEST' },
  'Europe/Amsterdam': { winter: 'CET', summer: 'CEST' },
  'Europe/Brussels': { winter: 'CET', summer: 'CEST' },
  'Europe/Vienna': { winter: 'CET', summer: 'CEST' },
  'Europe/Stockholm': { winter: 'CET', summer: 'CEST' },
  'Europe/Warsaw': { winter: 'CET', summer: 'CEST' },
  'Europe/Athens': { winter: 'EET', summer: 'EEST' },
  'Europe/Istanbul': { winter: 'TRT', summer: 'TRT' },
  'Europe/Moscow': { winter: 'MSK', summer: 'MSK' },
  'Asia/Tokyo': { winter: 'JST', summer: 'JST' },
  'Asia/Seoul': { winter: 'KST', summer: 'KST' },
  'Asia/Shanghai': { winter: 'CST', summer: 'CST' },
  'Asia/Hong_Kong': { winter: 'HKT', summer: 'HKT' },
  'Asia/Taipei': { winter: 'CST', summer: 'CST' },
  'Asia/Singapore': { winter: 'SGT', summer: 'SGT' },
  'Asia/Bangkok': { winter: 'ICT', summer: 'ICT' },
  'Asia/Ho_Chi_Minh': { winter: 'ICT', summer: 'ICT' },
  'Asia/Manila': { winter: 'PST', summer: 'PST' },
  'Asia/Jakarta': { winter: 'WIB', summer: 'WIB' },
  'Asia/Makassar': { winter: 'WITA', summer: 'WITA' },
  'Asia/Kolkata': { winter: 'IST', summer: 'IST' },
  'Asia/Dubai': { winter: 'GST', summer: 'GST' },
  'Asia/Riyadh': { winter: 'AST', summer: 'AST' },
  'Australia/Sydney': { winter: 'AEST', summer: 'AEDT' },
  'Australia/Melbourne': { winter: 'AEST', summer: 'AEDT' },
  'Australia/Brisbane': { winter: 'AEST', summer: 'AEST' },
  'Australia/Adelaide': { winter: 'ACST', summer: 'ACDT' },
  'Australia/Perth': { winter: 'AWST', summer: 'AWST' },
  'Australia/Darwin': { winter: 'ACST', summer: 'ACST' },
  'Pacific/Auckland': { winter: 'NZST', summer: 'NZDT' },
  'Pacific/Fiji': { winter: 'FJT', summer: 'FJT' },
  'Africa/Johannesburg': { winter: 'SAST', summer: 'SAST' },
  'Africa/Cairo': { winter: 'EET', summer: 'EEST' },
  'Africa/Lagos': { winter: 'WAT', summer: 'WAT' },
  'Africa/Nairobi': { winter: 'EAT', summer: 'EAT' },
  'Africa/Casablanca': { winter: 'WET', summer: 'WEST' },
  'America/Sao_Paulo': { winter: 'BRT', summer: 'BRST' },
  'America/Manaus': { winter: 'AMT', summer: 'AMT' },
  'America/Buenos_Aires': { winter: 'ART', summer: 'ART' },
  'America/Santiago': { winter: 'CLT', summer: 'CLST' },
  'America/Bogota': { winter: 'COT', summer: 'COT' },
  'America/Lima': { winter: 'PET', summer: 'PET' }
};

/**
 * Get offset for a specific date in a timezone
 */
function getOffsetAtDate(timezone, date) {
  try {
    const utcFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const tzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const utcParts = Object.fromEntries(
      utcFormatter.formatToParts(date)
        .filter(p => p.type !== 'literal')
        .map(p => [p.type, parseInt(p.value)])
    );
    
    const tzParts = Object.fromEntries(
      tzFormatter.formatToParts(date)
        .filter(p => p.type !== 'literal')
        .map(p => [p.type, parseInt(p.value)])
    );
    
    const utcTime = Date.UTC(utcParts.year, utcParts.month - 1, utcParts.day, utcParts.hour, utcParts.minute);
    const tzTime = Date.UTC(tzParts.year, tzParts.month - 1, tzParts.day, tzParts.hour, tzParts.minute);
    
    return (tzTime - utcTime) / (1000 * 60 * 60);
  } catch (error) {
    return 0;
  }
}

/**
 * Detect if a timezone is currently observing DST
 */
function isCurrentlyDST(timezone) {
  try {
    const now = new Date();
    const jan = new Date(now.getFullYear(), 0, 1);
    const jul = new Date(now.getFullYear(), 6, 1);
    
    const janOffset = getOffsetAtDate(timezone, jan);
    const julOffset = getOffsetAtDate(timezone, jul);
    
    // ✅ FIX: If offsets are the same year-round, timezone doesn't observe DST
    if (janOffset === julOffset) {
      return false;
    }
    
    const nowOffset = getOffsetAtDate(timezone, now);
    const maxOffset = Math.max(janOffset, julOffset);
    return nowOffset === maxOffset;
  } catch (error) {
    const month = new Date().getMonth() + 1;
    return month >= 3 && month <= 10;
  }
}

/**
 * ✅ FIXED: Get current timezone abbreviation including DST
 * Example: America/New_York returns "EST" in winter, "EDT" in summer
 */
function getCurrentTimezoneAbbr(timezone) {
  try {
    const regionalMap = REGIONAL_ABBR_MAP[timezone];
    if (regionalMap) {
      const isDST = isCurrentlyDST(timezone);
      return isDST ? regionalMap.summer : regionalMap.winter;
    }
    
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    
    if (tzPart && tzPart.value) {
      return tzPart.value;
    }
    
    return TIMEZONE_ABBR[timezone] || timezone;
  } catch (error) {
    console.error(`[TIMEZONE] Error getting abbreviation for ${timezone}:`, error.message);
    return TIMEZONE_ABBR[timezone] || timezone;
  }
}

/**
 * ✅ FIXED: Get current UTC offset for a timezone in hours (handles DST automatically)
 * Example: America/New_York returns -5 in winter (EST), -4 in summer (EDT)
 */
function getCurrentTimezoneOffset(timezone) {
  try {
    const now = new Date();
    return getOffsetAtDate(timezone, now);
  } catch (error) {
    console.error(`[TIMEZONE] Error calculating offset for ${timezone}:`, error.message);
    const abbr = TIMEZONE_ABBR[timezone];
    if (abbr) {
      const staticOffsets = {
        'PST': -8, 'PDT': -7, 'MST': -7, 'MDT': -6,
        'CST': -6, 'CDT': -5, 'EST': -5, 'EDT': -4,
        'AST': -4, 'ADT': -3, 'NST': -3.5, 'NDT': -2.5,
        'AKST': -9, 'AKDT': -8, 'HST': -10,
        'UTC': 0, 'GMT': 0, 'WET': 0, 'WEST': 1,
        'CET': 1, 'CEST': 2, 'EET': 2, 'EEST': 3,
        'TRT': 3, 'MSK': 3, 'GST': 4, 'IST': 5.5,
        'ICT': 7, 'WIB': 7, 'SGT': 8, 'HKT': 8,
        'PHT': 8, 'MYT': 8, 'JST': 9, 'KST': 9,
        'AEST': 10, 'AEDT': 11, 'AWST': 8, 'NZDT': 13, 'NZST': 12
      };
      return staticOffsets[abbr] || 0;
    }
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════
// END TIMEZONE FIX
// ═══════════════════════════════════════════════════════════════════

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.client = null;
    this.spreadsheetId = config.sheets.id;
    
    this.lastSyncTime = 0;
    this.minSyncInterval = 30000;
    this.syncPending = false;
    this.syncTimeout = null;
    
    // ✅ SYNC LOCK - Prevent concurrent syncs
    this.isSyncing = false;
    this.syncQueue = [];
    
    // ✅ Cache for current sheet state (for diff comparison)
    this.cachedSheetData = null;
    this.cachedMetadata = null;
    
    const githubBaseUrl = 'https://raw.githubusercontent.com/ExoCode33/-BP-Heal-Guild-Helper/f0f9f7305c33cb299a202f115124248156acbf00/class-icons';
    
    this.classLogos = {
      'Beat Performer': `${githubBaseUrl}/BeatPerformer.png`,
      'Frost Mage': `${githubBaseUrl}/FrostMage.png`,
      'Heavy Guardian': `${githubBaseUrl}/HeavyGuardian.png`,
      'Marksman': `${githubBaseUrl}/Marksman.png`,
      'Shield Knight': `${githubBaseUrl}/ShieldKnight.png`,
      'Stormblade': `${githubBaseUrl}/StormBlade.png`,
      'Verdant Oracle': `${githubBaseUrl}/VerdantOracle.png`,
      'Wind Knight': `${githubBaseUrl}/WindKnight.png`
    };
  }

  async initialize() {
    console.log('🚀 [SHEETS] initialize() called');
    try {
      console.log('🔍 [SHEETS] Checking environment variables...');
      console.log(`  GOOGLE_SHEETS_ID: ${config.sheets.id ? '✅ Set' : '❌ Missing'}`);
      console.log(`  GOOGLE_SERVICE_ACCOUNT_EMAIL: ${config.sheets.email ? '✅ Set' : '❌ Missing'}`);
      console.log(`  GOOGLE_PRIVATE_KEY: ${config.sheets.key ? '✅ Set' : '❌ Missing'}`);
      
      if (!config.sheets.id || !config.sheets.email || !config.sheets.key) {
        console.log('⚠️  Google Sheets credentials not configured - skipping');
        return false;
      }

      console.log('🔧 [SHEETS] Creating Google Auth...');
      const privateKey = config.sheets.key?.replace(/\\n/g, '\n');

      this.auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: config.sheets.email,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      console.log('🔧 [SHEETS] Creating Sheets client...');
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('✅ Google Sheets API initialized successfully');
      
      return true;
    } catch (error) {
      console.error('⚠️  Google Sheets initialization failed:', error.message);
      console.error('🐛 Full error:', error);
      return false;
    }
  }

  getTimezoneAbbreviation(timezone) {
    return getCurrentTimezoneAbbr(timezone);
  }

  getTimezoneOffset(timezone) {
    return getCurrentTimezoneOffset(timezone);
  }

  getAbilityScoreColor(score) {
    if (!score || score === '') return null;
    
    const numScore = parseInt(score);
    
    // Vibrant progressive gradient: Green → Lime → Yellow → Orange → Red → Purple
    if (numScore >= 36000) return { red: 0.70, green: 0.25, blue: 0.85 }; // Vibrant purple (36k+)
    if (numScore >= 32000) return { red: 0.95, green: 0.25, blue: 0.30 }; // Vibrant red (32-36k)
    if (numScore >= 28000) return { red: 0.95, green: 0.50, blue: 0.15 }; // Vibrant orange (28-32k)
    if (numScore >= 24000) return { red: 0.95, green: 0.85, blue: 0.15 }; // Vibrant yellow (24-28k)
    if (numScore >= 20000) return { red: 0.65, green: 0.85, blue: 0.20 }; // Vibrant lime (20-24k)
    if (numScore >= 10000) return { red: 0.25, green: 0.75, blue: 0.30 }; // Vibrant green (10-20k)
    return { red: 0.55, green: 0.55, blue: 0.60 }; // Gray (<10k)
  }

  /**
   * Get cell background color based on local time (for Overview sheet)
   * Pastel green = Prime time (18:00-23:59, 00:00-01:59)
   * Pastel yellow = Less common (02:00-05:59, 12:00-13:59)
   * Pastel red = Off hours (06:00-11:59, 14:00-17:59)
   */
  getTimePeriodColor(hour) {
    // Prime gaming hours (6 PM - 2 AM)
    if ((hour >= 18 && hour <= 23) || (hour >= 0 && hour <= 1)) {
      return { red: 0.85, green: 0.95, blue: 0.85 }; // Pastel green
    }
    // Less common hours (2 AM - 6 AM, 12 PM - 2 PM)
    else if ((hour >= 2 && hour <= 5) || (hour >= 12 && hour <= 13)) {
      return { red: 0.98, green: 0.98, blue: 0.80 }; // Pastel yellow
    }
    // Off hours (6 AM - 12 PM, 2 PM - 6 PM)
    else {
      return { red: 0.98, green: 0.85, blue: 0.85 }; // Pastel red
    }
  }

  formatAbilityScore(score) {
    if (!score || score === '' || score === 0) return '';
    
    const numScore = parseInt(score);
    
    const scoreRanges = {
      10000: '≤10k',
      11000: '10-12k',
      13000: '12-14k',
      15000: '14-16k',
      17000: '16-18k',
      19000: '18-20k',
      21000: '20-22k',
      23000: '22-24k',
      25000: '24-26k',
      27000: '26-28k',
      29000: '28-30k',
      31000: '30-32k',
      33000: '32-34k',
      35000: '34-36k',
      37000: '36-38k',
      39000: '38-40k',
      41000: '40-42k',
      43000: '42-44k',
      45000: '44-46k',
      47000: '46-48k',
      49000: '48-50k',
      51000: '50-52k',
      53000: '52-54k',
      55000: '54-56k',
      57000: '56k+'
    };
    
    return scoreRanges[numScore] || numScore.toLocaleString();
  }

  getClassColor(className) {
    const classColors = {
      'Beat Performer': { red: 0.65, green: 0.30, blue: 0.80 }, // Vibrant purple
      'Frost Mage': { red: 0.30, green: 0.65, blue: 0.90 }, // Vibrant cyan
      'Heavy Guardian': { red: 0.50, green: 0.65, blue: 0.25 }, // Vibrant olive
      'Marksman': { red: 0.25, green: 0.75, blue: 0.35 }, // Vibrant GREEN
      'Shield Knight': { red: 0.25, green: 0.60, blue: 0.90 }, // Vibrant blue
      'Stormblade': { red: 0.75, green: 0.25, blue: 0.70 }, // Vibrant magenta
      'Verdant Oracle': { red: 0.90, green: 0.70, blue: 0.20 }, // Vibrant gold
      'Wind Knight': { red: 0.30, green: 0.80, blue: 0.95 } // Vibrant sky blue
    };
    return classColors[className] || { red: 0.50, green: 0.50, blue: 0.55 };
  }

  getRoleColor(role) {
    const roleColors = {
      'Tank': { red: 0.25, green: 0.60, blue: 0.95 }, // Vibrant blue
      'Support': { red: 0.25, green: 0.75, blue: 0.40 }, // Vibrant green
      'DPS': { red: 0.95, green: 0.30, blue: 0.35 } // Vibrant red
    };
    return roleColors[role] || { red: 0.50, green: 0.50, blue: 0.55 };
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // ✅ IMPROVED: SMART DIFF-BASED UPDATE SYSTEM
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Fetch current sheet data for comparison
   */
  async getCurrentSheetData(sheetName) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A2:M1000`,
      });

      return response.data.values || [];
    } catch (error) {
      console.log(`📋 [SHEETS] No existing data or error fetching from "${sheetName}":`, error.message);
      return [];
    }
  }

  /**
   * Parse ability score for sorting (returns numeric value)
   */
  parseAbilityScore(abilityScore) {
    if (!abilityScore) return 0;
    
    const str = String(abilityScore).trim();
    
    // Handle ranges like "24-26k" -> take the max value (26000)
    if (str.includes('-')) {
      const parts = str.split('-');
      const maxPart = parts[parts.length - 1];
      return this.parseAbilityScore(maxPart);
    }
    
    // Remove 'k' and convert to number
    const numStr = str.replace(/[k,\s]/gi, '');
    const num = parseFloat(numStr);
    
    // If it had 'k', multiply by 1000
    if (str.toLowerCase().includes('k')) {
      return num * 1000;
    }
    
    return num || 0;
  }

  /**
   * Compare two rows and return if they're different
   * ✅ IMPROVED: Smarter comparison that ignores formula columns
   */
  rowsAreDifferent(oldRow, newRow) {
    if (!oldRow || !newRow) return true;
    if (oldRow.length !== newRow.length) return true;
    
    // Compare all columns except timezone (column 11) which updates via formula
    // and column 4 (Icon/Image) which we handle separately
    for (let i = 0; i < newRow.length; i++) {
      if (i === 4 || i === 11) continue; // Skip icon and timezone columns
      
      const oldVal = String(oldRow[i] || '').trim();
      const newVal = String(newRow[i] || '').trim();
      
      if (oldVal !== newVal) return true;
    }
    
    return false;
  }

  /**
   * Calculate diff between old and new data
   */
  calculateDiff(oldData, newData) {
    const diff = {
      rowsToUpdate: [],
      rowsToDelete: [],
      rowsToAdd: [],
      unchanged: 0
    };

    for (let i = 0; i < Math.max(oldData.length, newData.length); i++) {
      const oldRow = oldData[i];
      const newRow = newData[i];

      if (!oldRow && newRow) {
        diff.rowsToAdd.push({ index: i, data: newRow });
      } else if (oldRow && !newRow) {
        diff.rowsToDelete.push(i);
      } else if (this.rowsAreDifferent(oldRow, newRow)) {
        diff.rowsToUpdate.push({ index: i, data: newRow });
      } else {
        diff.unchanged++;
      }
    }

    return diff;
  }

  // ═══════════════════════════════════════════════════════════════════
  // ✅ NEW: CLEAN BOTTOM BORDERS (FIX FOR SCREENSHOT ISSUE)
  // ═══════════════════════════════════════════════════════════════════

  async cleanBottomBorders(sheetId, lastDataRow, sheetName) {
    try {
      if (lastDataRow >= 999) {
        return; // Nothing to clean
      }

      // STEP 1: Clear all cell VALUES first (most important - removes the colored badges!)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A${lastDataRow + 2}:M1000`,
      });

      // STEP 2: Clear all formatting
      const requests = [];
      
      // Remove all borders
      requests.push({
        updateBorders: {
          range: {
            sheetId: sheetId,
            startRowIndex: lastDataRow + 1,
            endRowIndex: 1000,
            startColumnIndex: 0,
            endColumnIndex: 13
          },
          top: { style: 'NONE' },
          bottom: { style: 'NONE' },
          left: { style: 'NONE' },
          right: { style: 'NONE' },
          innerHorizontal: { style: 'NONE' },
          innerVertical: { style: 'NONE' }
        }
      });

      // Reset all cell formatting to default (white background, no colors, no text formatting)
      requests.push({
        repeatCell: {
          range: {
            sheetId: sheetId,
            startRowIndex: lastDataRow + 1,
            endRowIndex: 1000,
            startColumnIndex: 0,
            endColumnIndex: 13
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 1, green: 1, blue: 1 },
              textFormat: {
                foregroundColor: { red: 0, green: 0, blue: 0 },
                fontSize: 10,
                bold: false,
                italic: false,
                fontFamily: 'Arial'
              },
              horizontalAlignment: 'LEFT',
              verticalAlignment: 'BOTTOM',
              padding: {
                top: 2,
                bottom: 2,
                left: 3,
                right: 3
              }
            }
          },
          fields: 'userEnteredFormat'
        }
      });

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests }
      });
      
      // STEP 3: Add thick fuchsia pink bottom border on the last data row
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            updateBorders: {
              range: {
                sheetId: sheetId,
                startRowIndex: lastDataRow,
                endRowIndex: lastDataRow + 1,
                startColumnIndex: 0,
                endColumnIndex: 13
              },
              bottom: {
                style: 'SOLID_THICK',
                width: 3,
                color: { red: 0.87, green: 0.11, blue: 0.49 } // Fuchsia pink
              }
            }
          }]
        }
      });
      
      console.log(`   🧹 Cleaned rows ${lastDataRow + 2}-1000`);
    } catch (error) {
      console.error('   ❌ Cleanup error:', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════

  async syncMemberList(allCharactersWithSubclasses) {
    // ✅ SYNC LOCK - Prevent concurrent syncs
    if (this.isSyncing) {
      console.log('⏸️  [SHEETS] Sync already in progress - skipping duplicate call');
      return;
    }
    
    this.isSyncing = true;
    const syncStartTime = Date.now();
    
    console.log('🚀 [SHEETS] syncMemberList called');
    console.log(`📊 [SHEETS] Characters to sync: ${allCharactersWithSubclasses.length}`);
    
    if (!this.sheets) {
      console.error('❌ [SHEETS] Google Sheets API not initialized!');
      this.isSyncing = false;
      return;
    }

    try {
      // Define all sheets to sync with their filter functions
      const sheetsToSync = [
        {
          name: 'Total Members',
          filter: (char) => true // All members
        },
        {
          name: 'iDolls Members',
          filter: (char) => char.guild && char.guild.toLowerCase().includes('idoll') // iDolls (includes Alts, excludes Visitors)
        },
        {
          name: 'iDolls Alts',
          filter: (char) => char.guild && char.guild.toLowerCase().includes('idoll') && char.character_type === 'alt' // ✅ FIXED: Use character_type instead of isAlt
        },
        {
          name: 'Honored Guests',
          filter: (char) => char.guild && char.guild.toLowerCase().includes('visitor') // Visitors only
        },
        {
          name: 'iDolls Overview',
          filter: (char) => char.guild && char.guild.toLowerCase().includes('idoll'), // ✅ iDolls only (excludes visitors)
          isOverview: true // Special flag for overview sheet
        }
      ];

      // Sync each sheet with delays to avoid quota issues
      for (let i = 0; i < sheetsToSync.length; i++) {
        const sheetConfig = sheetsToSync[i];
        console.log(`\n📋 [SHEETS] Syncing "${sheetConfig.name}" (${i + 1}/${sheetsToSync.length})...`);
        const filteredCharacters = allCharactersWithSubclasses.filter(sheetConfig.filter);
        console.log(`   📊 Filtered to ${filteredCharacters.length} characters`);
        
        // Debug: Show details for iDolls Alts
        if (sheetConfig.name === 'iDolls Alts') {
          console.log(`   🔍 [DEBUG] Alt filter details:`);
          if (filteredCharacters.length === 0) {
            console.log(`   ❌ No alts found! Checking all characters...`);
            const allIdolls = allCharactersWithSubclasses.filter(c => c.guild && c.guild.toLowerCase().includes('idoll'));
            console.log(`   📊 Total iDolls characters: ${allIdolls.length}`);
            const byType = {};
            allIdolls.forEach(c => {
              const type = c.character_type || 'NULL';
              byType[type] = (byType[type] || 0) + 1;
            });
            console.log(`   📊 By type:`, byType);
          } else {
            filteredCharacters.forEach(char => {
              console.log(`   ✅ ${char.ign} (type: ${char.character_type}, guild: ${char.guild})`);
            });
          }
        }
        
        try {
          // Route to appropriate sync function
          if (sheetConfig.isOverview) {
            await this.syncOverviewSheet(sheetConfig.name, filteredCharacters);
          } else {
            await this.syncToSheet(sheetConfig.name, filteredCharacters);
          }
        } catch (error) {
          console.error(`❌ [SHEETS] Error syncing "${sheetConfig.name}":`, error.message);
          
          // If quota exceeded, wait longer before continuing
          if (error.message.includes('Quota exceeded')) {
            console.log(`   ⏸️  Quota exceeded - waiting 30 seconds before next sheet...`);
            await new Promise(resolve => setTimeout(resolve, 30000));
          }
        }
        
        // Add 5 second delay between sheets (increased from 3)
        if (i < sheetsToSync.length - 1) {
          console.log(`   ⏳ Waiting 5 seconds before next sheet...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      const syncDuration = ((Date.now() - syncStartTime) / 1000).toFixed(1);
      console.log(`\n✅ [SHEETS] All sheets synced successfully! (took ${syncDuration}s)`);
    } catch (error) {
      console.error('❌ [SHEETS] Error in syncMemberList:', error.message);
    } finally {
      // ✅ Always release lock
      this.isSyncing = false;
    }
  }

  async syncOverviewSheet(sheetName, characters) {
    try {
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      let targetSheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      
      // Create sheet if it doesn't exist, otherwise use existing
      if (!targetSheet) {
        console.log(`   📋 Creating new tab "${sheetName}"...`);
        const addSheetResponse = await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName,
                  gridProperties: {
                    rowCount: 50,
                    columnCount: 20
                  }
                }
              }
            }]
          }
        });
        
        const newSheetId = addSheetResponse.data.replies[0].addSheet.properties.sheetId;
        console.log(`   ✅ Created tab with ID: ${newSheetId}`);
        targetSheet = { properties: { sheetId: newSheetId, title: sheetName } };
      } else {
        console.log(`   ✅ Using existing tab "${sheetName}"`);
      }

      const sheetId = targetSheet.properties.sheetId;

      // ✅ STEP 1: Collect all unique timezones from UNIQUE USERS (not characters)
      const timezoneMap = new Map(); // timezone -> count
      const processedUsers = new Set(); // Track already processed users
      
      for (const char of characters) {
        // Skip if we already counted this user
        if (processedUsers.has(char.user_id)) {
          continue;
        }
        
        try {
          const userTimezone = await TimezoneRepo.get(char.user_id);
          if (userTimezone) {
            timezoneMap.set(userTimezone, (timezoneMap.get(userTimezone) || 0) + 1);
            processedUsers.add(char.user_id); // Mark user as counted
          }
        } catch (error) {
          // Skip if error
        }
      }

      // ✅ STEP 2: Sort timezones by member count (descending)
      const sortedTimezones = Array.from(timezoneMap.entries())
        .sort((a, b) => b[1] - a[1]) // Sort by count, highest first
        .map(([tz, count]) => ({ timezone: tz, count }));

      console.log(`   🌍 Found ${sortedTimezones.length} unique timezones`);

      // ✅ STEP 3: Build header row
      const headers = ['UTC Time'];
      sortedTimezones.forEach(({ timezone, count }) => {
        const abbr = this.getTimezoneAbbreviation(timezone);
        headers.push(`${abbr} (${count})`);
      });

      // ✅ STEP 4: Build time conversion rows (00:00 to 23:00)
      const rows = [];
      for (let utcHour = 0; utcHour < 24; utcHour++) {
        const row = [`${String(utcHour).padStart(2, '0')}:00`];
        
        sortedTimezones.forEach(({ timezone }) => {
          const offset = this.getTimezoneOffset(timezone);
          let localHour = utcHour + offset;
          
          // Handle day wraparound
          if (localHour < 0) localHour += 24;
          if (localHour >= 24) localHour -= 24;
          
          row.push(`${String(Math.floor(localHour)).padStart(2, '0')}:00`);
        });
        
        rows.push(row);
      }

      // ✅ STEP 5: Write all data to sheet
      const allData = [headers, ...rows];
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: allData,
        },
      });

      // ✅ STEP 6: Apply formatting (including time-based colors)
      await this.formatOverviewSheet(sheetName, sheetId, headers.length);

      // ✅ STEP 7: Apply time-based background colors to data cells
      console.log(`   🎨 Applying time-based colors...`);
      const colorRequests = [];

      for (let utcHour = 0; utcHour < 24; utcHour++) {
        const rowIndex = utcHour + 1; // +1 because row 0 is header
        
        // For each timezone column
        for (let colIndex = 0; colIndex < sortedTimezones.length; colIndex++) {
          const { timezone } = sortedTimezones[colIndex];
          const offset = this.getTimezoneOffset(timezone);
          let localHour = utcHour + offset;
          
          // Handle day wraparound
          if (localHour < 0) localHour += 24;
          if (localHour >= 24) localHour -= 24;
          
          // Get color based on local time
          const bgColor = this.getTimePeriodColor(Math.floor(localHour));
          
          colorRequests.push({
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: colIndex + 1, // +1 to skip UTC column
                endColumnIndex: colIndex + 2
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: bgColor,
                  textFormat: {
                    foregroundColor: {
                      red: 0.2,
                      green: 0.2,
                      blue: 0.2
                    },
                    fontSize: 10,
                    fontFamily: 'Montserrat'
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
            }
          });
        }
      }

      // Apply all color formatting in batches
      const batchSize = 100;
      for (let i = 0; i < colorRequests.length; i += batchSize) {
        const batch = colorRequests.slice(i, i + batchSize);
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: { requests: batch }
        });
        
        // Small delay to avoid quota
        if (i + batchSize < colorRequests.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`✅ [SHEETS] "${sheetName}" synced successfully`);

    } catch (error) {
      console.error('❌ [SHEETS] Overview sync error:', error.message);
      console.error('🐛 Full error:', error);
    }
  }

  async syncToSheet(sheetName, characters) {
    try {
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      let targetSheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      
      // Create sheet if it doesn't exist, otherwise use existing
      if (!targetSheet) {
        console.log(`   📋 Creating new tab "${sheetName}"...`);
        const addSheetResponse = await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName,
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 13
                  }
                }
              }
            }]
          }
        });
        
        const newSheetId = addSheetResponse.data.replies[0].addSheet.properties.sheetId;
        console.log(`   ✅ Created tab with ID: ${newSheetId}`);
        
        targetSheet = { properties: { sheetId: newSheetId, title: sheetName } };
      } else {
        console.log(`   ✅ Using existing tab "${sheetName}"`);
      }

      const sheetId = targetSheet.properties.sheetId;

      const headers = [
        'Discord Name',
        'IGN',
        'UID',
        'Type',
        'Icon',
        'Class',
        'Subclass',
        'Role',
        'Ability Score',
        'Battle Imagines',
        'Guild',
        'Timezone',
        'Registered'
      ];

      // ✅ Write headers if needed
      try {
        const currentHeaders = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A1:M1`,
        }).catch(() => ({ data: { values: [[]] } }));

        const existingHeaders = currentHeaders.data.values?.[0] || [];
        const headersMatch = JSON.stringify(existingHeaders) === JSON.stringify(headers);

        if (!headersMatch) {
          console.log('📝 [SHEETS] Writing/updating headers...');
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!A1:M1`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [headers] },
          });
        }
      } catch (error) {
        console.log('⚠️  [SHEETS] Could not verify headers:', error.message);
      }

      // ✅ Build new data
      const rows = [];
      const rowMetadata = [];

      // ✅ Helper: Infer role from class if role is missing
      const inferRole = (char) => {
        if (char.role) return char.role;
        
        // Infer role from class
        const supportClasses = ['Beat Performer', 'Verdant Oracle'];
        const tankClasses = ['Heavy Guardian', 'Shield Knight'];
        const dpsClasses = ['Frost Mage', 'Marksman', 'Stormblade', 'Wind Knight'];
        
        if (supportClasses.includes(char.class)) return 'Support';
        if (tankClasses.includes(char.class)) return 'Tank';
        if (dpsClasses.includes(char.class)) return 'DPS';
        
        return 'DPS'; // Default
      };

      // ✅ SORT ALL CHARACTERS INDEPENDENTLY: Role -> Ability Score -> IGN
      // This separates subclasses from mains if they have different roles
      const roleOrder = { 'Support': 1, 'Tank': 2, 'DPS': 3 };
      
      characters.sort((a, b) => {
        // 1. First sort by role (infer if missing)
        const roleA = roleOrder[inferRole(a)] || 999;
        const roleB = roleOrder[inferRole(b)] || 999;
        if (roleA !== roleB) return roleA - roleB;
        
        // 2. Then sort by ability score (descending - highest first)
        const scoreA = this.parseAbilityScore(a.ability_score);
        const scoreB = this.parseAbilityScore(b.ability_score);
        if (scoreA !== scoreB) return scoreB - scoreA;
        
        // 3. Finally sort by IGN alphabetically
        const ignA = (a.ign || '').toLowerCase();
        const ignB = (b.ign || '').toLowerCase();
        return ignA.localeCompare(ignB);
      });

      // ✅ Build rows in sorted order - each character is independent
      for (const char of characters) {
        const userId = char.user_id;
        
        // Get user info
        let userTimezone = '';
        try {
          userTimezone = await TimezoneRepo.get(userId) || '';
          
          // Debug: Log timezone fetching for alt characters
          if (char.character_type === 'alt') {
            console.log(`   🕐 [DEBUG] Alt "${char.ign}" - User: ${userId} - Timezone: ${userTimezone || 'NONE'}`);
          }
        } catch (error) {
          if (char.character_type === 'alt') {
            console.log(`   ⚠️  [DEBUG] Alt "${char.ign}" - Error fetching timezone: ${error.message}`);
          }
        }
        
        let discordName = userId;
        if (this.client) {
          try {
            const user = await this.client.users.fetch(userId);
            discordName = user.username;
          } catch (error) {
            // Silently continue
          }
        }
        
        // Determine character type
        const isMain = char.character_type === 'main';
        const isSubclass = char.character_type === 'main_subclass';
        const isAlt = char.character_type === 'alt';
        
        let typeLabel = 'Main';
        if (isSubclass) typeLabel = 'Subclass';
        if (isAlt) typeLabel = 'Alt';
        
        // ✅ Ensure role is set (infer from class if missing)
        const characterRole = inferRole(char);
        
        // Get battle imagines (only for mains and alts, not subclasses)
        let battleImaginesText = '';
        if (isMain || isAlt) {
          const battleImagines = await BattleImagineRepo.findByCharacter(char.id);
          battleImaginesText = battleImagines
            .map(img => `${img.imagine_name} ${img.tier}`)
            .join(', ');
        }
        
        // Add row
        rows.push([
          discordName,
          char.ign,
          char.uid || '',
          typeLabel,
          '', // Icon column - will be filled with formula
          char.class,
          char.subclass,
          characterRole, // ✅ Use inferred role
          this.formatAbilityScore(char.ability_score),
          battleImaginesText,
          char.guild || '',
          '', // Timezone column - will be filled with formula
          `'${this.formatDate(char.created_at)}`
        ]);

        rowMetadata.push({
          character: char,
          discordName: discordName,
          timezone: userTimezone,
          registeredDate: this.formatDate(char.created_at),
          isSubclass: isSubclass,
          isMain: isMain,
          isAlt: isAlt,
          isFirstOfUser: false, // We'll calculate this later if needed for borders
          inferredRole: characterRole // ✅ Store inferred role for border comparison
        });
      }

      // ✅ DIFF-BASED UPDATE
      const currentData = await this.getCurrentSheetData(sheetName);
      const diff = this.calculateDiff(currentData, rows);

      // Skip if no changes
      if (diff.rowsToUpdate.length === 0 && diff.rowsToAdd.length === 0 && diff.rowsToDelete.length === 0) {
        console.log(`   ⏭️  No changes - skipping`);
        return;
      }
      
      console.log(`   🔄 Changes: ${diff.rowsToUpdate.length} updated, ${diff.rowsToAdd.length} added, ${diff.rowsToDelete.length} deleted`);

      // Track if we need to reformat (only if data changed)
      let needsFormatting = false;

      // ✅ Handle deleted rows
      if (diff.rowsToDelete.length > 0) {
        const maxDeleteRow = Math.max(...diff.rowsToDelete);
        await this.sheets.spreadsheets.values.clear({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A${maxDeleteRow + 2}:M${currentData.length + 1}`,
        });
        needsFormatting = true;
      }

      // ✅ IMPROVED: Update rows WITHOUT touching icon/timezone columns
      if (diff.rowsToUpdate.length > 0) {
        const batchData = [];
        
        for (const update of diff.rowsToUpdate) {
          const rowNum = update.index + 2;
          
          // Update all columns EXCEPT E (icon) and L (timezone) - these stay untouched
          // Columns A-D
          batchData.push({
            range: `${sheetName}!A${rowNum}:D${rowNum}`,
            values: [update.data.slice(0, 4)]
          });
          
          // Columns F-K (skip E which is icon)
          batchData.push({
            range: `${sheetName}!F${rowNum}:K${rowNum}`,
            values: [update.data.slice(5, 11)]
          });
          
          // Column M (skip L which is timezone)
          batchData.push({
            range: `${sheetName}!M${rowNum}`,
            values: [[update.data[12]]]
          });
        }
        
        try {
          await this.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: {
              valueInputOption: 'USER_ENTERED',
              data: batchData
            }
          });
          needsFormatting = true;
        } catch (error) {
          console.error(`   ❌ Batch update error:`, error.message);
        }
      }

      // ✅ Handle new rows
      if (diff.rowsToAdd.length > 0) {
        const newRowsData = diff.rowsToAdd.map(r => r.data);
        const startRow = currentData.length + 2;
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A${startRow}`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: newRowsData,
          },
        });
        needsFormatting = true;
      }

      // ✅ CONDITIONAL FORMATTING: Only apply if data actually changed
      if (needsFormatting) {
        await this.formatCleanSheet(sheetName, headers.length, rows.length);
        await this.applyCleanDesign(sheetName, rowMetadata, sheetId);
        await this.addClassLogos(sheetName, rowMetadata, 2, sheetId);
        await this.enableAutoRecalculation();
        await this.cleanBottomBorders(sheetId, rows.length, sheetName);
      }

      console.log(`✅ [SHEETS] "${sheetName}" synced successfully`);

    } catch (error) {
      console.error('❌ [SHEETS] Sync error:', error.message);
      
      if (error.message.includes('not found')) {
        console.error('📋 [SHEETS] Spreadsheet not found. Check GOOGLE_SHEETS_ID in .env');
      } else if (error.message.includes('permission') || error.message.includes('forbidden') || error.code === 403) {
        console.error('🔒 [SHEETS] Permission denied!');
        console.error(`    ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
      } else {
        console.error('🐛 [SHEETS] Full error:', error);
      }
    }
  }

  async formatOverviewSheet(sheetName, sheetId, columnCount) {
    if (!this.sheets) return;

    try {
      const requests = [
        // Freeze first row and first column
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              gridProperties: {
                frozenRowCount: 1,
                frozenColumnCount: 1,
                hideGridlines: false
              },
              tabColor: {
                red: 0.87,
                green: 0.11,
                blue: 0.49
              } // Fuchsia pink tab
            },
            fields: 'gridProperties.frozenRowCount,gridProperties.frozenColumnCount,gridProperties.hideGridlines,tabColor'
          }
        },
        // Header row formatting
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: columnCount
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.87,
                  green: 0.11,
                  blue: 0.49
                }, // Fuchsia pink header
                textFormat: {
                  foregroundColor: {
                    red: 1,
                    green: 1,
                    blue: 1
                  },
                  fontSize: 11,
                  bold: true,
                  fontFamily: 'Montserrat'
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                padding: {
                  top: 12,
                  bottom: 12,
                  left: 8,
                  right: 8
                }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)'
          }
        },
        // UTC Time column (A) formatting - darker background
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              endRowIndex: 25,
              startColumnIndex: 0,
              endColumnIndex: 1
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.95,
                  green: 0.95,
                  blue: 0.95
                }, // Light gray for UTC column
                textFormat: {
                  foregroundColor: {
                    red: 0.2,
                    green: 0.2,
                    blue: 0.2
                  },
                  fontSize: 10,
                  bold: true,
                  fontFamily: 'Montserrat'
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        },
        // Borders for entire table
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 25,
              startColumnIndex: 0,
              endColumnIndex: columnCount
            },
            top: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.85, green: 0.85, blue: 0.87 }
            },
            bottom: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.85, green: 0.85, blue: 0.87 }
            },
            left: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.85, green: 0.85, blue: 0.87 }
            },
            right: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.85, green: 0.85, blue: 0.87 }
            },
            innerHorizontal: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.90, green: 0.90, blue: 0.92 }
            },
            innerVertical: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.90, green: 0.90, blue: 0.92 }
            }
          }
        },
        // Thick border after header row
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: columnCount
            },
            bottom: {
              style: 'SOLID_THICK',
              width: 3,
              color: { red: 0.87, green: 0.11, blue: 0.49 } // Fuchsia pink
            }
          }
        }
      ];

      // Set column widths
      for (let i = 0; i < columnCount; i++) {
        const width = i === 0 ? 100 : 110; // UTC column slightly narrower
        requests.push({
          updateDimensionProperties: {
            range: {
              sheetId: sheetId,
              dimension: 'COLUMNS',
              startIndex: i,
              endIndex: i + 1
            },
            properties: {
              pixelSize: width
            },
            fields: 'pixelSize'
          }
        });
      }

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests }
      });

      console.log(`   ✅ Overview formatting applied`);
    } catch (error) {
      console.error(`   ❌ Overview formatting error:`, error.message);
    }
  }

  async formatCleanSheet(sheetName, headerCount, dataRowCount) {
    if (!this.sheets) return;

    try {
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;

      const requests = [
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              gridProperties: {
                frozenRowCount: 1,
                hideGridlines: true
              },
              tabColor: {
                red: 0.87,
                green: 0.11,
                blue: 0.49
              } // Fuchsia pink tab
            },
            fields: 'gridProperties.frozenRowCount,gridProperties.hideGridlines,tabColor'
          }
        },
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: headerCount
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.87,
                  green: 0.11,
                  blue: 0.49
                }, // Fuchsia pink header
                textFormat: {
                  foregroundColor: {
                    red: 1,
                    green: 1,
                    blue: 1
                  },
                  fontSize: 11,
                  bold: true,
                  fontFamily: 'Montserrat'
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                padding: {
                  top: 14,
                  bottom: 14,
                  left: 10,
                  right: 10
                }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)'
          }
        },
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: headerCount
            },
            bottom: {
              style: 'SOLID_THICK',
              width: 3,
              color: { red: 0.87, green: 0.11, blue: 0.49 } // Fuchsia pink
            }
          }
        }
      ];

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests }
      });
    } catch (error) {
      console.error(`❌ [SHEETS] Error formatting ${sheetName}:`, error.message);
    }
  }

  async enableAutoRecalculation() {
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            updateSpreadsheetProperties: {
              properties: {
                iterativeCalculationSettings: {
                  maxIterations: 50,
                  convergenceThreshold: 0.05
                },
                autoRecalc: 'ON_CHANGE'
              },
              fields: 'iterativeCalculationSettings,autoRecalc'
            }
          }]
        }
      });
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * ✅ IMPROVED: Add class logos only for NEW rows to avoid flickering
   */
  // ═══════════════════════════════════════════════════════════════════
  
  /**
   * Check if current time is at an EXACT 5-minute interval (XX:00, XX:05, XX:10, etc.)
   * Only returns true within the first 15 seconds of the interval to avoid repeated updates
   */
  shouldUpdateTimezones() {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    // Only update if:
    // 1. Minutes are at 5-minute mark (0, 5, 10, 15, 20, etc.)
    // 2. Seconds are within first 15 seconds (to avoid multiple calls in same minute)
    return (minutes % 5 === 0) && (seconds <= 15);
  }
  
  /**
   * Get milliseconds until next 5-minute interval
   */
  getMillisecondsUntilNext5MinInterval() {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const milliseconds = now.getMilliseconds();
    
    // Calculate minutes until next 5-minute mark
    const minutesUntilNext = 5 - (minutes % 5);
    const secondsUntilNext = (minutesUntilNext * 60) - seconds;
    const msUntilNext = (secondsUntilNext * 1000) - milliseconds;
    
    return msUntilNext;
  }

  async addClassLogos(sheetName, rowMetadata, startRowIndex = 2, sheetId) {
    if (!this.sheets || rowMetadata.length === 0) return;

    try {
      const valueUpdates = [];
      
      console.log(`   🖼️  [SHEETS] Adding class icons and timezone formulas...`);
      
      for (let i = 0; i < rowMetadata.length; i++) {
        const rowIndex = startRowIndex + i;
        const meta = rowMetadata[i];
        const member = meta.character;
        
        const imageUrl = this.classLogos[member.class];
        
        if (imageUrl) {
          valueUpdates.push({
            range: `E${rowIndex}`,
            values: [[`=IMAGE("${imageUrl}",4,28,28)`]]
          });
        }

        // Always update timezone formulas (no 5-minute restriction)
        if (meta.timezone && meta.timezone !== '') {
          const abbrev = this.getTimezoneAbbreviation(meta.timezone);
          const offset = this.getTimezoneOffset(meta.timezone);
          
          const formula = `=CONCATENATE("${abbrev} ", TEXT(NOW() + (${offset}/24), "h:mm AM/PM"))`;
          
          valueUpdates.push({
            range: `L${rowIndex}`,
            values: [[formula]]
          });
        }
      }

      if (valueUpdates.length > 0) {
        const batchSize = 15; // REDUCED from 20 to avoid quota issues
        const totalBatches = Math.ceil(valueUpdates.length / batchSize);
        console.log(`   🖼️  Formulas: ${valueUpdates.length} updates → ${totalBatches} batches`);
        
        let successCount = 0;
        
        for (let i = 0; i < valueUpdates.length; i += batchSize) {
          const batch = valueUpdates.slice(i, i + batchSize);
          const batchNum = Math.floor(i / batchSize) + 1;
          
          const requests = batch.map(update => ({
            updateCells: {
              range: {
                sheetId: sheetId,
                startRowIndex: parseInt(update.range.match(/\d+/)[0]) - 1,
                endRowIndex: parseInt(update.range.match(/\d+/)[0]),
                startColumnIndex: update.range.charCodeAt(0) - 65,
                endColumnIndex: update.range.charCodeAt(0) - 64
              },
              rows: [{
                values: [{
                  userEnteredValue: { formulaValue: update.values[0][0] }
                }]
              }],
              fields: 'userEnteredValue'
            }
          }));
          
          try {
            await this.sheets.spreadsheets.batchUpdate({
              spreadsheetId: this.spreadsheetId,
              requestBody: { requests }
            });
            successCount++;
            
            // Longer delay between formula batches (2 seconds instead of 800ms)
            if (i + batchSize < valueUpdates.length) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } catch (error) {
            console.error(`   ❌ Formula batch ${batchNum} error:`, error.message);
            
            // If quota exceeded, wait much longer
            if (error.message.includes('Quota exceeded')) {
              console.log(`   ⏸️  Quota exceeded - waiting 10 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 10000));
            }
          }
        }
        
        console.log(`   ✅ Formulas complete: ${successCount}/${totalBatches} batches`);
      }

    } catch (error) {
      console.error('❌ [SHEETS] Error adding icons:', error.message);
    }
  }

  async applyCleanDesign(sheetName, rowMetadata, sheetId) {
    if (!this.sheets || rowMetadata.length === 0) return;

    try {
      const requests = [];
      const dropdownRequests = []; // Store dropdown validation requests separately

      // Column widths - EXTRA WIDE for Registered to prevent cutoff
      const columnWidths = [150, 140, 120, 125, 65, 180, 165, 120, 130, 210, 120, 240, 145]; // Timezone column increased to 240px
      columnWidths.forEach((width, index) => {
        requests.push({
          updateDimensionProperties: {
            range: {
              sheetId: sheetId,
              dimension: 'COLUMNS',
              startIndex: index,
              endIndex: index + 1
            },
            properties: {
              pixelSize: width
            },
            fields: 'pixelSize'
          }
        });
      });

      // Row heights - comfortable and readable
      for (let i = 0; i < rowMetadata.length; i++) {
        const meta = rowMetadata[i];
        const rowHeight = 34; // Slightly taller for readability
        
        requests.push({
          updateDimensionProperties: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: i + 1,
              endIndex: i + 2
            },
            properties: {
              pixelSize: rowHeight
            },
            fields: 'pixelSize'
          }
        });
      }

      let lastDiscordName = '';

      for (let i = 0; i < rowMetadata.length; i++) {
        const rowIndex = i + 1;
        const meta = rowMetadata[i];
        const member = meta.character;
        
        const isNewUserGroup = meta.discordName !== lastDiscordName && meta.discordName !== '';
        if (isNewUserGroup) {
          lastDiscordName = meta.discordName;
        }
        
        // All rows have white background (no alternating)
        const rowBg = { red: 1, green: 1, blue: 1 };
        
        // Apply white background to ENTIRE ROW
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 0,
              endColumnIndex: 13
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: rowBg
              }
            },
            fields: 'userEnteredFormat.backgroundColor'
          }
        });
        
        // Get type text
        const typeText = meta.isMain ? 'Main' : (meta.isAlt ? 'Alt' : 'Subclass');
        
        // Discord name - dark text
        this.addDropdownBadge(requests, dropdownRequests, sheetId, rowIndex, 0, { red: 0.25, green: 0.25, blue: 0.25 }, 'Discord', false, meta.discordName);

        // IGN - dark text
        this.addDropdownBadge(requests, dropdownRequests, sheetId, rowIndex, 1, { red: 0.25, green: 0.25, blue: 0.25 }, 'IGN', false, member.ign);

        // UID - dark text
        this.addDropdownBadge(requests, dropdownRequests, sheetId, rowIndex, 2, { red: 0.25, green: 0.25, blue: 0.25 }, 'UID', false, member.uid);

        // Type badge - Colored text
        let typeTextColor = { red: 0.55, green: 0.55, blue: 0.60 }; // Gray for Subclass
        if (meta.isMain) {
          typeTextColor = { red: 0.25, green: 0.60, blue: 0.95 }; // Blue for Main
        } else if (meta.isAlt) {
          typeTextColor = { red: 0.95, green: 0.50, blue: 0.15 }; // Orange for Alt
        }
        this.addDropdownBadge(requests, dropdownRequests, sheetId, rowIndex, 3, typeTextColor, 'Type', true, typeText);
        
        // Icon cell - dark text
        this.addDropdownBadge(requests, dropdownRequests, sheetId, rowIndex, 4, { red: 0.50, green: 0.50, blue: 0.50 }, 'Icon', false, '');
        
        // Class - Colored text
        const classColor = this.getClassColor(member.class);
        this.addDropdownBadge(requests, dropdownRequests, sheetId, rowIndex, 5, classColor, 'Class', true, member.class);
        
        // Subclass - Same color as class
        this.addDropdownBadge(requests, dropdownRequests, sheetId, rowIndex, 6, classColor, 'Subclass', true, member.subclass);
        
        // Role - Colored text
        const roleColor = this.getRoleColor(meta.inferredRole);
        this.addDropdownBadge(requests, dropdownRequests, sheetId, rowIndex, 7, roleColor, 'Role', true, meta.inferredRole);
        
        // Ability score - Colored text
        if (member.ability_score && member.ability_score !== '') {
          const abilityColor = this.getAbilityScoreColor(member.ability_score);
          this.addDropdownBadge(requests, dropdownRequests, sheetId, rowIndex, 8, abilityColor, 'AS', true, this.formatAbilityScore(member.ability_score));
        } else {
          this.addDropdownBadge(requests, dropdownRequests, sheetId, rowIndex, 8, { red: 0.50, green: 0.50, blue: 0.55 }, 'AS', false, '');
        }
        
        // Battle Imagines - dark text
        this.addDropdownBadge(requests, dropdownRequests, sheetId, rowIndex, 9, { red: 0.25, green: 0.25, blue: 0.25 }, 'BI', false, member.battle_imagines);
        
        // Guild - Colored text for iDolls/Visitor
        let guildTextColor = { red: 0.25, green: 0.25, blue: 0.25 }; // Default dark
        let isGuildColored = false;
        if (member.guild && member.guild.toLowerCase().includes('idoll')) {
          guildTextColor = { red: 0.95, green: 0.50, blue: 0.75 }; // Pink for iDolls
          isGuildColored = true;
        } else if (member.guild && member.guild.toLowerCase().includes('visitor')) {
          guildTextColor = { red: 0.60, green: 0.60, blue: 0.65 }; // Gray for Visitor
          isGuildColored = true;
        }
        this.addDropdownBadge(requests, dropdownRequests, sheetId, rowIndex, 10, guildTextColor, 'Guild', isGuildColored, member.guild);
        
        // Timezone - dark text
        this.addDropdownBadge(requests, dropdownRequests, sheetId, rowIndex, 11, { red: 0.25, green: 0.25, blue: 0.25 }, 'TZ', false, meta.timezone);
        
        // Registered Date - dark text
        this.addDropdownBadge(requests, dropdownRequests, sheetId, rowIndex, 12, { red: 0.25, green: 0.25, blue: 0.25 }, 'Date', false, member.registered);

        // Borders - standard borders for all rows
        requests.push({
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 0,
              endColumnIndex: 13
            },
            top: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.85, green: 0.85, blue: 0.87 }
            },
            bottom: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.85, green: 0.85, blue: 0.87 }
            },
            left: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.85, green: 0.85, blue: 0.87 }
            },
            right: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.85, green: 0.85, blue: 0.87 }
            }
          }
        });
        
        // Thick purple border when role changes (last row of each role section)
        const isLastOfRole = (i === rowMetadata.length - 1) || 
                             (i + 1 < rowMetadata.length && meta.inferredRole !== rowMetadata[i + 1].inferredRole);
        
        if (isLastOfRole) {
          requests.push({
            updateBorders: {
              range: {
                sheetId: sheetId,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: 0,
                endColumnIndex: 13
              },
              top: {
                style: 'SOLID',
                width: 1,
                color: { red: 0.85, green: 0.85, blue: 0.87 }
              },
              bottom: {
                style: 'SOLID_THICK',
                width: 3,
                color: { red: 0.87, green: 0.11, blue: 0.49 } // Fuchsia pink
              },
              left: {
                style: 'SOLID',
                width: 1,
                color: { red: 0.85, green: 0.85, blue: 0.87 }
              },
              right: {
                style: 'SOLID',
                width: 1,
                color: { red: 0.85, green: 0.85, blue: 0.87 }
              }
            }
          });
        }
      }

      if (requests.length > 0) {
        const batchSize = 50; // REDUCED from 100 to avoid quota issues
        const totalBatches = Math.ceil(requests.length / batchSize);
        console.log(`   📦 Formatting: ${requests.length} requests → ${totalBatches} batches`);
        
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 0; i < requests.length; i += batchSize) {
          const batch = requests.slice(i, i + batchSize);
          const batchNum = Math.floor(i / batchSize) + 1;
          
          try {
            await this.sheets.spreadsheets.batchUpdate({
              spreadsheetId: this.spreadsheetId,
              requestBody: { requests: batch }
            });
            successCount++;
            
            // Only log progress every 4 batches or on last batch
            if (batchNum % 4 === 0 || batchNum === totalBatches) {
              console.log(`   ⏳ Progress: ${batchNum}/${totalBatches} batches`);
            }
          } catch (error) {
            failCount++;
            console.error(`   ❌ Batch ${batchNum} failed:`, error.message);
            
            // If quota exceeded, wait even longer
            if (error.message.includes('Quota exceeded')) {
              console.log(`   ⏸️  Quota exceeded - waiting 10 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 10000));
            }
          }
          
          // Longer delays between batches to avoid quota (5 seconds instead of 2)
          if (i + batchSize < requests.length) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
        
        console.log(`   ✅ Formatting complete: ${successCount}/${totalBatches} batches succeeded`);
      }
      
      // Send dropdown validation requests separately
      if (dropdownRequests.length > 0) {
        try {
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: { requests: dropdownRequests }
          });
          console.log(`   ✅ Dropdowns: ${dropdownRequests.length} added`);
        } catch (error) {
          console.error(`   ❌ Dropdowns failed:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ [SHEETS] Design error:', error.message);
    }
  }


  addDropdownBadge(requests, dropdownRequests, sheetId, rowIndex, colIndex, textColor, label, isColored = false, cellValue = '') {
    // Simple: White background always, colored text if isColored=true, NO dropdowns
    const cellFormat = {
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: colIndex,
          endColumnIndex: colIndex + 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 1, green: 1, blue: 1 }, // WHITE background always
            textFormat: {
              bold: true,
              fontSize: 11, // SIZE 11
              foregroundColor: isColored ? textColor : { red: 0.25, green: 0.25, blue: 0.25 }, // Colored or dark text
              fontFamily: 'Montserrat' // MONTSERRAT font
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            padding: {
              top: 7,
              bottom: 7,
              left: 12,
              right: 12
            },
            wrapStrategy: 'OVERFLOW_CELL'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding,wrapStrategy)'
      }
    };
    requests.push(cellFormat);
    // NO dropdown validation ever
  }

  addPillBadge(requests, sheetId, rowIndex, colIndex, bgColor, isNumber = false) {
    const cellFormat = {
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: colIndex,
          endColumnIndex: colIndex + 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: bgColor,
            textFormat: {
              bold: true,
              fontSize: 11,
              foregroundColor: { red: 1, green: 1, blue: 1 },
              fontFamily: 'Montserrat'
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            padding: {
              top: 6,
              bottom: 6,
              left: 10,
              right: 10
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)'
      }
    };

    if (isNumber) {
      cellFormat.repeatCell.cell.userEnteredFormat.numberFormat = {
        type: 'NUMBER',
        pattern: '#,##0'
      };
      cellFormat.repeatCell.fields = 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding,numberFormat)';
    }

    requests.push(cellFormat);
  }

  addCleanTextCell(requests, sheetId, rowIndex, colIndex, value, rowBg) {
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: colIndex,
          endColumnIndex: colIndex + 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: rowBg,
            textFormat: {
              fontSize: 11,
              fontFamily: 'Montserrat',
              foregroundColor: { red: 0.20, green: 0.22, blue: 0.24 }
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat'
      }
    });
  }

  addColoredTextCell(requests, sheetId, rowIndex, colIndex, textColor, rowBg, isNumber = false) {
    const cellFormat = {
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: colIndex,
          endColumnIndex: colIndex + 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: rowBg,
            textFormat: {
              bold: true,
              fontSize: 11,
              fontFamily: 'Montserrat',
              foregroundColor: textColor
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    };

    if (isNumber) {
      cellFormat.repeatCell.cell.userEnteredFormat.numberFormat = {
        type: 'NUMBER',
        pattern: '#,##0'
      };
      cellFormat.repeatCell.fields = 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,numberFormat)';
    }

    requests.push(cellFormat);
  }

  addBoldTextCell(requests, sheetId, rowIndex, colIndex, rowBg) {
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: colIndex,
          endColumnIndex: colIndex + 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: rowBg,
            textFormat: {
              bold: true,
              fontSize: 11,
              fontFamily: 'Montserrat',
              foregroundColor: { red: 0.20, green: 0.22, blue: 0.24 }
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat'
      }
    });
  }

  addTimezoneCell(requests, sheetId, rowIndex, colIndex, timezone, rowBg) {
    requests.push({
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: colIndex,
          endColumnIndex: colIndex + 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: rowBg,
            textFormat: {
              bold: true,
              fontSize: 11,
              fontFamily: 'Montserrat',
              foregroundColor: { red: 0.38, green: 0.42, blue: 0.45 }
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            padding: {
              left: 12,
              right: 12
            }
          }
        },
        fields: 'userEnteredFormat'
      }
    });
  }

  async fullSync(allCharactersWithSubclasses) {
    // ✅ SYNC LOCK - Prevent concurrent syncs at this level too
    if (this.isSyncing) {
      console.log('⏸️  [SHEETS] Sync already in progress - skipping');
      return;
    }
    
    const now = Date.now();
    const timeSinceLastSync = now - this.lastSyncTime;
    
    if (timeSinceLastSync < this.minSyncInterval) {
      if (!this.syncPending) {
        this.syncPending = true;
        const waitTime = this.minSyncInterval - timeSinceLastSync;
        
        console.log(`⏸️  [SHEETS] Rate limited - sync delayed ${Math.round(waitTime/1000)}s`);
        
        if (this.syncTimeout) {
          clearTimeout(this.syncTimeout);
        }
        
        this.syncTimeout = setTimeout(async () => {
          this.syncPending = false;
          await this.performSync(allCharactersWithSubclasses);
        }, waitTime);
      }
      return;
    }
    
    await this.performSync(allCharactersWithSubclasses);
  }

  async performSync(allCharactersWithSubclasses) {
    const timestamp = new Date().toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    });
    console.log(`🔄 [SHEETS] Sync started (${allCharactersWithSubclasses.length} chars) - ${timestamp}`);
    
    try {
      this.lastSyncTime = Date.now();
      await this.syncMemberList(allCharactersWithSubclasses);
      console.log(`✅ [SHEETS] Sync complete - ${timestamp}`);
    } catch (error) {
      console.error(`❌ [SHEETS] Sync error:`, error.message);
      
      if (error.message.includes('Quota exceeded')) {
        this.minSyncInterval = Math.min(this.minSyncInterval * 2, 300000);
        console.log(`⚠️  [SHEETS] Quota exceeded - increased interval to ${this.minSyncInterval/1000}s`);
      }
    }
  }

  async syncAllCharacters(allCharactersWithSubclasses) {
    return await this.fullSync(allCharactersWithSubclasses);
  }

  async init(client) {
    this.client = client;
    const success = await this.initialize();
    if (!success) {
      console.log('⚠️  [SHEETS] Service not available');
    }
    return success;
  }
}

export default new GoogleSheetsService();
