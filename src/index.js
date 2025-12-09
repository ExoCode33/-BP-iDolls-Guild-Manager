import { Client, GatewayIntentBits, Events, Collection, REST, Routes } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import logger from './utils/logger.js';

// Dynamic handler imports with error handling
let handlers = {};

async function loadHandlers() {
  const handlerFiles = [
    { path: './handlers/character.js', name: 'character' },
    { path: './handlers/registration.js', name: 'registration' },
    { path: './handlers/update.js', name: 'update' },
    { path: './handlers/subclass.js', name: 'subclass' },
    { path: './handlers/remove.js', name: 'remove' }
  ];

  const loaded = [];
  const missing = [];

  for (const handler of handlerFiles) {
    try {
      const module = await import(handler.path);
      handlers[handler.name] = module;
      loaded.push(handler.name);
    } catch (error) {
      handlers[handler.name] = null;
      missing.push(handler.name);
    }
  }

  logger.handlers(loaded, missing);
}

// Dynamic sheets import
let syncToSheets = null;
try {
  const sheetsModule = await import('./services/sheets.js');
  syncToSheets = sheetsModule.syncToSheets;
} catch (error) {
  // Sheets service not available
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();

// Create Express app for health checks
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Discord bot is running!');
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

const server = app.listen(PORT, () => {
  logger.server(PORT);
});

// Load handlers
await loadHandlers();

// Load commands
const commandsPath = join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  import(filePath).then(commandModule => {
    const command = commandModule.default;
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      logger.warning(`Command at ${file} missing data/execute`, false);
    }
  });
}

// Register commands with Discord
async function registerCommands() {
  const commands = [];
  const commandsPath = join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const commandModule = await import(filePath);
    const command = commandModule.default;
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    }
  }

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  try {
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    logger.commands(data.length);
  } catch (error) {
    logger.error(`Command registration failed: ${error.message}`);
  }
}

// Bot ready event
client.once(Events.ClientReady, async (c) => {
  logger.init(client);
  logger.botReady(c.user.tag);
  await registerCommands();
  
  // Start auto-sync if configured
  if (syncToSheets) {
    const autoSyncInterval = parseInt(process.env.AUTO_SYNC_INTERVAL) || 300000;
    if (autoSyncInterval > 0) {
      logger.info(`Auto-sync enabled: every ${autoSyncInterval / 1000}s`, false);
      setInterval(async () => {
        try {
          logger.syncStarted();
          await syncToSheets(client);
          logger.syncComplete();
        } catch (error) {
          logger.syncFailed(error);
        }
      }, autoSyncInterval);
    }
  }
});

// Handle slash commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    logger.error(`Command not found: ${interaction.commandName}`);
    return;
  }

  try {
    logger.commandExecuted(interaction.commandName, interaction.user.tag);
    await command.execute(interaction);
  } catch (error) {
    logger.commandError(interaction.commandName, error);
    
    const errorResponse = {
      content: 'An error occurred while executing this command.',
      ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorResponse);
    } else {
      await interaction.reply(errorResponse);
    }
  }
});

// Safe handler call helper with timeout protection
async function safeCall(handlerName, functionName, interaction, ...args) {
  if (handlers[handlerName] && handlers[handlerName][functionName]) {
    // Defer immediately to prevent "interaction failed" errors
    if (!interaction.deferred && !interaction.replied) {
      try {
        await interaction.deferUpdate();
      } catch (error) {
        logger.verbose(`Could not defer ${functionName}: ${error.message}`);
      }
    }
    return handlers[handlerName][functionName](interaction, ...args);
  }
  return Promise.resolve();
}

