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
    const result = await db.query(`SELECT * FROM log_settings WHERE guild_id = $1`, [guildId]);
    return result.rows[0] || null;
  },
  async upsert(guildId, data) {
    const { enabledCategories, channelId, batchInterval, pingRoleId, pingOnError } = data;
    await db.query(
      `INSERT INTO log_settings (guild_id, enabled_categories, log_channel_id, batch_interval, ping_role_id, ping_on_error)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (guild_id) DO UPDATE SET
         enabled_categories = COALESCE($2, log_settings.enabled_categories),
         log_channel_id = COALESCE($3, log_settings.log_channel_id),
         batch_interval = COALESCE($4, log_settings.batch_interval),
         ping_role_id = COALESCE($5, log_settings.ping_role_id),
         ping_on_error = COALESCE($6, log_settings.ping_on_error),
         updated_at = NOW()`,
      [guildId, enabledCategories, channelId, batchInterval, pingRoleId, pingOnError]
    );
  }
};

export const EphemeralRepo = {
  async get(guildId) {
    const result = await db.query(`SELECT ephemeral_commands FROM ephemeral_settings WHERE guild_id = $1`, [guildId]);
    return result.rows[0]?.ephemeral_commands || ['character', 'admin'];
  },
  async set(guildId, commands) {
    await db.query(`INSERT INTO ephemeral_settings (guild_id, ephemeral_commands) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET ephemeral_commands = $2, updated_at = NOW()`, [guildId, commands]);
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

  async addVote(id, userId, voteType) {
    const field = voteType === 'accept' ? 'accept_votes' : 'deny_votes';
    const otherField = voteType === 'accept' ? 'deny_votes' : 'accept_votes';
    
    const result = await db.query(
      `UPDATE guild_applications 
       SET ${field} = array_append(array_remove(${field}, $2), $2),
           ${otherField} = array_remove(${otherField}, $2),
           updated_at = NOW()
       WHERE id = $1 
       RETURNING *`,
      [id, userId]
    );
    return result.rows[0];
  },

  async removeVote(id, userId) {
    const result = await db.query(
      `UPDATE guild_applications 
       SET accept_votes = array_remove(accept_votes, $2),
           deny_votes = array_remove(deny_votes, $2),
           updated_at = NOW()
       WHERE id = $1 
       RETURNING *`,
      [id, userId]
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

// ═══════════════════════════════════════════════════════════════════
// ✅ NEW: Logger Settings Repository for new logging system
// ═══════════════════════════════════════════════════════════════════

export class LoggerSettingsRepo {
  static async getSettings(guildId) {
    try {
      const result = await db.query(
        `SELECT general_log_channel_id, application_log_channel_id, log_settings, log_grouping 
         FROM guild_settings WHERE guild_id = $1`,
        [guildId]
      );

      if (result.rows.length === 0) {
        const defaultSettings = {
          character_registration: true,
          character_updates: true,
          character_deletion: true,
          verification: true,
          timezone_changes: true,
          battle_imagine_changes: true,
          guild_applications: true,
          application_votes: true,
          admin_overrides: true,
          settings_changes: true,
          role_changes: true
        };

        const defaultGrouping = {
          character_registration: false,
          character_updates: true,
          character_deletion: false,
          verification: true,
          timezone_changes: true,
          battle_imagine_changes: true,
          settings_changes: false,
          role_changes: false,
          grouping_window_minutes: 10
        };

        await db.query(
          `INSERT INTO guild_settings (guild_id, log_settings, log_grouping, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           ON CONFLICT (guild_id) DO NOTHING`,
          [guildId, JSON.stringify(defaultSettings), JSON.stringify(defaultGrouping)]
        );

        return {
          generalChannelId: null,
          applicationChannelId: null,
          settings: defaultSettings,
          grouping: defaultGrouping
        };
      }

      const row = result.rows[0];
      return {
        generalChannelId: row.general_log_channel_id,
        applicationChannelId: row.application_log_channel_id,
        settings: row.log_settings || {},
        grouping: row.log_grouping || { grouping_window_minutes: 10 }
      };
    } catch (error) {
      console.error('[LoggerSettingsRepo] Error getting settings:', error);
      throw error;
    }
  }

  static async setGeneralLogChannel(guildId, channelId) {
    try {
      await db.query(
        `INSERT INTO guild_settings (guild_id, general_log_channel_id, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (guild_id)
         DO UPDATE SET general_log_channel_id = $2, updated_at = NOW()`,
        [guildId, channelId]
      );
    } catch (error) {
      console.error('[LoggerSettingsRepo] Error setting general log channel:', error);
      throw error;
    }
  }

  static async setApplicationLogChannel(guildId, channelId) {
    try {
      await db.query(
        `INSERT INTO guild_settings (guild_id, application_log_channel_id, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (guild_id)
         DO UPDATE SET application_log_channel_id = $2, updated_at = NOW()`,
        [guildId, channelId]
      );
    } catch (error) {
      console.error('[LoggerSettingsRepo] Error setting application log channel:', error);
      throw error;
    }
  }

  static async updateLogSettings(guildId, settings) {
    try {
      await db.query(
        `UPDATE guild_settings 
         SET log_settings = $2, updated_at = NOW()
         WHERE guild_id = $1`,
        [guildId, JSON.stringify(settings)]
      );
    } catch (error) {
      console.error('[LoggerSettingsRepo] Error updating log settings:', error);
      throw error;
    }
  }

  static async updateGrouping(guildId, grouping) {
    try {
      await db.query(
        `UPDATE guild_settings 
         SET log_grouping = $2, updated_at = NOW()
         WHERE guild_id = $1`,
        [guildId, JSON.stringify(grouping)]
      );
    } catch (error) {
      console.error('[LoggerSettingsRepo] Error updating grouping:', error);
      throw error;
    }
  }
}
