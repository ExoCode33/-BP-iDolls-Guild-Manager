import pool from './db.js';

export const queries = {
  // Character queries
  async createCharacter(characterData) {
    const { discordId, discordName, ign, role, className, subclass, abilityScore, timezone, guild } = characterData;
    
    const query = `
      INSERT INTO characters (discord_id, discord_name, ign, role, class, subclass, ability_score, timezone, guild, is_main)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      ON CONFLICT (discord_id, ign) 
      DO UPDATE SET 
        discord_name = EXCLUDED.discord_name,
        role = EXCLUDED.role,
        class = EXCLUDED.class,
        subclass = EXCLUDED.subclass,
        ability_score = EXCLUDED.ability_score,
        timezone = EXCLUDED.timezone,
        guild = EXCLUDED.guild,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [discordId, discordName, ign, role, className, subclass, abilityScore, timezone, guild];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getMainCharacter(discordId) {
    const query = 'SELECT * FROM characters WHERE discord_id = $1 AND is_main = true';
    const result = await pool.query(query, [discordId]);
    return result.rows[0];
  },

  async getAllCharactersByDiscordId(discordId) {
    const query = 'SELECT * FROM characters WHERE discord_id = $1';
    const result = await pool.query(query, [discordId]);
    return result.rows;
  },

  async updateCharacter(discordId, ign, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramIndex}`);
      values.push(updates[key]);
      paramIndex++;
    });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(discordId, ign);

    const query = `
      UPDATE characters 
      SET ${fields.join(', ')}
      WHERE discord_id = $${paramIndex} AND ign = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async deleteMainCharacter(discordId) {
    const query = 'DELETE FROM characters WHERE discord_id = $1 AND is_main = true RETURNING *';
    const result = await pool.query(query, [discordId]);
    return result.rows[0];
  },

  // Alt character queries
  async createAltCharacter(altData) {
    const { discordId, mainCharacterId, ign, role, className, subclass } = altData;
    
    const query = `
      INSERT INTO alt_characters (discord_id, main_character_id, ign, role, class, subclass)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (discord_id, ign)
      DO UPDATE SET
        role = EXCLUDED.role,
        class = EXCLUDED.class,
        subclass = EXCLUDED.subclass,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [discordId, mainCharacterId, ign, role, className, subclass];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getAltCharacters(discordId) {
    const query = 'SELECT * FROM alt_characters WHERE discord_id = $1 ORDER BY created_at ASC';
    const result = await pool.query(query, [discordId]);
    return result.rows;
  },

  async deleteAltCharacter(discordId, ign) {
    const query = 'DELETE FROM alt_characters WHERE discord_id = $1 AND ign = $2 RETURNING *';
    const result = await pool.query(query, [discordId, ign]);
    return result.rows[0];
  },

  // Utility queries
  async getAllCharacters() {
    const query = 'SELECT * FROM characters ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  },

  async getAllAlts() {
    const query = 'SELECT * FROM alt_characters ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  },

  async initializeDatabase() {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    try {
      const schemaPath = path.join(__dirname, '../../database/schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('✅ Database tables initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing database:', error);
      throw error;
    }
  }
};