// Handle button interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;
  logger.interaction('Button', customId);

  try {
    // Registration flow buttons
    if (customId.startsWith('register_main_')) {
      await safeCall('character', 'handleAddMain', interaction);
    }
    else if (customId.startsWith('add_alt_')) {
      await safeCall('character', 'handleAddAlt', interaction);
    }
    else if (customId.startsWith('add_subclass_')) {
      await safeCall('subclass', 'handleAddSubclassToMain', interaction);
    }
    
    // Update handlers
    else if (customId.startsWith('show_edit_menu_')) {
      const editMemberDetails = await import('./commands/edit-member-details.js');
      await editMemberDetails.default.showEditMenu(interaction, customId.split('_').pop());
    }
    else if (customId.startsWith('update_main_')) {
      await safeCall('update', 'handleUpdateMain', interaction);
    }
    else if (customId.startsWith('update_alt_')) {
      await safeCall('update', 'handleUpdateAlt', interaction);
    }
    else if (customId.startsWith('update_subclass_')) {
      await safeCall('update', 'handleUpdateSubclass', interaction);
    }
    else if (customId.startsWith('back_to_update_menu_')) {
      await safeCall('update', 'handleBackToUpdateMenu', interaction);
    }
    else if (customId.startsWith('back_to_update_class_')) {
      await safeCall('update', 'handleBackToUpdateClass', interaction);
    }
    else if (customId.startsWith('back_to_update_timezone_region_')) {
      await safeCall('update', 'handleBackToUpdateTimezoneRegion', interaction);
    }
    else if (customId.startsWith('back_to_update_timezone_country_')) {
      await safeCall('update', 'handleBackToUpdateTimezoneCountry', interaction);
    }
    
    // Remove handlers
    else if (customId.startsWith('remove_main_')) {
      await safeCall('remove', 'handleRemoveMain', interaction);
    }
    else if (customId.startsWith('remove_alt_')) {
      await safeCall('remove', 'handleRemoveAlt', interaction);
    }
    else if (customId.startsWith('remove_subclass_')) {
      await safeCall('remove', 'handleRemoveSubclass', interaction);
    }
    else if (customId.startsWith('confirm_remove_main_')) {
      await safeCall('remove', 'handleConfirmRemoveMain', interaction);
    }
    else if (customId.startsWith('confirm_remove_alt_')) {
      await safeCall('remove', 'handleConfirmRemoveAlt', interaction);
    }
    else if (customId.startsWith('confirm_remove_subclass_')) {
      await safeCall('remove', 'handleConfirmRemoveSubclass', interaction);
    }
    else if (customId.startsWith('cancel_remove_main_')) {
      await safeCall('remove', 'handleCancelRemoveMain', interaction);
    }
    else if (customId.startsWith('cancel_remove_alt_')) {
      await safeCall('remove', 'handleCancelRemoveAlt', interaction);
    }
    else if (customId.startsWith('cancel_remove_subclass_')) {
      await safeCall('remove', 'handleCancelRemoveSubclass', interaction);
    }
    
    // Back buttons
    else if (customId.startsWith('back_to_menu_')) {
      await safeCall('character', 'handleBackToMenu', interaction);
    }
    else if (customId.startsWith('back_to_class_')) {
      await safeCall('character', 'handleBackToClass', interaction);
    }
    else if (customId.startsWith('back_to_subclass_')) {
      await safeCall('character', 'handleBackToSubclass', interaction);
    }
    else if (customId.startsWith('back_to_ability_')) {
      await safeCall('character', 'handleBackToAbility', interaction);
    }
    else if (customId.startsWith('back_to_guild_')) {
      await safeCall('character', 'handleBackToGuild', interaction);
    }
    else if (customId.startsWith('back_to_timezone_region_')) {
      await safeCall('character', 'handleBackToTimezoneRegion', interaction);
    }
    else if (customId.startsWith('back_to_timezone_country_')) {
      await safeCall('character', 'handleBackToTimezoneCountry', interaction);
    }

  } catch (error) {
    logger.error(`Button error (${customId}): ${error.message}`);
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: 'An error occurred while processing your request.', 
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: 'An error occurred while processing your request.', 
          ephemeral: true 
        });
      }
    } catch (followupError) {
      logger.error(`Error sending error message: ${followupError.message}`, false);
    }
  }
});

