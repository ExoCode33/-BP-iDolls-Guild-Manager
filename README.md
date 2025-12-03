# Guild Manager Discord Bot

A comprehensive Discord bot for managing guild member characters with PostgreSQL database and Google Sheets integration. Built for Railway deployment with modern slash commands.

## Features

- ✅ **Character Registration** - Register main characters with full details
- ✅ **Alt Character Support** - Add unlimited alt characters
- ✅ **Automatic Role Detection** - Roles automatically assigned based on class/subclass
- ✅ **Nickname Management** - Automatically updates Discord nicknames to IGN
- ✅ **PostgreSQL Database** - Persistent data storage
- ✅ **Google Sheets Integration** - Real-time sync with spreadsheets
- ✅ **Dropdown Menus** - User-friendly selection for classes, subclasses, guilds, and timezones
- ✅ **Update Commands** - Easily update character information
- ✅ **Well-Organized Structure** - Easy to extend and maintain

## Project Structure

```
guild-manager-bot/
├── src/
│   ├── commands/           # Slash commands
│   │   ├── register.js     # Main character registration
│   │   ├── addalt.js       # Alt character registration
│   │   ├── viewchar.js     # View characters
│   │   ├── update.js       # Update character info
│   │   └── sync.js         # Manual Google Sheets sync
│   ├── config/
│   │   └── gameData.js     # Game classes, roles, and configuration
│   ├── database/
│   │   ├── db.js           # Database connection
│   │   └── queries.js      # Database queries
│   ├── services/
│   │   └── googleSheets.js # Google Sheets integration
│   ├── index.js            # Main bot file
│   └── deploy-commands.js  # Command deployment script
├── database/
│   └── schema.sql          # Database schema
├── package.json
├── .env.example
└── README.md
```

## Setup Instructions

