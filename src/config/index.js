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
    channelId: process.env.LOG_CHANNEL_ID,
    maxMessages: int(process.env.MAX_LOG_MESSAGES, 500),
    cleanupInterval: int(process.env.LOG_CLEANUP_INTERVAL, 3600000),
    adminRoleId: process.env.ADMIN_ROLE_ID
  },
  ephemeral: {
    defaults: ['register', 'edit', 'admin']
  }
};