// Handle select menu interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const customId = interaction.customId;
  logger.interaction('Select', customId);

  try {
    // Registration flow
    if (customId.startsWith('select_class_')) {
      await safeCall('character', 'handleClassSelection', interaction);
    }
    else if (customId.startsWith('select_subclass_')) {
      await safeCall('character', 'handleSubclassSelection', interaction);
    }
    else if (customId.startsWith('select_ability_score_')) {
      await safeCall('character', 'handleAbilityScoreSelection', interaction);
    }
    else if (customId.startsWith('select_guild_')) {
      await safeCall('character', 'handleGuildSelection', interaction);
    }
    else if (customId.startsWith('select_timezone_region_')) {
      await safeCall('character', 'handleTimezoneRegionSelection', interaction);
    }
    else if (customId.startsWith('select_timezone_country_')) {
      await safeCall('character', 'handleTimezoneCountrySelection', interaction);
    }
    else if (customId.startsWith('select_timezone_')) {
      await safeCall('character', 'handleTimezoneSelection', interaction);
    }
    
    // Edit menu selection
    else if (customId.startsWith('edit_type_select_')) {
      const editMemberDetails = await import('./commands/edit-member-details.js');
      const userId = customId.split('_').pop();
      const selectedType = interaction.values[0];
      
      if (selectedType === 'edit_main') {
        await safeCall('update', 'handleUpdateMain', interaction);
      } else if (selectedType === 'edit_alt') {
        await safeCall('update', 'handleUpdateAlt', interaction);
      } else if (selectedType === 'edit_subclass') {
        await safeCall('update', 'handleUpdateSubclass', interaction);
      }
    }
    
    // Update option selection
    else if (customId.startsWith('update_option_')) {
      await safeCall('update', 'handleUpdateOptionSelection', interaction);
    }
    else if (customId.startsWith('update_class_')) {
      await safeCall('update', 'handleUpdateClassSelection', interaction);
    }
    else if (customId.startsWith('update_subclass_')) {
      await safeCall('update', 'handleUpdateSubclassSelection', interaction);
    }
    else if (customId.startsWith('update_ability_score_select_')) {
      await safeCall('update', 'handleUpdateAbilityScoreSelection', interaction);
    }
    else if (customId.startsWith('update_guild_')) {
      await safeCall('update', 'handleUpdateGuildSelection', interaction);
    }
    else if (customId.startsWith('update_timezone_region_')) {
      await safeCall('update', 'handleUpdateTimezoneRegionSelection', interaction);
    }
    else if (customId.startsWith('update_timezone_country_')) {
      await safeCall('update', 'handleUpdateTimezoneCountrySelection', interaction);
    }
    else if (customId.startsWith('update_timezone_final_')) {
      await safeCall('update', 'handleUpdateTimezoneFinalSelection', interaction);
    }
    
    // Select alt/subclass for update
    else if (customId.startsWith('select_alt_update_')) {
      await safeCall('update', 'handleAltSelectionForUpdate', interaction);
    }
    else if (customId.startsWith('select_subclass_update_')) {
      await safeCall('update', 'handleSubclassSelectionForUpdate', interaction);
    }
    
    // Select alt/subclass for removal
    else if (customId.startsWith('select_alt_remove_')) {
      await safeCall('remove', 'handleAltSelectionForRemoval', interaction);
    }
    else if (customId.startsWith('select_subclass_remove_')) {
      await safeCall('remove', 'handleSubclassSelectionForRemoval', interaction);
    }
    
    // Subclass handlers
    else if (customId.startsWith('select_alt_for_subclass_')) {
      await safeCall('subclass', 'handleAltSelectionForSubclass', interaction);
    }
    else if (customId.startsWith('select_subclass_class_')) {
      await safeCall('subclass', 'handleSubclassClassSelection', interaction);
    }
    else if (customId.startsWith('select_subclass_subclass_')) {
      await safeCall('subclass', 'handleSubclassSubclassSelection', interaction);
    }
    else if (customId.startsWith('select_subclass_ability_score_')) {
      await safeCall('subclass', 'handleSubclassAbilityScoreSelection', interaction);
    }

  } catch (error) {
    logger.error(`Select error (${customId}): ${error.message}`);
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: 'An error occurred while processing your selection.', 
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: 'An error occurred while processing your selection.', 
          ephemeral: true 
        });
      }
    } catch (followupError) {
      logger.error(`Error sending error message: ${followupError.message}`, false);
    }
  }
});

// Handle modal submissions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  const customId = interaction.customId;
  logger.interaction('Modal', customId);

  try {
    // IGN modals
    if (customId.startsWith('ign_modal_')) {
      await safeCall('character', 'handleIGNModal', interaction);
    }
    // Update IGN modal
    else if (customId.startsWith('update_ign_modal_')) {
      await safeCall('update', 'handleUpdateModal', interaction, 'ign');
    }

  } catch (error) {
    logger.error(`Modal error (${customId}): ${error.message}`);
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: 'An error occurred while processing your submission.', 
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: 'An error occurred while processing your submission.', 
          ephemeral: true 
        });
      }
    } catch (followupError) {
      logger.error(`Error sending error message: ${followupError.message}`, false);
    }
  }
});

// Error handling
process.on('unhandledRejection', error => {
  logger.error(`Unhandled rejection: ${error.message}`);
});

process.on('uncaughtException', error => {
  logger.error(`Uncaught exception: ${error.message}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.shutdown();
  server.close(() => {
    client.destroy();
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.shutdown();
  server.close(() => {
    client.destroy();
    process.exit(0);
  });
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
