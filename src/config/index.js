import dotenv from 'dotenv';
dotenv.config();

const bool = (val, def = false) => {
  if (!val) return def;
  return ['true', '1', 'yes'].includes(String(val).toLowerCase());
};

const int = (val, def = 0) => {
  const n = parseInt(val);
  return isNaN(n) ? def : n;
};

const loadGuilds = () => {
  const guilds = [];
  for (let i = 1; i <= 5; i++) {
    const name = process.env[`GUILD_${i}_NAME`];
    const roleId = process.env[`GUILD_${i}_ROLE_ID`];
    if (name && roleId) guilds.push({ name, roleId });
  }
  if (process.env.VISITOR_ROLE_ID) {
    guilds.push({ name: 'Visitor', roleId: process.env.VISITOR_ROLE_ID });
  }
  return guilds;
};

const loadBattleImagines = () => {
  const imagines = [];
  let i = 1;
  while (process.env[`BATTLE_IMAGINE_NAME_${i}`]) {
    imagines.push({
      name: process.env[`BATTLE_IMAGINE_NAME_${i}`].trim(),
      logo: process.env[`BATTLE_IMAGINE_LOGO_${i}`]?.trim() || null
    });
    i++;
  }
  return imagines;
};

const loadClassRoles = () => {
  return {
    'Beat Performer': process.env.CLASS_ROLE_BEAT_PERFORMER,
    'Frost Mage': process.env.CLASS_ROLE_FROST_MAGE,
    'Heavy Guardian': process.env.CLASS_ROLE_HEAVY_GUARDIAN,
    'Marksman': process.env.CLASS_ROLE_MARKSMAN,
    'Shield Knight': process.env.CLASS_ROLE_SHIELD_KNIGHT,
    'Stormblade': process.env.CLASS_ROLE_STORMBLADE,
    'Verdant Oracle': process.env.CLASS_ROLE_VERDANT_ORACLE,
    'Wind Knight': process.env.CLASS_ROLE_WIND_KNIGHT
  };
};

export default {
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
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  },
  guilds: loadGuilds(),
  battleImagines: loadBattleImagines(),
  sync: {
    sheetsInterval: int(process.env.SHEETS_SYNC_INTERVAL, 60000),
    nicknameEnabled: bool(process.env.NICKNAME_SYNC_ENABLED),
    nicknameInterval: int(process.env.NICKNAME_SYNC_INTERVAL, 300000)
  },
  logging: {
    adminRoleId: process.env.ADMIN_ROLE_ID
  },
  roles: {
    registered: process.env.REGISTERED_ROLE_ID,
    verified: process.env.VERIFIED_ROLE_ID,
    visitor: process.env.VISITOR_ROLE_ID,
    guild1: process.env.GUILD_1_ROLE_ID,
    guild2: process.env.GUILD_2_ROLE_ID,
    guild3: process.env.GUILD_3_ROLE_ID,
    guild4: process.env.GUILD_4_ROLE_ID,
    guild5: process.env.GUILD_5_ROLE_ID
  },
  channels: {
    admin: process.env.ADMIN_CHANNEL_ID
  },
  ephemeral: {
    defaults: ['character', 'admin']
  },
  classRoles: loadClassRoles()
};
