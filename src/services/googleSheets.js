import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    // 🎨 CLASS LOGO URLs - GitHub Raw URLs
    // Base URL for your GitHub repository's raw content
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

  getAbilityScoreColor(score) {
    if (!score || score === '') return null;
    
    const numScore = parseInt(score);
    
    if (numScore >= 40000) return { red: 0.61, green: 0.15, blue: 0.69 };
    if (numScore >= 30000) return { red: 0.96, green: 0.26, blue: 0.21 };
    if (numScore >= 20000) return { red: 0.97, green: 0.73, blue: 0.15 };
    if (numScore >= 10000) return { red: 0.30, green: 0.69, blue: 0.31 };
    return { red: 0.62, green: 0.64, blue: 0.66 };
  }

  getClassColor(className) {
    const classColors = {
      'Beat Performer': { red: 0.58, green: 0.29, blue: 0.82 }, // Purple
      'Frost Mage': { red: 0.26, green: 0.71, blue: 0.89 }, // Light Blue
      'Heavy Guardian': { red: 0.42, green: 0.56, blue: 0.14 }, // Olive/Green
      'Marksman': { red: 0.80, green: 0.47, blue: 0.13 }, // Orange/Brown
      'Shield Knight': { red: 0.13, green: 0.59, blue: 0.95 }, // Blue
      'Stormblade': { red: 0.61, green: 0.15, blue: 0.69 }, // Purple/Magenta
      'Verdant Oracle': { red: 0.98, green: 0.74, blue: 0.02 }, // Gold/Yellow
      'Wind Knight': { red: 0.40, green: 0.85, blue: 0.92 } // Cyan
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

  getTimezoneOffset(timezone) {
    // Common timezone offsets from UTC
    const timezoneOffsets = {
      'PST': -8, 'PDT': -7,
      'MST': -7, 'MDT': -6,
      'CST': -6, 'CDT': -5,
      'EST': -5, 'EDT': -4,
      'UTC': 0, 'GMT': 0,
      'CET': 1, 'CEST': 2,
      'JST': 9, 'KST': 9,
      'AEST': 10, 'AEDT': 11,
      // Add more as needed
    };
    
    // Try to extract timezone abbreviation
    const tzMatch = timezone.match(/\b([A-Z]{3,4})\b/);
    if (tzMatch) {
      const tz = tzMatch[1];
      return timezoneOffsets[tz] || 0;
    }
    
    return 0;
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
    if (!this.sheets) return;

    try {
      const { queries } = await import('../database/queries.js');
      
      const headers = [
        'Discord Name',
        'IGN',
        'Type',
        'Icon',
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
          // Silently continue
        }
        
        let discordName = '';
        
        if (mainChar) {
          discordName = mainChar.discord_name;
          
          rows.push([
            discordName,
            mainChar.ign,
            'Main',
            '', // Icon column (will be replaced with IMAGE)
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
              '', // Icon column
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
            '', // Icon column
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
              '', // Icon column
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

      // Clear and write data
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Member List!A:K',
      });

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Member List!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers, ...rows],
        },
      });

      // Apply formatting
      await this.formatCleanSheet('Member List', headers.length, rows.length);
      await this.applyCleanDesign('Member List', rowMetadata);
      await this.addClassLogos('Member List', rowMetadata);
      await this.enableAutoRecalculation();

    } catch (error) {
      console.error('❌ [SHEETS] Sync error:', error.message);
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
                autoRecalc: 'MINUTE'
              },
              fields: 'iterativeCalculationSettings,autoRecalc'
            }
          }]
        }
      });
    } catch (error) {
      // Silently fail
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
      const requests = [];

      // Update values to include IMAGE formula in Icon column (D) and timezone formulas
      const valueUpdates = [];
      
      for (let i = 0; i < rowMetadata.length; i++) {
        const rowIndex = i + 2;
        const meta = rowMetadata[i];
        const member = meta.character;
        
        const imageUrl = this.classLogos[member.class];
        
        if (imageUrl) {
          valueUpdates.push({
            range: `D${rowIndex}`,
            values: [[`=IMAGE("${imageUrl}",4,28,28)`]]
          });
        }

        if (meta.timezone && meta.timezone !== '') {
          const offset = this.getTimezoneOffset(meta.timezone);
          const formula = `="${meta.timezone} " & TEXT(NOW() + (${offset}/24), "h:mm AM/PM")`;
          
          valueUpdates.push({
            range: `J${rowIndex}`,
            values: [[formula]]
          });
        }
      }

      // Batch update all the IMAGE formulas and timezone formulas
      if (valueUpdates.length > 0) {
        for (const update of valueUpdates) {
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: update.range,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: update.values
            }
          });
        }
      }

      if (requests.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < requests.length; i += batchSize) {
          const batch = requests.slice(i, i + batchSize);
          try {
            await this.sheets.spreadsheets.batchUpdate({
              spreadsheetId: this.spreadsheetId,
              requestBody: { requests: batch }
            });
          } catch (batchError) {
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

      // Merge Icon (D) and Class (E) header cells to display "Class"
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
      
      // Column widths
      const columnWidths = [160, 150, 95, 50, 180, 145, 85, 125, 105, 170, 105];
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

        if (meta.isMain) {
          this.addPillBadge(requests, sheetId, rowIndex, 2, { red: 0.26, green: 0.59, blue: 0.98 });
        } else if (meta.isAlt) {
          this.addPillBadge(requests, sheetId, rowIndex, 2, { red: 0.96, green: 0.49, blue: 0.13 });
        } else {
          this.addCleanTextCell(requests, sheetId, rowIndex, 2, 'Subclass', rowBg);
        }
        
        this.addCleanTextCell(requests, sheetId, rowIndex, 3, '', rowBg);
        
        const classColor = this.getClassColor(member.class);
        this.addColoredTextCell(requests, sheetId, rowIndex, 4, classColor, rowBg);
        this.addColoredTextCell(requests, sheetId, rowIndex, 5, classColor, rowBg);
        
        const roleColor = this.getRoleColor(member.role);
        this.addPillBadge(requests, sheetId, rowIndex, 6, roleColor);
        
        if (member.ability_score && member.ability_score !== '') {
          const abilityColor = this.getAbilityScoreColor(member.ability_score);
          this.addColoredTextCell(requests, sheetId, rowIndex, 7, abilityColor, rowBg, true);
        } else {
          this.addCleanTextCell(requests, sheetId, rowIndex, 7, '', rowBg);
        }
        
        this.addBoldTextCell(requests, sheetId, rowIndex, 8, rowBg);
        this.addTimezoneCell(requests, sheetId, rowIndex, 9, meta.timezone, rowBg);
        this.addBoldTextCell(requests, sheetId, rowIndex, 10, rowBg);

        const isLastOfGroup = (i === rowMetadata.length - 1) || 
                              (i + 1 < rowMetadata.length && rowMetadata[i + 1].isFirstOfUser);
        
        requests.push({
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 0,
              endColumnIndex: 11
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
                endColumnIndex: 11
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
  }

  async fullSync(allCharactersWithSubclasses) {
    const timestamp = new Date().toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    });
    console.log(`🔄 [SHEETS] Sync started (${allCharactersWithSubclasses.length} chars) - ${timestamp}`);
    
    await this.syncMemberList(allCharactersWithSubclasses);
    
    console.log(`✅ [SHEETS] Sync complete - ${timestamp}`);
  }
}

export default new GoogleSheetsService();
