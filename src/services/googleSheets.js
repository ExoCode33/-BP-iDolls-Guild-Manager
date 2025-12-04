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

  // 🎨 Enhanced pill-style color palette with better saturation
  getClassColor(className) {
    const colors = {
      'Beat Performer': { red: 0.95, green: 0.3, blue: 0.65 },
      'Frost Mage': { red: 0.2, green: 0.6, blue: 1 },
      'Heavy Guardian': { red: 0.75, green: 0.5, blue: 0.3 },
      'Marksman': { red: 0.7, green: 0.85, blue: 0.2 },
      'Shield Knight': { red: 1, green: 0.75, blue: 0.2 },
      'Stormblade': { red: 0.6, green: 0.3, blue: 0.95 },
      'Verdant Oracle': { red: 0.3, green: 0.85, blue: 0.5 },
      'Wind Knight': { red: 0.2, green: 0.8, blue: 0.95 }
    };
    return colors[className] || { red: 0.85, green: 0.85, blue: 0.85 };
  }

  // 🌟 Enhanced ability score gradient with better contrast
  getAbilityScoreColor(score) {
    if (!score || score === '') return { red: 0.92, green: 0.92, blue: 0.92 };
    
    const numScore = parseInt(score);
    
    if (numScore >= 30000) return { red: 0.5, green: 0.2, blue: 0.85 };
    if (numScore >= 27000) return { red: 0.9, green: 0.3, blue: 0.8 };
    if (numScore >= 24000) return { red: 0.95, green: 0.4, blue: 0.65 };
    if (numScore >= 21000) return { red: 1, green: 0.55, blue: 0.25 };
    if (numScore >= 18000) return { red: 1, green: 0.8, blue: 0.2 };
    if (numScore >= 15000) return { red: 0.3, green: 0.7, blue: 1 };
    if (numScore >= 10000) return { red: 0.4, green: 0.85, blue: 0.65 };
    return { red: 0.8, green: 0.8, blue: 0.8 };
  }

  // 🎭 Enhanced role colors with better saturation
  getRoleColor(role) {
    const roleColors = {
      'Tank': { red: 0.3, green: 0.55, blue: 0.9 },
      'DPS': { red: 0.95, green: 0.3, blue: 0.3 },
      'Support': { red: 0.3, green: 0.8, blue: 0.45 }
    };
    return roleColors[role] || { red: 0.7, green: 0.7, blue: 0.7 };
  }

  // 🏰 Enhanced guild colors
  getGuildColor(guildName) {
    const guildColors = {
      'NA': { red: 0.4, green: 0.65, blue: 1 },
      'EU': { red: 0.4, green: 0.85, blue: 0.45 },
      'SEA': { red: 1, green: 0.65, blue: 0.3 },
      'SA': { red: 1, green: 0.45, blue: 0.45 }
    };
    
    if (guildColors[guildName]) {
      return guildColors[guildName];
    }
    
    let hash = 0;
    for (let i = 0; i < guildName.length; i++) {
      hash = guildName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash % 360);
    return this.hslToRgb(hue / 360, 0.75, 0.65);
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
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              gridProperties: {
                frozenRowCount: 1,
                hideGridlines: true
              },
              tabColor: {
                red: 0.3,
                green: 0.15,
                blue: 0.7
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
                  red: 0.18,
                  green: 0.08,
                  blue: 0.45
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
        },
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
                  fontFamily: 'Google Sans'
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                padding: {
                  top: 8,
                  bottom: 8,
                  left: 10,
                  right: 10
                }
              }
            },
            fields: 'userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,padding)'
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
              style: 'SOLID_MEDIUM',
              width: 3,
              color: { red: 0.18, green: 0.08, blue: 0.45 }
            }
          }
        }
      ];

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
              color: { red: 0.88, green: 0.88, blue: 0.9 }
            }
          }
        });
      }

      requests.push({
        updateBorders: {
          range: {
            sheetId: sheetId,
            startRowIndex: dataRowCount,
            endRowIndex: dataRowCount + 1,
            startColumnIndex: 0,
            endColumnIndex: headerCount
          },
          bottom: {
            style: 'SOLID_MEDIUM',
            width: 3,
            color: { red: 0.18, green: 0.08, blue: 0.45 }
          }
        }
      });

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
      const rowMetadata = []; // Track what each row represents for styling

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
        // Separate main, alts, and subclasses
        const mainChar = userChars.find(c => c.character_type === 'main');
        const mainSubclasses = userChars.filter(c => c.character_type === 'main_subclass');
        const alts = userChars.filter(c => c.character_type === 'alt');
        
        // Add main character
        if (mainChar) {
          rows.push([
            mainChar.discord_name,
            mainChar.ign,
            'Main',
            mainChar.class,
            mainChar.subclass,
            mainChar.role,
            mainChar.ability_score || '',
            mainChar.guild || '',
            mainChar.timezone || '',
            new Date(mainChar.created_at).toLocaleDateString('en-US', { 
              month: '2-digit', 
              day: '2-digit',
              year: 'numeric'
            })
          ]);

          rowMetadata.push({
            character: mainChar,
            isSubclass: false,
            parentId: null
          });

          // Add main's subclasses immediately after
          mainSubclasses.forEach(subclass => {
            rows.push([
              '', // Empty discord name
              `    ↳ ${subclass.ign || '(no name)'}`, // Indented IGN
              '  ↳ Subclass',
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
              parentId: mainChar.id
            });
          });
        }

        // Add each alt and its subclasses
        alts.forEach(alt => {
          rows.push([
            mainChar ? '' : alt.discord_name, // Only show discord name if no main
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
            parentId: null
          });

          // Add this alt's subclasses immediately after
          const altSubclasses = userChars.filter(c => 
            c.character_type === 'alt_subclass' && 
            c.parent_character_id === alt.id
          );

          altSubclasses.forEach(subclass => {
            rows.push([
              '', // Empty discord name
              `    ↳ ${subclass.ign || '(no name)'}`, // Indented IGN
              '  ↳ Subclass',
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
              parentId: alt.id
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

      console.log(`📊 [SHEETS] Applying hierarchical pill-style colors...`);
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
      requests.push(
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 160 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 120 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 5, endIndex: 6 }, properties: { pixelSize: 80 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 6, endIndex: 7 }, properties: { pixelSize: 110 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 7, endIndex: 8 }, properties: { pixelSize: 80 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 8, endIndex: 9 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 9, endIndex: 10 }, properties: { pixelSize: 120 }, fields: 'pixelSize' } }
      );

      // Increase row height for better pill effect
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
              pixelSize: 34
            },
            fields: 'pixelSize'
          }
        });
      }

      // Apply base formatting to ALL data cells
      for (let i = 0; i < rowMetadata.length; i++) {
        const rowIndex = i + 1;
        const meta = rowMetadata[i];
        
        // Different background for subclasses - slightly darker/indented look
        const bgColor = meta.isSubclass 
          ? { red: 0.95, green: 0.95, blue: 0.96 } // Slightly gray for subclasses
          : { red: 1, green: 1, blue: 1 }; // Pure white for main/alt
        
        // Discord Name column - different style for subclass rows
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
                backgroundColor: bgColor,
                textFormat: {
                  fontSize: 10,
                  fontFamily: 'Arial',
                  foregroundColor: { red: 0.15, green: 0.15, blue: 0.2 },
                  bold: !meta.isSubclass // Bold for main/alt, normal for subclass
                },
                horizontalAlignment: 'LEFT',
                verticalAlignment: 'MIDDLE',
                padding: meta.isSubclass ? {
                  left: 20 // Extra left padding for subclass rows
                } : undefined
              }
            },
            fields: 'userEnteredFormat'
          }
        });

        // IGN column - with indentation for subclasses
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
                backgroundColor: bgColor,
                textFormat: {
                  fontSize: 10,
                  fontFamily: meta.isSubclass ? 'Courier New' : 'Arial', // Monospace for arrow alignment
                  foregroundColor: meta.isSubclass 
                    ? { red: 0.4, green: 0.4, blue: 0.5 } // Lighter gray for subclass
                    : { red: 0.15, green: 0.15, blue: 0.2 },
                  bold: !meta.isSubclass,
                  italic: meta.isSubclass // Italic for subclass
                },
                horizontalAlignment: 'LEFT',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat'
          }
        });

        // Timezone and Registered columns
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
                backgroundColor: bgColor,
                textFormat: {
                  fontSize: 10,
                  fontFamily: 'Arial',
                  foregroundColor: { red: 0.35, green: 0.35, blue: 0.4 }
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat'
          }
        });
      }

      // Apply colored pills for each row
      for (let i = 0; i < rowMetadata.length; i++) {
        const member = rowMetadata[i].character;
        const rowIndex = i + 1;
        const isSubclass = rowMetadata[i].isSubclass;
        
        const classColor = this.getClassColor(member.class);
        const roleColor = this.getRoleColor(member.role);
        const abilityColor = member.ability_score ? this.getAbilityScoreColor(member.ability_score) : null;
        
        // Type column
        const typeColor = isSubclass
          ? { red: 0.7, green: 0.7, blue: 0.75 } // Gray for subclass
          : (member.character_type === 'main' ? { red: 0.3, green: 0.85, blue: 0.45 } : { red: 1, green: 0.65, blue: 0.25 });
        
        this.addPillCell(requests, sheetId, rowIndex, 2, typeColor, true, 10);
        
        // Class column
        this.addPillCell(requests, sheetId, rowIndex, 3, classColor, true, 10);
        
        // Subclass column - darker variant
        const subclassColor = {
          red: Math.max(classColor.red * 0.65, 0.15),
          green: Math.max(classColor.green * 0.65, 0.15),
          blue: Math.max(classColor.blue * 0.65, 0.15)
        };
        this.addPillCell(requests, sheetId, rowIndex, 4, subclassColor, true, 10);
        
        // Role column
        this.addPillCell(requests, sheetId, rowIndex, 5, roleColor, true, 10);
        
        // Ability Score
        if (member.ability_score && member.ability_score !== '' && abilityColor) {
          this.addPillCell(requests, sheetId, rowIndex, 6, abilityColor, true, 10, true);
        }
        
        // Guild
        if (member.guild && member.guild !== '') {
          const guildColor = this.getGuildColor(member.guild);
          this.addPillCell(requests, sheetId, rowIndex, 7, guildColor, true, 10);
        }
        
        // Add borders
        requests.push({
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 0,
              endColumnIndex: 10
            },
            left: {
              style: 'SOLID',
              width: 2,
              color: { red: 0.92, green: 0.92, blue: 0.94 }
            },
            right: {
              style: 'SOLID',
              width: 2,
              color: { red: 0.92, green: 0.92, blue: 0.94 }
            },
            top: {
              style: 'SOLID',
              width: 2,
              color: { red: 0.92, green: 0.92, blue: 0.94 }
            },
            bottom: {
              style: 'SOLID',
              width: 2,
              color: { red: 0.92, green: 0.92, blue: 0.94 }
            }
          }
        });
      }

      if (requests.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < requests.length; i += batchSize) {
          const batch = requests.slice(i, i + batchSize);
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: { requests: batch }
          });
        }
        console.log(`✅ [SHEETS] Applied ${requests.length} hierarchical formats`);
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
