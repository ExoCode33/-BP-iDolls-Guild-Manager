import db from './index.js';

// ═══════════════════════════════════════════════════════════════════
// CHARACTER REPOSITORY
// ═══════════════════════════════════════════════════════════════════

export class CharacterRepo {
  static async create(characterData) {
    const result = await db.query(
      `INSERT INTO characters (user_id, character_type, ign, uid, class, subclass, ability_score, guild, rank, parent_character_id, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        characterData.user_id,
        characterData.character_type,
        characterData.ign,
        characterData.uid,
        characterData.class,
        characterData.subclass || null,
        characterData.ability_score || null,
        characterData.guild || null,
        characterData.rank || null,
        characterData.parent_character_id || null,
        characterData.role || null
      ]
    );
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const result = await db.query(
      'SELECT * FROM characters WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await db.query('SELECT * FROM characters WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByIgn(ign) {
    const result = await db.query('SELECT * FROM characters WHERE LOWER(ign) = LOWER($1)', [ign]);
    return result.rows[0];
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE characters SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(id) {
    await db.query('DELETE FROM characters WHERE id = $1', [id]);
  }

  static async findByParentId(parentId) {
    const result = await db.query(
      'SELECT * FROM characters WHERE parent_character_id = $1',
      [parentId]
    );
    return result.rows;
  }
}

// ═══════════════════════════════════════════════════════════════════
// APPLICATION REPOSITORY
// ═══════════════════════════════════════════════════════════════════

export class ApplicationRepo {
  static async create(userId, characterData) {
    const result = await db.query(
      `INSERT INTO applications (user_id, status, character_data)
       VALUES ($1, 'pending', $2) RETURNING *`,
      [userId, JSON.stringify(characterData)]
    );
    return result.rows[0];
  }

  static async findPending(userId) {
    const result = await db.query(
      `SELECT * FROM applications WHERE user_id = $1 AND status = 'pending'`,
      [userId]
    );
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const result = await db.query(
      `UPDATE applications SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, status]
    );
    return result.rows[0];
  }
}

// ═══════════════════════════════════════════════════════════════════
// GUILD APPLICATION REPOSITORY
// ═══════════════════════════════════════════════════════════════════

