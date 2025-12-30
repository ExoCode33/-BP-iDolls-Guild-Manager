import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

export async function initialize() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS characters (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      character_type VARCHAR(20) NOT NULL,
      ign VARCHAR(100) NOT NULL,
      uid VARCHAR(20) NOT NULL,
      class VARCHAR(50) NOT NULL,
      guild VARCHAR(100),
      rank VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
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
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ephemeral_settings (
      guild_id VARCHAR(20) PRIMARY KEY,
      enabled_categories TEXT[],
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id VARCHAR(20) PRIMARY KEY,
      verification_channel_id VARCHAR(20),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('[DATABASE] ✅ Tables initialized');
}

export default pool;
