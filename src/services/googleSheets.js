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

  // 🎨 Pill-style color palette for classes
  getClassColor(className) {
    const colors = {
      'Beat Performer': { red: 1, green: 0.4, blue: 0.7 },       // Vibrant pink
      'Frost Mage': { red: 0.4, green: 0.7, blue: 1 },          // Bright ice blue
      'Heavy Guardian': { red: 0.8, green: 0.6, blue: 0.4 },    // Rich bronze
      'Marksman': { red: 0.8, green: 0.9, blue: 0.3 },          // Yellow-green
      'Shield Knight': { red: 1, green: 0.85, blue: 0.3 },      // Rich gold
      'Stormblade': { red: 0.7, green: 0.4, blue: 1 },          // Vivid purple
      'Verdant Oracle': { red: 0.4, green: 0.9, blue: 0.6 },    // Bright emerald
      'Wind Knight': { red: 0.3, green: 0.85, blue: 0.95 }      // Bright cyan
    };
    return colors[className] || { red: 0.9, green: 0.9, blue: 0.9 };
  }

  // 🌟 Ability score gradient colors
  getAbilityScoreColor(score) {
    if (!score || score === '') return { red: 0.94, green: 0.94, blue: 0.94 };
    
    const numScore = parseInt(score);
    
    // Legendary - Deep purple
    if (numScore >= 30000) return { red: 0.6, green: 0.3, blue: 0.9 };
    // Epic - Magenta
    if (numScore >= 27000) return { red: 0.95, green: 0.4, blue: 0.85 };
    // Rare - Hot pink
    if (numScore >= 24000) return { red: 1, green: 0.5, blue: 0.7 };
    // Uncommon - Orange
    if (numScore >= 21000) return { red: 1, green: 0.6, blue: 0.3 };
    // Common - Gold
    if (numScore >= 18000) return { red: 1, green: 0.85, blue: 0.3 };
    // Beginner - Sky blue
    if (numScore >= 15000) return { red: 0.4, green: 0.75, blue: 1 };
    // Starter - Mint
    if (numScore >= 10000) return { red: 0.5, green: 0.9, blue: 0.7 };
    return { red: 0.88, green: 0.88, blue: 0.88 };
  }

  // 🎭 Role colors
  getRoleColor(role) {
    const roleColors = {
      'Tank': { red: 0.4, green: 0.6, blue: 0.9 },       // Bright blue
      'DPS': { red: 1, green: 0.4, blue: 0.4 },          // Bright red
      'Support': { red: 0.4, green: 0.85, blue: 0.5 }    // Bright green
    };
    return roleColors[role] || { red: 0.8, green: 0.8, blue: 0.8 };
  }

  // 🏰 Guild colors (generate from guild name for variety)
  getGuildColor(guildName) {
    const guildColors = {
      'NA': { red: 0.5, green: 0.7, blue: 1 },
      'EU': { red: 0.5, green: 0.9, blue: 0.5 },
      'SEA': { red: 1, green: 0.7, blue: 0.4 },
      'SA': { red: 1, green: 0.5, blue: 0.5 }
    };
    
    // Check if it's a region code
    if (guildColors[guildName]) {
      return guildColors[guildName];
    }
    
    // Generate color based on guild name hash
    let hash = 0;
    for (let i = 0; i < guildName.length; i++) {
      hash = guildName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash % 360);
    return this.hslToRgb(hue / 360, 0.7, 0.75);
  }

  // Helper to convert HSL to RGB
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
                hideGridlines: false
              },
              tabColor: {
                red: 0.5,
                green: 0.3,
                blue: 0.95
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
                  red: 0.4,
                  green: 0.25,
                  blue: 0.85
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
                  top: 12,
                  bottom: 12,
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
              style: 'SOLID',
              width: 3,
              color: { red: 0.4, green: 0.25, blue: 0.85 }
            }
          }
        }
      ];

      // Alternating row colors with better contrast
      for (let i = 1; i <= dataRowCount; i++) {
        const isEvenRow = i % 2 === 0;
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: i,
              endRowIndex: i + 1,
              startColumnIndex: 0,
              endColumnIndex: headerCount
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: isEvenRow 
                  ? { red: 0.97, green: 0.97, blue: 0.98 }    // Light gray
                  : { red: 1, green: 1, blue: 1 }              // Pure white
              }
            },
            fields: 'userEnteredFormat.backgroundColor'
          }
        });
      }

      // Add bottom border to last row
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
            style: 'SOLID',
            width: 2,
            color: { red: 0.4, green: 0.25, blue: 0.85 }
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

  async syncMemberList(mainCharacters, altCharacters) {
    if (!this.sheets) return;

    try {
      const totalMembers = mainCharacters.length + altCharacters.length;
      console.log(`📊 [SHEETS] Starting sync for ${totalMembers} total members (${mainCharacters.length} main + ${altCharacters.length} alts)...`);
      
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

      // Combine main and alt characters
      const allMembers = [];
      
      mainCharacters.forEach(char => {
        allMembers.push({
          type: 'Main',
          discord_name: char.discord_name,
          ign: char.ign,
          class: char.class,
          subclass: char.subclass,
          role: char.role,
          ability_score: char.ability_score || '',
          guild: char.guild || '',
          timezone: char.timezone || '',
          created_at: char.created_at,
          isMain: true
        });
      });
      
      altCharacters.forEach(alt => {
        allMembers.push({
          type: 'Alt',
          discord_name: alt.discord_name || 'Unknown',
          ign: alt.ign,
          class: alt.class,
          subclass: alt.subclass,
          role: alt.role,
          ability_score: '',
          guild: '',
          timezone: '',
          created_at: alt.created_at,
          isMain: false
        });
      });

      // Sort: Main first, then alts, both sorted by Discord name
      allMembers.sort((a, b) => {
        if (a.isMain !== b.isMain) {
          return a.isMain ? -1 : 1;
        }
        return a.discord_name.localeCompare(b.discord_name);
      });

      const rows = allMembers.map(member => [
        member.discord_name,
        member.ign,
        member.type,
        member.class,
        member.subclass,
        member.role,
        member.ability_score,
        member.guild,
        member.timezone,
        new Date(member.created_at).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        })
      ]);

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

      console.log(`📊 [SHEETS] Applying pill-style colors...`);
      await this.applyPillStyleColors('Member List', allMembers);

      console.log(`✅ [SHEETS] Member List synced successfully! (${mainCharacters.length} main + ${altCharacters.length} alts = ${totalMembers} total)`);
    } catch (error) {
      console.error('❌ [SHEETS] Error syncing member list:', error.message);
    }
  }

  async applyPillStyleColors(sheetName, members) {
    if (!this.sheets || members.length === 0) return;

    try {
      console.log(`🎨 [SHEETS] Applying pill-style formatting to ${members.length} members...`);
      
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
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 70 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 5, endIndex: 6 }, properties: { pixelSize: 80 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 6, endIndex: 7 }, properties: { pixelSize: 110 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 7, endIndex: 8 }, properties: { pixelSize: 80 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 8, endIndex: 9 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } },
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 9, endIndex: 10 }, properties: { pixelSize: 120 }, fields: 'pixelSize' } }
      );

      // Increase row height for pill effect (32px like reference)
      for (let i = 0; i < members.length; i++) {
        requests.push({
          updateDimensionProperties: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: i + 1,
              endIndex: i + 2
            },
            properties: {
              pixelSize: 32
            },
            fields: 'pixelSize'
          }
        });
      }

      // Apply base formatting to ALL data cells first
      for (let i = 0; i < members.length; i++) {
        const rowIndex = i + 1;
        
        // Base white background for Discord Name and IGN
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 0,
              endColumnIndex: 2
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 1, green: 1, blue: 1 },
                textFormat: {
                  fontSize: 10,
                  fontFamily: 'Arial',
                  foregroundColor: { red: 0.1, green: 0.1, blue: 0.1 }
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat'
          }
        });

        // Light gray for Timezone and Registered
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
                backgroundColor: { red: 0.95, green: 0.95, blue: 0.96 },
                textFormat: {
                  fontSize: 10,
                  fontFamily: 'Arial',
                  foregroundColor: { red: 0.3, green: 0.3, blue: 0.35 }
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat'
          }
        });
      }

      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        const rowIndex = i + 1;
        
        const classColor = this.getClassColor(member.class);
        const roleColor = this.getRoleColor(member.role);
        const abilityColor = member.ability_score ? this.getAbilityScoreColor(member.ability_score) : null;
        
        // Type column - pill badge with white text
        const typeColor = member.isMain 
          ? { red: 0.4, green: 0.9, blue: 0.5 }
          : { red: 1, green: 0.7, blue: 0.3 };
        
        this.addPillCell(requests, sheetId, rowIndex, 2, typeColor, true, 10);
        
        // Class column - bold pill with white text
        this.addPillCell(requests, sheetId, rowIndex, 3, classColor, true, 10);
        
        // Subclass column - darker variant with white text
        const subclassColor = {
          red: Math.max(classColor.red * 0.7, 0.2),
          green: Math.max(classColor.green * 0.7, 0.2),
          blue: Math.max(classColor.blue * 0.7, 0.2)
        };
        this.addPillCell(requests, sheetId, rowIndex, 4, subclassColor, true, 10);
        
        // Role column - white text pill
        this.addPillCell(requests, sheetId, rowIndex, 5, roleColor, true, 10);
        
        // Ability Score - gradient pill with white text
        if (member.ability_score && member.ability_score !== '' && abilityColor) {
          this.addPillCell(requests, sheetId, rowIndex, 6, abilityColor, true, 10, true);
        }
        
        // Guild - colored pill with white text
        if (member.guild && member.guild !== '') {
          const guildColor = this.getGuildColor(member.guild);
          this.addPillCell(requests, sheetId, rowIndex, 7, guildColor, true, 10);
        }
        
        // Add white borders between ALL pills for separation - spans entire row
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
              color: { red: 1, green: 1, blue: 1 }
            },
            right: {
              style: 'SOLID',
              width: 2,
              color: { red: 1, green: 1, blue: 1 }
            },
            top: {
              style: 'SOLID',
              width: 2,
              color: { red: 1, green: 1, blue: 1 }
            },
            bottom: {
              style: 'SOLID',
              width: 2,
              color: { red: 1, green: 1, blue: 1 }
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
        console.log(`✅ [SHEETS] Applied ${requests.length} pill-style formats`);
      }
    } catch (error) {
      console.error('❌ [SHEETS] Error applying pill-style colors:', error.message);
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

  async fullSync(mainCharacters, altCharacters) {
    const timestamp = new Date().toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    console.log(`\n🔄 [SHEETS] ========== FULL SYNC STARTED (${timestamp}) ==========`);
    
    await this.syncMemberList(mainCharacters, altCharacters);
    
    console.log(`✅ [SHEETS] ========== FULL SYNC COMPLETE (${timestamp}) ==========\n`);
  }
}

export default new GoogleSheetsService();
