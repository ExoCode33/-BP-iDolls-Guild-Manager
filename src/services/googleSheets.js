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

  // 🎨 Professional color palette - Clean and consistent
  getClassColor(className) {
    const colors = {
      'Beat Performer': { red: 0.91, green: 0.30, blue: 0.64, dark: { red: 0.73, green: 0.24, blue: 0.51 } },
      'Frost Mage': { red: 0.26, green: 0.65, blue: 0.96, dark: { red: 0.21, green: 0.52, blue: 0.77 } },
      'Heavy Guardian': { red: 0.61, green: 0.35, blue: 0.16, dark: { red: 0.49, green: 0.28, blue: 0.13 } },
      'Marksman': { red: 0.55, green: 0.76, blue: 0.29, dark: { red: 0.44, green: 0.61, blue: 0.23 } },
      'Shield Knight': { red: 0.95, green: 0.77, blue: 0.20, dark: { red: 0.76, green: 0.62, blue: 0.16 } },
      'Stormblade': { red: 0.61, green: 0.35, blue: 0.71, dark: { red: 0.49, green: 0.28, blue: 0.57 } },
      'Verdant Oracle': { red: 0.30, green: 0.69, blue: 0.31, dark: { red: 0.24, green: 0.55, blue: 0.25 } },
      'Wind Knight': { red: 0.26, green: 0.80, blue: 0.91, dark: { red: 0.21, green: 0.64, blue: 0.73 } }
    };
    return colors[className] || { red: 0.70, green: 0.70, blue: 0.70, dark: { red: 0.56, green: 0.56, blue: 0.56 } };
  }

  // 🌟 Clean ability score colors - Single consistent gradient
  getAbilityScoreColor(score) {
    if (!score || score === '') return null;
    
    const numScore = parseInt(score);
    
    // Purple to Red gradient (high to low)
    if (numScore >= 40000) return { red: 0.46, green: 0.20, blue: 0.73 }; // Deep Purple
    if (numScore >= 35000) return { red: 0.58, green: 0.24, blue: 0.71 }; // Purple
    if (numScore >= 30000) return { red: 0.91, green: 0.30, blue: 0.64 }; // Pink
    if (numScore >= 25000) return { red: 0.96, green: 0.42, blue: 0.42 }; // Red
    if (numScore >= 20000) return { red: 0.95, green: 0.61, blue: 0.27 }; // Orange
    if (numScore >= 15000) return { red: 0.95, green: 0.77, blue: 0.20 }; // Yellow
    if (numScore >= 10000) return { red: 0.55, green: 0.76, blue: 0.29 }; // Green
    return { red: 0.62, green: 0.64, blue: 0.66 }; // Gray
  }

  // 🎭 Clean role colors
  getRoleColor(role) {
    const roleColors = {
      'Tank': { red: 0.26, green: 0.52, blue: 0.96 },    // Blue
      'DPS': { red: 0.96, green: 0.42, blue: 0.42 },     // Red  
      'Support': { red: 0.30, green: 0.69, blue: 0.31 }  // Green
    };
    return roleColors[role] || { red: 0.62, green: 0.64, blue: 0.66 };
  }

  // 🏰 Clean guild colors
  getGuildColor(guildName) {
    const guildColors = {
      'heal': { red: 0.26, green: 0.80, blue: 0.91 },
      'Visitor': { red: 0.62, green: 0.64, blue: 0.66 }
    };
    
    if (guildColors[guildName]) {
      return guildColors[guildName];
    }
    
    // Pastel colors for other guilds
    const pastelColors = [
      { red: 0.74, green: 0.62, blue: 0.91 }, // Lavender
      { red: 0.91, green: 0.76, blue: 0.62 }, // Peach
      { red: 0.62, green: 0.91, blue: 0.76 }, // Mint
      { red: 0.91, green: 0.62, blue: 0.76 }, // Pink
      { red: 0.76, green: 0.91, blue: 0.62 }, // Light Green
    ];
    
    let hash = 0;
    for (let i = 0; i < guildName.length; i++) {
      hash = guildName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return pastelColors[Math.abs(hash) % pastelColors.length];
  }

  async formatProfessionalSheet(sheetName, headerCount, dataRowCount) {
    if (!this.sheets) return;

    try {
      console.log(`📊 [SHEETS] Applying glamorous formatting to ${sheetName}...`);
      
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
                red: 0.40,
                green: 0.23,
                blue: 0.72
              }
            },
            fields: 'gridProperties.frozenRowCount,gridProperties.hideGridlines,tabColor'
          }
        },
        // Header row - Elegant dark purple
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
                  red: 0.29,
                  green: 0.16,
                  blue: 0.52
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
                  top: 14,
                  bottom: 14,
                  left: 12,
                  right: 12
                }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)'
          }
        }
      ];

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests }
      });

      console.log(`✅ [SHEETS] Glamorous formatting applied to ${sheetName}`);
    } catch (error) {
      console.error(`Error formatting ${sheetName}:`, error.message);
    }
  }

  async syncMemberList(allCharactersWithSubclasses) {
    if (!this.sheets) return;

    try {
      console.log(`📊 [SHEETS] Starting glamorous sync...`);
      
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
      Object.values(userGroups).forEach(userChars => {
        const mainChar = userChars.find(c => c.character_type === 'main');
        const mainSubclasses = userChars.filter(c => c.character_type === 'main_subclass');
        const alts = userChars.filter(c => c.character_type === 'alt');
        
        let userTimezone = '';
        let discordName = '';
        
        if (mainChar) {
          userTimezone = mainChar.timezone || '';
          discordName = mainChar.discord_name;
          
          // Add main character
          rows.push([
            discordName,
            mainChar.ign,
            'Main',
            mainChar.class,
            mainChar.subclass,
            mainChar.role,
            mainChar.ability_score || '',
            mainChar.guild || '',
            userTimezone,
            this.formatDate(mainChar.created_at)
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
              discordName, // REPEAT discord name
              mainChar.ign, // REPEAT parent IGN
              'Subclass',
              subclass.class,
              subclass.subclass,
              subclass.role,
              subclass.ability_score || '',
              mainChar.guild || '', // Use parent guild
              userTimezone, // REPEAT timezone
              this.formatDate(mainChar.created_at) // Use parent date
            ]);

            rowMetadata.push({
              character: subclass,
              discordName: discordName,
              timezone: userTimezone,
              parentIGN: mainChar.ign,
              isSubclass: true,
              isMain: false,
              isAlt: false
            });
          });
        }

        // Add each alt and its subclasses
        alts.forEach(alt => {
          rows.push([
            discordName, // REPEAT discord name
            alt.ign,
            'Alt',
            alt.class,
            alt.subclass,
            alt.role,
            alt.ability_score || '',
            alt.guild || '',
            userTimezone, // REPEAT timezone
            this.formatDate(alt.created_at)
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
              discordName, // REPEAT discord name
              alt.ign, // REPEAT parent IGN
              'Subclass',
              subclass.class,
              subclass.subclass,
              subclass.role,
              subclass.ability_score || '',
              alt.guild || '', // Use parent guild
              userTimezone, // REPEAT timezone
              this.formatDate(alt.created_at) // Use parent date
            ]);

            rowMetadata.push({
              character: subclass,
              discordName: discordName,
              timezone: userTimezone,
              parentIGN: alt.ign,
              isSubclass: true,
              isMain: false,
              isAlt: false
            });
          });
        });
      });

      console.log(`📊 [SHEETS] Clearing Member List sheet...`);
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Member List!A:J',
      });

      console.log(`📊 [SHEETS] Writing ${rows.length} rows to Member List...`);
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Member List!A1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [headers, ...rows],
        },
      });

      console.log(`📊 [SHEETS] Applying professional formatting...`);
      await this.formatProfessionalSheet('Member List', headers.length, rows.length);

      console.log(`📊 [SHEETS] Applying glamorous colors...`);
      await this.applyGlamorousColors('Member List', rowMetadata);

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

  async applyGlamorousColors(sheetName, rowMetadata) {
    if (!this.sheets || rowMetadata.length === 0) return;

    try {
      console.log(`🎨 [SHEETS] Applying glamorous design to ${rowMetadata.length} rows...`);
      
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;
      const requests = [];

      // Set column widths for perfect layout
      const columnWidths = [150, 150, 100, 140, 140, 90, 120, 110, 160, 110];
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

      // Set consistent row height
      for (let i = 0; i < rowMetadata.length; i++) {
        requests.push({
          updateDimensionProperties: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: i + 1,
              endIndex: i + 2
            },
            properties: {
              pixelSize: 36
            },
            fields: 'pixelSize'
          }
        });
      }

      // Apply formatting to each row
      for (let i = 0; i < rowMetadata.length; i++) {
        const rowIndex = i + 1;
        const meta = rowMetadata[i];
        const member = meta.character;
        
        // Clean white background for all rows
        const rowBg = { red: 1, green: 1, blue: 1 };
        
        // Discord Name (A) - Always visible, muted for subclasses
        const discordTextColor = meta.isSubclass 
          ? { red: 0.60, green: 0.62, blue: 0.65 }
          : { red: 0.15, green: 0.16, blue: 0.18 };
        
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
                  foregroundColor: discordTextColor,
                  bold: meta.isMain
                },
                horizontalAlignment: 'LEFT',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat'
          }
        });

        // IGN (B) - Always visible, styled for subclasses
        const ignTextColor = meta.isSubclass 
          ? { red: 0.60, green: 0.62, blue: 0.65 }
          : { red: 0.15, green: 0.16, blue: 0.18 };
        
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
                  foregroundColor: ignTextColor,
                  bold: !meta.isSubclass,
                  italic: meta.isSubclass
                },
                horizontalAlignment: 'LEFT',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat'
          }
        });

        // Type (C) - Elegant pill
        const typeColor = meta.isSubclass
          ? { red: 0.72, green: 0.74, blue: 0.76 }
          : (meta.isMain 
              ? { red: 0.30, green: 0.69, blue: 0.31 } 
              : { red: 0.95, green: 0.61, blue: 0.27 });
        
        this.addModernPill(requests, sheetId, rowIndex, 2, typeColor);
        
        // Class (D) - Vibrant pill
        const classColorObj = this.getClassColor(member.class);
        this.addModernPill(requests, sheetId, rowIndex, 3, classColorObj);
        
        // Subclass (E) - Darker variant pill
        this.addModernPill(requests, sheetId, rowIndex, 4, classColorObj.dark);
        
        // Role (F) - Clean pill
        const roleColor = this.getRoleColor(member.role);
        this.addModernPill(requests, sheetId, rowIndex, 5, roleColor);
        
        // Ability Score (G) - Gradient pill
        if (member.ability_score && member.ability_score !== '') {
          const abilityColor = this.getAbilityScoreColor(member.ability_score);
          this.addModernPill(requests, sheetId, rowIndex, 6, abilityColor, true);
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
                  backgroundColor: rowBg
                }
              },
              fields: 'userEnteredFormat(backgroundColor)'
            }
          });
        }
        
        // Guild (H) - Soft pill
        if (member.guild && member.guild !== '') {
          const guildColor = this.getGuildColor(member.guild);
          this.addModernPill(requests, sheetId, rowIndex, 7, guildColor);
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
                  backgroundColor: rowBg
                }
              },
              fields: 'userEnteredFormat(backgroundColor)'
            }
          });
        }
        
        // Timezone (I) - Muted text
        const timezoneColor = meta.timezone && meta.timezone !== ''
          ? { red: 0.45, green: 0.47, blue: 0.50 }
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
        
        // Registered (J) - Muted text
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
                  foregroundColor: { red: 0.45, green: 0.47, blue: 0.50 }
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat'
          }
        });

        // Add subtle row separator
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
              color: { red: 0.95, green: 0.95, blue: 0.96 }
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
        console.log(`✅ [SHEETS] Applied ${requests.length} glamorous formats`);
      }
    } catch (error) {
      console.error('❌ [SHEETS] Error applying glamorous colors:', error.message);
    }
  }

  addModernPill(requests, sheetId, rowIndex, colIndex, bgColor, isNumber = false) {
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
