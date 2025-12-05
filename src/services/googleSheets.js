import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  }

  async initialize() {
    try {
      if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        console.log('⚠️  Google Sheets credentials not configured - skipping');
        return false;
      }

      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      this.auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('✅ Google Sheets API initialized');
      return true;
    } catch (error) {
      console.error('⚠️  Google Sheets initialization failed:', error.message);
      return false;
    }
  }

  // 🎨 Premium color palette
  getClassColors(className) {
    const colors = {
      'Beat Performer': { 
        main: { red: 0.95, green: 0.26, blue: 0.61 },
        sub: { red: 0.76, green: 0.21, blue: 0.49 }
      },
      'Frost Mage': { 
        main: { red: 0.31, green: 0.71, blue: 0.98 },
        sub: { red: 0.25, green: 0.57, blue: 0.78 }
      },
      'Heavy Guardian': { 
        main: { red: 0.68, green: 0.43, blue: 0.24 },
        sub: { red: 0.54, green: 0.34, blue: 0.19 }
      },
      'Marksman': { 
        main: { red: 0.60, green: 0.80, blue: 0.36 },
        sub: { red: 0.48, green: 0.64, blue: 0.29 }
      },
      'Shield Knight': { 
        main: { red: 0.98, green: 0.82, blue: 0.27 },
        sub: { red: 0.78, green: 0.66, blue: 0.22 }
      },
      'Stormblade': { 
        main: { red: 0.67, green: 0.40, blue: 0.76 },
        sub: { red: 0.54, green: 0.32, blue: 0.61 }
      },
      'Verdant Oracle': { 
        main: { red: 0.36, green: 0.74, blue: 0.38 },
        sub: { red: 0.29, green: 0.59, blue: 0.30 }
      },
      'Wind Knight': { 
        main: { red: 0.31, green: 0.85, blue: 0.95 },
        sub: { red: 0.25, green: 0.68, blue: 0.76 }
      }
    };
    return colors[className] || { 
      main: { red: 0.75, green: 0.75, blue: 0.75 },
      sub: { red: 0.60, green: 0.60, blue: 0.60 }
    };
  }

  getAbilityScoreColor(score) {
    if (!score || score === '') return null;
    
    const numScore = parseInt(score);
    
    if (numScore >= 50000) return { red: 0.42, green: 0.15, blue: 0.68 };
    if (numScore >= 45000) return { red: 0.58, green: 0.22, blue: 0.72 };
    if (numScore >= 40000) return { red: 0.85, green: 0.24, blue: 0.58 };
    if (numScore >= 35000) return { red: 0.95, green: 0.26, blue: 0.42 };
    if (numScore >= 30000) return { red: 0.98, green: 0.38, blue: 0.35 };
    if (numScore >= 25000) return { red: 0.98, green: 0.58, blue: 0.29 };
    if (numScore >= 20000) return { red: 0.98, green: 0.75, blue: 0.24 };
    if (numScore >= 15000) return { red: 0.85, green: 0.85, blue: 0.31 };
    if (numScore >= 10000) return { red: 0.52, green: 0.78, blue: 0.33 };
    return { red: 0.67, green: 0.69, blue: 0.71 };
  }

  getRoleColor(role) {
    const roleColors = {
      'Tank': { red: 0.31, green: 0.60, blue: 0.98 },
      'DPS': { red: 0.98, green: 0.38, blue: 0.35 },
      'Support': { red: 0.36, green: 0.74, blue: 0.38 }
    };
    return roleColors[role] || { red: 0.67, green: 0.69, blue: 0.71 };
  }

  getGuildColor(guildName) {
    const guildColors = {
      'heal': { red: 0.31, green: 0.85, blue: 0.95 },
      'Visitor': { red: 0.67, green: 0.69, blue: 0.71 }
    };
    
    if (guildColors[guildName]) {
      return guildColors[guildName];
    }
    
    const premiumColors = [
      { red: 0.80, green: 0.67, blue: 0.93 },
      { red: 0.93, green: 0.78, blue: 0.67 },
      { red: 0.67, green: 0.93, blue: 0.80 },
      { red: 0.93, green: 0.67, blue: 0.78 },
      { red: 0.78, green: 0.93, blue: 0.67 },
      { red: 0.67, green: 0.78, blue: 0.93 },
    ];
    
    let hash = 0;
    for (let i = 0; i < guildName.length; i++) {
      hash = guildName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return premiumColors[Math.abs(hash) % premiumColors.length];
  }

  async formatPremiumSheet(sheetName, headerCount, dataRowCount) {
    if (!this.sheets) return;

    try {
      console.log(`📊 [SHEETS] Applying premium formatting to ${sheetName}...`);
      
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
                red: 0.42,
                green: 0.27,
                blue: 0.76
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

      console.log(`✅ [SHEETS] Premium formatting applied to ${sheetName}`);
    } catch (error) {
      console.error(`Error formatting ${sheetName}:`, error.message);
    }
  }

  async syncMemberList(allCharactersWithSubclasses) {
    if (!this.sheets) return;

    try {
      console.log(`📊 [SHEETS] Starting premium sync...`);
      
      // Import queries to get timezone data
      const { queries } = await import('../database/queries.js');
      
      const headers = [
        'Discord Name',
        'IGN',
        'Type',
        'Class',
        'Subclass',
        'Role',
        'Ability Score',
        'Guild',
        'Timezone',
        'Registered'
      ];

      const rows = [];
      const rowMetadata = [];

      // Group characters by discord_id
      const userGroups = {};
      allCharactersWithSubclasses.forEach(char => {
        if (!userGroups[char.discord_id]) {
          userGroups[char.discord_id] = [];
        }
        userGroups[char.discord_id].push(char);
      });

      // Process each user's characters hierarchically
      for (const [discordId, userChars] of Object.entries(userGroups)) {
        const mainChar = userChars.find(c => c.character_type === 'main');
        const mainSubclasses = userChars.filter(c => c.character_type === 'main_subclass');
        const alts = userChars.filter(c => c.character_type === 'alt');
        
        // Fetch timezone from user_timezones table
        let userTimezone = '';
        try {
          const timezoneData = await queries.getUserTimezone(discordId);
          userTimezone = timezoneData?.timezone || '';
          console.log(`📊 [SHEETS] Timezone for ${discordId}: ${userTimezone || 'Not set'}`);
        } catch (error) {
          console.log(`⚠️ [SHEETS] Could not fetch timezone for ${discordId}:`, error.message);
        }
        
        let discordName = '';
        
        if (mainChar) {
          discordName = mainChar.discord_name;
          
          // Add main character - Format date as TEXT with apostrophe prefix
          rows.push([
            discordName,
            mainChar.ign,
            'Main',
            mainChar.class,
            mainChar.subclass,
            mainChar.role,
            mainChar.ability_score || '',
            mainChar.guild || '',
            userTimezone || '',
            `'${this.formatDate(mainChar.created_at)}` // Add apostrophe to force text format
          ]);

          rowMetadata.push({
            character: mainChar,
            discordName: discordName,
            timezone: userTimezone,
            isSubclass: false,
            isMain: true,
            isAlt: false
          });

          // Add main's subclasses
          mainSubclasses.forEach(subclass => {
            rows.push([
              discordName,
              mainChar.ign,
              'Subclass',
              subclass.class,
              subclass.subclass,
              subclass.role,
              subclass.ability_score || '',
              mainChar.guild || '',
              userTimezone || '',
              `'${this.formatDate(mainChar.created_at)}` // Add apostrophe to force text format
            ]);

            rowMetadata.push({
              character: subclass,
              discordName: discordName,
              timezone: userTimezone,
              parentIGN: mainChar.ign,
              parentClass: mainChar.class,
              isSubclass: true,
              isMain: false,
              isAlt: false
            });
          });
        }

        // Add each alt and its subclasses
        alts.forEach(alt => {
          rows.push([
            discordName,
            alt.ign,
            'Alt',
            alt.class,
            alt.subclass,
            alt.role,
            alt.ability_score || '',
            alt.guild || '',
            userTimezone || '',
            `'${this.formatDate(alt.created_at)}` // Add apostrophe to force text format
          ]);

          rowMetadata.push({
            character: alt,
            discordName: discordName,
            timezone: userTimezone,
            isSubclass: false,
            isMain: false,
            isAlt: true
          });

          // Add this alt's subclasses
          const altSubclasses = userChars.filter(c => 
            c.character_type === 'alt_subclass' && 
            c.parent_character_id === alt.id
          );

          altSubclasses.forEach(subclass => {
            rows.push([
              discordName,
              alt.ign,
              'Subclass',
              subclass.class,
              subclass.subclass,
              subclass.role,
              subclass.ability_score || '',
              alt.guild || '',
              userTimezone || '',
              `'${this.formatDate(alt.created_at)}` // Add apostrophe to force text format
            ]);

            rowMetadata.push({
              character: subclass,
              discordName: discordName,
              timezone: userTimezone,
              parentIGN: alt.ign,
              parentClass: alt.class,
              isSubclass: true,
              isMain: false,
              isAlt: false
            });
          });
        });
      }

      console.log(`📊 [SHEETS] Clearing Member List sheet...`);
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Member List!A:J',
      });

      console.log(`📊 [SHEETS] Writing ${rows.length} rows to Member List...`);
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Member List!A1',
        valueInputOption: 'RAW', // Changed from USER_ENTERED to RAW to preserve text formatting
        resource: {
          values: [headers, ...rows],
        },
      });

      console.log(`📊 [SHEETS] Applying premium formatting...`);
      await this.formatPremiumSheet('Member List', headers.length, rows.length);

      console.log(`📊 [SHEETS] Applying premium design...`);
      await this.applyPremiumDesign('Member List', rowMetadata);

      console.log(`✅ [SHEETS] Member List synced successfully! (${rows.length} total rows)`);
    } catch (error) {
      console.error('❌ [SHEETS] Error syncing member list:', error.message);
    }
  }

  formatDate(dateString) {
    // Convert date to proper format MM/DD/YYYY
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  async applyPremiumDesign(sheetName, rowMetadata) {
    if (!this.sheets || rowMetadata.length === 0) return;

    try {
      console.log(`🎨 [SHEETS] Applying premium design to ${rowMetadata.length} rows...`);
      
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;
      const requests = [];

      // Premium column widths
      const columnWidths = [160, 150, 95, 145, 145, 85, 125, 105, 170, 105];
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

      // Premium row heights
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

      // Apply premium styling to each row
      for (let i = 0; i < rowMetadata.length; i++) {
        const rowIndex = i + 1;
        const meta = rowMetadata[i];
        const member = meta.character;
        
        const isEvenRow = Math.floor(i / 3) % 2 === 0;
        const rowBg = isEvenRow 
          ? { red: 1, green: 1, blue: 1 }
          : { red: 0.99, green: 0.99, blue: 0.995 };
        
        // Discord Name (A)
        const discordColor = meta.isSubclass 
          ? { red: 0.55, green: 0.57, blue: 0.60 }
          : { red: 0.13, green: 0.14, blue: 0.16 };
        
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
                  bold: meta.isMain
                },
                horizontalAlignment: 'LEFT',
                verticalAlignment: 'MIDDLE',
                padding: {
                  left: 12,
                  right: 8
                }
              }
            },
            fields: 'userEnteredFormat'
          }
        });

        // IGN (B)
        const ignColor = meta.isSubclass 
          ? { red: 0.55, green: 0.57, blue: 0.60 }
          : { red: 0.13, green: 0.14, blue: 0.16 };
        
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
                  bold: !meta.isSubclass,
                  italic: meta.isSubclass
                },
                horizontalAlignment: 'LEFT',
                verticalAlignment: 'MIDDLE',
                padding: {
                  left: 12,
                  right: 8
                }
              }
            },
            fields: 'userEnteredFormat'
          }
        });

        // Type (C)
        const typeColor = meta.isSubclass
          ? { red: 0.70, green: 0.72, blue: 0.75 }
          : (meta.isMain 
              ? { red: 0.36, green: 0.74, blue: 0.38 } 
              : { red: 0.98, green: 0.65, blue: 0.31 });
        
        this.addPremiumPill(requests, sheetId, rowIndex, 2, typeColor);
        
        // Class (D)
        const classColors = this.getClassColors(member.class);
        this.addPremiumPill(requests, sheetId, rowIndex, 3, classColors.main);
        
        // Subclass (E)
        this.addPremiumPill(requests, sheetId, rowIndex, 4, classColors.sub);
        
        // Role (F)
        const roleColor = this.getRoleColor(member.role);
        this.addPremiumPill(requests, sheetId, rowIndex, 5, roleColor);
        
        // Ability Score (G)
        if (member.ability_score && member.ability_score !== '') {
          const abilityColor = this.getAbilityScoreColor(member.ability_score);
          this.addPremiumPill(requests, sheetId, rowIndex, 6, abilityColor, true);
        } else {
          requests.push({
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: 6,
                endColumnIndex: 7
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: rowBg,
                  textFormat: {
                    fontSize: 9,
                    fontFamily: 'Google Sans',
                    foregroundColor: { red: 0.85, green: 0.85, blue: 0.85 }
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE'
                }
              },
              fields: 'userEnteredFormat'
            }
          });
        }
        
        // Guild (H)
        if (member.guild && member.guild !== '') {
          const guildColor = this.getGuildColor(member.guild);
          this.addPremiumPill(requests, sheetId, rowIndex, 7, guildColor);
        } else {
          requests.push({
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: 7,
                endColumnIndex: 8
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: rowBg,
                  textFormat: {
                    fontSize: 9,
                    fontFamily: 'Google Sans',
                    foregroundColor: { red: 0.85, green: 0.85, blue: 0.85 }
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE'
                }
              },
              fields: 'userEnteredFormat'
            }
          });
        }
        
        // Timezone (I)
        const timezoneColor = meta.timezone && meta.timezone !== ''
          ? { red: 0.42, green: 0.45, blue: 0.48 }
          : { red: 0.85, green: 0.85, blue: 0.85 };
        
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 8,
              endColumnIndex: 9
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: rowBg,
                textFormat: {
                  fontSize: 9,
                  fontFamily: 'Google Sans',
                  foregroundColor: timezoneColor
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat'
          }
        });
        
        // Registered (J) - Force as plain text
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 9,
              endColumnIndex: 10
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: rowBg,
                textFormat: {
                  fontSize: 9,
                  fontFamily: 'Google Sans',
                  foregroundColor: { red: 0.42, green: 0.45, blue: 0.48 }
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                numberFormat: {
                  type: 'TEXT'
                }
              }
            },
            fields: 'userEnteredFormat'
          }
        });

        // Row separator
        requests.push({
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 0,
              endColumnIndex: 10
            },
            bottom: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.94, green: 0.94, blue: 0.95 }
            }
          }
        });
      }

      // Apply in batches
      if (requests.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < requests.length; i += batchSize) {
          const batch = requests.slice(i, i + batchSize);
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: { requests: batch }
          });
        }
        console.log(`✅ [SHEETS] Applied ${requests.length} premium styling requests`);
      }
    } catch (error) {
      console.error('❌ [SHEETS] Error applying premium design:', error.message);
    }
  }

  addPremiumPill(requests, sheetId, rowIndex, colIndex, bgColor, isNumber = false) {
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

  async fullSync(allCharactersWithSubclasses) {
    const timestamp = new Date().toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    console.log(`\n🔄 [SHEETS] ========== FULL SYNC STARTED (${timestamp}) ==========`);
    
    await this.syncMemberList(allCharactersWithSubclasses);
    
    console.log(`✅ [SHEETS] ========== FULL SYNC COMPLETE (${timestamp}) ==========\n`);
  }
}

export default new GoogleSheetsService();
