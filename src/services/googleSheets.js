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

  // 🎨 Enhanced color palette with better contrast and saturation
  getClassColor(className) {
    const colors = {
      'Beat Performer': { red: 1, green: 0.08, blue: 0.58 },      // Hot Pink
      'Frost Mage': { red: 0.2, green: 0.6, blue: 1 },            // Bright Blue
      'Heavy Guardian': { red: 0.55, green: 0.27, blue: 0.07 },   // Brown
      'Marksman': { red: 0.4, green: 0.8, blue: 0.2 },            // Lime Green
      'Shield Knight': { red: 1, green: 0.84, blue: 0 },          // Gold
      'Stormblade': { red: 0.58, green: 0.24, blue: 0.93 },       // Purple
      'Verdant Oracle': { red: 0.13, green: 0.7, blue: 0.29 },    // Green
      'Wind Knight': { red: 0.2, green: 0.8, blue: 0.95 }         // Cyan
    };
    return colors[className] || { red: 0.75, green: 0.75, blue: 0.75 };
  }

  // 🌟 Enhanced ability score gradient
  getAbilityScoreColor(score) {
    if (!score || score === '') return { red: 0.9, green: 0.9, blue: 0.9 };
    
    const numScore = parseInt(score);
    
    if (numScore >= 40000) return { red: 0.6, green: 0, blue: 0.8 };      // Deep Purple
    if (numScore >= 35000) return { red: 0.8, green: 0, blue: 0.6 };      // Magenta
    if (numScore >= 30000) return { red: 1, green: 0.27, blue: 0 };       // Red-Orange
    if (numScore >= 25000) return { red: 1, green: 0.65, blue: 0 };       // Orange
    if (numScore >= 20000) return { red: 1, green: 0.84, blue: 0 };       // Gold
    if (numScore >= 15000) return { red: 0.2, green: 0.6, blue: 1 };      // Blue
    if (numScore >= 10000) return { red: 0.3, green: 0.8, blue: 0.5 };    // Green
    return { red: 0.7, green: 0.7, blue: 0.7 };                           // Gray
  }

  // 🎭 Role colors
  getRoleColor(role) {
    const roleColors = {
      'Tank': { red: 0.2, green: 0.4, blue: 0.8 },      // Blue
      'DPS': { red: 0.9, green: 0.2, blue: 0.2 },       // Red
      'Support': { red: 0.2, green: 0.8, blue: 0.3 }    // Green
    };
    return roleColors[role] || { red: 0.6, green: 0.6, blue: 0.6 };
  }

  // 🏰 Guild colors
  getGuildColor(guildName) {
    const guildColors = {
      'heal': { red: 0.4, green: 0.8, blue: 0.9 },      // Light Blue
      'Visitor': { red: 0.7, green: 0.7, blue: 0.7 }    // Gray
    };
    
    if (guildColors[guildName]) {
      return guildColors[guildName];
    }
    
    // Generate color from guild name
    let hash = 0;
    for (let i = 0; i < guildName.length; i++) {
      hash = guildName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash % 360);
    return this.hslToRgb(hue / 360, 0.7, 0.6);
  }

  hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return { red: r, green: g, blue: b };
  }

  async formatProfessionalSheet(sheetName, headerCount, dataRowCount) {
    if (!this.sheets) return;

    try {
      console.log(`📊 [SHEETS] Applying professional formatting to ${sheetName}...`);
      
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;

      const requests = [
        // Freeze header row and hide gridlines
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              gridProperties: {
                frozenRowCount: 1,
                hideGridlines: false // Keep gridlines for better readability
              },
              tabColor: {
                red: 0.26,
                green: 0.12,
                blue: 0.56
              }
            },
            fields: 'gridProperties.frozenRowCount,gridProperties.hideGridlines,tabColor'
          }
        },
        // Header row styling
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
                  red: 0.26,
                  green: 0.12,
                  blue: 0.56
                },
                textFormat: {
                  foregroundColor: {
                    red: 1,
                    green: 1,
                    blue: 1
                  },
                  fontSize: 11,
                  bold: true,
                  fontFamily: 'Arial'
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                padding: {
                  top: 12,
                  bottom: 12,
                  left: 10,
                  right: 10
                }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)'
          }
        },
        // Data rows base styling
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              endRowIndex: dataRowCount + 1,
              startColumnIndex: 0,
              endColumnIndex: headerCount
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  fontSize: 10,
                  fontFamily: 'Arial'
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                padding: {
                  top: 6,
                  bottom: 6,
                  left: 8,
                  right: 8
                }
              }
            },
            fields: 'userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,padding)'
          }
        },
        // Header bottom border
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
              style: 'SOLID_MEDIUM',
              width: 3,
              color: { red: 0.26, green: 0.12, blue: 0.56 }
            }
          }
        }
      ];

      // Add subtle borders between rows
      for (let i = 1; i <= dataRowCount; i++) {
        requests.push({
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: i,
              endRowIndex: i + 1,
              startColumnIndex: 0,
              endColumnIndex: headerCount
            },
            bottom: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.85, green: 0.85, blue: 0.85 }
            }
          }
        });
      }

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests }
      });

      console.log(`✅ [SHEETS] Professional formatting applied to ${sheetName}`);
    } catch (error) {
      console.error(`Error formatting ${sheetName}:`, error.message);
    }
  }

  async syncMemberList(allCharactersWithSubclasses) {
    if (!this.sheets) return;

    try {
      console.log(`📊 [SHEETS] Starting hierarchical sync...`);
      
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
        
        // Add main character
        if (mainChar) {
          const userTimezone = mainChar.timezone || '';
          
          rows.push([
            mainChar.discord_name,
            mainChar.ign,
            'Main',
            mainChar.class,
            mainChar.subclass,
            mainChar.role,
            mainChar.ability_score || '',
            mainChar.guild || '',
            userTimezone,
            new Date(mainChar.created_at).toLocaleDateString('en-US', { 
              month: '2-digit', 
              day: '2-digit',
              year: 'numeric'
            })
          ]);

          rowMetadata.push({
            character: mainChar,
            isSubclass: false,
            parentId: null,
            isMain: true,
            isAlt: false
          });

          // Add main's subclasses immediately after
          mainSubclasses.forEach(subclass => {
            rows.push([
              '', // Empty discord name
              `↳ ${subclass.class}`, // Show class name for subclass
              'Subclass',
              subclass.class,
              subclass.subclass,
              subclass.role,
              subclass.ability_score || '',
              '', // Empty guild
              '', // Empty timezone
              '' // Empty registered
            ]);

            rowMetadata.push({
              character: subclass,
              isSubclass: true,
              parentId: mainChar.id,
              isMain: false,
              isAlt: false
            });
          });
        }

        // Add each alt and its subclasses
        alts.forEach(alt => {
          rows.push([
            '', // Empty discord name (grouped under main)
            alt.ign,
            'Alt',
            alt.class,
            alt.subclass,
            alt.role,
            alt.ability_score || '',
            alt.guild || '',
            '', // Empty timezone for alts
            new Date(alt.created_at).toLocaleDateString('en-US', { 
              month: '2-digit', 
              day: '2-digit',
              year: 'numeric'
            })
          ]);

          rowMetadata.push({
            character: alt,
            isSubclass: false,
            parentId: null,
            isMain: false,
            isAlt: true
          });

          // Add this alt's subclasses immediately after
          const altSubclasses = userChars.filter(c => 
            c.character_type === 'alt_subclass' && 
            c.parent_character_id === alt.id
          );

          altSubclasses.forEach(subclass => {
            rows.push([
              '', // Empty discord name
              `↳ ${subclass.class}`, // Show class name for subclass
              'Subclass',
              subclass.class,
              subclass.subclass,
              subclass.role,
              subclass.ability_score || '',
              '', // Empty guild
              '', // Empty timezone
              '' // Empty registered
            ]);

            rowMetadata.push({
              character: subclass,
              isSubclass: true,
              parentId: alt.id,
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

      console.log(`📊 [SHEETS] Applying hierarchical colors...`);
      await this.applyHierarchicalColors('Member List', rowMetadata);

      console.log(`✅ [SHEETS] Member List synced successfully! (${rows.length} total rows with hierarchy)`);
    } catch (error) {
      console.error('❌ [SHEETS] Error syncing member list:', error.message);
    }
  }

  async applyHierarchicalColors(sheetName, rowMetadata) {
    if (!this.sheets || rowMetadata.length === 0) return;

    try {
      console.log(`🎨 [SHEETS] Applying hierarchical formatting to ${rowMetadata.length} rows...`);
      
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;
      const requests = [];

      // Set column widths
      const columnWidths = [140, 180, 100, 150, 150, 90, 130, 100, 180, 120];
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

      // Set row heights
      for (let i = 0; i < rowMetadata.length; i++) {
        const meta = rowMetadata[i];
        const rowHeight = meta.isSubclass ? 28 : 32;
        
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

      // Apply formatting to each row
      for (let i = 0; i < rowMetadata.length; i++) {
        const rowIndex = i + 1;
        const meta = rowMetadata[i];
        const member = meta.character;
        
        // Row background - alternating for better readability
        const isEvenRow = i % 2 === 0;
        const rowBg = meta.isSubclass 
          ? { red: 0.97, green: 0.97, blue: 0.98 }  // Light gray for subclasses
          : (isEvenRow ? { red: 1, green: 1, blue: 1 } : { red: 0.98, green: 0.98, blue: 0.99 });
        
        // Discord Name column (A)
        if (meta.isMain) {
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
                    fontFamily: 'Arial',
                    foregroundColor: { red: 0.1, green: 0.1, blue: 0.1 },
                    bold: true
                  },
                  horizontalAlignment: 'LEFT',
                  verticalAlignment: 'MIDDLE'
                }
              },
              fields: 'userEnteredFormat'
            }
          });
        } else {
          // Empty cells for subclasses and alts
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
                  backgroundColor: rowBg
                }
              },
              fields: 'userEnteredFormat(backgroundColor)'
            }
          });
        }

        // IGN column (B)
        const ignTextColor = meta.isSubclass 
          ? { red: 0.4, green: 0.4, blue: 0.5 }
          : { red: 0.1, green: 0.1, blue: 0.1 };
        
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
                  fontFamily: 'Arial',
                  foregroundColor: ignTextColor,
                  bold: !meta.isSubclass,
                  italic: meta.isSubclass
                },
                horizontalAlignment: meta.isSubclass ? 'CENTER' : 'LEFT',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat'
          }
        });

        // Type column (C) - colored pill
        const typeColor = meta.isSubclass
          ? { red: 0.65, green: 0.65, blue: 0.7 }
          : (meta.isMain ? { red: 0.3, green: 0.85, blue: 0.45 } : { red: 1, green: 0.6, blue: 0.2 });
        
        this.addPillCell(requests, sheetId, rowIndex, 2, typeColor, true, 9);
        
        // Class column (D) - colored pill
        const classColor = this.getClassColor(member.class);
        this.addPillCell(requests, sheetId, rowIndex, 3, classColor, true, 9);
        
        // Subclass column (E) - darker variant
        const subclassColor = {
          red: Math.max(classColor.red * 0.7, 0.2),
          green: Math.max(classColor.green * 0.7, 0.2),
          blue: Math.max(classColor.blue * 0.7, 0.2)
        };
        this.addPillCell(requests, sheetId, rowIndex, 4, subclassColor, true, 9);
        
        // Role column (F) - colored pill
        const roleColor = this.getRoleColor(member.role);
        this.addPillCell(requests, sheetId, rowIndex, 5, roleColor, true, 9);
        
        // Ability Score column (G) - colored pill with number
        if (member.ability_score && member.ability_score !== '') {
          const abilityColor = this.getAbilityScoreColor(member.ability_score);
          this.addPillCell(requests, sheetId, rowIndex, 6, abilityColor, true, 9, true);
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
        
        // Guild column (H) - colored pill
        if (member.guild && member.guild !== '') {
          const guildColor = this.getGuildColor(member.guild);
          this.addPillCell(requests, sheetId, rowIndex, 7, guildColor, true, 9);
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
        
        // Timezone and Registered columns (I, J) - plain text
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 8,
              endColumnIndex: 10
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: rowBg,
                textFormat: {
                  fontSize: 9,
                  fontFamily: 'Arial',
                  foregroundColor: { red: 0.4, green: 0.4, blue: 0.4 }
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat'
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
        console.log(`✅ [SHEETS] Applied ${requests.length} formatting requests`);
      }
    } catch (error) {
      console.error('❌ [SHEETS] Error applying hierarchical colors:', error.message);
    }
  }

  addPillCell(requests, sheetId, rowIndex, colIndex, bgColor, whiteText = true, fontSize = 10, isNumber = false) {
    const textColor = whiteText 
      ? { red: 1, green: 1, blue: 1 }
      : { red: 0.1, green: 0.1, blue: 0.1 };
    
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
              fontSize: fontSize,
              foregroundColor: textColor,
              fontFamily: 'Arial'
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