### 1. Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section:
   - Click "Add Bot"
   - Enable "SERVER MEMBERS INTENT" under Privileged Gateway Intents
   - Copy the bot token (you'll need this for `.env`)
4. Go to "OAuth2" > "General":
   - Copy the "CLIENT ID" (you'll need this for `.env`)
5. Go to "OAuth2" > "URL Generator":
   - Select scopes: `bot`, `applications.commands`
   - Select bot permissions: `Manage Nicknames`, `Send Messages`, `Use Slash Commands`
   - Copy the generated URL and use it to invite the bot to your server

### 2. PostgreSQL Database Setup

#### For Railway:
1. Go to your Railway project
2. Click "New" > "Database" > "PostgreSQL"
3. Once created, go to the PostgreSQL service
4. Copy the "DATABASE_URL" from the "Connect" tab

#### For Local Development:
```bash
# Install PostgreSQL locally
# Create a database
createdb guild_manager

# Your DATABASE_URL will be:
# postgresql://username:password@localhost:5432/guild_manager
```

### 3. Google Sheets Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create a service account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the details and click "Create"
   - Skip granting roles and click "Done"
5. Create a key for the service account:
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" > "Create New Key"
   - Choose "JSON" and click "Create"
   - Save the downloaded JSON file securely
6. From the JSON file, you'll need:
   - `client_email` → This is your `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → This is your `GOOGLE_PRIVATE_KEY`
7. Create a Google Sheet:
   - Go to [Google Sheets](https://sheets.google.com/)
   - Create a new spreadsheet
   - Create two sheets named: "Main Characters" and "Alt Characters"
   - Share the spreadsheet with your service account email (the `client_email` from the JSON)
   - Give it "Editor" access
   - Copy the spreadsheet ID from the URL (it's the long string between `/d/` and `/edit`)

### 4. Environment Variables

Create a `.env` file in the root directory:

```env
# Discord Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here  # Optional: for faster command deployment during development

# PostgreSQL Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# Google Sheets Configuration
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
```

**Important Notes:**
- For `GUILD_ID`: Right-click your Discord server icon > "Copy Server ID" (you need Developer Mode enabled in Discord settings)
- For `GOOGLE_PRIVATE_KEY`: Keep the quotes and the `\n` characters - they're important!

### 5. Installation

```bash
# Install dependencies
npm install

# Deploy slash commands to Discord
npm run deploy

# Start the bot
npm start
```

### 6. Railway Deployment

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Initialize project: `railway init`
4. Add environment variables in Railway dashboard
5. Deploy: `railway up`

Or use Railway's GitHub integration:
1. Push your code to GitHub
2. Connect your Railway project to your GitHub repo
3. Add environment variables in Railway dashboard
4. Railway will automatically deploy

## Database Schema

### Characters Table
- `discord_id` - User's Discord ID
- `discord_name` - User's Discord username
- `ign` - In-game name
- `role` - Character role (Tank/DPS/Support)
- `class` - Character class
- `subclass` - Character subclass
- `ability_score` - Total combat power/gear score
- `timezone` - User's timezone
- `guild` - User's guild (Guild 1, 2, or 3)
- `is_main` - Whether this is the main character

### Alt Characters Table
- `discord_id` - User's Discord ID
- `main_character_id` - Reference to main character
- `ign` - Alt character's in-game name
- `role` - Character role
- `class` - Character class
- `subclass` - Character subclass

## Available Commands

### `/register`
Register your main character. Walks you through:
1. Class selection
2. Subclass selection
3. Guild selection
4. Timezone selection
5. IGN and ability score input

### `/addalt`
Add an alt character. Asks for:
1. Class
2. Subclass
3. IGN

### `/viewchar [user]`
View your own or another user's registered characters

### `/update <field>`
Update your main character information:
- `class` - Change class and subclass
- `ability_score` - Update your ability score
- `guild` - Change your guild
- `timezone` - Update your timezone

### `/sync` (Admin only)
Manually sync all data to Google Sheets

## Game Data Configuration

The bot supports the following classes and subclasses:

- **Beat Performer** (Support)
  - Dissonance
  - Concerto
- **Frost Mage** (DPS)
  - Icicle
  - Frostbeam
- **Heavy Guardian** (Tank)
  - Earthfort
  - Block
- **Marksman** (DPS)
  - Wildpack
  - Falconry
- **Shield Knight** (Tank)
  - Recovery
  - Shield
- **Stormblade** (DPS)
  - Iaido
  - Moonstrike
- **Verdant Oracle** (Support)
  - Smite
  - Lifebind
- **Wind Knight** (DPS)
  - Vanguard
  - Skyward

## Extending the Bot

### Adding New Classes/Subclasses

Edit `src/config/gameData.js`:

```javascript
'New Class Name': {
  subclasses: ['Subclass1', 'Subclass2'],
  role: 'DPS' // or 'Tank', 'Support'
}
```

### Adding New Commands

1. Create a new file in `src/commands/`
2. Follow the structure of existing commands
3. Import and add to the commands array in `src/index.js`
4. Run `npm run deploy` to register the new command

### Adding More Guilds

Edit `src/config/gameData.js`:

```javascript
guilds: ['Guild 1', 'Guild 2', 'Guild 3', 'Guild 4']
```

## Troubleshooting

### Commands not showing up
- Make sure you ran `npm run deploy`
- If using `GUILD_ID`, commands update instantly
- Global commands can take up to 1 hour to propagate

### Bot can't change nicknames
- Check bot role position in server settings (must be above member roles)
- Verify "Manage Nicknames" permission is enabled

### Database connection errors
- Verify your `DATABASE_URL` is correct
- For Railway, make sure the database is in the same project
- Check Railway logs for detailed error messages

### Google Sheets not syncing
- Verify the service account email has Editor access to the sheet
- Check that sheet names are exactly "Main Characters" and "Alt Characters"
- Ensure the private key in `.env` has proper formatting with `\n`

## License

MIT

## Support

For issues or questions, please open an issue on the GitHub repository.
