import { google } from 'googleapis';
import config from '../config/index.js';
import { TIMEZONE_ABBR, CLASSES } from '../config/game.js';
import { TimezoneRepo, BattleImagineRepo } from '../database/repositories.js';
import logger from './logger.js';

class SheetsService {
  constructor() {
    this.sheets = null;
    this.lastSync = 0;
    this.minInterval = 30000;
  }

  async init() {
    if (!config.sheets.id || !config.sheets.email || !config.sheets.key) {
      console.log('[SHEETS] Not configured, skipping');
      return false;
    }

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: { client_email: config.sheets.email, private_key: config.sheets.key },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      this.sheets = google.sheets({ version: 'v4', auth });
      console.log('[SHEETS] Initialized');
      return true;
    } catch (e) {
      console.error('[SHEETS] Init failed:', e.message);
      return false;
    }
  }

  formatScore(score) {
    const map = {
      10000: '≤10k', 11000: '10-12k', 13000: '12-14k', 15000: '14-16k',
      17000: '16-18k', 19000: '18-20k', 21000: '20-22k', 23000: '22-24k',
      25000: '24-26k', 27000: '26-28k', 29000: '28-30k', 31000: '30-32k',
      33000: '32-34k', 35000: '34-36k', 37000: '36-38k', 39000: '38-40k',
      41000: '40-42k', 43000: '42-44k', 45000: '44-46k', 47000: '46-48k',
      49000: '48-50k', 51000: '50-52k', 53000: '52-54k', 55000: '54-56k',
      57000: '56k+'
    };
    return map[parseInt(score)] || score;
  }

  formatDate(date) {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  }

  async sync(characters, client) {
    if (!this.sheets) return;

    const now = Date.now();
    if (now - this.lastSync < this.minInterval) return;
    this.lastSync = now;

    const start = Date.now();

    try {
      const userGroups = {};
      for (const char of characters) {
        if (!userGroups[char.user_id]) userGroups[char.user_id] = [];
        userGroups[char.user_id].push(char);
      }

      const headers = [
        'Discord Name', 'IGN', 'UID', 'Type', 'Icon', 'Class', 'Subclass',
        'Role', 'Ability Score', 'Battle Imagines', 'Guild', 'Timezone', 'Registered'
      ];

      const rows = [];

      for (const [userId, chars] of Object.entries(userGroups)) {
        const main = chars.find(c => c.character_type === 'main');
        const mainSubs = chars.filter(c => c.character_type === 'main_subclass');
        const alts = chars.filter(c => c.character_type === 'alt');

        let discordName = userId;
        try {
          const user = await client.users.fetch(userId);
          discordName = user.username;
        } catch (e) {}

        const tz = await TimezoneRepo.get(userId);
        const tzAbbr = tz ? TIMEZONE_ABBR[tz] || tz : '';

        if (main) {
          const bi = await BattleImagineRepo.findByCharacter(main.id);
          const biText = bi.map(b => `${b.imagine_name} ${b.tier}`).join(', ');

          rows.push([
            discordName, main.ign, main.uid, 'Main', '',
            main.class, main.subclass, CLASSES[main.class]?.role || '',
            this.formatScore(main.ability_score), biText,
            main.guild || '', tzAbbr, this.formatDate(main.created_at)
          ]);

          for (const sub of mainSubs) {
            rows.push([
              discordName, main.ign, main.uid, 'Subclass', '',
              sub.class, sub.subclass, CLASSES[sub.class]?.role || '',
              this.formatScore(sub.ability_score), '',
              main.guild || '', tzAbbr, this.formatDate(main.created_at)
            ]);
          }
        }

        for (const alt of alts) {
          const bi = await BattleImagineRepo.findByCharacter(alt.id);
          const biText = bi.map(b => `${b.imagine_name} ${b.tier}`).join(', ');
          const altSubs = chars.filter(c => c.character_type === 'alt_subclass' && c.parent_character_id === alt.id);

          rows.push([
            discordName, alt.ign, alt.uid, 'Alt', '',
            alt.class, alt.subclass, CLASSES[alt.class]?.role || '',
            this.formatScore(alt.ability_score), biText,
            alt.guild || '', tzAbbr, this.formatDate(alt.created_at)
          ]);

          for (const sub of altSubs) {
            rows.push([
              discordName, alt.ign, alt.uid, 'Subclass', '',
              sub.class, sub.subclass, CLASSES[sub.class]?.role || '',
              this.formatScore(sub.ability_score), '',
              alt.guild || '', tzAbbr, this.formatDate(alt.created_at)
            ]);
          }
        }
      }

      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: config.sheets.id,
        range: 'Member List!A1:Z1000'
      });

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: config.sheets.id,
        range: 'Member List!A1',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [headers, ...rows] }
      });

      const duration = Date.now() - start;
      logger.sheetsSync(rows.length, duration);
    } catch (e) {
      logger.error('Sheets', 'Sync failed', e);
    }
  }
}

export default new SheetsService();