export class GuildApplicationRepo {
  static async create(applicationData) {
    const result = await db.query(
      `INSERT INTO guild_applications (user_id, character_id, guild_name, message_id, channel_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        applicationData.user_id,
        applicationData.character_id,
        applicationData.guild_name,
        applicationData.message_id,
        applicationData.channel_id
      ]
    );
    return result.rows[0];
  }

  static async findByMessageId(messageId) {
    const result = await db.query(
      'SELECT * FROM guild_applications WHERE message_id = $1',
      [messageId]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM guild_applications WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async addVote(id, userId, voteType) {
    const column = voteType === 'accept' ? 'accept_votes' : 'deny_votes';
    await db.query(
      `UPDATE guild_applications 
       SET ${column} = array_append(${column}, $2), updated_at = NOW()
       WHERE id = $1`,
      [id, userId]
    );
  }

  static async removeVote(id, userId, voteType) {
    const column = voteType === 'accept' ? 'accept_votes' : 'deny_votes';
    await db.query(
      `UPDATE guild_applications 
       SET ${column} = array_remove(${column}, $2), updated_at = NOW()
       WHERE id = $1`,
      [id, userId]
    );
  }

  static async updateStatus(id, status) {
    await db.query(
      `UPDATE guild_applications SET status = $2, updated_at = NOW() WHERE id = $1`,
      [id, status]
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// TIMEZONE REPOSITORY - YOUR NAMING
// ═══════════════════════════════════════════════════════════════════

export class TimezoneRepo {
  static async set(userId, timezone) {
    await db.query(
      `INSERT INTO user_timezones (user_id, timezone, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET timezone = $2, updated_at = NOW()`,
      [userId, timezone]
    );
  }

  static async get(userId) {
    const result = await db.query(
      'SELECT timezone FROM user_timezones WHERE user_id = $1',
      [userId]
    );
    return result.rows[0]?.timezone;
  }
}

// ═══════════════════════════════════════════════════════════════════
// BATTLE IMAGINE REPOSITORY
// ═══════════════════════════════════════════════════════════════════

export class BattleImagineRepo {
  static async add(characterId, imagineName, tier) {
    const result = await db.query(
      `INSERT INTO battle_imagines (character_id, imagine_name, tier)
       VALUES ($1, $2, $3)
       ON CONFLICT (character_id, imagine_name) DO NOTHING
       RETURNING *`,
      [characterId, imagineName, tier]
    );
    return result.rows[0];
  }

  static async findByCharacterId(characterId) {
    const result = await db.query(
      'SELECT * FROM battle_imagines WHERE character_id = $1 ORDER BY created_at DESC',
      [characterId]
    );
    return result.rows;
  }

  static async delete(characterId, imagineName) {
    await db.query(
      'DELETE FROM battle_imagines WHERE character_id = $1 AND imagine_name = $2',
      [characterId, imagineName]
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// EPHEMERAL SETTINGS REPOSITORY
// ═══════════════════════════════════════════════════════════════════

export class EphemeralSettingsRepo {
  static async getSettings(guildId) {
    const result = await db.query(
      'SELECT ephemeral_commands FROM ephemeral_settings WHERE guild_id = $1',
      [guildId]
    );
    return result.rows[0]?.ephemeral_commands || [];
  }

  static async updateSettings(guildId, commands) {
    await db.query(
      `INSERT INTO ephemeral_settings (guild_id, ephemeral_commands, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (guild_id)
       DO UPDATE SET ephemeral_commands = $2, updated_at = NOW()`,
      [guildId, commands]
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// LOGGING REPOSITORY - NEW FOR LOGGING SYSTEM
// ═══════════════════════════════════════════════════════════════════

export class LoggingRepo {
  static async getSettings(guildId) {
    const result = await db.query(
      `SELECT general_log_channel_id, application_log_channel_id, log_settings, log_grouping 
       FROM guild_settings WHERE guild_id = $1`,
      [guildId]
    );

    if (result.rows.length === 0) {
      await db.query(
        `INSERT INTO guild_settings (guild_id) VALUES ($1) ON CONFLICT (guild_id) DO NOTHING`,
        [guildId]
      );

      return {
        generalChannelId: null,
        applicationChannelId: null,
        settings: {
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
        },
        grouping: {
          character_registration: false,
          character_updates: true,
          character_deletion: false,
          verification: true,
          timezone_changes: true,
          battle_imagine_changes: true,
          settings_changes: false,
          role_changes: false,
          grouping_window_minutes: 10
        }
      };
    }

    const row = result.rows[0];
    return {
      generalChannelId: row.general_log_channel_id,
      applicationChannelId: row.application_log_channel_id,
      settings: row.log_settings || {},
      grouping: row.log_grouping || { grouping_window_minutes: 10 }
    };
  }

  static async setGeneralLogChannel(guildId, channelId) {
    await db.query(
      `INSERT INTO guild_settings (guild_id, general_log_channel_id, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (guild_id)
       DO UPDATE SET general_log_channel_id = $2, updated_at = NOW()`,
      [guildId, channelId]
    );
  }

  static async setApplicationLogChannel(guildId, channelId) {
    await db.query(
      `INSERT INTO guild_settings (guild_id, application_log_channel_id, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (guild_id)
       DO UPDATE SET application_log_channel_id = $2, updated_at = NOW()`,
      [guildId, channelId]
    );
  }

  static async updateLogSettings(guildId, settings) {
    await db.query(
      `UPDATE guild_settings 
       SET log_settings = $2, updated_at = NOW()
       WHERE guild_id = $1`,
      [guildId, JSON.stringify(settings)]
    );
  }

  static async updateGrouping(guildId, grouping) {
    await db.query(
      `UPDATE guild_settings 
       SET log_grouping = $2, updated_at = NOW()
       WHERE guild_id = $1`,
      [guildId, JSON.stringify(grouping)]
    );
  }

  static async getVerificationChannel(guildId) {
    const result = await db.query(
      'SELECT verification_channel_id FROM guild_settings WHERE guild_id = $1',
      [guildId]
    );
    return result.rows[0]?.verification_channel_id;
  }

  static async setVerificationChannel(guildId, channelId) {
    await db.query(
      `INSERT INTO guild_settings (guild_id, verification_channel_id, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (guild_id)
       DO UPDATE SET verification_channel_id = $2, updated_at = NOW()`,
      [guildId, channelId]
    );
  }
}
