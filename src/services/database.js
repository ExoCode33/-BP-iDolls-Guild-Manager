import pkg from 'pg';
const { Pool } = pkg;
import logger from '../utils/logger.js';

class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  /**
   * Extract operation and table from SQL query for better logging
   */
  parseQuery(text) {
    const upperText = text.trim().toUpperCase();
    let operation = 'QUERY';
    let table = 'unknown';
    
    // Detect operation
    if (upperText.startsWith('SELECT')) operation = 'SELECT';
    else if (upperText.startsWith('INSERT')) operation = 'INSERT';
    else if (upperText.startsWith('UPDATE')) operation = 'UPDATE';
    else if (upperText.startsWith('DELETE')) operation = 'DELETE';
    else if (upperText.startsWith('CREATE')) operation = 'CREATE';
    else if (upperText.startsWith('DROP')) operation = 'DROP';
    else if (upperText.startsWith('ALTER')) operation = 'ALTER';
    
    // Extract table name (basic extraction)
    const fromMatch = text.match(/FROM\s+(\w+)/i);
    const intoMatch = text.match(/INTO\s+(\w+)/i);
    const updateMatch = text.match(/UPDATE\s+(\w+)/i);
    const tableMatch = text.match(/TABLE\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?(\w+)/i);
    
    if (fromMatch) table = fromMatch[1];
    else if (intoMatch) table = intoMatch[1];
    else if (updateMatch) table = updateMatch[1];
    else if (tableMatch) table = tableMatch[1];
    
    return { operation, table };
  }

  async query(text, params) {
    const start = Date.now();
    const { operation, table } = this.parseQuery(text);
    
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log with context
      const rowInfo = res.rowCount !== undefined ? `${res.rowCount} rows` : 'No data';
      await logger.logDatabaseQuery(operation, table, duration, true, rowInfo);
      
      return res;
    } catch (error) {
      const duration = Date.now() - start;
      await logger.logDatabaseQuery(operation, table, duration, false, error.message);
      logger.error(`Database query error: ${error.message}`);
      throw error;
    }
  }

  async initializeDatabase() {
    try {
      // Create characters table
      await this.query(`
        CREATE TABLE IF NOT EXISTS characters (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          ign VARCHAR(255) NOT NULL,
          uid VARCHAR(50) NOT NULL,
          guild VARCHAR(255),
          class VARCHAR(255) NOT NULL,
          subclass VARCHAR(255) NOT NULL,
          ability_score VARCHAR(50) NOT NULL,
          character_type VARCHAR(50) NOT NULL,
          parent_character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create user_timezones table
      await this.query(`
        CREATE TABLE IF NOT EXISTS user_timezones (
          user_id VARCHAR(255) PRIMARY KEY,
          timezone VARCHAR(255) NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // ✅ NEW: Create battle_imagines table
      await this.query(`
        CREATE TABLE IF NOT EXISTS battle_imagines (
          id SERIAL PRIMARY KEY,
          character_id INTEGER NOT NULL,
          imagine_name VARCHAR(100) NOT NULL,
          tier VARCHAR(10) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
          UNIQUE(character_id, imagine_name)
        )
      `);

      // Create bot_settings table
      await this.query(`
        CREATE TABLE IF NOT EXISTS bot_settings (
          id SERIAL PRIMARY KEY,
          setting_key VARCHAR(100) UNIQUE NOT NULL,
          setting_value TEXT NOT NULL,
          setting_type VARCHAR(50) NOT NULL,
          description TEXT,
          updated_by VARCHAR(255),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_user_id ON characters(user_id)
      `);

      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_character_type ON characters(character_type)
      `);

      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_parent_character_id ON characters(parent_character_id)
      `);

      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_bot_settings_key ON bot_settings(setting_key)
      `);

      // ✅ NEW: Create battle_imagines indexes
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_battle_imagines_character ON battle_imagines(character_id)
      `);

      // Insert default bot settings if they don't exist
      const defaultSettings = [
        ['log_channel_id', '', 'string', 'Discord channel ID for logging'],
        ['log_level', 'INFO', 'string', 'Log level: ERROR_ONLY, WARN_ERROR, INFO, VERBOSE, DEBUG, ALL'],
        ['error_ping_enabled', 'false', 'boolean', 'Enable role ping on errors'],
        ['error_ping_role_id', '', 'string', 'Role ID to ping on errors'],
        ['warn_ping_enabled', 'false', 'boolean', 'Enable role ping on warnings'],
        ['warn_ping_role_id', '', 'string', 'Role ID to ping on warnings'],
        ['debug_mode', 'false', 'boolean', 'Enable debug logging to console']
      ];

      for (const [key, value, type, desc] of defaultSettings) {
        await this.query(
          `INSERT INTO bot_settings (setting_key, setting_value, setting_type, description)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (setting_key) DO NOTHING`,
          [key, value, type, desc]
        );
      }

      logger.success('Database tables initialized successfully');
    } catch (error) {
      logger.error(`Database initialization error: ${error.message}`);
      throw error;
    }
  }

  // ============================================================================
  // BATTLE IMAGINE OPERATIONS
  // ============================================================================

  /**
   * Add a battle imagine to a character
   */
  async addBattleImagine(characterId, imagineName, tier) {
    try {
      const result = await this.query(
        `INSERT INTO battle_imagines (character_id, imagine_name, tier)
         VALUES ($1, $2, $3)
         ON CONFLICT (character_id, imagine_name)
         DO UPDATE SET tier = $3
         RETURNING *`,
        [characterId, imagineName, tier]
      );
      
      logger.success(`Battle Imagine added: ${imagineName} ${tier} to character ${characterId}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error adding battle imagine: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all battle imagines for a character
   */
  async getBattleImagines(characterId) {
    try {
      const result = await this.query(
        `SELECT * FROM battle_imagines WHERE character_id = $1 ORDER BY created_at ASC`,
        [characterId]
      );
      return result.rows;
    } catch (error) {
      logger.error(`Error fetching battle imagines: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a specific battle imagine
   */
  async deleteBattleImagine(characterId, imagineName) {
    try {
      await this.query(
        `DELETE FROM battle_imagines WHERE character_id = $1 AND imagine_name = $2`,
        [characterId, imagineName]
      );
      logger.success(`Battle Imagine deleted: ${imagineName} from character ${characterId}`);
    } catch (error) {
      logger.error(`Error deleting battle imagine: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete all battle imagines for a character
   */
  async deleteAllBattleImagines(characterId) {
    try {
      await this.query(
        `DELETE FROM battle_imagines WHERE character_id = $1`,
        [characterId]
      );
      logger.success(`All Battle Imagines deleted for character ${characterId}`);
    } catch (error) {
      logger.error(`Error deleting all battle imagines: ${error.message}`);
      throw error;
    }
  }

  // Character Operations
  async createCharacter(data) {
    const { userId, ign, uid, guild, class: className, subclass, abilityScore, characterType, parentCharacterId = null } = data;
    
    try {
      const result = await this.query(
        `INSERT INTO characters (user_id, ign, uid, guild, class, subclass, ability_score, character_type, parent_character_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [userId, ign, uid, guild, className, subclass, abilityScore, characterType, parentCharacterId]
      );
      
      logger.success(`Character created: ${ign} (${className})`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating character: ${error.message}`);
      throw error;
    }
  }

  async getMainCharacter(userId) {
    try {
      const result = await this.query(
        `SELECT * FROM characters WHERE user_id = $1 AND character_type = 'main'`,
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error fetching main character: ${error.message}`);
      throw error;
    }
  }

  async getAlts(userId) {
    try {
      const result = await this.query(
        `SELECT * FROM characters WHERE user_id = $1 AND character_type = 'alt' ORDER BY created_at ASC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      logger.error(`Error fetching alts: ${error.message}`);
      throw error;
    }
  }

  async getAllCharactersWithSubclasses(userId) {
    try {
      const result = await this.query(
        `SELECT c.*, 
                CASE 
                  WHEN c.parent_character_id IS NOT NULL THEN p.ign 
                  ELSE NULL 
                END as parent_ign,
                CASE
                  WHEN c.class = 'Beat Performer' THEN 'Support'
                  WHEN c.class = 'Frost Mage' THEN 'DPS'
                  WHEN c.class = 'Heavy Guardian' THEN 'Tank'
                  WHEN c.class = 'Marksman' THEN 'DPS'
                  WHEN c.class = 'Shield Knight' THEN 'Tank'
                  WHEN c.class = 'Stormblade' THEN 'DPS'
                  WHEN c.class = 'Verdant Oracle' THEN 'Support'
                  WHEN c.class = 'Wind Knight' THEN 'DPS'
                END as role
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
           c.created_at ASC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      logger.error(`Error fetching characters: ${error.message}`);
      throw error;
    }
  }

  async getAllCharacters() {
    try {
      const result = await this.query(
        `SELECT c.*,
                CASE
                  WHEN c.class = 'Beat Performer' THEN 'Support'
                  WHEN c.class = 'Frost Mage' THEN 'DPS'
                  WHEN c.class = 'Heavy Guardian' THEN 'Tank'
                  WHEN c.class = 'Marksman' THEN 'DPS'
                  WHEN c.class = 'Shield Knight' THEN 'Tank'
                  WHEN c.class = 'Stormblade' THEN 'DPS'
                  WHEN c.class = 'Verdant Oracle' THEN 'Support'
                  WHEN c.class = 'Wind Knight' THEN 'DPS'
                END as role
         FROM characters c
         WHERE c.character_type IN ('main', 'alt')
         ORDER BY c.user_id, c.created_at ASC`
      );
      return result.rows;
    } catch (error) {
      logger.error(`Error fetching all characters: ${error.message}`);
      throw error;
    }
  }

  async getAllUsersWithCharacters() {
    try {
      const result = await this.query(
        `SELECT c.*, 
                CASE 
                  WHEN c.parent_character_id IS NOT NULL THEN p.ign 
                  ELSE NULL 
                END as parent_ign,
                CASE
                  WHEN c.class = 'Beat Performer' THEN 'Support'
                  WHEN c.class = 'Frost Mage' THEN 'DPS'
                  WHEN c.class = 'Heavy Guardian' THEN 'Tank'
                  WHEN c.class = 'Marksman' THEN 'DPS'
                  WHEN c.class = 'Shield Knight' THEN 'Tank'
                  WHEN c.class = 'Stormblade' THEN 'DPS'
                  WHEN c.class = 'Verdant Oracle' THEN 'Support'
                  WHEN c.class = 'Wind Knight' THEN 'DPS'
                END as role
         FROM characters c
         LEFT JOIN characters p ON c.parent_character_id = p.id
         ORDER BY 
           c.user_id,
           CASE c.character_type
             WHEN 'main' THEN 1
             WHEN 'main_subclass' THEN 2
             WHEN 'alt' THEN 3
             WHEN 'alt_subclass' THEN 4
           END,
           c.created_at ASC`
      );
      return result.rows;
    } catch (error) {
      logger.error(`Error fetching all users with characters: ${error.message}`);
      throw error;
    }
  }

  async updateCharacter(characterId, data) {
    try {
      // Get current character data
      const currentResult = await this.query(
        'SELECT * FROM characters WHERE id = $1',
        [characterId]
      );
      
      if (currentResult.rows.length === 0) {
        throw new Error('Character not found');
      }
      
      const current = currentResult.rows[0];
      
      // Merge with new data, keeping existing values if not provided
      const ign = data.ign !== undefined ? data.ign : current.ign;
      const uid = data.uid !== undefined ? data.uid : current.uid;
      const guild = data.guild !== undefined ? data.guild : current.guild;
      const className = data.class !== undefined ? data.class : current.class;
      const subclass = data.subclass !== undefined ? data.subclass : current.subclass;
      const abilityScore = data.abilityScore !== undefined ? data.abilityScore : current.ability_score;
      
      const result = await this.query(
        `UPDATE characters 
         SET ign = $1, uid = $2, guild = $3, class = $4, subclass = $5, ability_score = $6, updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [ign, uid, guild, className, subclass, abilityScore, characterId]
      );
      
      logger.success(`Character updated: ID ${characterId}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating character: ${error.message}`);
      throw error;
    }
  }

  async deleteCharacter(characterId) {
    try {
      await this.query('DELETE FROM characters WHERE id = $1', [characterId]);
      logger.success(`Character deleted: ID ${characterId}`);
    } catch (error) {
      logger.error(`Error deleting character: ${error.message}`);
      throw error;
    }
  }

  async deleteAllCharacters(userId) {
    try {
      await this.query('DELETE FROM characters WHERE user_id = $1', [userId]);
      logger.success(`All characters deleted for user: ${userId}`);
    } catch (error) {
      logger.error(`Error deleting all characters: ${error.message}`);
      throw error;
    }
  }

  async getCharacterById(characterId) {
    try {
      const result = await this.query(
        `SELECT c.*,
                CASE
                  WHEN c.class = 'Beat Performer' THEN 'Support'
                  WHEN c.class = 'Frost Mage' THEN 'DPS'
                  WHEN c.class = 'Heavy Guardian' THEN 'Tank'
                  WHEN c.class = 'Marksman' THEN 'DPS'
                  WHEN c.class = 'Shield Knight' THEN 'Tank'
                  WHEN c.class = 'Stormblade' THEN 'DPS'
                  WHEN c.class = 'Verdant Oracle' THEN 'Support'
                  WHEN c.class = 'Wind Knight' THEN 'DPS'
                END as role
         FROM characters c
         WHERE c.id = $1`,
        [characterId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error fetching character by ID: ${error.message}`);
      throw error;
    }
  }

  async getStats() {
    try {
      const result = await this.query(
        'SELECT COUNT(DISTINCT user_id) as total_users FROM characters'
      );
      return {
        totalUsers: parseInt(result.rows[0].total_users) || 0
      };
    } catch (error) {
      logger.error(`Error getting stats: ${error.message}`);
      return { totalUsers: 0 };
    }
  }

  // Timezone Operations
  async getUserTimezone(userId) {
    try {
      const result = await this.query(
        'SELECT timezone FROM user_timezones WHERE user_id = $1',
        [userId]
      );
      return result.rows[0]?.timezone || null;
    } catch (error) {
      logger.error(`Error getting user timezone: ${error.message}`);
      return null;
    }
  }

  async setUserTimezone(userId, timezone) {
    try {
      await this.query(
        `INSERT INTO user_timezones (user_id, timezone, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET timezone = $2, updated_at = NOW()`,
        [userId, timezone]
      );
      logger.success(`Set timezone for user ${userId}: ${timezone}`);
      return true;
    } catch (error) {
      logger.error(`Error setting user timezone: ${error.message}`);
      return false;
    }
  }

  async removeUserTimezone(userId) {
    try {
      await this.query('DELETE FROM user_timezones WHERE user_id = $1', [userId]);
      logger.success(`Removed timezone for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error removing user timezone: ${error.message}`);
      return false;
    }
  }

  // Bot Settings Operations
  async getBotSetting(key) {
    try {
      const result = await this.query(
        'SELECT setting_value, setting_type FROM bot_settings WHERE setting_key = $1',
        [key]
      );
      
      if (result.rows.length === 0) return null;
      
      const { setting_value, setting_type } = result.rows[0];
      
      // Parse based on type
      switch (setting_type) {
        case 'boolean':
          return setting_value.toLowerCase() === 'true';
        case 'integer':
          return parseInt(setting_value);
        case 'json':
          return JSON.parse(setting_value);
        default:
          return setting_value;
      }
    } catch (error) {
      logger.error(`Error getting bot setting ${key}: ${error.message}`);
      return null;
    }
  }

  async setBotSetting(key, value, type, description = '', updatedBy = 'system') {
    try {
      // Convert value to string for storage
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      await this.query(
        `INSERT INTO bot_settings (setting_key, setting_value, setting_type, description, updated_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (setting_key)
         DO UPDATE SET setting_value = $2, setting_type = $3, updated_by = $5, updated_at = NOW()`,
        [key, stringValue, type, description, updatedBy]
      );
      
      logger.success(`Bot setting updated: ${key} = ${value}`);
      return true;
    } catch (error) {
      logger.error(`Error setting bot setting ${key}: ${error.message}`);
      return false;
    }
  }

  async getAllBotSettings() {
    try {
      const result = await this.query(
        'SELECT setting_key, setting_value, setting_type, description, updated_by, updated_at FROM bot_settings ORDER BY setting_key'
      );
      
      const settings = {};
      for (const row of result.rows) {
        const { setting_key, setting_value, setting_type } = row;
        
        // Parse based on type
        switch (setting_type) {
          case 'boolean':
            settings[setting_key] = setting_value.toLowerCase() === 'true';
            break;
          case 'integer':
            settings[setting_key] = parseInt(setting_value);
            break;
          case 'json':
            settings[setting_key] = JSON.parse(setting_value);
            break;
          default:
            settings[setting_key] = setting_value;
        }
      }
      
      return settings;
    } catch (error) {
      logger.error(`Error getting all bot settings: ${error.message}`);
      return {};
    }
  }
}

export default new Database();
