import dotenv from 'dotenv';
dotenv.config();

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
    privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  },
  guilds: [
    { name: 'Visitor', roleId: process.env.VISITOR_ROLE_ID }, // Added visitor as guild
    { name: process.env.GUILD_1_NAME, roleId: process.env.GUILD_1_ROLE_ID },
    { name: process.env.GUILD_2_NAME, roleId: process.env.GUILD_2_ROLE_ID },
    { name: process.env.GUILD_3_NAME, roleId: process.env.GUILD_3_ROLE_ID },
    { name: process.env.GUILD_4_NAME, roleId: process.env.GUILD_4_ROLE_ID },
    { name: process.env.GUILD_5_NAME, roleId: process.env.GUILD_5_ROLE_ID }
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
  sync: {
    autoSyncInterval: parseInt(process.env.AUTO_SYNC_INTERVAL) || 3600000
  },
  ephemeral: {
    registerChar: process.env.REGISTER_CHAR_EPHEMERAL !== 'false',
    editChar: process.env.EDIT_CHAR_EPHEMERAL !== 'false',
    viewChar: process.env.VIEW_CHAR_EPHEMERAL === 'true',
    admin: process.env.ADMIN_EPHEMERAL !== 'false'
  },
  logging: {
    toChannel: process.env.LOG_TO_CHANNEL === 'true',
    clearOnStart: process.env.CLEAR_LOG_ON_START === 'true'
  }
};

export default config;
