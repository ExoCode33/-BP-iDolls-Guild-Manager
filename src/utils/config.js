import dotenv from 'dotenv';
dotenv.config();

/**
 * Robust boolean parser that handles Railway's quoted values
 * Railway adds quotes: CLEAR_LOG_ON_START="true" 
 * This becomes string "true" which fails === 'true' check
 */
function parseBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  
  const str = String(value).trim().toLowerCase();
  return str === 'true' || str === '1' || str === 'yes';
}

/**
 * Parse integer with default fallback
 */
function parseIntValue(value, defaultValue = 0) {
  const parsed = Number.parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Load Battle Imagines from environment variables
 * Looks for BATTLE_IMAGINE_NAME_X and BATTLE_IMAGINE_LOGO_X pairs
 */
function loadBattleImagines() {
  const battleImagines = [];
  let index = 1;
  
  while (process.env[`BATTLE_IMAGINE_NAME_${index}`]) {
    const name = process.env[`BATTLE_IMAGINE_NAME_${index}`];
    const logo = process.env[`BATTLE_IMAGINE_LOGO_${index}`];
    
    // Only add if name is provided (logo is optional)
    if (name && name.trim() !== '') {
      battleImagines.push({
        name: name.trim(),
        logo: logo ? logo.trim() : null,
        tiers: ['T0', 'T1', 'T2', 'T3', 'T4', 'T5']
      });
    }
    
    index++;
  }
  
  return battleImagines;
}

const config = {
  discord: {
    clientId: process.env.CLIENT_ID,
    token: process.env.DISCORD_TOKEN,
    guildId: process.env.GUILD_ID
  },
  database: {
    url: process.env.DATABASE_URL
  },
  sheets: {
    id: process.env.GOOGLE_SHEETS_ID,
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    debugMode: parseBool(process.env.SHEETS_DEBUG_MODE, false)
  },
  guilds: [
    { name: process.env.GUILD_1_NAME, roleId: process.env.GUILD_1_ROLE_ID },
    { name: process.env.GUILD_2_NAME, roleId: process.env.GUILD_2_ROLE_ID },
    { name: process.env.GUILD_3_NAME, roleId: process.env.GUILD_3_ROLE_ID },
    { name: process.env.GUILD_4_NAME, roleId: process.env.GUILD_4_ROLE_ID },
    { name: process.env.GUILD_5_NAME, roleId: process.env.GUILD_5_ROLE_ID },
    { name: 'Visitor', roleId: process.env.VISITOR_ROLE_ID } // Visitor at the end
  ].filter(g => g.name && g.roleId),
  roles: {
    visitor: process.env.VISITOR_ROLE_ID,
    moderator: process.env.MODERATOR_ROLE_ID
  },
  channels: {
    moderatorNotification: process.env.MODERATOR_NOTIFICATION_CHANNEL_ID,
    log: process.env.LOG_CHANNEL_ID
  },
  icons: {
    beatPerformer: process.env.ICON_BEAT_PERFORMER,
    frostMage: process.env.ICON_FROST_MAGE,
    heavyGuardian: process.env.ICON_HEAVY_GUARDIAN,
    marksman: process.env.ICON_MARKSMAN,
    shieldKnight: process.env.ICON_SHIELD_KNIGHT,
    stormblade: process.env.ICON_STORMBLADE,
    verdantOracle: process.env.ICON_VERDANT_ORACLE,
    windKnight: process.env.ICON_WIND_KNIGHT
  },
  battleImagines: loadBattleImagines(), // ✅ NEW: Load Battle Imagines
  sync: {
    autoSyncInterval: parseIntValue(process.env.AUTO_SYNC_INTERVAL, 3600000), // 1 hour default
    nicknameSyncEnabled: parseBool(process.env.NICKNAME_SYNC_ENABLED, false),
    nicknameSyncInterval: parseIntValue(process.env.NICKNAME_SYNC_INTERVAL, 300000) // 5 minutes default
  },
  ephemeral: {
    registerChar: parseBool(process.env.REGISTER_CHAR_EPHEMERAL, true), // Default true
    editChar: parseBool(process.env.EDIT_CHAR_EPHEMERAL, true), // Default true
    viewChar: parseBool(process.env.VIEW_CHAR_EPHEMERAL, false), // Default false
    admin: parseBool(process.env.ADMIN_EPHEMERAL, true) // Default true
  },
  logging: {
    toChannel: parseBool(process.env.LOG_TO_CHANNEL, true),
    clearOnStart: parseBool(process.env.CLEAR_LOG_ON_START, false)
  }
};

export default config;
