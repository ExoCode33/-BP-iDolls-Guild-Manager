import db from './db.js';
import { getRole } from '../utils/classRoleMapping.js';

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
// CHARACTER REPOSITORY
// ═══════════════════════════════════════════════════════════════════

export const CharacterRepo = {
  async findById(id) {
    const result = await db.query(
      'SELECT * FROM characters WHERE id = $1',
      [id]
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

  async create({ userId, ign, uid, className, subclass, abilityScore, guild, characterType = 'main', parentId = null }) {
    const result = await db.query(
      `INSERT INTO characters 
       (user_id, ign, uid, class, subclass, ability_score, guild, character_type, parent_id, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) 
       RETURNING *`,
      [userId, ign, uid, className, subclass, abilityScore, guild, characterType, parentId]
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
    values.push(id);

    const query = `UPDATE characters SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async delete(id) {
    await db.query('DELETE FROM characters WHERE id = $1', [id]);
  },

  async deleteSubclasses(parentId) {
    await db.query('DELETE FROM characters WHERE parent_id = $1', [parentId]);
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
      [altId]
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
      `SELECT * FROM battle_imagines WHERE character_id = $1 ORDER BY name`,
      [characterId]
    );
    return result.rows;
  },

  async add(characterId, imagineName, tier) {
    const result = await db.query(
      `INSERT INTO battle_imagines (character_id, name, tier, created_at, updated_at) 
       VALUES ($1, $2, $3, NOW(), NOW()) 
       ON CONFLICT (character_id, name) DO UPDATE SET tier = $3, updated_at = NOW() 
       RETURNING *`,
      [characterId, imagineName, tier]
    );
    return result.rows[0];
  },

  async update(characterId, imagineName, tier) {
    const result = await db.query(
      `UPDATE battle_imagines SET tier = $3, updated_at = NOW() 
       WHERE character_id = $1 AND name = $2 
       RETURNING *`,
      [characterId, imagineName, tier]
    );
    return result.rows[0];
  },

  async delete(characterId, imagineName) {
    await db.query(
      `DELETE FROM battle_imagines WHERE character_id = $1 AND name = $2`,
      [characterId, imagineName]
    );
  },

  async deleteAllByCharacter(characterId) {
    await db.query('DELETE FROM battle_imagines WHERE character_id = $1', [characterId]);
  }
};

// ═══════════════════════════════════════════════════════════════════
// APPLICATION REPOSITORY
// ═══════════════════════════════════════════════════════════════════

export const ApplicationRepo = {
  async create(userId, characterId, guild) {
    const result = await db.query(
      `INSERT INTO applications (user_id, character_id, guild, status, created_at, updated_at) 
       VALUES ($1, $2, $3, 'pending', NOW(), NOW()) 
       RETURNING *`,
      [userId, characterId, guild]
    );
    return result.rows[0];
  },

  async findByUserId(userId) {
    const result = await db.query(
      `SELECT a.*, c.ign, c.class, c.subclass, c.character_type 
       FROM applications a 
       LEFT JOIN characters c ON a.character_id = c.id 
       WHERE a.user_id = $1 
       ORDER BY a.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async findByCharacterId(characterId) {
    const result = await db.query(
      `SELECT * FROM applications WHERE character_id = $1`,
      [characterId]
    );
    return result.rows[0];
  },

  async findPending() {
    const result = await db.query(
      `SELECT a.*, c.ign, c.class, c.subclass, c.character_type, u.timezone 
       FROM applications a 
       LEFT JOIN characters c ON a.character_id = c.id 
       LEFT JOIN users u ON a.user_id = u.user_id 
       WHERE a.status = 'pending' 
       ORDER BY a.created_at ASC`
    );
    return result.rows;
  },

  async updateStatus(applicationId, status, reviewedBy = null) {
    const result = await db.query(
      `UPDATE applications 
       SET status = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [applicationId, status, reviewedBy]
    );
    return result.rows[0];
  },

  async delete(applicationId) {
    await db.query('DELETE FROM applications WHERE id = $1', [applicationId]);
  },

  async deleteByCharacter(characterId) {
    await db.query('DELETE FROM applications WHERE character_id = $1', [characterId]);
  }
};

export default {
  UserRepo,
  CharacterRepo,
  BattleImagineRepo,
  ApplicationRepo
};
