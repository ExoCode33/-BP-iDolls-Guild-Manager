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

  // 🎨 Vibrant yet professional color palette for classes
  getClassColor(className) {
    const colors = {
      'Beat Performer': { red: 1, green: 0.4, blue: 0.7 },       // Vibrant pink
      'Frost Mage': { red: 0.4, green: 0.7, blue: 1 },          // Bright ice blue
      'Heavy Guardian': { red: 0.8, green: 0.6, blue: 0.4 },    // Rich bronze
      'Marksman': { red: 0.5, green: 0.9, blue: 0.4 },          // Fresh lime
      'Shield Knight': { red: 1, green: 0.85, blue: 0.3 },      // Rich gold
      'Stormblade': { red: 0.7, green: 0.4, blue: 1 },          // Vivid purple
      'Verdant Oracle': { red: 0.4, green: 0.9, blue: 0.6 },    // Bright emerald
      'Wind Knight': { red: 0.3, green: 0.85, blue: 0.95 }      // Bright cyan
    };
    return colors[className] || { red: 0.95, green: 0.95, blue: 0.95 };
  }

  // 🌟 Bold gradient ability score colors
  getAbilityScoreColor(score) {
    if (!score || score === '') return { red: 0.96, green: 0.96, blue: 0.96 };
    
    const numScore = parseInt(score);
    
    // Legendary tier - Deep purple
    if (numScore >= 30000) return { red: 0.6, green: 0.3, blue: 0.9 };
    // Epic tier - Magenta
    if (numScore >= 27000) return { red: 0.95, green: 0.4, blue: 0.85 };
    // Rare tier - Hot pink
    if (numScore >= 24000) return { red: 1, green: 0.5, blue: 0.7 };
    // Uncommon tier - Orange
    if (numScore >= 21000) return { red: 1, green: 0.6, blue: 0.3 };
    // Common tier - Gold
    if (numScore >= 18000) return { red: 1, green: 0.85, blue: 0.3 };
    // Beginner tier - Sky blue
    if (numScore >= 15000) return { red: 0.4, green: 0.75, blue: 1 };
    // Starter tier - Mint
    if (numScore >= 10000) return { red: 0.5, green: 0.9, blue: 0.7 };
    return { red: 0.9, green: 0.9, blue: 0.9 };
  }

  // 🎭 Bold role colors
  getRoleColor(role) {
    const roleColors = {
      'Tank': { red: 0.4, green: 0.6, blue: 0.9 },       // Bright blue
      'DPS': { red: 1, green: 0.4, blue: 0.4 },          // Bright red
      'Support': { red: 0.4, green: 0.85, blue: 0.5 }    // Bright green
    };
    return roleColors[role] || { red: 0.85, green: 0.85, blue: 0.85 };
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
                  top: 10,
                  bottom: 10,
                  left: 12,
                  right: 12
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
        },
        {
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              endRowIndex: dataRowCount + 1,
              startColumnIndex: 0,
              endColumnIndex: headerCount
            },
            left: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.92, green: 0.92, blue: 0.95 }
            },
            right: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.92, green: 0.92, blue: 0.95 }
            },
            innerHorizontal: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.95, green: 0.95, blue: 0.97 }
            },
            innerVertical: {
              style: 'SOLID',
              width: 1,
              color: { red: 0.95, green: 0.95, blue: 0.97 }
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
                  ? { red: 0.97, green: 0.96, blue: 0.99 }    // Light purple tint
                  : { red: 1, green: 1, blue: 1 }              // Pure white
              }
            },
            fields: 'userEnteredFormat.backgroundColor'
          }
        });
      }

      // Add bottom border to last row for clean finish
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

      // Combine main and alt characters into one array
      const allMembers = [];
      
      // Add main characters
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
      
      // Add alt characters
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

      // Sort: Main characters first, then alts, both sorted by Discord name
      allMembers.sort((a, b) => {
        if (a.isMain !== b.isMain) {
          return a.isMain ? -1 : 1; // Mains first
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

      console.log(`📊 [SHEETS] Applying colors to all members...`);
      await this.applyMemberListColors('Member List', allMembers);

      console.log(`✅ [SHEETS] Member List synced successfully! (${mainCharacters.length} main + ${altCharacters.length} alts = ${totalMembers} total)`);
    } catch (error) {
      console.error('❌ [SHEETS] Error syncing member list:', error.message);
    }
  }

  async applyMemberListColors(sheetName, members) {
    if (!this.sheets || members.length === 0) return;

    try {
      console.log(`🎨 [SHEETS] Applying colorful formatting to ${members.length} members...`);
      
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;
      const requests = [];

      // Set column widths for Member List
      requests.push(
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 160 }, fields: 'pixelSize' } },  // Discord Name
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } },  // IGN
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 80 }, fields: 'pixelSize' } },   // Type
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 150 }, fields: 'pixelSize' } },  // Class
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 }, properties: { pixelSize: 130 }, fields: 'pixelSize' } },  // Subclass
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 5, endIndex: 6 }, properties: { pixelSize: 100 }, fields: 'pixelSize' } },  // Role
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 6, endIndex: 7 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },  // Ability Score
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 7, endIndex: 8 }, properties: { pixelSize: 120 }, fields: 'pixelSize' } },  // Guild
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 8, endIndex: 9 }, properties: { pixelSize: 200 }, fields: 'pixelSize' } },  // Timezone
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 9, endIndex: 10 }, properties: { pixelSize: 120 }, fields: 'pixelSize' } }  // Registered
      );

      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        const rowIndex = i + 1;
        
        const classColor = this.getClassColor(member.class);
        const roleColor = this.getRoleColor(member.role);
        const abilityColor = member.ability_score ? this.getAbilityScoreColor(member.ability_score) : { red: 0.95, green: 0.95, blue: 0.95 };
        
        // Type column (Main/Alt) with vibrant badge-like colors
        const typeColor = member.isMain 
          ? { red: 0.3, green: 0.8, blue: 0.5 }    // Vibrant green for Main
          : { red: 1, green: 0.65, blue: 0.3 };     // Vibrant orange for Alt
        
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
                backgroundColor: typeColor,
                textFormat: {
                  bold: true,
                  fontSize: 10,
                  foregroundColor: { red: 1, green: 1, blue: 1 }
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        });

        // Class column with vibrant background and white text
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 3,
              endColumnIndex: 4
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: classColor,
                textFormat: {
                  bold: true,
                  fontSize: 10,
                  foregroundColor: { red: 1, green: 1, blue: 1 }
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                wrapStrategy: 'WRAP'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
          }
        });

        // Subclass column with lighter tint of class color
        const lighterColor = {
          red: Math.min(classColor.red + 0.15, 0.98),
          green: Math.min(classColor.green + 0.15, 0.98),
          blue: Math.min(classColor.blue + 0.15, 0.98)
        };
        
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 4,
              endColumnIndex: 5
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: lighterColor,
                textFormat: {
                  fontSize: 10,
                  foregroundColor: { red: 0.3, green: 0.3, blue: 0.35 }
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        });

        // Role column with vibrant colors and white text
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 5,
              endColumnIndex: 6
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: roleColor,
                textFormat: {
                  bold: true,
                  fontSize: 10,
                  foregroundColor: { red: 1, green: 1, blue: 1 }
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        });

        // Ability Score column with vibrant gradient tiers (only for main characters)
        if (member.ability_score && member.ability_score !== '') {
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
                  backgroundColor: abilityColor,
                  textFormat: {
                    bold: true,
                    fontSize: 10,
                    foregroundColor: { red: 1, green: 1, blue: 1 }
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE',
                  numberFormat: {
                    type: 'NUMBER',
                    pattern: '#,##0'
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,numberFormat)'
            }
          });
        }

        // Guild column (only for main characters)
        if (member.guild && member.guild !== '') {
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
                  backgroundColor: { red: 0.92, green: 0.88, blue: 0.98 },
                  textFormat: {
                    fontSize: 10,
                    bold: true,
                    foregroundColor: { red: 0.35, green: 0.2, blue: 0.65 }
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
            }
          });
        }
        
        // Timezone column (only for main characters)
        if (member.timezone && member.timezone !== '') {
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
                  backgroundColor: { red: 1, green: 0.95, blue: 0.85 },
                  textFormat: {
                    fontSize: 10,
                    foregroundColor: { red: 0.55, green: 0.4, blue: 0.15 }
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
            }
          });
        }
        
        // Registered column
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
                backgroundColor: { red: 0.94, green: 0.94, blue: 0.96 },
                textFormat: {
                  fontSize: 10,
                  foregroundColor: { red: 0.45, green: 0.45, blue: 0.5 }
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
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
        console.log(`✅ [SHEETS] Applied ${requests.length} color formats to Member List`);
      }
    } catch (error) {
      console.error('❌ [SHEETS] Error applying member list colors:', error.message);
    }
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
