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

  // 🎨 Elite color palette - Maximum visual impact
  getClassColors(className) {
    const colors = {
      'Beat Performer': { 
        main: { red: 0.98, green: 0.12, blue: 0.58 },
        sub: { red: 0.78, green: 0.09, blue: 0.46 }
      },
      'Frost Mage': { 
        main: { red: 0.20, green: 0.69, blue: 1.00 },
        sub: { red: 0.16, green: 0.55, blue: 0.80 }
      },
      'Heavy Guardian': { 
        main: { red: 0.78, green: 0.50, blue: 0.20 },
        sub: { red: 0.62, green: 0.40, blue: 0.16 }
      },
      'Marksman': { 
        main: { red: 0.55, green: 0.82, blue: 0.27 },
        sub: { red: 0.44, green: 0.66, blue: 0.22 }
      },
      'Shield Knight': { 
        main: { red: 1.00, green: 0.84, blue: 0.00 },
        sub: { red: 0.80, green: 0.67, blue: 0.00 }
      },
      'Stormblade': { 
        main: { red: 0.69, green: 0.31, blue: 0.85 },
        sub: { red: 0.55, green: 0.25, blue: 0.68 }
      },
      'Verdant Oracle': { 
        main: { red: 0.30, green: 0.76, blue: 0.33 },
        sub: { red: 0.24, green: 0.61, blue: 0.26 }
      },
      'Wind Knight': { 
        main: { red: 0.20, green: 0.88, blue: 1.00 },
        sub: { red: 0.16, green: 0.70, blue: 0.80 }
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
    
    // Elite gradient
    if (numScore >= 50000) return { red: 0.38, green: 0.10, blue: 0.75 };
    if (numScore >= 45000) return { red: 0.55, green: 0.15, blue: 0.80 };
    if (numScore >= 40000) return { red: 0.88, green: 0.15, blue: 0.62 };
    if (numScore >= 35000) return { red: 0.98, green: 0.20, blue: 0.45 };
    if (numScore >= 30000) return { red: 1.00, green: 0.30, blue: 0.30 };
    if (numScore >= 25000) return { red: 1.00, green: 0.55, blue: 0.20 };
    if (numScore >= 20000) return { red: 1.00, green: 0.76, blue: 0.03 };
    if (numScore >= 15000) return { red: 0.90, green: 0.90, blue: 0.20 };
    if (numScore >= 10000) return { red: 0.45, green: 0.80, blue: 0.25 };
    return { red: 0.70, green: 0.72, blue: 0.74 };
  }

  getRoleColor(role) {
    const roleColors = {
      'Tank': { red: 0.25, green: 0.58, blue: 1.00 },
      'DPS': { red: 1.00, green: 0.30, blue: 0.30 },
      'Support': { red: 0.30, green: 0.76, blue: 0.33 }
    };
    return roleColors[role] || { red: 0.70, green: 0.72, blue: 0.74 };
  }

  getGuildColor(guildName) {
    const guildColors = {
      'heal': { red: 0.20, green: 0.88, blue: 1.00 },
      'Visitor': { red: 0.70, green: 0.72, blue: 0.74 }
    };
    
    if (guildColors[guildName]) {
      return guildColors[guildName];
    }
    
    const eliteColors = [
      { red: 0.85, green: 0.70, blue: 0.98 },
      { red: 0.98, green: 0.82, blue: 0.70 },
      { red: 0.70, green: 0.98, blue: 0.85 },
      { red: 0.98, green: 0.70, blue: 0.82 },
      { red: 0.82, green: 0.98, blue: 0.70 },
      { red: 0.70, green: 0.82, blue: 0.98 },
    ];
    
    let hash = 0;
    for (let i = 0; i < guildName.length; i++) {
      hash = guildName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return eliteColors[Math.abs(hash) % eliteColors.length];
  }

  async formatEliteSheet(sheetName, headerCount, dataRowCount) {
    if (!this.sheets) return;

    try {
      console.log(`📊 [SHEETS] Applying elite formatting to ${sheetName}...`);
      
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;

      const requests = [
        // Sheet properties
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              gridProperties: {
                frozenRowCount: 1,
                hideGridlines: true
              },
              tabColor: {
                red: 0.45,
                green: 0.27,
                blue: 0.85
              }
            },
            fields: 'gridProperties.frozenRowCount,gridProperties.hideGridlines,tabColor'
          }
        },
        // Elite header with gradient effect
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
                  red: 0.35,
                  green: 0.22,
                  blue: 0.65
                },
                textFormat: {
                  foregroundColor: {
                    red: 1,
                    green: 1,
                    blue: 1
                  },
                  fontSize: 12,
                  bold: true,
                  fontFamily: 'Google Sans'
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                padding: {
                  top: 18,
                  bottom: 18,
                  left: 16,
                  right: 16
                }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)'
          }
        },
        // Elite shadow effect
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
              width: 5,
              color: { red: 0.25, green: 0.15, blue: 0.50 }
            }
          }
        }
      ];

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests }
      });

      console.log(`✅ [SHEETS] Elite formatting applied to ${sheetName}`);
    } catch (error) {
      console.error(`Error formatting ${sheetName}:`, error.message);
    }
  }

  async syncMemberList(allCharactersWithSubclasses) {
    if (!this.sheets) return;

    try {
      console.log(`📊 [SHEETS] Starting elite sync...`);
      
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

      // Process each user's characters
      for (const [discordId, userChars] of Object.entries(userGroups)) {
        const mainChar = userChars.find(c => c.character_type === 'main');
        const mainSubclasses = userChars.filter(c => c.character_type === 'main_subclass');
        const alts = userChars.filter(c => c.character_type === 'alt');
        
        let userTimezone = '';
        try {
          const timezoneData = await queries.getUserTimezone(discordId);
          userTimezone = timezoneData?.timezone || '';
        } catch (error) {
          console.log(`⚠️ [SHEETS] Could not fetch timezone for ${discordId}`);
        }
        
        let discordName = '';
        
        if (mainChar) {
          discordName = mainChar.discord_name;
          
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
            `'${this.formatDate(mainChar.created_at)}`
          ]);

          rowMetadata.push({
            character: mainChar,
            discordName: discordName,
            timezone: userTimezone,
            isSubclass: false,
            isMain: true,
            isAlt: false
          });

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
              `'${this.formatDate(mainChar.created_at)}`
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
            `'${this.formatDate(alt.created_at)}`
          ]);

          rowMetadata.push({
            character: alt,
            discordName: discordName,
            timezone: userTimezone,
            isSubclass: false,
            isMain: false,
            isAlt: true
          });

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
              `'${this.formatDate(alt.created_at)}`
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
        valueInputOption: 'RAW',
        resource: {
          values: [headers, ...rows],
        },
      });

      console.log(`📊 [SHEETS] Applying elite formatting...`);
      await this.formatEliteSheet('Member List', headers.length, rows.length);

      console.log(`📊 [SHEETS] Applying elite design...`);
      await this.applyEliteDesign('Member List', rowMetadata);

      console.log(`✅ [SHEETS] Member List synced successfully! (${rows.length} total rows)`);
    } catch (error) {
      console.error('❌ [SHEETS] Error syncing member list:', error.message);
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  async applyEliteDesign(sheetName, rowMetadata) {
    if (!this.sheets || rowMetadata.length === 0) return;

    try {
      console.log(`🎨 [SHEETS] Applying elite design to ${rowMetadata.length} rows...`);
      
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;
      const requests = [];

      // Elite column widths - Optimized
      const columnWidths = [155, 145, 90, 140, 140, 80, 120, 100, 165, 100];
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

      // Elite row heights - Perfectly balanced
      for (let i = 0; i < rowMetadata.length; i++) {
        const meta = rowMetadata[i];
        const rowHeight = meta.isSubclass ? 36 : 40;
        
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

      // Apply elite styling to each row
      for (let i = 0; i < rowMetadata.length; i++) {
        const rowIndex = i + 1;
        const meta = rowMetadata[i];
        const member = meta.character;
        
        // Elite alternating background - Grouped by user
        const userGroupIndex = Math.floor(i / 3);
        const isEvenGroup = userGroupIndex % 2 === 0;
        const rowBg = isEvenGroup 
          ? { red: 1, green: 1, blue: 1 }
          : { red: 0.98, green: 0.985, blue: 0.99 };
        
        // Discord Name (A) - Elite styling
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
                  bold: meta.isMain
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

        // IGN (B) - Elite styling
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
                  bold: !meta.isSubclass,
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

        // Type (C) - Elite pill
        const typeColor = meta.isSubclass
          ? { red: 0.68, green: 0.70, blue: 0.73 }
          : (meta.isMain 
              ? { red: 0.30, green: 0.76, blue: 0.33 } 
              : { red: 1.00, green: 0.65, blue: 0.25 });
        
        this.addElitePill(requests, sheetId, rowIndex, 2, typeColor);
        
        // Class (D) - Elite pill
        const classColors = this.getClassColors(member.class);
        this.addElitePill(requests, sheetId, rowIndex, 3, classColors.main);
        
        // Subclass (E) - Elite pill
        this.addElitePill(requests, sheetId, rowIndex, 4, classColors.sub);
        
        // Role (F) - Elite pill
        const roleColor = this.getRoleColor(member.role);
        this.addElitePill(requests, sheetId, rowIndex, 5, roleColor);
        
        // Ability Score (G) - Elite gradient pill
        if (member.ability_score && member.ability_score !== '') {
          const abilityColor = this.getAbilityScoreColor(member.ability_score);
          this.addElitePill(requests, sheetId, rowIndex, 6, abilityColor, true);
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
        
        // Guild (H) - Elite pill
        if (member.guild && member.guild !== '') {
          const guildColor = this.getGuildColor(member.guild);
          this.addElitePill(requests, sheetId, rowIndex, 7, guildColor);
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
        
        // Timezone (I) - Elite text with icon
        const timezoneColor = meta.timezone && meta.timezone !== ''
          ? { red: 0.38, green: 0.42, blue: 0.45 }
          : { red: 0.82, green: 0.82, blue: 0.82 };
        
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
                horizontalAlignment: 'LEFT',
                verticalAlignment: 'MIDDLE',
                padding: {
                  left: 12
                }
              }
            },
            fields: 'userEnteredFormat'
          }
        });
        
        // Registered (J) - Elite date
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
                  foregroundColor: { red: 0.38, green: 0.42, blue: 0.45 }
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

        // Elite row separator - Subtle elegance
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
              color: { red: 0.93, green: 0.93, blue: 0.94 }
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
        console.log(`✅ [SHEETS] Applied ${requests.length} elite styling requests`);
      }
    } catch (error) {
      console.error('❌ [SHEETS] Error applying elite design:', error.message);
    }
  }

  addElitePill(requests, sheetId, rowIndex, colIndex, bgColor, isNumber = false) {
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
              top: 7,
              bottom: 7,
              left: 12,
              right: 12
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
