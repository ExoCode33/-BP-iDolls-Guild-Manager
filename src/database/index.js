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
        log_channel_id VARCHAR(20),
        enabled_categories TEXT[] DEFAULT ARRAY['startup','shutdown','errors','commands','adminCommands','registration','editing','deletion','sheetsSync'],
        batch_interval INTEGER DEFAULT 0,
        ping_role_id VARCHAR(20),
        ping_on_error BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='log_settings' AND column_name='log_channel_id') THEN
          ALTER TABLE log_settings ADD COLUMN log_channel_id VARCHAR(20);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='log_settings' AND column_name='batch_interval') THEN
          ALTER TABLE log_settings ADD COLUMN batch_interval INTEGER DEFAULT 0;
        END IF;
      END $$;
    `);

    await this.query(`
      CREATE TABLE IF NOT EXISTS ephemeral_settings (
        guild_id VARCHAR(20) PRIMARY KEY,
        ephemeral_commands TEXT[] DEFAULT ARRAY['character','admin'],
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.query(`
      CREATE TABLE IF NOT EXISTS guild_applications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(20) NOT NULL,
        character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
        guild_name VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        message_id VARCHAR(20) UNIQUE,
        channel_id VARCHAR(20),
        accept_votes TEXT[] DEFAULT '{}',
        deny_votes TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, character_id)
      )
    `);

    await this.query(`CREATE INDEX IF NOT EXISTS idx_char_user ON characters(user_id)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_char_type ON characters(character_type)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_bi_char ON battle_imagines(character_id)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_app_status ON guild_applications(status)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_app_message ON guild_applications(message_id)`);

    console.log('[DB] Tables initialized');
  }

  async close() {
    await this.pool.end();
  }
}

export default new Database();
