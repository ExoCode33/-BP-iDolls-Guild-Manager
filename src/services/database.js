import pg from 'pg';
import config from '../utils/config.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: config.database.url,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug(`Query executed in ${duration}ms`);
      return result;
    } catch (error) {
      logger.error(`Database query error: ${error.message}`);
      throw error;
    }
  }

  async initializeDatabase() {
    try {
      const schemaPath = './database/schema.sql';
      const fs = await import('fs');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await this.query(schema);
      logger.success('Database initialized');
    } catch (error) {
      logger.error(`Database init failed: ${error.message}`);
      throw error;
    }
  }

  async createCharacter(data) {
    const query = `
      INSERT INTO characters (user_id, ign, class, subclass, ability_score, guild, role, character_type, parent_character_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [data.userId, data.ign, data.class, data.subclass, data.abilityScore, data.guild || null, data.role, data.characterType, data.parentCharacterId || null];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async getMainCharacter(userId) {
    const query = `SELECT * FROM characters WHERE user_id = $1 AND character_type = 'main' LIMIT 1`;
    const result = await this.query(query, [userId]);
    return result.rows[0];
  }

  async getAllCharactersWithSubclasses(userId) {
    const query = `
      SELECT c.*, p.ign as parent_ign
      FROM characters c
      LEFT JOIN characters p ON c.parent_character_id = p.id
      WHERE c.user_id = $1
      ORDER BY 
        CASE c.character_type
          WHEN 'main' THEN 1
          WHEN 'main_subclass' THEN 2
          WHEN 'alt' THEN 3
          WHEN 'alt_subclass' THEN 4
        END,
        c.created_at ASC
    `;
    const result = await this.query(query, [userId]);
    return result.rows;
  }

  async getAllCharacters() {
    const query = `
      SELECT c.*, p.ign as parent_ign
      FROM characters c
      LEFT JOIN characters p ON c.parent_character_id = p.id
      ORDER BY c.user_id, c.created_at ASC
    `;
    const result = await this.query(query);
    return result.rows;
  }

  async updateCharacter(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.ign !== undefined) { fields.push(`ign = $${paramIndex++}`); values.push(data.ign); }
    if (data.class !== undefined) { fields.push(`class = $${paramIndex++}`); values.push(data.class); }
    if (data.subclass !== undefined) { fields.push(`subclass = $${paramIndex++}`); values.push(data.subclass); }
    if (data.abilityScore !== undefined) { fields.push(`ability_score = $${paramIndex++}`); values.push(data.abilityScore); }
    if (data.guild !== undefined) { fields.push(`guild = $${paramIndex++}`); values.push(data.guild); }
    if (data.role !== undefined) { fields.push(`role = $${paramIndex++}`); values.push(data.role); }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE characters SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async deleteCharacter(id) {
    const query = `DELETE FROM characters WHERE id = $1`;
    await this.query(query, [id]);
  }

  async deleteMainCharacter(userId) {
    const query = `DELETE FROM characters WHERE user_id = $1`;
    await this.query(query, [userId]);
  }

  async setUserTimezone(userId, timezone) {
    const query = `
      INSERT INTO user_timezones (user_id, timezone)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET timezone = $2, updated_at = CURRENT_TIMESTAMP
    `;
    await this.query(query, [userId, timezone]);
  }

  async getUserTimezone(userId) {
    const query = `SELECT timezone FROM user_timezones WHERE user_id = $1`;
    const result = await this.query(query, [userId]);
    return result.rows[0]?.timezone;
  }

  async getStats() {
    const totalQuery = `SELECT COUNT(DISTINCT user_id) as total FROM characters WHERE character_type = 'main'`;
    const totalResult = await this.query(totalQuery);
    return { totalUsers: parseInt(totalResult.rows[0].total) };
  }
}

export default new Database();
