import { google } from 'googleapis';
import config from '../utils/config.js';
import logger from '../utils/logger.js';

class SheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.initialize();
  }

  initialize() {
    try {
      this.auth = new google.auth.JWT(
        config.sheets.serviceAccountEmail,
        null,
        config.sheets.privateKey,
        ['https://www.googleapis.com/auth/spreadsheets']
      );
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      logger.success('Sheets service initialized');
    } catch (error) {
      logger.error(`Sheets init failed: ${error.message}`);
    }
  }

  async syncAllCharacters(characters) {
    try {
      const rows = characters.map(char => [
        char.user_id,
        char.ign,
        char.class,
        char.subclass,
        char.ability_score,
        char.guild || '',
        char.role,
        char.character_type,
        char.parent_ign || '',
        new Date(char.created_at).toISOString(),
        new Date(char.updated_at).toISOString()
      ]);

      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: config.sheets.id,
        range: 'Sheet1!A2:K'
      });

      if (rows.length > 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: config.sheets.id,
          range: 'Sheet1!A2',
          valueInputOption: 'RAW',
          resource: { values: rows }
        });
      }

      logger.success(`Synced ${rows.length} characters to Sheets`);
    } catch (error) {
      logger.error(`Sheets sync failed: ${error.message}`);
    }
  }
}

export default new SheetsService();
