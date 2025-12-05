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

  // Professional color palette - minimal strategic use
  getClassColors(className) {
    const colors = {
      'Beat Performer': { 
        main: { red: 0.91, green: 0.12, blue: 0.39 },
        sub: { red: 0.73, green: 0.10, blue: 0.31 }
      },
      'Frost Mage': { 
        main: { red: 0.13, green: 0.59, blue: 0.95 },
        sub: { red: 0.10, green: 0.47, blue: 0.76 }
      },
      'Heavy Guardian': { 
        main: { red: 0.96, green: 0.64, blue: 0.38 },
        sub: { red: 0.77, green: 0.51, blue: 0.30 }
      },
      'Marksman': { 
        main: { red: 0.55, green: 0.76, blue: 0.29 },
        sub: { red: 0.44, green: 0.61, blue: 0.23 }
      },
      'Shield Knight': { 
        main: { red: 0.25, green: 0.53, blue: 0.96 },
        sub: { red: 0.20, green: 0.42, blue: 0.77 }
      },
      'Stormblade': { 
        main: { red: 0.61, green: 0.15, blue: 0.69 },
        sub: { red: 0.49, green: 0.12, blue: 0.55 }
      },
      'Verdant Oracle': { 
        main: { red: 0.30, green: 0.69, blue: 0.31 },
        sub: { red: 0.24, green: 0.55, blue: 0.25 }
      },
      'Wind Knight': { 
        main: { red: 0.26, green: 0.59, blue: 0.98 },
        sub: { red: 0.21, green: 0.47, blue: 0.78 }
      }
    };
    return colors[className] || { 
      main: { red: 0.62, green: 0.64, blue: 0.66 },
      sub: { red: 0.50, green: 0.52, blue: 0.54 }
    };
  }

  getAbilityScoreColor(score) {
    if (!score || score === '') return null;
    
    const numScore = parseInt(score);
    
    if (numScore >= 50000) return { red: 0.46, green: 0.10, blue: 0.73 };
    if (numScore >= 45000) return { red: 0.61, green: 0.15, blue: 0.69 };
    if (numScore >= 40000) return { red: 0.84, green: 0.15, blue: 0.51 };
    if (numScore >= 35000) return { red: 0.96, green: 0.26, blue: 0.21 };
    if (numScore >= 30000) return { red: 0.96, green: 0.42, blue: 0.21 };
    if (numScore >= 25000) return { red: 0.96, green: 0.58, blue: 0.21 };
    if (numScore >= 20000) return { red: 0.97, green: 0.73, blue: 0.15 };
    if (numScore >= 15000) return { red: 0.69, green: 0.77, blue: 0.22 };
    if (numScore >= 10000) return { red: 0.30, green: 0.69, blue: 0.31 };
    return { red: 0.62, green: 0.64, blue: 0.66 };
  }

  getRoleColor(role) {
    const roleColors = {
      'Tank': { red: 0.25, green: 0.53, blue: 0.96 },
      'DPS': { red: 0.96, green: 0.26, blue: 0.21 },
      'Support': { red: 0.30, green: 0.69, blue: 0.31 }
    };
    return roleColors[role] || { red: 0.62, green: 0.64, blue: 0.66 };
  }

  getGuildColor(guildName) {
    const guildColors = {
      'heal': { red: 0.26, green: 0.59, blue: 0.98 },
      'Visitor': { red: 0.62, green: 0.64, blue: 0.66 }
    };
    
    if (guildColors[guildName]) {
      return guildColors[guildName];
    }
    
    // Soft professional palette for other guilds
    const professionalColors = [
      { red: 0.76, green: 0.61, blue: 0.91 },
      { red: 0.91, green: 0.73, blue: 0.61 },
      { red: 0.61, green: 0.91, blue: 0.76 },
      { red: 0.91, green: 0.61, blue: 0.73 },
      { red: 0.73, green: 0.91, blue: 0.61 },
      { red: 0.61, green: 0.73, blue: 0.91 },
    ];
    
    let hash = 0;
    for (let i = 0; i < guildName.length; i++) {
      hash = guildName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return professionalColors[Math.abs(hash) % professionalColors.length];
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

      console.log(`✅ [SHEETS] Premium formatting applied to ${sheetName}`);
    } catch (error) {
      console.error(`Error formatting ${sheetName}:`, error.message);
    }
  }

  async syncMemberList(allCharactersWithSubclasses) {
    if (!this.sheets) return;

    try {
      console.log(`📊 [SHEETS] Starting premium sync...`);
      
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
            isAlt: false,
            isFirstOfUser: true
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
              isAlt: false,
              isFirstOfUser: false
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
              isAlt: false,
              isFirstOfUser: false
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

      // Column widths
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

      // Row heights
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

      // Track for user group separators
      let lastDiscordName = '';

      // Apply styling to each row
      for (let i = 0; i < rowMetadata.length; i++) {
        const rowIndex = i + 1;
        const meta = rowMetadata[i];
        const member = meta.character;
        
        // Detect when we're starting a new user's section
        const isNewUserGroup = meta.discordName !== lastDiscordName && meta.discordName !== '';
        if (isNewUserGroup) {
          lastDiscordName = meta.discordName;
        }
        
        // Clean alternating background
        const rowBg = meta.isSubclass 
          ? { red: 0.98, green: 0.98, blue: 0.99 }
          : { red: 1, green: 1, blue: 1 };
        
        // Discord Name (A)
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

        // IGN (B)
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

        // Type (C) - Only Main/Alt get colors, Subclass is neutral
        let typeColor;
        if (meta.isMain) {
          typeColor = { red: 0.30, green: 0.69, blue: 0.31 };
        } else if (meta.isAlt) {
          typeColor = { red: 0.96, green: 0.64, blue: 0.26 };
        } else {
          typeColor = { red: 0.75, green: 0.75, blue: 0.75 };
        }
        
        this.addPillBadge(requests, sheetId, rowIndex, 2, typeColor);
        
        // Class (D) - NO COLOR, just text
        const classColors = this.getClassColors(member.class);
        this.addCleanTextCell(requests, sheetId, rowIndex, 3, member.class, rowBg);
        
        // Subclass (E) - NO COLOR, just text
        this.addCleanTextCell(requests, sheetId, rowIndex, 4, member.subclass, rowBg);
        
        // Role (F) - Strategic color
        const roleColor = this.getRoleColor(member.role);
        this.addPillBadge(requests, sheetId, rowIndex, 5, roleColor);
        
        // Ability Score (G) - Strategic gradient
        if (member.ability_score && member.ability_score !== '') {
          const abilityColor = this.getAbilityScoreColor(member.ability_score);
          this.addPillBadge(requests, sheetId, rowIndex, 6, abilityColor, true);
        } else {
          this.addCleanTextCell(requests, sheetId, rowIndex, 6, '', rowBg);
        }
        
        // Guild (H) - NO COLOR, just text
        this.addCleanTextCell(requests, sheetId, rowIndex, 7, member.guild || '', rowBg);
        
        // Timezone (I)
        this.addSubtleTextCell(requests, sheetId, rowIndex, 8, rowBg);
        
        // Registered (J)
        this.addSubtleTextCell(requests, sheetId, rowIndex, 9, rowBg);

        // Professional separator - Thick border after each user group
        const isLastOfGroup = (i === rowMetadata.length - 1) || 
                              (i + 1 < rowMetadata.length && rowMetadata[i + 1].isFirstOfUser);
        
        if (isLastOfGroup) {
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
                style: 'SOLID_MEDIUM',
                width: 3,
                color: { red: 0.32, green: 0.20, blue: 0.58 }
              }
            }
          });
        } else {
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
                color: { red: 0.90, green: 0.90, blue: 0.92 }
              }
            }
          });
        }
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
              foregroundColor: { red: 0.10, green: 0.11, blue: 0.13 }
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat'
      }
    });
  }

  addSubtleTextCell(requests, sheetId, rowIndex, colIndex, rowBg) {
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
              fontSize: 9,
              fontFamily: 'Google Sans',
              foregroundColor: { red: 0.38, green: 0.42, blue: 0.45 }
            },
            horizontalAlignment: 'LEFT',
            verticalAlignment: 'MIDDLE',
            padding: {
              left: 12
            },
            numberFormat: {
              type: 'TEXT'
            }
          }
        },
        fields: 'userEnteredFormat'
      }
    });
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
