import pg from 'pg';
import config from '../config/index.js';

const { Pool } = pg;

class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: config.database.url,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000
    });
  }

  async query(text, params) {
    return this.pool.query(text, params);
  }

  async initialize() {
    await this.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(20) NOT NULL,
        ign VARCHAR(255) NOT NULL,
        uid VARCHAR(50) NOT NULL,
        class VARCHAR(100) NOT NULL,
        subclass VARCHAR(100) NOT NULL,
        ability_score VARCHAR(50) NOT NULL,
        guild VARCHAR(100),
        character_type VARCHAR(50) NOT NULL,
        parent_character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.query(`
      CREATE TABLE IF NOT EXISTS user_timezones (
        user_id VARCHAR(20) PRIMARY KEY,
        timezone VARCHAR(100) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.query(`
      CREATE TABLE IF NOT EXISTS battle_imagines (
        id SERIAL PRIMARY KEY,
        character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        imagine_name VARCHAR(100) NOT NULL,
        tier VARCHAR(10) NOT NULL,
        UNIQUE(character_id, imagine_name)
      )
    `);

    await this.query(`
      CREATE TABLE IF NOT EXISTS log_settings (
        guild_id VARCHAR(20) PRIMARY KEY,
        enabled_categories TEXT[] DEFAULT ARRAY['startup','shutdown','error','warning','reg_complete','delete_character','sync_sheets','sync_nickname','db_error'],
        ping_role_id VARCHAR(20),
        ping_on_error BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.query(`
      CREATE TABLE IF NOT EXISTS ephemeral_settings (
        guild_id VARCHAR(20) PRIMARY KEY,
        ephemeral_commands TEXT[] DEFAULT ARRAY['register','edit','admin'],
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.query(`CREATE INDEX IF NOT EXISTS idx_char_user ON characters(user_id)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_char_type ON characters(character_type)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_bi_char ON battle_imagines(character_id)`);

    console.log('[DB] Tables initialized');
  }

  async close() {
    await this.pool.end();
  }
}

export default new Database();
