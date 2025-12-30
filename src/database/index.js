import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function initialize() {
  // Characters table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS characters (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      character_type VARCHAR(20) NOT NULL,
      ign VARCHAR(100) NOT NULL,
      uid VARCHAR(20) NOT NULL,
      class VARCHAR(50) NOT NULL,
      subclass VARCHAR(50),
      ability_score VARCHAR(20),
      guild VARCHAR(100),
      rank VARCHAR(50),
      parent_character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
      role VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Applications table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL,
      character_data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Guild applications table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_applications (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
      guild_name VARCHAR(100) NOT NULL,
      message_id VARCHAR(20),
      channel_id VARCHAR(20),
      status VARCHAR(20) DEFAULT 'pending',
      accept_votes TEXT[] DEFAULT '{}',
      deny_votes TEXT[] DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User timezones table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_timezones (
      user_id VARCHAR(20) PRIMARY KEY,
      timezone VARCHAR(100) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Battle imagines table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS battle_imagines (
      id SERIAL PRIMARY KEY,
      character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
      imagine_name VARCHAR(100) NOT NULL,
      tier VARCHAR(10) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(character_id, imagine_name)
    )
  `);

  // Ephemeral settings table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ephemeral_settings (
      guild_id VARCHAR(20) PRIMARY KEY,
      ephemeral_commands TEXT[] DEFAULT '{}',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Guild settings table with unified logging
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id VARCHAR(20) PRIMARY KEY,
      verification_channel_id TEXT,
      general_log_channel_id TEXT,
      application_log_channel_id TEXT,
      log_settings JSONB DEFAULT '{
        "character_registration": true,
        "character_updates": true,
        "character_deletion": true,
        "verification": true,
        "timezone_changes": true,
        "battle_imagine_changes": true,
        "guild_applications": true,
        "application_votes": true,
        "admin_overrides": true,
        "settings_changes": true,
        "role_changes": true
      }'::jsonb,
      log_grouping JSONB DEFAULT '{
        "character_registration": false,
        "character_updates": true,
        "character_deletion": false,
        "verification": true,
        "timezone_changes": true,
        "battle_imagine_changes": true,
        "settings_changes": false,
        "role_changes": false,
        "grouping_window_minutes": 10
      }'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('[DATABASE] ✅ All tables initialized');
}

pool.initialize = initialize;

export default pool;
