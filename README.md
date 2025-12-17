# Discord Guild Bot

Clean, modular Discord bot for guild member registration and management.

## Features

- Character registration (main, alts, subclasses)
- Battle Imagine tracking with tiers
- Timezone support with local time display
- Google Sheets sync
- Nickname sync (IGN → Discord nickname)
- Granular log filtering
- Profile viewing

## Setup

1. Copy `.env.example` to `.env` and fill in values
2. `npm install`
3. `npm run deploy` (register commands)
4. `npm start`

## Commands

- `/character profile [user]` - View profile
- `/character register` - Start registration
- `/character list` - List all members
- `/admin sync` - Force sheets sync
- `/admin nicknames` - Sync all nicknames
- `/admin logs` - Configure log categories
- `/admin ephemeral` - Configure ephemeral settings
- `/admin stats` - View statistics
- `/admin delete <user>` - Delete user data

## Environment Variables

See `.env.example` for all options.

## Architecture
```
src/
├── config/          # Environment, game data, log categories
├── database/        # Pool, repositories
├── services/        # Logger, state, sheets, nickname sync, ephemeral
├── commands/        # Slash commands
├── interactions/    # Registration, editing flows, router
└── ui/              # Embeds, components, utilities
```

## Railway Deployment

Push to GitHub, connect to Railway, set environment variables.
