import db from './index.js';
import { CLASSES } from '../config/game.js';

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTION
// ═══════════════════════════════════════════════════════════════════

function getRole(className) {
  return CLASSES[className]?.role || 'Unknown';
}

// ═══════════════════════════════════════════════════════════════════
// USER REPOSITORY
// ═══════════════════════════════════════════════════════════════════

export const UserRepo = {
  async findById(userId) {
    const result = await db.query(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  },

  async create(userId, timezone) {
    const result = await db.query(
      `INSERT INTO users (user_id, timezone, created_at, updated_at) 
       VALUES ($1, $2, NOW(), NOW()) 
       ON CONFLICT (user_id) DO UPDATE SET timezone = $2, updated_at = NOW() 
       RETURNING *`,
      [userId, timezone]
    );
    return result.rows[0];
  },

  async updateTimezone(userId, timezone) {
    const result = await db.query(
      `UPDATE users SET timezone = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *`,
      [timezone, userId]
    );
    return result.rows[0];
  },

  async delete(userId) {
    await db.query('DELETE FROM users WHERE user_id = $1', [userId]);
  }
};

// ═══════════════════════════════════════════════════════════════════
// TIMEZONE REPOSITORY
// ═══════════════════════════════════════════════════════════════════

export const TimezoneRepo = {
  async get(userId) {
    const result = await db.query(
      'SELECT timezone FROM user_timezones WHERE user_id = $1',
      [userId]
    );
    return result.rows[0]?.timezone || null;
  },

  async set(userId, timezone) {
    await db.query(
      `INSERT INTO user_timezones (user_id, timezone, updated_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (user_id) DO UPDATE SET timezone = $2, updated_at = NOW()`,
      [userId, timezone]
    );
  },

  async delete(userId) {
    await db.query('DELETE FROM user_timezones WHERE user_id = $1', [userId]);
  }
};

// ═══════════════════════════════════════════════════════════════════
// CHARACTER REPOSITORY
// ═══════════════════════════════════════════════════════════════════

export const CharacterRepo = {
  async findById(id) {
    const result = await db.query(
      'SELECT * FROM characters WHERE id = $1',
      [parseInt(id)]  // ✅ Convert to int
    );
    return result.rows[0];
  },

  async findMain(userId) {
    const result = await db.query(
      `SELECT * FROM characters WHERE user_id = $1 AND character_type = 'main'`,
      [userId]
    );
    const char = result.rows[0];
    if (char) {
      char.role = getRole(char.class);
    }
    return char;
  },

  async findSubclasses(userId) {
    const result = await db.query(
      `SELECT * FROM characters WHERE user_id = $1 AND character_type = 'main_subclass' ORDER BY created_at`,
      [userId]
    );
    return result.rows.map(r => ({ ...r, role: getRole(r.class) }));
  },

  async findAlts(userId) {
    const result = await db.query(
      `SELECT * FROM characters WHERE user_id = $1 AND character_type = 'alt' ORDER BY created_at`,
      [userId]
    );
    return result.rows.map(r => ({ ...r, role: getRole(r.class) }));
  },

  async countAlts(userId) {
    const result = await db.query(
      `SELECT COUNT(*) FROM characters WHERE user_id = $1 AND character_type = 'alt'`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  },

  async findAllByUser(userId) {
    const result = await db.query(
      `SELECT * FROM characters WHERE user_id = $1 ORDER BY 
       CASE character_type 
         WHEN 'main' THEN 1 
         WHEN 'main_subclass' THEN 2 
         WHEN 'alt' THEN 3 
       END, created_at`,
      [userId]
    );
    return result.rows.map(r => ({ ...r, role: getRole(r.class) }));
  },

  async findAll() {
    const result = await db.query(
      `SELECT * FROM characters ORDER BY 
       user_id, 
       CASE character_type 
         WHEN 'main' THEN 1 
         WHEN 'main_subclass' THEN 2 
         WHEN 'alt' THEN 3 
       END, created_at`
    );
    return result.rows.map(r => ({ ...r, role: getRole(r.class) }));
  },

  async create({ userId, ign, uid, className, subclass, abilityScore, guild, characterType = 'main', parentId = null }) {
    const result = await db.query(
      `INSERT INTO characters 
       (user_id, ign, uid, class, subclass, ability_score, guild, character_type, parent_character_id, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) 
       RETURNING *`,
      [userId, ign, uid, className, subclass, abilityScore, guild, characterType, parentId ? parseInt(parentId) : null]  // ✅ Convert parentId to int
    );
    return result.rows[0];
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    });

    fields.push(`updated_at = NOW()`);
    values.push(parseInt(id));  // ✅ Convert to int

    const query = `UPDATE characters SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async delete(id) {
    await db.query('DELETE FROM characters WHERE id = $1', [parseInt(id)]);  // ✅ Convert to int
  },

  async deleteSubclasses(parentId) {
    await db.query('DELETE FROM characters WHERE parent_character_id = $1', [parseInt(parentId)]);  // ✅ Convert to int
  },

  async deleteAllByUser(userId) {
    await db.query('DELETE FROM characters WHERE user_id = $1', [userId]);
  },

  async deleteMainAndSubclasses(userId) {
    await db.query(
      `DELETE FROM characters WHERE user_id = $1 AND character_type IN ('main', 'main_subclass')`,
      [userId]
    );
  },

  async promoteAltToMain(altId) {
    const result = await db.query(
      `UPDATE characters SET character_type = 'main', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [parseInt(altId)]  // ✅ Convert to int
    );
    return result.rows[0];
  },

  async hasAnyCharacterWithClass(userId, className) {
    const result = await db.query(
      `SELECT COUNT(*) FROM characters 
       WHERE user_id = $1 AND class = $2 AND character_type IN ('main', 'main_subclass', 'alt')`,
      [userId, className]
    );
    return parseInt(result.rows[0].count) > 0;
  },

  async getAllMains() {
    const result = await db.query(
      `SELECT * FROM characters WHERE character_type = 'main' ORDER BY created_at DESC`
    );
    return result.rows.map(r => ({ ...r, role: getRole(r.class) }));
  }
};

