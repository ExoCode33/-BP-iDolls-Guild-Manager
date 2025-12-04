import pool from './db.js';

export const queries = {
  // ==================== CHARACTER QUERIES ====================
  
  /**
   * Create or update a character (main or alt)
   * @param {Object} characterData - Character information
   * @returns {Object} Created/updated character
   */
  async createCharacter(characterData) {
    const { 
      discordId, 
      discordName, 
      ign, 
      role, 
      className, 
      subclass, 
      abilityScore, 
      guild, 
      isMain 
    } = characterData;
    
    const query = `
      INSERT INTO characters (discord_id, discord_name, ign, role, class, subclass, ability_score, guild, is_main)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (discord_id, ign) 
      DO UPDATE SET 
        discord_name = EXCLUDED.discord_name,
        role = EXCLUDED.role,
        class = EXCLUDED.class,
        subclass = EXCLUDED.subclass,
        ability_score = EXCLUDED.ability_score,
        guild = EXCLUDED.guild,
        is_main = EXCLUDED.is_main,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [discordId, discordName, ign, role, className, subclass, abilityScore, guild, isMain];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Get main character for a user
   * @param {string} discordId - Discord user ID
   * @returns {Object|null} Main character or null
   */
  async getMainCharacter(discordId) {
    const query = 'SELECT * FROM characters WHERE discord_id = $1 AND is_main = true';
    const result = await pool.query(query, [discordId]);
    return result.rows[0] || null;
  },

  /**
   * Get all alt characters for a user
   * @param {string} discordId - Discord user ID
   * @returns {Array} Array of alt characters
   */
  async getAltCharacters(discordId) {
    const query = 'SELECT * FROM characters WHERE discord_id = $1 AND is_main = false ORDER BY created_at ASC';
    const result = await pool.query(query, [discordId]);
    return result.rows;
  },

  /**
   * Get all characters (main + alts) for a user
   * @param {string} discordId - Discord user ID
   * @returns {Array} Array of all characters (main first, then alts)
   */
  async getAllCharactersByDiscordId(discordId) {
    const query = 'SELECT * FROM characters WHERE discord_id = $1 ORDER BY is_main DESC, created_at ASC';
    const result = await pool.query(query, [discordId]);
    return result.rows;
  },

  /**
   * Update a character by discord ID and IGN
   * @param {string} discordId - Discord user ID
   * @param {string} ign - In-game name
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated character
   */
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

  /**
   * Delete a character by discord ID and IGN
   * @param {string} discordId - Discord user ID
   * @param {string} ign - In-game name
   * @returns {Object} Deleted character
   */
  async deleteCharacter(discordId, ign) {
    const query = 'DELETE FROM characters WHERE discord_id = $1 AND ign = $2 RETURNING *';
    const result = await pool.query(query, [discordId, ign]);
    return result.rows[0];
  },

  /**
   * Delete main character for a user (and optionally cascade delete alts)
   * @param {string} discordId - Discord user ID
   * @param {boolean} deleteAlts - Whether to also delete alt characters
   * @returns {Object} Result with deleted characters count
   */
  async deleteMainCharacter(discordId, deleteAlts = true) {
    if (deleteAlts) {
      // Delete all characters (main + alts)
      const query = 'DELETE FROM characters WHERE discord_id = $1 RETURNING *';
      const result = await pool.query(query, [discordId]);
      return { deletedCount: result.rowCount, characters: result.rows };
    } else {
      // Delete only main character
      const query = 'DELETE FROM characters WHERE discord_id = $1 AND is_main = true RETURNING *';
      const result = await pool.query(query, [discordId]);
      return { deletedCount: result.rowCount, characters: result.rows };
    }
  },

  /**
   * Delete an alt character
   * @param {string} discordId - Discord user ID
   * @param {string} ign - In-game name of the alt
   * @returns {Object} Deleted alt character
   */
  async deleteAltCharacter(discordId, ign) {
    const query = 'DELETE FROM characters WHERE discord_id = $1 AND ign = $2 AND is_main = false RETURNING *';
    const result = await pool.query(query, [discordId, ign]);
    return result.rows[0];
  },

  /**
   * Get all main characters
   * @returns {Array} Array of all main characters
   */
  async getAllCharacters() {
    const query = 'SELECT * FROM characters WHERE is_main = true ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  },

  /**
   * Get all alt characters
   * @returns {Array} Array of all alt characters
   */
  async getAllAlts() {
    const query = 'SELECT * FROM characters WHERE is_main = false ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  },

  /**
   * Get characters by guild
   * @param {string} guild - Guild name
   * @returns {Array} Array of characters in the guild
   */
  async getCharactersByGuild(guild) {
    const query = 'SELECT * FROM characters WHERE guild = $1 ORDER BY is_main DESC, created_at ASC';
    const result = await pool.query(query, [guild]);
    return result.rows;
  },

  /**
   * Get characters by class
   * @param {string} className - Class name
   * @returns {Array} Array of characters with that class
   */
  async getCharactersByClass(className) {
    const query = 'SELECT * FROM characters WHERE class = $1 ORDER BY is_main DESC, created_at ASC';
    const result = await pool.query(query, [className]);
    return result.rows;
  },

  // ==================== TIMEZONE QUERIES ====================

  /**
   * Set or update user timezone
   * @param {string} discordId - Discord user ID
   * @param {string} discordName - Discord username
   * @param {string} timezone - Timezone string
   * @returns {Object} User timezone record
   */
  async setUserTimezone(discordId, discordName, timezone) {
    const query = `
      INSERT INTO user_timezones (discord_id, discord_name, timezone)
      VALUES ($1, $2, $3)
      ON CONFLICT (discord_id)
      DO UPDATE SET
        discord_name = EXCLUDED.discord_name,
        timezone = EXCLUDED.timezone,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [discordId, discordName, timezone];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Get user timezone
   * @param {string} discordId - Discord user ID
   * @returns {Object|null} User timezone record or null
   */
  async getUserTimezone(discordId) {
    const query = 'SELECT * FROM user_timezones WHERE discord_id = $1';
    const result = await pool.query(query, [discordId]);
    return result.rows[0] || null;
  },

  /**
   * Delete user timezone
   * @param {string} discordId - Discord user ID
   * @returns {Object} Deleted timezone record
   */
  async deleteUserTimezone(discordId) {
    const query = 'DELETE FROM user_timezones WHERE discord_id = $1 RETURNING *';
    const result = await pool.query(query, [discordId]);
    return result.rows[0];
  },

  /**
   * Get all user timezones
   * @returns {Array} Array of all user timezone records
   */
  async getAllUserTimezones() {
    const query = 'SELECT * FROM user_timezones ORDER BY discord_name ASC';
    const result = await pool.query(query);
    return result.rows;
  },

  // ==================== UTILITY QUERIES ====================

  /**
   * Initialize database tables
   */
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
  },

  /**
   * Get database statistics
   * @returns {Object} Statistics about the database
   */
  async getStats() {
    const mainCountQuery = 'SELECT COUNT(*) as count FROM characters WHERE is_main = true';
    const altCountQuery = 'SELECT COUNT(*) as count FROM characters WHERE is_main = false';
    const timezoneCountQuery = 'SELECT COUNT(*) as count FROM user_timezones';
    
    const [mainResult, altResult, timezoneResult] = await Promise.all([
      pool.query(mainCountQuery),
      pool.query(altCountQuery),
      pool.query(timezoneCountQuery)
    ]);
    
    return {
      mainCharacters: parseInt(mainResult.rows[0].count),
      altCharacters: parseInt(altResult.rows[0].count),
      totalCharacters: parseInt(mainResult.rows[0].count) + parseInt(altResult.rows[0].count),
      usersWithTimezone: parseInt(timezoneResult.rows[0].count)
    };
  }
};
