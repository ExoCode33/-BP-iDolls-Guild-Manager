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
    
    // ✅ Cache for current sheet state (for diff comparison)
    this.cachedSheetData = null;
    
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
    
    if (numScore >= 40000) return { red: 0.61, green: 0.15, blue: 0.69 };
    if (numScore >= 30000) return { red: 0.96, green: 0.26, blue: 0.21 };
    if (numScore >= 20000) return { red: 0.97, green: 0.73, blue: 0.15 };
    if (numScore >= 10000) return { red: 0.30, green: 0.69, blue: 0.31 };
    return { red: 0.62, green: 0.64, blue: 0.66 };
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
      'Beat Performer': { red: 0.58, green: 0.29, blue: 0.82 },
      'Frost Mage': { red: 0.26, green: 0.71, blue: 0.89 },
      'Heavy Guardian': { red: 0.42, green: 0.56, blue: 0.14 },
      'Marksman': { red: 0.80, green: 0.47, blue: 0.13 },
      'Shield Knight': { red: 0.13, green: 0.59, blue: 0.95 },
      'Stormblade': { red: 0.61, green: 0.15, blue: 0.69 },
      'Verdant Oracle': { red: 0.98, green: 0.74, blue: 0.02 },
      'Wind Knight': { red: 0.40, green: 0.85, blue: 0.92 }
    };
    return classColors[className] || { red: 0.62, green: 0.64, blue: 0.66 };
  }

  getRoleColor(role) {
    const roleColors = {
      'Tank': { red: 0.25, green: 0.53, blue: 0.96 },
      'DPS': { red: 0.96, green: 0.26, blue: 0.21 },
      'Support': { red: 0.30, green: 0.69, blue: 0.31 }
    };
    return roleColors[role] || { red: 0.62, green: 0.64, blue: 0.66 };
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // ✅ NEW: DIFF-BASED UPDATE SYSTEM
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Fetch current sheet data for comparison
   */
  async getCurrentSheetData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Member List!A2:M1000', // Skip header row
      });

      return response.data.values || [];
    } catch (error) {
      console.log('📋 [SHEETS] No existing data or error fetching:', error.message);
      return [];
    }
  }

  /**
   * Compare two rows and return if they're different
   */
  rowsAreDifferent(oldRow, newRow) {
    if (!oldRow || !newRow) return true;
    if (oldRow.length !== newRow.length) return true;
    
    // Compare all columns except timezone (column 11) which updates via formula
    for (let i = 0; i < newRow.length; i++) {
      if (i === 11) continue; // Skip timezone column (auto-updates)
      
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

    // Check which rows changed
    for (let i = 0; i < Math.max(oldData.length, newData.length); i++) {
      const oldRow = oldData[i];
      const newRow = newData[i];

      if (!oldRow && newRow) {
        // New row added
        diff.rowsToAdd.push({ index: i, data: newRow });
      } else if (oldRow && !newRow) {
        // Row deleted
        diff.rowsToDelete.push(i);
      } else if (this.rowsAreDifferent(oldRow, newRow)) {
        // Row changed
        diff.rowsToUpdate.push({ index: i, data: newRow });
      } else {
        // Row unchanged
        diff.unchanged++;
      }
    }

    return diff;
  }

  // ═══════════════════════════════════════════════════════════════════

  async syncMemberList(allCharactersWithSubclasses) {
    console.log('🚀 [SHEETS] syncMemberList called');
    console.log(`📊 [SHEETS] Characters to sync: ${allCharactersWithSubclasses.length}`);
    
    if (!this.sheets) {
      console.error('❌ [SHEETS] Google Sheets API not initialized!');
      return;
    }

    try {
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      const memberListSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Member List');
      if (!memberListSheet) {
        console.error('❌ [SHEETS] "Member List" tab not found!');
        return;
      }

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

      // ✅ FIX 1: Write headers if needed
      try {
        const currentHeaders = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: 'Member List!A1:M1',
        }).catch(() => ({ data: { values: [[]] } }));

        const existingHeaders = currentHeaders.data.values?.[0] || [];
        const headersMatch = JSON.stringify(existingHeaders) === JSON.stringify(headers);

        if (!headersMatch) {
          console.log('📝 [SHEETS] Writing/updating headers...');
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Member List!A1:M1',
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

      const userGroups = {};
      allCharactersWithSubclasses.forEach(char => {
        if (!userGroups[char.user_id]) {
          userGroups[char.user_id] = [];
        }
        userGroups[char.user_id].push(char);
      });

      for (const [userId, userChars] of Object.entries(userGroups)) {
        const mainChar = userChars.find(c => c.character_type === 'main');
        const mainSubclasses = userChars.filter(c => c.character_type === 'main_subclass');
        const alts = userChars.filter(c => c.character_type === 'alt');
        
        let userTimezone = '';
        try {
          userTimezone = await TimezoneRepo.get(userId) || '';
        } catch (error) {
          // Silently continue
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
        
        if (mainChar) {
          const mainBattleImagines = await BattleImagineRepo.findByCharacter(mainChar.id);
          const mainBattleImaginesText = mainBattleImagines
            .map(img => `${img.imagine_name} ${img.tier}`)
            .join(', ');
          
          rows.push([
            discordName,
            mainChar.ign,
            mainChar.uid || '',
            'Main',
            '',
            mainChar.class,
            mainChar.subclass,
            mainChar.role,
            this.formatAbilityScore(mainChar.ability_score),
            mainBattleImaginesText,
            mainChar.guild || '',
            '',
            `'${this.formatDate(mainChar.created_at)}`
          ]);

          rowMetadata.push({
            character: mainChar,
            discordName: discordName,
            timezone: userTimezone,
            registeredDate: this.formatDate(mainChar.created_at),
            isSubclass: false,
            isMain: true,
            isAlt: false,
            isFirstOfUser: true
          });

          mainSubclasses.forEach(subclass => {
            rows.push([
              discordName,
              mainChar.ign,
              mainChar.uid || '',
              'Subclass',
              '',
              subclass.class,
              subclass.subclass,
              subclass.role,
              this.formatAbilityScore(subclass.ability_score),
              '',
              mainChar.guild || '',
              '',
              `'${this.formatDate(mainChar.created_at)}`
            ]);

            rowMetadata.push({
              character: subclass,
              discordName: discordName,
              timezone: userTimezone,
              registeredDate: this.formatDate(mainChar.created_at),
              parentIGN: mainChar.ign,
              parentClass: mainChar.class,
              isSubclass: true,
              isMain: false,
              isAlt: false,
              isFirstOfUser: false
            });
          });
        }

        for (const alt of alts) {
          const altBattleImagines = await BattleImagineRepo.findByCharacter(alt.id);
          const altBattleImaginesText = altBattleImagines
            .map(img => `${img.imagine_name} ${img.tier}`)
            .join(', ');
          
          rows.push([
            discordName,
            alt.ign,
            alt.uid || '',
            'Alt',
            '',
            alt.class,
            alt.subclass,
            alt.role,
            this.formatAbilityScore(alt.ability_score),
            altBattleImaginesText,
            alt.guild || '',
            '',
            `'${this.formatDate(alt.created_at)}`
          ]);

          rowMetadata.push({
            character: alt,
            discordName: discordName,
            timezone: userTimezone,
            registeredDate: this.formatDate(alt.created_at),
            isSubclass: false,
            isMain: false,
            isAlt: true,
            isFirstOfUser: false
          });

          const altSubclasses = userChars.filter(c => 
            c.character_type === 'alt_subclass' && 
            c.parent_character_id === alt.id
          );

          altSubclasses.forEach(subclass => {
            rows.push([
              discordName,
              alt.ign,
              alt.uid || '',
              'Subclass',
              '',
              subclass.class,
              subclass.subclass,
              subclass.role,
              this.formatAbilityScore(subclass.ability_score),
              '',
              alt.guild || '',
              '',
              `'${this.formatDate(alt.created_at)}`
            ]);

            rowMetadata.push({
              character: subclass,
              discordName: discordName,
              timezone: userTimezone,
              registeredDate: this.formatDate(alt.created_at),
              parentIGN: alt.ign,
              parentClass: alt.class,
              isSubclass: true,
              isMain: false,
              isAlt: false,
              isFirstOfUser: false
            });
          });
        }
      }

      // ✅ DIFF-BASED UPDATE: Compare with existing data
      console.log('🔍 [SHEETS] Fetching current sheet data for comparison...');
      const currentData = await this.getCurrentSheetData();
      const diff = this.calculateDiff(currentData, rows);

      console.log(`📊 [SHEETS] Diff analysis:`);
      console.log(`   ✅ Unchanged: ${diff.unchanged} rows`);
      console.log(`   🔄 To update: ${diff.rowsToUpdate.length} rows`);
      console.log(`   ➕ To add: ${diff.rowsToAdd.length} rows`);
      console.log(`   ➖ To delete: ${diff.rowsToDelete.length} rows`);
      
      // Calculate API calls saved
      const totalChanges = diff.rowsToUpdate.length + diff.rowsToAdd.length + diff.rowsToDelete.length;
      if (totalChanges > 0) {
        console.log(`   📉 API efficiency: ${totalChanges} changes → ~3 API calls (saved ${totalChanges - 3} calls!)`);
      }

      // ✅ If nothing changed, skip update
      if (diff.rowsToUpdate.length === 0 && diff.rowsToAdd.length === 0 && diff.rowsToDelete.length === 0) {
        console.log('⏭️  [SHEETS] No changes detected - skipping update (no flickering!)');
        return;
      }

      // ✅ Only update what changed
      const updateRequests = [];

      // Handle deleted rows (clear from end)
      if (diff.rowsToDelete.length > 0) {
        const maxDeleteRow = Math.max(...diff.rowsToDelete);
        console.log(`🗑️  [SHEETS] Clearing deleted rows starting from row ${maxDeleteRow + 2}...`);
        await this.sheets.spreadsheets.values.clear({
          spreadsheetId: this.spreadsheetId,
          range: `Member List!A${maxDeleteRow + 2}:M${currentData.length + 1}`,
        });
      }

      // Handle updated rows (batch them to avoid quota)
      if (diff.rowsToUpdate.length > 0) {
        console.log(`🔄 [SHEETS] Updating ${diff.rowsToUpdate.length} changed rows...`);
        
        // ✅ CRITICAL FIX: Skip column L (timezone) to preserve formulas!
        // Update columns A-K and M only, leaving L untouched
        const batchData = [];
        
        for (const update of diff.rowsToUpdate) {
          const rowNum = update.index + 2;
          
          // Columns A-K (indices 0-10): Discord Name through Guild
          const columnsAK = update.data.slice(0, 11);
          batchData.push({
            range: `Member List!A${rowNum}:K${rowNum}`,
            values: [columnsAK]
          });
          
          // Column M (index 12): Registered date
          // Skip index 11 (column L - timezone with formula)
          const columnM = [update.data[12]];
          batchData.push({
            range: `Member List!M${rowNum}`,
            values: [columnM]
          });
        }
        
        // Send all updates in one API call
        try {
          await this.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: {
              valueInputOption: 'USER_ENTERED',
              data: batchData
            }
          });
          console.log(`✅ [SHEETS] Batch updated ${diff.rowsToUpdate.length} rows (preserved timezone formulas)`);
        } catch (error) {
          console.error(`❌ [SHEETS] Batch update error:`, error.message);
        }
      }

      // Handle new rows
      if (diff.rowsToAdd.length > 0) {
        console.log(`➕ [SHEETS] Adding ${diff.rowsToAdd.length} new rows...`);
        const newRowsData = diff.rowsToAdd.map(r => r.data);
        const startRow = currentData.length + 2;
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `Member List!A${startRow}`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: newRowsData,
          },
        });
      }

      // ✅ QUOTA FIX: Only apply full formatting when necessary
      // (First sync, rows added/deleted, or major changes)
      const needsFullFormatting = diff.rowsToAdd.length > 0 || 
                                   diff.rowsToDelete.length > 0 ||
                                   currentData.length === 0;

      if (needsFullFormatting) {
        console.log(`🎨 [SHEETS] Applying formatting (${diff.rowsToAdd.length} added, ${diff.rowsToDelete.length} deleted)...`);
        await this.formatCleanSheet('Member List', headers.length, rows.length);
        await this.applyCleanDesign('Member List', rowMetadata);
        await this.addClassLogos('Member List', rowMetadata);
        await this.enableAutoRecalculation();
      } else {
        console.log(`⏭️  [SHEETS] Skipping formatting (only data updated, formatting preserved)`);
      }

      console.log(`✅ [SHEETS] Sync complete (smooth, no flickering!)`);

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
                red: 0.32,
                green: 0.20,
                blue: 0.58
              }
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
                  red: 0.32,
                  green: 0.20,
                  blue: 0.58
                },
                textFormat: {
                  foregroundColor: {
                    red: 1,
                    green: 1,
                    blue: 1
                  },
                  fontSize: 11,
                  bold: true,
                  fontFamily: 'Google Sans'
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                padding: {
                  top: 16,
                  bottom: 16,
                  left: 14,
                  right: 14
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
              width: 4,
              color: { red: 0.22, green: 0.14, blue: 0.42 }
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

  async addClassLogos(sheetName, rowMetadata) {
    if (!this.sheets || rowMetadata.length === 0) return;

    try {
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;
      const valueUpdates = [];
      
      for (let i = 0; i < rowMetadata.length; i++) {
        const rowIndex = i + 2;
        const meta = rowMetadata[i];
        const member = meta.character;
        
        const imageUrl = this.classLogos[member.class];
        
        if (imageUrl) {
          valueUpdates.push({
            range: `E${rowIndex}`,
            values: [[`=IMAGE("${imageUrl}",4,28,28)`]]
          });
        }

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
        const batchSize = 10;
        for (let i = 0; i < valueUpdates.length; i += batchSize) {
          const batch = valueUpdates.slice(i, i + batchSize);
          
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
            
            if (i + batchSize < valueUpdates.length) {
              await new Promise(resolve => setTimeout(resolve, 500));  // ✅ Increased from 300ms
            }
          } catch (error) {
            if (error.message && error.message.includes('Quota exceeded')) {
              console.log(`   ⚠️  Quota hit in addClassLogos, waiting 3 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 3000));
              // Retry once
              try {
                await this.sheets.spreadsheets.batchUpdate({
                  spreadsheetId: this.spreadsheetId,
                  requestBody: { requests }
                });
              } catch (retryError) {
                console.error(`   ❌ addClassLogos retry failed:`, retryError.message);
                // Continue to next batch anyway
              }
            }
            // Continue even if error (logos/formulas not critical)
          }
        }
      }

    } catch (error) {
      console.error('❌ [SHEETS] Error adding icons:', error.message);
    }
  }

  async applyCleanDesign(sheetName, rowMetadata) {
    if (!this.sheets || rowMetadata.length === 0) return;

    try {
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;
      const requests = [];

      // ✅ FIX 2: Removed header merge - Type and Icon should be separate columns
      
      const columnWidths = [160, 150, 100, 95, 50, 180, 145, 85, 125, 200, 105, 170, 105];
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

      for (let i = 0; i < rowMetadata.length; i++) {
        const meta = rowMetadata[i];
        const rowHeight = meta.isSubclass ? 34 : 38;
        
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
        
        // ✅ UPDATED: Medium grey for subclasses (0.92, 0.92, 0.93)
        const rowBg = meta.isAlt
          ? { red: 0.96, green: 0.96, blue: 0.96 }
          : meta.isSubclass 
          ? { red: 0.92, green: 0.92, blue: 0.93 } // ✅ Medium grey - more visible!
          : { red: 1, green: 1, blue: 1 };
        
        // ✅ FIX 3: Apply background to ENTIRE ROW first (ensures grey shows)
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 0,
              endColumnIndex: 13  // All columns A-M
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: rowBg
              }
            },
            fields: 'userEnteredFormat.backgroundColor'
          }
        });
        
        const discordColor = meta.isSubclass 
          ? { red: 0.50, green: 0.52, blue: 0.55 }
          : { red: 0.10, green: 0.11, blue: 0.13 };
        
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 0,
              endColumnIndex: 1
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: rowBg,
                textFormat: {
                  fontSize: 10,
                  fontFamily: 'Google Sans',
                  foregroundColor: discordColor,
                  bold: true
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                padding: {
                  left: 14,
                  right: 10
                }
              }
            },
            fields: 'userEnteredFormat'
          }
        });

        const ignColor = meta.isSubclass 
          ? { red: 0.50, green: 0.52, blue: 0.55 }
          : { red: 0.10, green: 0.11, blue: 0.13 };
        
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 1,
              endColumnIndex: 2
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: rowBg,
                textFormat: {
                  fontSize: 10,
                  fontFamily: 'Google Sans',
                  foregroundColor: ignColor,
                  bold: true,
                  italic: meta.isSubclass
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                padding: {
                  left: 14,
                  right: 10
                }
              }
            },
            fields: 'userEnteredFormat'
          }
        });

        const uidColor = meta.isSubclass 
          ? { red: 0.50, green: 0.52, blue: 0.55 }
          : { red: 0.10, green: 0.11, blue: 0.13 };
        
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 2,
              endColumnIndex: 3
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: rowBg,
                textFormat: {
                  fontSize: 10,
                  fontFamily: 'Google Sans',
                  foregroundColor: uidColor,
                  bold: true,
                  italic: meta.isSubclass
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                padding: {
                  left: 14,
                  right: 10
                }
              }
            },
            fields: 'userEnteredFormat'
          }
        });

        if (meta.isMain) {
          this.addPillBadge(requests, sheetId, rowIndex, 3, { red: 0.26, green: 0.59, blue: 0.98 });
        } else if (meta.isAlt) {
          this.addPillBadge(requests, sheetId, rowIndex, 3, { red: 0.96, green: 0.49, blue: 0.13 });
        } else {
          this.addCleanTextCell(requests, sheetId, rowIndex, 3, 'Subclass', rowBg);
        }
        
        this.addCleanTextCell(requests, sheetId, rowIndex, 4, '', rowBg);
        
        const classColor = this.getClassColor(member.class);
        this.addColoredTextCell(requests, sheetId, rowIndex, 5, classColor, rowBg);
        this.addColoredTextCell(requests, sheetId, rowIndex, 6, classColor, rowBg);
        
        const roleColor = this.getRoleColor(member.role);
        this.addPillBadge(requests, sheetId, rowIndex, 7, roleColor);
        
        if (member.ability_score && member.ability_score !== '') {
          const abilityColor = this.getAbilityScoreColor(member.ability_score);
          this.addColoredTextCell(requests, sheetId, rowIndex, 8, abilityColor, rowBg, true);
        } else {
          this.addCleanTextCell(requests, sheetId, rowIndex, 8, '', rowBg);
        }
        
        this.addBoldTextCell(requests, sheetId, rowIndex, 9, rowBg);
        this.addBoldTextCell(requests, sheetId, rowIndex, 10, rowBg);
        this.addTimezoneCell(requests, sheetId, rowIndex, 11, meta.timezone, rowBg);
        this.addBoldTextCell(requests, sheetId, rowIndex, 12, rowBg);

        const isLastOfGroup = (i === rowMetadata.length - 1) || 
                              (i + 1 < rowMetadata.length && rowMetadata[i + 1].isFirstOfUser);
        
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
            },
            innerHorizontal: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.85, green: 0.85, blue: 0.87 }
            },
            innerVertical: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.85, green: 0.85, blue: 0.87 }
            }
          }
        });
        
        if (isLastOfGroup) {
          requests.push({
            updateBorders: {
              range: {
                sheetId: sheetId,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: 0,
                endColumnIndex: 13
              },
              bottom: {
                style: 'SOLID_THICK',
                width: 3,
                color: { red: 0.32, green: 0.20, blue: 0.58 }
              }
            }
          });
        }
      }

      if (requests.length > 0) {
        const batchSize = 50;  // ✅ Reduced from 100 to 50 (more conservative)
        console.log(`   📦 Sending ${requests.length} formatting requests in ${Math.ceil(requests.length / batchSize)} batches...`);
        
        for (let i = 0; i < requests.length; i += batchSize) {
          const batch = requests.slice(i, i + batchSize);
          const batchNum = Math.floor(i / batchSize) + 1;
          const totalBatches = Math.ceil(requests.length / batchSize);
          
          try {
            await this.sheets.spreadsheets.batchUpdate({
              spreadsheetId: this.spreadsheetId,
              requestBody: { requests: batch }
            });
            console.log(`   ✅ Batch ${batchNum}/${totalBatches} complete (${batch.length} requests)`);
          } catch (error) {
            if (error.message.includes('Quota exceeded')) {
              console.log(`   ⚠️  Quota hit on batch ${batchNum}, waiting 5 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 5000));
              // Retry once
              try {
                await this.sheets.spreadsheets.batchUpdate({
                  spreadsheetId: this.spreadsheetId,
                  requestBody: { requests: batch }
                });
                console.log(`   ✅ Batch ${batchNum}/${totalBatches} complete after retry`);
              } catch (retryError) {
                console.error(`   ❌ Batch ${batchNum} failed even after retry:`, retryError.message);
                throw retryError; // Re-throw to stop further batches
              }
            } else {
              throw error;
            }
          }
          
          // ✅ Increased delay from 200ms to 1000ms (1 second)
          if (i + batchSize < requests.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    } catch (error) {
      console.error('❌ [SHEETS] Design error:', error.message);
    }
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
              fontSize: 10,
              foregroundColor: { red: 1, green: 1, blue: 1 },
              fontFamily: 'Google Sans'
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
              fontSize: 10,
              fontFamily: 'Google Sans',
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
              fontSize: 10,
              fontFamily: 'Google Sans',
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
              fontSize: 10,
              fontFamily: 'Google Sans',
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
              fontSize: 9,
              fontFamily: 'Google Sans',
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

  async init() {
    return await this.initialize();
  }

  async sync(characters, client) {
    this.client = client;
    return await this.fullSync(characters);
  }
}

export default new GoogleSheetsService();
