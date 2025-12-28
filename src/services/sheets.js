import { google } from 'googleapis';
import dotenv from 'dotenv';
import db from './database.js';

dotenv.config();

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    // Rate limiting
    this.lastSyncTime = 0;
    this.minSyncInterval = 30000; // 30 seconds minimum between syncs
    this.syncPending = false;
    this.syncTimeout = null;
    
    // Class logo URLs
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
      console.log(`  GOOGLE_SHEETS_ID: ${process.env.GOOGLE_SHEETS_ID ? '✅ Set' : '❌ Missing'}`);
      console.log(`  GOOGLE_SERVICE_ACCOUNT_EMAIL: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? '✅ Set' : '❌ Missing'}`);
      console.log(`  GOOGLE_PRIVATE_KEY: ${process.env.GOOGLE_PRIVATE_KEY ? '✅ Set' : '❌ Missing'}`);
      
      if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        console.log('⚠️  Google Sheets credentials not configured - skipping');
        return false;
      }

      console.log('🔧 [SHEETS] Creating Google Auth...');
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      this.auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
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

  // ✅ NEW: Timezone abbreviation mapping
  getTimezoneAbbreviation(timezone) {
    const abbreviations = {
      'America/New_York': 'EST',
      'America/Chicago': 'CST',
      'America/Denver': 'MST',
      'America/Los_Angeles': 'PST',
      'America/Phoenix': 'MST',
      'America/Anchorage': 'AKST',
      'Pacific/Honolulu': 'HST',
      'America/Toronto': 'EST',
      'America/Vancouver': 'PST',
      'America/Halifax': 'AST',
      'America/St_Johns': 'NST',
      'America/Edmonton': 'MST',
      'America/Winnipeg': 'CST',
      'Europe/London': 'GMT',
      'Europe/Paris': 'CET',
      'Europe/Berlin': 'CET',
      'Europe/Rome': 'CET',
      'Europe/Madrid': 'CET',
      'Europe/Amsterdam': 'CET',
      'Europe/Brussels': 'CET',
      'Europe/Vienna': 'CET',
      'Europe/Stockholm': 'CET',
      'Europe/Oslo': 'CET',
      'Europe/Copenhagen': 'CET',
      'Europe/Helsinki': 'EET',
      'Europe/Athens': 'EET',
      'Europe/Istanbul': 'TRT',
      'Europe/Moscow': 'MSK',
      'Europe/Zurich': 'CET',
      'Europe/Dublin': 'GMT',
      'Europe/Lisbon': 'WET',
      'Europe/Warsaw': 'CET',
      'Asia/Tokyo': 'JST',
      'Asia/Seoul': 'KST',
      'Asia/Shanghai': 'CST',
      'Asia/Hong_Kong': 'HKT',
      'Asia/Singapore': 'SGT',
      'Asia/Dubai': 'GST',
      'Asia/Kolkata': 'IST',
      'Asia/Bangkok': 'ICT',
      'Asia/Manila': 'PHT',
      'Asia/Jakarta': 'WIB',
      'Asia/Taipei': 'CST',
      'Asia/Kuala_Lumpur': 'MYT',
      'Australia/Sydney': 'AEDT',
      'Australia/Melbourne': 'AEDT',
      'Australia/Brisbane': 'AEST',
      'Australia/Perth': 'AWST',
      'Pacific/Auckland': 'NZDT',
    };
    return abbreviations[timezone] || timezone;
  }

  // ✅ UPDATED: Timezone offset with abbreviation support
  getTimezoneOffset(timezone) {
    const abbrev = this.getTimezoneAbbreviation(timezone);
    
    const timezoneOffsets = {
      'PST': -8, 'PDT': -7,
      'MST': -7, 'MDT': -6,
      'CST': -6, 'CDT': -5,
      'EST': -5, 'EDT': -4,
      'AST': -4, 'ADT': -3,
      'NST': -3.5, 'NDT': -2.5,
      'AKST': -9, 'AKDT': -8,
      'HST': -10,
      'UTC': 0, 'GMT': 0,
      'WET': 0, 'WEST': 1,
      'CET': 1, 'CEST': 2,
      'EET': 2, 'EEST': 3,
      'TRT': 3, 'MSK': 3,
      'GST': 4, 'IST': 5.5,
      'ICT': 7, 'WIB': 7,
      'SGT': 8, 'HKT': 8,
      'PHT': 8, 'MYT': 8,
      'JST': 9, 'KST': 9,
      'AEST': 10, 'AEDT': 11,
      'AWST': 8, 'NZDT': 13,
      'NZST': 12,
    };
    
    return timezoneOffsets[abbrev] || 0;
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

  // ✅ Convert stored ability score number back to the range label they selected
  formatAbilityScore(score) {
    if (!score || score === '' || score === 0) return '';
    
    const numScore = parseInt(score);
    
    // Map stored values to display labels (must match character.js options)
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

  async syncMemberList(allCharactersWithSubclasses) {
    console.log('🚀 [SHEETS] syncMemberList called');
    console.log(`📊 [SHEETS] Characters to sync: ${allCharactersWithSubclasses.length}`);
    console.log(`🔧 [SHEETS] this.sheets initialized: ${!!this.sheets}`);
    console.log(`🔧 [SHEETS] spreadsheetId: ${this.spreadsheetId}`);
    
    if (!this.sheets) {
      console.error('❌ [SHEETS] Google Sheets API not initialized!');
      console.error('➡️  Check that initialize() was called on startup');
      console.error('➡️  Verify GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY in .env');
      return;
    }

    try {
      // ✅ NEW: Verify spreadsheet access and tab existence
      console.log(`🔍 [SHEETS] Checking spreadsheet: ${this.spreadsheetId}`);
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      console.log(`📋 [SHEETS] Spreadsheet found: "${spreadsheet.data.properties.title}"`);
      
      const sheetNames = spreadsheet.data.sheets.map(s => s.properties.title);
      console.log(`📑 [SHEETS] Available tabs:`, sheetNames);
      
      const memberListSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Member List');
      if (!memberListSheet) {
        console.error('❌ [SHEETS] ERROR: "Member List" tab not found!');
        console.error('📋 [SHEETS] Please create a tab named "Member List" (case-sensitive)');
        return;
      }
      console.log('✅ [SHEETS] "Member List" tab found');
      
      // ✅ UPDATED: Add Battle Imagines column header
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
        'Battle Imagines', // ✅ NEW COLUMN
        'Guild',
        'Timezone',
        'Registered'
      ];

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
          userTimezone = await db.getUserTimezone(userId) || '';
        } catch (error) {
          // Silently continue
        }
        
        // ✅ Get Discord username from enriched character data
        let discordName = userId; // Fallback to user ID
        
        if (mainChar) {
          // Use discord_name from enriched data, fallback to userId
          discordName = mainChar.discord_name || userId;
          
          // ✅ UPDATED: Format timezone - we'll add the time via formula later
          const timezoneAbbrev = userTimezone ? this.getTimezoneAbbreviation(userTimezone) : '';
          
          // ✅ NEW: Get Battle Imagines for main character
          const mainBattleImagines = await db.getBattleImagines(mainChar.id);
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
            mainBattleImaginesText, // ✅ NEW
            mainChar.guild || '',
            '', // Empty - will be filled by formula
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
              '', // ✅ Subclasses don't have Battle Imagines
              mainChar.guild || '',
              '', // Empty - will be filled by formula
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
          // Use alt's discord_name if available (fallback to already-set discordName from main)
          const altDiscordName = alt.discord_name || discordName;
          
          // ✅ NEW: Get Battle Imagines for alt
          const altBattleImagines = await db.getBattleImagines(alt.id);
          const altBattleImaginesText = altBattleImagines
            .map(img => `${img.imagine_name} ${img.tier}`)
            .join(', ');
          
          rows.push([
            altDiscordName,
            alt.ign,
            alt.uid || '',
            'Alt',
            '',
            alt.class,
            alt.subclass,
            alt.role,
            this.formatAbilityScore(alt.ability_score),
            altBattleImaginesText, // ✅ NEW
            alt.guild || '',
            '', // Empty - will be filled by formula
            `'${this.formatDate(alt.created_at)}`
          ]);

          rowMetadata.push({
            character: alt,
            discordName: altDiscordName,
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
              altDiscordName,
              alt.ign,
              alt.uid || '',
              'Subclass',
              '',
              subclass.class,
              subclass.subclass,
              subclass.role,
              this.formatAbilityScore(subclass.ability_score),
              '', // ✅ Subclasses don't have Battle Imagines
              alt.guild || '',
              '', // Empty - will be filled by formula
              `'${this.formatDate(alt.created_at)}`
            ]);

            rowMetadata.push({
              character: subclass,
              discordName: altDiscordName,
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

      // ✅ UPDATED: Clear ALL data AND formatting before writing
      console.log('🗑️  [SHEETS] Clearing existing data from Member List...');
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Member List!A1:Z1000',
      });
      
      // ✅ NEW: Clear all formatting to prevent broken layout after deletions
      console.log('🧹 [SHEETS] Clearing all formatting...');
      await this.clearAllFormatting('Member List');

      console.log('📝 [SHEETS] Writing fresh data to Member List...');
      console.log(`📊 [SHEETS] Headers: ${headers.length} columns`);
      console.log(`📊 [SHEETS] Data rows: ${rows.length} rows`);
      console.log(`📊 [SHEETS] First row sample:`, rows[0]);
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Member List!A1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [headers, ...rows],
        },
      });
      
      console.log('✅ [SHEETS] Data written successfully');

      await this.formatCleanSheet('Member List', headers.length, rows.length);
      await this.applyCleanDesign('Member List', rowMetadata);
      await this.addClassLogos('Member List', rowMetadata);
      await this.enableAutoRecalculation();

      console.log(`✅ [SHEETS] Synced ${rows.length} rows successfully`);

    } catch (error) {
      console.error('❌ [SHEETS] Sync error:', error.message);
      
      // Check for specific error types
      if (error.message.includes('not found')) {
        console.error('📋 [SHEETS] Spreadsheet not found. Check GOOGLE_SHEETS_ID in .env');
      } else if (error.message.includes('permission') || error.message.includes('forbidden') || error.code === 403) {
        console.error('🔒 [SHEETS] Permission denied!');
        console.error('➡️  Add this email to your sheet with Editor access:');
        console.error(`    ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
      } else if (error.message.includes('Quota exceeded')) {
        this.minSyncInterval = Math.min(this.minSyncInterval * 2, 300000);
        console.log(`⚠️  [SHEETS] Quota exceeded - increased interval to ${this.minSyncInterval/1000}s`);
      } else {
        console.error('🐛 [SHEETS] Full error:', error);
      }
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
      console.log('✅ [SHEETS] Auto-recalculation enabled (ON_CHANGE)');
    } catch (error) {
      console.error('⚠️  [SHEETS] Auto-recalc setting failed:', error.message);
    }
  }

  async clearAllFormatting(sheetName) {
    if (!this.sheets) return;

    try {
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              updateCells: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1000,
                  startColumnIndex: 0,
                  endColumnIndex: 26
                },
                fields: 'userEnteredFormat'
              }
            },
            {
              updateBorders: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1000,
                  startColumnIndex: 0,
                  endColumnIndex: 26
                },
                top: { style: 'NONE' },
                bottom: { style: 'NONE' },
                left: { style: 'NONE' },
                right: { style: 'NONE' },
                innerHorizontal: { style: 'NONE' },
                innerVertical: { style: 'NONE' }
              }
            }
          ]
        }
      });
    } catch (error) {
      console.error('⚠️  [SHEETS] Error clearing formatting:', error.message);
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
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
          const offset = this.getTimezoneOffset(meta.timezone);
          const abbrev = this.getTimezoneAbbreviation(meta.timezone);
          
          const spreadsheetOffset = -7;
          const adjustedOffset = offset - spreadsheetOffset;
          
          const formula = `=CONCATENATE("${abbrev} ", TEXT(NOW() + (${adjustedOffset}/24), "h:mm AM/PM"))`;
          
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
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          } catch (error) {
            // Silently continue
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

      requests.push({
        mergeCells: {
          range: {
            sheetId: sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 3,
            endColumnIndex: 5
          },
          mergeType: 'MERGE_ALL'
        }
      });
      
      requests.push({
        updateCells: {
          range: {
            sheetId: sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 3,
            endColumnIndex: 4
          },
          rows: [{
            values: [{
              userEnteredValue: { stringValue: 'Class' },
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
            }]
          }],
          fields: 'userEnteredValue,userEnteredFormat'
        }
      });
      
      // ✅ UPDATED: Add Battle Imagines column width
      const columnWidths = [160, 150, 100, 95, 50, 180, 145, 85, 125, 200, 105, 170, 105];
      //                                                                  ^^^ NEW: 200px for Battle Imagines
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
        
        const rowBg = meta.isAlt
          ? { red: 0.96, green: 0.96, blue: 0.96 }
          : meta.isSubclass 
          ? { red: 0.98, green: 0.98, blue: 0.99 }
          : { red: 1, green: 1, blue: 1 };
        
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
                horizontalAlignment: 'LEFT',
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
                horizontalAlignment: 'LEFT',
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
                horizontalAlignment: 'LEFT',
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
        
        // ✅ NEW: Battle Imagines column (index 9)
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
              endColumnIndex: 13 // ✅ UPDATED from 12 to 13
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
                endColumnIndex: 13 // ✅ UPDATED from 12 to 13
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
        const batchSize = 100;
        for (let i = 0; i < requests.length; i += batchSize) {
          const batch = requests.slice(i, i + batchSize);
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: { requests: batch }
          });
          
          if (i + batchSize < requests.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
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
}

export default new GoogleSheetsService();
