import db from './index.js';
import { CLASSES } from '../config/game.js';

const getRole = (className) => CLASSES[className]?.role || 'Unknown';

export const CharacterRepo = {
  async create(data) {
    const { userId, ign, uid, className, subclass, abilityScore, guild, characterType, parentId } = data;
    const result = await db.query(
      `INSERT INTO characters (user_id, ign, uid, class, subclass, ability_score, guild, character_type, parent_character_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [userId, ign, uid, className, subclass, abilityScore, guild, characterType, parentId || null]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query(`SELECT * FROM characters WHERE id = $1`, [id]);
    if (result.rows[0]) result.rows[0].role = getRole(result.rows[0].class);
    return result.rows[0] || null;
  },

  async findMain(userId) {
    const result = await db.query(`SELECT * FROM characters WHERE user_id = $1 AND character_type = 'main'`, [userId]);
    if (result.rows[0]) result.rows[0].role = getRole(result.rows[0].class);
    return result.rows[0] || null;
  },

  async findAllByUser(userId) {
    const result = await db.query(
      `SELECT c.*, p.ign as parent_ign FROM characters c LEFT JOIN characters p ON c.parent_character_id = p.id
       WHERE c.user_id = $1 ORDER BY CASE c.character_type WHEN 'main' THEN 1 WHEN 'main_subclass' THEN 2 ELSE 3 END, c.created_at`,
      [userId]
    );
    return result.rows.map(r => ({ ...r, role: getRole(r.class) }));
  },

  async findAll() {
    const result = await db.query(
      `SELECT c.*, p.ign as parent_ign FROM characters c LEFT JOIN characters p ON c.parent_character_id = p.id ORDER BY c.user_id, c.created_at`
    );
    return result.rows.map(r => ({ ...r, role: getRole(r.class) }));
  },

  async update(id, data) {
    const fields = [], values = [];
    let i = 1;
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        const dbKey = key === 'className' ? 'class' : key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = $${i}`);
        values.push(val);
        i++;
      }
    }
    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);
    values.push(id);
    const result = await db.query(`UPDATE characters SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values);
    return result.rows[0];
  },

  async delete(id) { await db.query(`DELETE FROM characters WHERE id = $1`, [id]); },
  async deleteAllByUser(userId) { await db.query(`DELETE FROM characters WHERE user_id = $1`, [userId]); },
  async countSubclasses(userId) {
    const result = await db.query(`SELECT COUNT(*) FROM characters WHERE user_id = $1 AND character_type = 'main_subclass'`, [userId]);
    return parseInt(result.rows[0].count);
  }
};

export const TimezoneRepo = {
  async get(userId) {
    const result = await db.query(`SELECT timezone FROM user_timezones WHERE user_id = $1`, [userId]);
    return result.rows[0]?.timezone || null;
  },
  async set(userId, timezone) {
    await db.query(`INSERT INTO user_timezones (user_id, timezone) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET timezone = $2, updated_at = NOW()`, [userId, timezone]);
  }
};

export const BattleImagineRepo = {
  async add(characterId, name, tier) {
    await db.query(`INSERT INTO battle_imagines (character_id, imagine_name, tier) VALUES ($1, $2, $3) ON CONFLICT (character_id, imagine_name) DO UPDATE SET tier = $3`, [characterId, name, tier]);
  },
  async findByCharacter(characterId) {
    const result = await db.query(`SELECT * FROM battle_imagines WHERE character_id = $1 ORDER BY id`, [characterId]);
    return result.rows;
  },
  async deleteByCharacter(characterId) { await db.query(`DELETE FROM battle_imagines WHERE character_id = $1`, [characterId]); },
  async deleteByCharacterAndName(characterId, imagineName) {
    await db.query(`DELETE FROM battle_imagines WHERE character_id = $1 AND imagine_name = $2`, [characterId, imagineName]);
  }
};

export const LogSettingsRepo = {
  async get(guildId) {
    try {
      const result = await db.query(`SELECT * FROM log_settings WHERE guild_id = $1`, [guildId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('[LogSettingsRepo] Error getting settings:', error.message);
      return null;
    }
  },
  
  async upsert(guildId, data) {
    try {
      const { enabledCategories, channelId, batchInterval, pingRoleId, pingOnError } = data;
      
      // Build dynamic update query based on what fields are provided
      const updates = [];
      const values = [guildId];
      let paramIndex = 2;
      
      if (enabledCategories !== undefined) {
        updates.push(`enabled_categories = $${paramIndex}`);
        values.push(enabledCategories);
        paramIndex++;
      }
      
      if (channelId !== undefined) {
        updates.push(`log_channel_id = $${paramIndex}`);
        values.push(channelId);
        paramIndex++;
      }
      
      if (batchInterval !== undefined) {
        updates.push(`batch_interval = $${paramIndex}`);
        values.push(batchInterval);
        paramIndex++;
      }
      
      if (pingRoleId !== undefined) {
        updates.push(`ping_role_id = $${paramIndex}`);
        values.push(pingRoleId);
        paramIndex++;
      }
      
      if (pingOnError !== undefined) {
        updates.push(`ping_on_error = $${paramIndex}`);
        values.push(pingOnError);
        paramIndex++;
      }
      
      if (updates.length === 0) {
        console.log('[LogSettingsRepo] No updates to make');
        return;
      }
      
      // Check if record exists
      const existing = await db.query(`SELECT guild_id FROM log_settings WHERE guild_id = $1`, [guildId]);
      
      if (existing.rows.length > 0) {
        // Update existing record
        updates.push(`updated_at = NOW()`);
        const query = `UPDATE log_settings SET ${updates.join(', ')} WHERE guild_id = $1`;
        await db.query(query, values);
        console.log('[LogSettingsRepo] Updated settings for guild:', guildId);
      } else {
        // Insert new record
        const insertFields = ['guild_id'];
        const insertValues = ['$1'];
        const insertParams = [guildId];
        let insertIndex = 2;
        
        if (enabledCategories !== undefined) {
          insertFields.push('enabled_categories');
          insertValues.push(`$${insertIndex}`);
          insertParams.push(enabledCategories);
          insertIndex++;
        }
        
        if (channelId !== undefined) {
          insertFields.push('log_channel_id');
          insertValues.push(`$${insertIndex}`);
          insertParams.push(channelId);
          insertIndex++;
        }
        
        if (batchInterval !== undefined) {
          insertFields.push('batch_interval');
          insertValues.push(`$${insertIndex}`);
          insertParams.push(batchInterval);
          insertIndex++;
        }
        
        if (pingRoleId !== undefined) {
          insertFields.push('ping_role_id');
          insertValues.push(`$${insertIndex}`);
          insertParams.push(pingRoleId);
          insertIndex++;
        }
        
        if (pingOnError !== undefined) {
          insertFields.push('ping_on_error');
          insertValues.push(`$${insertIndex}`);
          insertParams.push(pingOnError);
          insertIndex++;
        }
        
        const query = `INSERT INTO log_settings (${insertFields.join(', ')}) VALUES (${insertValues.join(', ')})`;
        await db.query(query, insertParams);
        console.log('[LogSettingsRepo] Created settings for guild:', guildId);
      }
    } catch (error) {
      console.error('[LogSettingsRepo] Error upserting settings:', error.message);
      throw error;
    }
  }
};

export const EphemeralRepo = {
  async get(guildId) {
    try {
      const result = await db.query(`SELECT ephemeral_commands FROM ephemeral_settings WHERE guild_id = $1`, [guildId]);
      return result.rows[0]?.ephemeral_commands || ['edit_character', 'admin', 'registration', 'errors'];
    } catch (error) {
      console.error('[EphemeralRepo] Error getting settings:', error.message);
      return ['edit_character', 'admin', 'registration', 'errors'];
    }
  },
  async set(guildId, commands) {
    try {
      await db.query(
        `INSERT INTO ephemeral_settings (guild_id, ephemeral_commands) 
         VALUES ($1, $2) 
         ON CONFLICT (guild_id) 
         DO UPDATE SET ephemeral_commands = $2, updated_at = NOW()`, 
        [guildId, commands]
      );
    } catch (error) {
      console.error('[EphemeralRepo] Error setting:', error.message);
      throw error;
    }
  }
};

export const ApplicationRepo = {
  async create(data) {
    const { userId, characterId, guildName, messageId, channelId } = data;
    const result = await db.query(
      `INSERT INTO guild_applications (user_id, character_id, guild_name, message_id, channel_id, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [userId, characterId, guildName, messageId, channelId]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query(`SELECT * FROM guild_applications WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },

  async findByMessageId(messageId) {
    const result = await db.query(`SELECT * FROM guild_applications WHERE message_id = $1`, [messageId]);
    return result.rows[0] || null;
  },

  async findPending() {
    const result = await db.query(
      `SELECT a.*, c.ign, c.uid, c.class, c.subclass, c.ability_score 
       FROM guild_applications a 
       JOIN characters c ON a.character_id = c.id 
       WHERE a.status = 'pending' 
       ORDER BY a.created_at ASC`
    );
    return result.rows;
  },

  async findAllByUserAndCharacter(userId, characterId) {
    const result = await db.query(
      `SELECT * FROM guild_applications 
       WHERE user_id = $1 AND character_id = $2 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId, characterId]
    );
    return result.rows[0] || null;
  },

  async addVote(id, oduserId, voteType) {
    const field = voteType === 'accept' ? 'accept_votes' : 'deny_votes';
    const otherField = voteType === 'accept' ? 'deny_votes' : 'accept_votes';
    
    const result = await db.query(
      `UPDATE guild_applications 
       SET ${field} = array_append(array_remove(${field}, $2), $2),
           ${otherField} = array_remove(${otherField}, $2),
           updated_at = NOW()
       WHERE id = $1 
       RETURNING *`,
      [id, oduserId]
    );
    return result.rows[0];
  },

  async removeVote(id, oduserId) {
    const result = await db.query(
      `UPDATE guild_applications 
       SET accept_votes = array_remove(accept_votes, $2),
           deny_votes = array_remove(deny_votes, $2),
           updated_at = NOW()
       WHERE id = $1 
       RETURNING *`,
      [id, oduserId]
    );
    return result.rows[0];
  },

  async updateStatus(id, status) {
    const result = await db.query(
      `UPDATE guild_applications 
       SET status = $2, updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [id, status]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    let i = 1;

    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = $${i}`);
        values.push(val);
        i++;
      }
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE guild_applications SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id) {
    await db.query(`DELETE FROM guild_applications WHERE id = $1`, [id]);
  },

  async deleteByMessageId(messageId) {
    await db.query(`DELETE FROM guild_applications WHERE message_id = $1`, [messageId]);
  }
};
