import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function initialize() {
  // ═══════════════════════════════════════════════════════════════
  // USERS TABLE (for nickname preferences)
  // ═══════════════════════════════════════════════════════════════
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id VARCHAR(20) PRIMARY KEY,
      nickname_preferences INTEGER[],
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add nickname_preferences column if it doesn't exist (for existing databases)
  await pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'nickname_preferences') THEN
        ALTER TABLE users ADD COLUMN nickname_preferences INTEGER[];
      END IF;
    END $$;
  `);

  // ═══════════════════════════════════════════════════════════════
  // CHARACTERS TABLE
  // ═══════════════════════════════════════════════════════════════
  await pool.query(`
    CREATE TABLE IF NOT EXISTS characters (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      character_type VARCHAR(20) NOT NULL,
      ign VARCHAR(100) NOT NULL,
      uid VARCHAR(20) NOT NULL,
      class VARCHAR(50) NOT NULL,
      subclass VARCHAR(50),
      ability_score INTEGER,
      guild VARCHAR(100),
      rank VARCHAR(50),
      parent_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add missing columns if they don't exist (for existing databases)
  await pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'characters' AND column_name = 'subclass') THEN
        ALTER TABLE characters ADD COLUMN subclass VARCHAR(50);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'characters' AND column_name = 'ability_score') THEN
        ALTER TABLE characters ADD COLUMN ability_score INTEGER;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'characters' AND column_name = 'parent_character_id') THEN
        ALTER TABLE characters ADD COLUMN parent_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `);

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS log_settings (
      guild_id VARCHAR(20) PRIMARY KEY,
      log_channel_id VARCHAR(20),
      enabled_categories TEXT[],
      batch_interval INTEGER DEFAULT 0,
      ping_role_id VARCHAR(20),
      ping_on_error BOOLEAN DEFAULT false,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add missing columns if they don't exist (for existing databases)
  await pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'log_settings' AND column_name = 'ping_role_id') THEN
        ALTER TABLE log_settings ADD COLUMN ping_role_id VARCHAR(20);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'log_settings' AND column_name = 'ping_on_error') THEN
        ALTER TABLE log_settings ADD COLUMN ping_on_error BOOLEAN DEFAULT false;
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ephemeral_settings (
      guild_id VARCHAR(20) PRIMARY KEY,
      ephemeral_commands TEXT[],
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add missing column if it doesn't exist
  await pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ephemeral_settings' AND column_name = 'ephemeral_commands') THEN
        ALTER TABLE ephemeral_settings ADD COLUMN ephemeral_commands TEXT[];
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id VARCHAR(20) PRIMARY KEY,
      verification_channel_id VARCHAR(20),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_timezones (
      user_id VARCHAR(20) PRIMARY KEY,
      timezone VARCHAR(100) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS battle_imagines (
      id SERIAL PRIMARY KEY,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      imagine_name VARCHAR(100) NOT NULL,
      tier VARCHAR(10) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(character_id, imagine_name)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_applications (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      character_id INTEGER NOT NULL,
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

  console.log('[DATABASE] ✅ Tables initialized');
}

async function close() {
  await pool.end();
  console.log('[DATABASE] Connection closed');
}

// Add methods to pool object
pool.initialize = initialize;
pool.close = close;

// Export pool with methods attached
export default pool;