// ═══════════════════════════════════════════════════════════════════
// BATTLE IMAGINE REPOSITORY
// ═══════════════════════════════════════════════════════════════════

export const BattleImagineRepo = {
  async findByCharacterId(characterId) {
    const result = await db.query(
      `SELECT * FROM battle_imagines WHERE character_id = $1 ORDER BY imagine_name`,
      [parseInt(characterId)]  // ✅ Convert to int
    );
    return result.rows;
  },

  async findByCharacter(characterId) {
    return await this.findByCharacterId(characterId);
  },

  async add(characterId, imagineName, tier) {
    const result = await db.query(
      `INSERT INTO battle_imagines (character_id, imagine_name, tier, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       ON CONFLICT (character_id, imagine_name) DO UPDATE SET tier = $3 
       RETURNING *`,
      [parseInt(characterId), imagineName, tier]  // ✅ Convert to int
    );
    return result.rows[0];
  },

  async update(characterId, imagineName, tier) {
    const result = await db.query(
      `UPDATE battle_imagines SET tier = $3 
       WHERE character_id = $1 AND imagine_name = $2 
       RETURNING *`,
      [parseInt(characterId), imagineName, tier]  // ✅ Convert to int
    );
    return result.rows[0];
  },

  async delete(characterId, imagineName) {
    await db.query(
      `DELETE FROM battle_imagines WHERE character_id = $1 AND imagine_name = $2`,
      [parseInt(characterId), imagineName]  // ✅ Convert to int
    );
  },

  async deleteAllByCharacter(characterId) {
    await db.query('DELETE FROM battle_imagines WHERE character_id = $1', [parseInt(characterId)]);  // ✅ Convert to int
  }
};

// ═══════════════════════════════════════════════════════════════════
// APPLICATION REPOSITORY
// ═══════════════════════════════════════════════════════════════════

