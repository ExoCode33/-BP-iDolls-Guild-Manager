# Setup Guide

## Files to Copy:

1. `gameData.js` → Replace `src/config/gameData.js`
2. `guildVerification.js` → Create `src/utils/guildVerification.js` (new file)
3. `googleSheets.js` → Replace `src/services/googleSheets.js`
4. `register.js` → Replace `src/commands/register.js`
5. `update.js` → Replace `src/commands/update.js`
6. `index.js` → Replace `src/index.js`

## Environment Variables (Railway):

```
GUILD_1_NAME=Your Guild Name
GUILD_1_ROLE_ID=123456789012345678
GUILD_2_NAME=Another Guild
GUILD_2_ROLE_ID=234567890123456789
GUILD_3_NAME=
GUILD_3_ROLE_ID=
GUILD_4_NAME=
GUILD_4_ROLE_ID=
GUILD_5_NAME=
GUILD_5_ROLE_ID=

VISITOR_ROLE_ID=987654321098765432

MODERATOR_ROLE_ID=111111111111111111
MODERATOR_NOTIFICATION_CHANNEL_ID=222222222222222222

GOOGLE_SHEETS_ID=1wgEO_nzTSxWrK1sRq_rBHzVbfvZf6dLyoCWGMOyW74M
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

## Deploy:

```bash
npm run deploy
npm start
```

## Features:

✨ **NEW - Automatic Sync:**
- Google Sheets syncs **every 1 minute** automatically
- Also syncs **immediately** after any register/update command
- Beautiful formatting with colors, borders, and frozen headers

✨ **Detailed Logging:**
- See every sync in your Railway logs
- Timestamps for every action
- Easy to track what's happening

## Commands:

- `/register` - Register main character
- `/addalt` - Add alt character
- `/viewchar` - View characters
- `/update` - Update character info
- `/sync` - Manual sync to Google Sheets (Admin)

## Google Sheets Format:

Your sheets will automatically have:
- 🔵 Blue header bar with white text
- 📌 Frozen header (stays at top when scrolling)
- 🦓 Zebra striping (alternating row colors)
- 📏 Auto-sized columns
- 📅 Formatted dates (Dec 3, 2025)
- 🔲 Clean borders

## Logs You'll See:

```
⏰ [AUTO-SYNC] Starting automatic sync...
🔄 [SHEETS] ========== FULL SYNC STARTED (Dec 3, 03:30:15 PM) ==========
📊 [SHEETS] Starting sync for 25 main characters...
📊 [SHEETS] Clearing Main Characters sheet...
📊 [SHEETS] Writing 25 rows to Main Characters...
📊 [SHEETS] Applying formatting to Main Characters...
✅ [SHEETS] Main Characters synced successfully! (25 characters)
📊 [SHEETS] Starting sync for 10 alt characters...
📊 [SHEETS] Clearing Alt Characters sheet...
📊 [SHEETS] Writing 10 rows to Alt Characters...
📊 [SHEETS] Applying formatting to Alt Characters...
✅ [SHEETS] Alt Characters synced successfully! (10 alts)
✅ [SHEETS] ========== FULL SYNC COMPLETE (Dec 3, 03:30:15 PM) ==========
```

## How It Works:

1. **On Bot Start:** Initial sync happens immediately
2. **Every Minute:** Automatic sync keeps sheet updated
3. **After Commands:** Instant sync when someone registers/updates
4. **Manual Trigger:** Admins can run `/sync` anytime

Your Google Sheet stays perfectly up-to-date without any manual work!
