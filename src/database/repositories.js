import db from './index.js';

// ═══════════════════════════════════════════════════════════════════
// CHARACTER REPOSITORY - Modern camelCase
// ═══════════════════════════════════════════════════════════════════

export class CharacterRepo {
  static async create(data) {
    const result = await db.query(
      `INSERT INTO characters (user_id, character_type, ign, uid, class, subclass, ability_score, guild, rank, parent_character_id, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        data.userId,
        data.characterType,
        data.ign,
        data.uid,
        data.className || data.class,
        data.subclass || null,
        data.abilityScore || null,
        data.guild || null,
        data.rank || null,
        data.parentId || null,
        data.role || null
      ]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      characterType: row.character_type,
      ign: row.ign,
      uid: row.uid,
      className: row.class,
      subclass: row.subclass,
      abilityScore: row.ability_score,
      guild: row.guild,
      rank: row.rank,
      parentId: row.parent_character_id,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async findAll() {
    const result = await db.query('SELECT * FROM characters ORDER BY created_at DESC');
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      characterType: row.character_type,
      ign: row.ign,
      uid: row.uid,
      className: row.class,
      subclass: row.subclass,
      abilityScore: row.ability_score,
      guild: row.guild,
      rank: row.rank,
      parentId: row.parent_character_id,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  static async findByUserId(userId) {
    const result = await db.query(
      'SELECT * FROM characters WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      characterType: row.character_type,
      ign: row.ign,
      uid: row.uid,
      className: row.class,
      subclass: row.subclass,
      abilityScore: row.ability_score,
      guild: row.guild,
      rank: row.rank,
      parentId: row.parent_character_id,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  static async findAllByUser(userId) {
    return this.findByUserId(userId);
  }

  static async findById(id) {
    const result = await db.query('SELECT * FROM characters WHERE id = $1', [id]);
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      characterType: row.character_type,
      ign: row.ign,
      uid: row.uid,
      className: row.class,
      subclass: row.subclass,
      abilityScore: row.ability_score,
      guild: row.guild,
      rank: row.rank,
      parentId: row.parent_character_id,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async findByIgn(ign) {
    const result = await db.query('SELECT * FROM characters WHERE LOWER(ign) = LOWER($1)', [ign]);
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      characterType: row.character_type,
      ign: row.ign,
      uid: row.uid,
      className: row.class,
      subclass: row.subclass,
      abilityScore: row.ability_score,
      guild: row.guild,
      rank: row.rank,
      parentId: row.parent_character_id,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async findMain(userId) {
    const result = await db.query(
      'SELECT * FROM characters WHERE user_id = $1 AND character_type = $2',
      [userId, 'main']
    );
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      characterType: row.character_type,
      ign: row.ign,
      uid: row.uid,
      className: row.class,
      subclass: row.subclass,
      abilityScore: row.ability_score,
      guild: row.guild,
      rank: row.rank,
      parentId: row.parent_character_id,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async countSubclasses(userId) {
    const result = await db.query(
      'SELECT COUNT(*) FROM characters WHERE user_id = $1 AND character_type = $2',
      [userId, 'main_subclass']
    );
    return parseInt(result.rows[0].count);
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Map camelCase to snake_case
    const fieldMap = {
      userId: 'user_id',
      characterType: 'character_type',
      className: 'class',
      abilityScore: 'ability_score',
      parentId: 'parent_character_id'
    };

    Object.entries(updates).forEach(([key, value]) => {
      const dbField = fieldMap[key] || key;
      if (dbField !== 'user_id') { // Don't update user_id
        fields.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE characters SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      characterType: row.character_type,
      ign: row.ign,
      uid: row.uid,
      className: row.class,
      subclass: row.subclass,
      abilityScore: row.ability_score,
      guild: row.guild,
      rank: row.rank,
      parentId: row.parent_character_id,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async delete(id) {
    await db.query('DELETE FROM characters WHERE id = $1', [id]);
  }

  static async deleteAllByUser(userId) {
    await db.query('DELETE FROM characters WHERE user_id = $1', [userId]);
  }

  static async findByParentId(parentId) {
    const result = await db.query(
      'SELECT * FROM characters WHERE parent_character_id = $1',
      [parentId]
    );
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      characterType: row.character_type,
      ign: row.ign,
      uid: row.uid,
      className: row.class,
      subclass: row.subclass,
      abilityScore: row.ability_score,
      guild: row.guild,
      rank: row.rank,
      parentId: row.parent_character_id,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
}

// ═══════════════════════════════════════════════════════════════════
// APPLICATION REPOSITORY - Modern camelCase
// ═══════════════════════════════════════════════════════════════════

export class ApplicationRepo {
  static async create(data) {
    const result = await db.query(
      `INSERT INTO applications (user_id, status, character_data, character_id, guild_name, message_id, channel_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        data.userId,
        data.status || 'pending',
        data.characterData ? JSON.stringify(data.characterData) : null,
        data.characterId || null,
        data.guildName || null,
        data.messageId || null,
        data.channelId || null
      ]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      characterData: row.character_data,
      characterId: row.character_id,
      guildName: row.guild_name,
      messageId: row.message_id,
      channelId: row.channel_id,
      acceptVotes: row.accept_votes,
      denyVotes: row.deny_votes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async findPending(userId = null) {
    if (userId) {
      const result = await db.query(
        `SELECT * FROM applications WHERE user_id = $1 AND status = 'pending'`,
        [userId]
      );
      if (!result.rows[0]) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        status: row.status,
        characterData: row.character_data,
        characterId: row.character_id,
        guildName: row.guild_name,
        messageId: row.message_id,
        channelId: row.channel_id,
        acceptVotes: row.accept_votes,
        denyVotes: row.deny_votes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    }
    
    const result = await db.query(
      `SELECT * FROM applications WHERE status = 'pending' ORDER BY created_at DESC`
    );
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      status: row.status,
      characterData: row.character_data,
      characterId: row.character_id,
      guildName: row.guild_name,
      messageId: row.message_id,
      channelId: row.channel_id,
      acceptVotes: row.accept_votes,
      denyVotes: row.deny_votes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  static async findById(id) {
    const result = await db.query('SELECT * FROM applications WHERE id = $1', [id]);
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      characterData: row.character_data,
      characterId: row.character_id,
      guildName: row.guild_name,
      messageId: row.message_id,
      channelId: row.channel_id,
      acceptVotes: row.accept_votes,
      denyVotes: row.deny_votes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async findAllByUserAndCharacter(userId, characterId) {
    const result = await db.query(
      'SELECT * FROM applications WHERE user_id = $1 AND character_id = $2 ORDER BY created_at DESC LIMIT 1',
      [userId, characterId]
    );
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      characterData: row.character_data,
      characterId: row.character_id,
      guildName: row.guild_name,
      messageId: row.message_id,
      channelId: row.channel_id,
      acceptVotes: row.accept_votes,
      denyVotes: row.deny_votes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async updateStatus(id, status) {
    const result = await db.query(
      `UPDATE applications SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, status]
    );
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      characterData: row.character_data,
      characterId: row.character_id,
      guildName: row.guild_name,
      messageId: row.message_id,
      channelId: row.channel_id,
      acceptVotes: row.accept_votes,
      denyVotes: row.deny_votes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const fieldMap = {
      messageId: 'message_id',
      channelId: 'channel_id',
      guildName: 'guild_name',
      characterId: 'character_id',
      characterData: 'character_data'
    };

    Object.entries(updates).forEach(([key, value]) => {
      const dbField = fieldMap[key] || key;
      fields.push(`${dbField} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE applications SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      characterData: row.character_data,
      characterId: row.character_id,
      guildName: row.guild_name,
      messageId: row.message_id,
      channelId: row.channel_id,
      acceptVotes: row.accept_votes,
      denyVotes: row.deny_votes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async delete(id) {
    await db.query('DELETE FROM applications WHERE id = $1', [id]);
  }

  static async addVote(id, userId, voteType) {
    const column = voteType === 'accept' ? 'accept_votes' : 'deny_votes';
    const result = await db.query(
      `UPDATE applications 
       SET ${column} = array_append(${column}, $2), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, userId]
    );
    
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      characterData: row.character_data,
      characterId: row.character_id,
      guildName: row.guild_name,
      messageId: row.message_id,
      channelId: row.channel_id,
      acceptVotes: row.accept_votes,
      denyVotes: row.deny_votes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async removeVote(id, userId, voteType) {
    const column = voteType === 'accept' ? 'accept_votes' : 'deny_votes';
    await db.query(
      `UPDATE applications 
       SET ${column} = array_remove(${column}, $2), updated_at = NOW()
       WHERE id = $1`,
      [id, userId]
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// GUILD APPLICATION REPOSITORY - Modern camelCase
// ═══════════════════════════════════════════════════════════════════

export class GuildApplicationRepo {
  static async create(data) {
    const result = await db.query(
      `INSERT INTO guild_applications (user_id, character_id, guild_name, message_id, channel_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        data.userId,
        data.characterId,
        data.guildName,
        data.messageId || null,
        data.channelId || null
      ]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      characterId: row.character_id,
      guildName: row.guild_name,
      messageId: row.message_id,
      channelId: row.channel_id,
      acceptVotes: row.accept_votes,
      denyVotes: row.deny_votes,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async findByMessageId(messageId) {
    const result = await db.query(
      'SELECT * FROM guild_applications WHERE message_id = $1',
      [messageId]
    );
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      characterId: row.character_id,
      guildName: row.guild_name,
      messageId: row.message_id,
      channelId: row.channel_id,
      acceptVotes: row.accept_votes,
      denyVotes: row.deny_votes,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async findById(id) {
    const result = await db.query('SELECT * FROM guild_applications WHERE id = $1', [id]);
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      characterId: row.character_id,
      guildName: row.guild_name,
      messageId: row.message_id,
      channelId: row.channel_id,
      acceptVotes: row.accept_votes,
      denyVotes: row.deny_votes,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
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
// TIMEZONE REPOSITORY - Modern camelCase
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
// BATTLE IMAGINE REPOSITORY - Modern camelCase
// ═══════════════════════════════════════════════════════════════════

export class BattleImagineRepo {
  static async add(characterId, imagineName, tier) {
    const result = await db.query(
      `INSERT INTO battle_imagines (character_id, imagine_name, tier)
       VALUES ($1, $2, $3)
       ON CONFLICT (character_id, imagine_name) 
       DO UPDATE SET tier = $3, created_at = NOW()
       RETURNING *`,
      [characterId, imagineName, tier]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      characterId: row.character_id,
      imagineName: row.imagine_name,
      tier: row.tier,
      createdAt: row.created_at
    };
  }

  static async findByCharacterId(characterId) {
    const result = await db.query(
      'SELECT * FROM battle_imagines WHERE character_id = $1 ORDER BY created_at DESC',
      [characterId]
    );
    return result.rows.map(row => ({
      id: row.id,
      characterId: row.character_id,
      imagineName: row.imagine_name,
      tier: row.tier,
      createdAt: row.created_at
    }));
  }

  static async findByCharacter(characterId) {
    return this.findByCharacterId(characterId);
  }

  static async delete(characterId, imagineName) {
    await db.query(
      'DELETE FROM battle_imagines WHERE character_id = $1 AND imagine_name = $2',
      [characterId, imagineName]
    );
  }

  static async deleteByCharacterAndName(characterId, imagineName) {
    return this.delete(characterId, imagineName);
  }
}

// ═══════════════════════════════════════════════════════════════════
// EPHEMERAL SETTINGS REPOSITORY - Modern camelCase
// ═══════════════════════════════════════════════════════════════════

export class EphemeralSettingsRepo {
  static async getSettings(guildId) {
    const result = await db.query(
      'SELECT ephemeral_commands FROM ephemeral_settings WHERE guild_id = $1',
      [guildId]
    );
    return result.rows[0]?.ephemeral_commands || [];
  }

  static async get(guildId) {
    return this.getSettings(guildId);
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
// LOGGING REPOSITORY - Modern camelCase
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

// Alias for backwards compatibility
export const EphemeralRepo = EphemeralSettingsRepo;
