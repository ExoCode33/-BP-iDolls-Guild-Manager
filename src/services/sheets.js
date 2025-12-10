import { google } from 'googleapis';
import config from '../utils/config.js';
import logger from '../utils/logger.js';

class SheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = config.sheets.id;
    this.lastSyncTime = 0;
    this.minSyncInterval = 30000;
    this.syncPending = false;
    this.syncTimeout = null;
  }

  async initialize() {
    try {
      if (!config.sheets.id || !config.sheets.serviceAccountEmail || !config.sheets.privateKey) {
        logger.warn('Google Sheets credentials not configured - skipping');
        return false;
      }

      this.auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: config.sheets.serviceAccountEmail,
          private_key: config.sheets.privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      logger.success('Sheets service initialized');
      return true;
    } catch (error) {
      logger.error(`Sheets init failed: ${error.message}`);
      return false;
    }
  }

  async syncAllCharacters(allCharactersWithSubclasses) {
    const now = Date.now();
    const timeSinceLastSync = now - this.lastSyncTime;
    
    if (timeSinceLastSync < this.minSyncInterval) {
      if (!this.syncPending) {
        this.syncPending = true;
        const waitTime = this.minSyncInterval - timeSinceLastSync;
        
        if (this.syncTimeout) clearTimeout(this.syncTimeout);
        
        this.syncTimeout = setTimeout(async () => {
          this.syncPending = false;
          await this.performSync(allCharactersWithSubclasses);
        }, waitTime);
      }
      return;
    }
    
    await this.performSync(allCharactersWithSubclasses);
  }

  async performSync(allCharactersWithSubclasses) {
    try {
      this.lastSyncTime = Date.now();
      
      if (!this.sheets) {
        await this.initialize();
        if (!this.sheets) {
          logger.warn('Sheets not initialized, skipping sync');
          return;
        }
      }

      await this.syncMemberList(allCharactersWithSubclasses);
      logger.success(`Synced ${allCharactersWithSubclasses.length} characters`);
    } catch (error) {
      logger.error(`Sheets sync failed: ${error.message}`);
      
      if (error.message.includes('Quota exceeded')) {
        this.minSyncInterval = Math.min(this.minSyncInterval * 2, 300000);
      }
    }
  }

  async syncMemberList(allChars) {
    try {
      const userGroups = new Map();
      
      for (const char of allChars) {
        if (!userGroups.has(char.user_id)) {
          userGroups.set(char.user_id, []);
        }
        userGroups.get(char.user_id).push(char);
      }

      const rows = [];
      
      for (const [userId, userChars] of userGroups) {
        const mainChar = userChars.find(c => c.character_type === 'main');
        if (!mainChar) continue;

        const mainSubclasses = userChars.filter(c => c.character_type === 'main_subclass');
        const alts = userChars.filter(c => c.character_type === 'alt');
        
        rows.push([
          mainChar.ign,
          mainChar.class,
          mainChar.subclass,
          mainChar.role,
          this.formatAbilityScore(mainChar.ability_score),
          mainChar.guild || '',
          mainSubclasses.map(s => `${s.class} (${s.subclass})`).join(', ') || '',
          alts.map(a => a.ign).join(', ') || '',
          userId,
          'Main',
          new Date(mainChar.updated_at).toISOString()
        ]);

        for (const alt of alts) {
          const altSubclasses = userChars.filter(c => 
            c.character_type === 'alt_subclass' && 
            c.parent_character_id === alt.id
          );
          
          rows.push([
            alt.ign,
            alt.class,
            alt.subclass,
            alt.role,
            this.formatAbilityScore(alt.ability_score),
            alt.guild || mainChar.guild || '',
            altSubclasses.map(s => `${s.class} (${s.subclass})`).join(', ') || '',
            '',
            userId,
            'Alt',
            new Date(alt.updated_at).toISOString()
          ]);
        }
      }

      const sheetName = 'Member List';
      
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A2:K`
      });

      if (rows.length > 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A2`,
          valueInputOption: 'RAW',
          resource: { values: rows }
        });
      }

    } catch (error) {
      throw error;
    }
  }

  formatAbilityScore(score) {
    if (!score || score === '' || score === 0) return '';
    
    const numScore = parseInt(score);
    const scoreRanges = {
      10000: '≤10k',
      11000: '10-12k',
      13000: '12-14k',
      15000: '14-16k',
      17000: '16-18k',
      19000: '18-20k',
      21000: '20-22k',
      23000: '22-24k',
      25000: '24-26k',
      27000: '26-28k',
      29000: '28-30k',
      31000: '30-32k',
      33000: '32-34k',
      35000: '34-36k',
      37000: '36-38k',
      39000: '38-40k',
      41000: '40-42k',
      43000: '42-44k',
      45000: '44-46k',
      47000: '46-48k',
      49000: '48-50k',
      51000: '50-52k',
      53000: '52-54k',
      55000: '54-56k',
      57000: '56k+'
    };
    
    return scoreRanges[numScore] || numScore.toLocaleString();
  }
}

export default new SheetsService();
