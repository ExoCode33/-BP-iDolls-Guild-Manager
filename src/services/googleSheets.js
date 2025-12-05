import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    // 🎨 CLASS LOGO URLs - Uses Railway public URL
    // Railway automatically provides RAILWAY_PUBLIC_DOMAIN
    const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
    const baseUrl = process.env.RAILWAY_PUBLIC_URL || 
                    (railwayDomain ? `https://${railwayDomain}` : 'http://localhost:3000');
    
    this.classLogos = {
      'Beat Performer': `${baseUrl}/class-icons/BeatPerformer.png`,
      'Frost Mage': `${baseUrl}/class-icons/FrostMage.png`,
      'Heavy Guardian': `${baseUrl}/class-icons/HeavyGuardian.png`,
      'Marksman': `${baseUrl}/class-icons/Marksman.png`,
      'Shield Knight': `${baseUrl}/class-icons/ShieldKnight.png`,
      'Stormblade': `${baseUrl}/class-icons/StormBlade.png`,
      'Verdant Oracle': `${baseUrl}/class-icons/VerdantOracle.png`,
      'Wind Knight': `${baseUrl}/class-icons/WindKnight.png`
    };
    
    console.log(`🖼️ [INIT] Class icons base URL: ${baseUrl}`);
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
      
      // Log the actual URLs that will be used
      console.log('📸 Example class icon URL:', this.classLogos['Beat Performer']);
      
      return true;
    } catch (error) {
      console.error('⚠️  Google Sheets initialization failed:', error.message);
      return false;
    }
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
      console.log(`📊 [SHEETS] Applying clean formatting to ${sheetName}...`);
      
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

      console.log(`✅ [SHEETS] Clean formatting applied to ${sheetName}`);
    } catch (error) {
      console.error(`Error formatting ${sheetName}:`, error.message);
    }
  }

  async syncMemberList(allCharactersWithSubclasses) {
    if (!this.sheets) return;

    try {
      console.log(`📊 [SHEETS] Starting clean sync...`);
      
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
              registeredDate: this.formatDate(alt.created_at),
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

      console.log(`📊 [SHEETS] Applying clean formatting...`);
      await this.formatCleanSheet('Member List', headers.length, rows.length);

      console.log(`📊 [SHEETS] Applying clean design...`);
      await this.applyCleanDesign('Member List', rowMetadata);

      console.log(`📊 [SHEETS] Adding class logos...`);
      await this.addClassLogos('Member List', rowMetadata);

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

  async addClassLogos(sheetName, rowMetadata) {
    if (!this.sheets || rowMetadata.length === 0) return;

    try {
      console.log(`🖼️ [SHEETS] Adding class logos...`);
      
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;
      const requests = [];

      // Add logo to each Class cell (Column D)
      for (let i = 0; i < rowMetadata.length; i++) {
        const rowIndex = i + 1;
        const meta = rowMetadata[i];
        const member = meta.character;
        
        const imageUrl = this.classLogos[member.class];
        
        if (imageUrl) {
          console.log(`🖼️ [SHEETS] Row ${rowIndex}: ${member.class} -> ${imageUrl}`);
          
          // Use IMAGE function with semicolon separator (for all locales)
          // Mode 4 = Custom size, 24x24 pixels
          requests.push({
            updateCells: {
              range: {
                sheetId: sheetId,
                startRowIndex: rowIndex,
                endRowIndex: rowIndex + 1,
                startColumnIndex: 3, // Column D (Class)
                endColumnIndex: 4
              },
              rows: [{
                values: [{
                  userEnteredValue: {
                    formulaValue: `=IMAGE("${imageUrl}"; 4; 24; 24)`
                  },
                  userEnteredFormat: {
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE',
                    textFormat: {
                      fontSize: 10,
                      fontFamily: 'Google Sans',
                      foregroundColor: { red: 0.20, green: 0.22, blue: 0.24 }
                    }
                  }
                }]
              }],
              fields: 'userEnteredValue,userEnteredFormat'
            }
          });
        }
      }

      if (requests.length > 0) {
        console.log(`🖼️ [SHEETS] Sending ${requests.length} image requests...`);
        const batchSize = 50;
        for (let i = 0; i < requests.length; i += batchSize) {
          const batch = requests.slice(i, i + batchSize);
          try {
            await this.sheets.spreadsheets.batchUpdate({
              spreadsheetId: this.spreadsheetId,
              requestBody: { requests: batch }
            });
            console.log(`✅ [SHEETS] Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(requests.length / batchSize)}`);
          } catch (batchError) {
            console.error(`❌ [SHEETS] Batch ${Math.floor(i / batchSize) + 1} failed:`, batchError.message);
          }
        }
        console.log(`✅ [SHEETS] Completed ${requests.length} class logo requests`);
      }
    } catch (error) {
      console.error('❌ [SHEETS] Error adding class logos:', error.message);
    }
  }

  async applyCleanDesign(sheetName, rowMetadata) {
    if (!this.sheets || rowMetadata.length === 0) return;

    try {
      console.log(`🎨 [SHEETS] Applying clean design to ${rowMetadata.length} rows...`);
      
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return;

      const sheetId = sheet.properties.sheetId;
      const requests = [];

      // Column widths
      const columnWidths = [160, 150, 95, 180, 145, 85, 125, 105, 170, 105];
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

      let lastDiscordName = '';

      for (let i = 0; i < rowMetadata.length; i++) {
        const rowIndex = i + 1;
        const meta = rowMetadata[i];
        const member = meta.character;
        
        const isNewUserGroup = meta.discordName !== lastDiscordName && meta.discordName !== '';
        if (isNewUserGroup) {
          lastDiscordName = meta.discordName;
        }
        
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

        // Type (C)
        if (meta.isMain) {
          this.addPillBadge(requests, sheetId, rowIndex, 2, { red: 0.26, green: 0.59, blue: 0.98 });
        } else if (meta.isAlt) {
          this.addPillBadge(requests, sheetId, rowIndex, 2, { red: 0.96, green: 0.49, blue: 0.13 });
        } else {
          this.addCleanTextCell(requests, sheetId, rowIndex, 2, 'Subclass', rowBg);
        }
        
        // Class (D) - Will have logo added separately
        this.addCleanTextCell(requests, sheetId, rowIndex, 3, member.class, rowBg);
        
        // Subclass (E)
        this.addCleanTextCell(requests, sheetId, rowIndex, 4, member.subclass, rowBg);
        
        // Role (F)
        const roleColor = this.getRoleColor(member.role);
        this.addPillBadge(requests, sheetId, rowIndex, 5, roleColor);
        
        // Ability Score (G)
        if (member.ability_score && member.ability_score !== '') {
          const abilityColor = this.getAbilityScoreColor(member.ability_score);
          this.addPillBadge(requests, sheetId, rowIndex, 6, abilityColor, true);
        } else {
          this.addCleanTextCell(requests, sheetId, rowIndex, 6, '', rowBg);
        }
        
        // Guild (H)
        this.addCleanTextCell(requests, sheetId, rowIndex, 7, member.guild || '', rowBg);
        
        // Timezone (I)
        this.addSubtleTextCell(requests, sheetId, rowIndex, 8, rowBg);
        
        // Registered (J)
        this.addSubtleTextCell(requests, sheetId, rowIndex, 9, rowBg);

        // Borders
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

      if (requests.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < requests.length; i += batchSize) {
          const batch = requests.slice(i, i + batchSize);
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: { requests: batch }
          });
        }
        console.log(`✅ [SHEETS] Applied ${requests.length} clean styling requests`);
      }
    } catch (error) {
      console.error('❌ [SHEETS] Error applying clean design:', error.message);
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