export const ApplicationRepo = {
  async create({ user_id, character_id, guild_name, message_id = null, channel_id = null }) {
    console.log('[APP REPO] Creating application with:', { user_id, character_id, guild_name, message_id, channel_id });
    
    const result = await db.query(
      `INSERT INTO guild_applications 
       (user_id, character_id, guild_name, message_id, channel_id, status, accept_votes, deny_votes, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, 'pending', '{}', '{}', NOW(), NOW()) 
       RETURNING *`,
      [user_id, parseInt(character_id), guild_name, message_id, channel_id]
    );
    
    console.log('[APP REPO] Created application:', result.rows[0]);
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query(
      `SELECT * FROM guild_applications WHERE id = $1`,
      [parseInt(id)]
    );
    return result.rows[0];
  },

  async findByCharacterId(characterId) {
    const result = await db.query(
      `SELECT * FROM guild_applications WHERE character_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [parseInt(characterId)]
    );
    return result.rows[0];
  },

  async findAllByUserAndCharacter(userId, characterId) {
    const result = await db.query(
      `SELECT * FROM guild_applications WHERE user_id = $1 AND character_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [userId, parseInt(characterId)]
    );
    return result.rows[0];
  },

  async findPending() {
    const result = await db.query(
      `SELECT * FROM guild_applications WHERE status = 'pending' ORDER BY created_at ASC`
    );
    return result.rows;
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    });

    fields.push(`updated_at = NOW()`);
    values.push(parseInt(id));

    const query = `UPDATE guild_applications SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    
    console.log('[APP REPO] Update query:', query);
    console.log('[APP REPO] Update values:', values);
    
    const result = await db.query(query, values);
    
    console.log('[APP REPO] Update result:', result.rows[0]);
    return result.rows[0];
  },

  async updateStatus(id, status) {
    const result = await db.query(
      `UPDATE guild_applications SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [parseInt(id), status]
    );
    return result.rows[0];
  },

  async addVote(id, userId, voteType) {
    const column = voteType === 'accept' ? 'accept_votes' : 'deny_votes';
    const otherColumn = voteType === 'accept' ? 'deny_votes' : 'accept_votes';
    
    const result = await db.query(
      `UPDATE guild_applications 
       SET ${column} = array_append(${column}, $2),
           ${otherColumn} = array_remove(${otherColumn}, $2),
           updated_at = NOW()
       WHERE id = $1 
       RETURNING *`,
      [parseInt(id), userId]
    );
    return result.rows[0];
  },

  async delete(id) {
    await db.query('DELETE FROM guild_applications WHERE id = $1', [parseInt(id)]);
  }
};

// ═══════════════════════════════════════════════════════════════════
// LOG SETTINGS REPOSITORY
// ═══════════════════════════════════════════════════════════════════

export const LogSettingsRepo = {
  async get(guildId) {
    const result = await db.query(
      'SELECT * FROM log_settings WHERE guild_id = $1',
      [guildId]
    );
    return result.rows[0];
  },

  async upsert(guildId, settings) {
    const { channelId, enabledCategories, batchInterval } = settings;
    
    const result = await db.query(
      `INSERT INTO log_settings (guild_id, log_channel_id, enabled_categories, batch_interval, updated_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       ON CONFLICT (guild_id) 
       DO UPDATE SET 
         log_channel_id = COALESCE($2, log_settings.log_channel_id),
         enabled_categories = COALESCE($3, log_settings.enabled_categories),
         batch_interval = COALESCE($4, log_settings.batch_interval),
         updated_at = NOW()
       RETURNING *`,
      [guildId, channelId, enabledCategories, batchInterval]
    );
    return result.rows[0];
  }
};

// ═══════════════════════════════════════════════════════════════════
// EPHEMERAL SETTINGS REPOSITORY
// ═══════════════════════════════════════════════════════════════════

export const EphemeralRepo = {
  async get(guildId) {
    const result = await db.query(
      'SELECT ephemeral_commands FROM ephemeral_settings WHERE guild_id = $1',
      [guildId]
    );
    return result.rows[0]?.ephemeral_commands || [];
  },

  async set(guildId, commands) {
    await db.query(
      `INSERT INTO ephemeral_settings (guild_id, ephemeral_commands, updated_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (guild_id) 
       DO UPDATE SET ephemeral_commands = $2, updated_at = NOW()`,
      [guildId, commands]
    );
  }
};

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export default {
  UserRepo,
  TimezoneRepo,
  CharacterRepo,
  BattleImagineRepo,
  ApplicationRepo,
  LogSettingsRepo,
  EphemeralRepo
};
