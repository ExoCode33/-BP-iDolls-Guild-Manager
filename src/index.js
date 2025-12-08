import { Client, Collection, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { queries } from './database/queries.js';
import googleSheets from './services/googleSheets.js';
import pool from './database/db.js';

// Commands
import editMemberDetails from './commands/edit-member-details.js';
import admin from './commands/admin.js';
import viewChar from './commands/view-char.js';

// Handlers
import * as characterHandlers from './handlers/character.js';
import * as subclassHandlers from './handlers/subclass.js';
import * as updateHandlers from './handlers/update.js';
import * as removeHandlers from './handlers/remove.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration constants
const AUTO_SYNC_INTERVAL = parseInt(process.env.AUTO_SYNC_INTERVAL) || 300000; // 5 minutes

console.log('🚀 Starting Guild Manager Bot...\n');

// ============================================
// EXPRESS SERVER FOR STATIC FILE HOSTING
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    classIconsAvailable: true
  });
});

// List available class icons endpoint
app.get('/class-icons', (req, res) => {
  const icons = [
    'BeatPerformer.png',
    'FrostMage.png',
    'HeavyGuardian.png',
    'Marksman.png',
    'ShieldKnight.png',
    'StormBlade.png',
    'VerdantOracle.png',
    'WindKnight.png'
  ];
  
  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  const baseUrl = process.env.RAILWAY_PUBLIC_URL || 
                  (railwayDomain ? `https://${railwayDomain}` : `http://localhost:${PORT}`);
  
  res.json({
    message: 'Available class icons',
    baseUrl: baseUrl,
    icons: icons.map(icon => `${baseUrl}/class-icons/${icon}`)
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`✅ Static file server running on port ${PORT}`);
  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  const displayUrl = process.env.RAILWAY_PUBLIC_URL || 
                     (railwayDomain ? `https://${railwayDomain}` : `http://localhost:${PORT}`);
  console.log(`📸 Class icons available at: ${displayUrl}/class-icons/`);
  console.log(`🏥 Health check: ${displayUrl}/health\n`);
});

// ============================================
// DISCORD BOT
// ============================================

// Create client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// Initialize commands collection
client.commands = new Collection();

// Load commands
const commands = [editMemberDetails, admin, viewChar];
commands.forEach(command => {
  client.commands.set(command.data.name, command);
  console.log(`📝 Loaded command: /${command.data.name}`);
});

console.log(`\n✅ Loaded ${commands.length} commands total\n`);

// Auto-deploy commands to Discord on startup
async function deployCommands() {
  try {
    console.log('🚀 Auto-deploying commands to Discord...');
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const commandsData = commands.map(cmd => cmd.data.toJSON());
    
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commandsData }
    );
    
    console.log('✅ Commands registered with Discord!\n');
  } catch (error) {
    console.error('❌ Failed to auto-deploy commands:', error.message);
    console.log('⚠️  Commands may not appear in Discord. Run: npm run deploy\n');
  }
}

// Deploy commands immediately
deployCommands();

// Auto-sync interval
let autoSyncInterval = null;

async function performAutoSync() {
  try {
    if (!googleSheets.sheets) {
      return;
    }

    console.log(`⏰ [AUTO-SYNC] Starting automatic sync...`);
    // Get all characters with subclasses for hierarchical sync
    const allChars = await queries.getAllCharacters();
    await googleSheets.fullSync(allChars);
  } catch (error) {
    console.error('❌ [AUTO-SYNC] Error during automatic sync:', error.message);
  }
}

// Ready event
client.once(Events.ClientReady, async (c) => {
  console.log('═══════════════════════════════════════════════════');
  console.log(`✅ Bot is online!`);
  console.log(`👤 Logged in as: ${c.user.tag}`);
  console.log(`🆔 Bot ID: ${c.user.id}`);
  console.log(`🌐 Connected to ${c.guilds.cache.size} server(s)`);
  console.log('═══════════════════════════════════════════════════\n');
  
  // Initialize database
  console.log('🗄️  Initializing database...');
  try {
    await queries.initializeDatabase();
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
  }

  // Initialize Google Sheets
  console.log('📊 Initializing Google Sheets...');
  try {
    const sheetsInitialized = await googleSheets.initialize();
    
    if (sheetsInitialized) {
      console.log('✅ Google Sheets initialized (auto-sync will run periodically)');
      
      console.log(`⏰ Starting auto-sync (every ${AUTO_SYNC_INTERVAL / 60000} minutes)...`);
      autoSyncInterval = setInterval(performAutoSync, AUTO_SYNC_INTERVAL);
      console.log('✅ Auto-sync enabled!\n');
    } else {
      console.log('⚠️  Google Sheets not configured - auto-sync disabled\n');
    }
  } catch (error) {
    console.error('⚠️  Google Sheets initialization error:', error.message);
    console.error('   Auto-sync will be disabled.\n');
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('🎮 Bot is ready to accept commands!');
  console.log('═══════════════════════════════════════════════════\n');
});

// Command interaction handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`❌ No command matching ${interaction.commandName} was found.`);
      return;
    }

    console.log(`💬 ${interaction.user.tag} used /${interaction.commandName}`);

    try {
      await command.execute(interaction);
      console.log(`✅ Command /${interaction.commandName} executed successfully`);
      
      // Trigger immediate sync after command execution
      if (googleSheets.sheets) {
        console.log(`🔄 [INSTANT-SYNC] Triggering sync after command...`);
        performAutoSync().catch(err => console.error('❌ [INSTANT-SYNC] Failed:', err.message));
      }
    } catch (error) {
      console.error(`❌ Error executing /${interaction.commandName}:`, error);
      
      const errorMessage = { 
        content: '❌ There was an error executing this command!', 
        flags: 64 
      };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }

  // ==================== BUTTON INTERACTIONS ====================
  if (interaction.isButton()) {
    console.log(`🔘 ${interaction.user.tag} clicked button: ${interaction.customId}`);
    
    try {
      // ✅ FIXED: Correct button prefixes (removed char_ and subclass_ prefixes)
      
      // Character handlers (main/alt)
      if (interaction.customId.startsWith('register_main_') || interaction.customId.startsWith('add_main_')) {
        await characterHandlers.handleAddMain(interaction);
      }
      else if (interaction.customId.startsWith('add_alt_')) {
        await characterHandlers.handleAddAlt(interaction);
      }
      else if (interaction.customId.startsWith('edit_main_')) {
        await updateHandlers.handleUpdateMain(interaction);
      }
      else if (interaction.customId.startsWith('remove_main_')) {
        await removeHandlers.handleRemoveMain(interaction);
      }
      else if (interaction.customId.startsWith('remove_alt_')) {
        await removeHandlers.handleRemoveAlt(interaction);
      }
      
      // Subclass handlers
      else if (interaction.customId.startsWith('add_subclass_')) {
        await subclassHandlers.handleAddSubclassToMain(interaction);
      }
      else if (interaction.customId.startsWith('remove_subclass_')) {
        await interaction.update({ 
          content: '🚧 Subclass removal coming soon!',
          embeds: [],
          components: []
        });
      }
      
      // Back buttons
      else if (interaction.customId.startsWith('back_to_menu_')) {
        await characterHandlers.handleBackToMenu(interaction);
      }
      else if (interaction.customId.startsWith('back_to_class_')) {
        await characterHandlers.handleBackToClass(interaction);
      }
      else if (interaction.customId.startsWith('back_to_subclass_')) {
        await characterHandlers.handleBackToSubclass(interaction);
      }
      else if (interaction.customId.startsWith('back_to_ability_')) {
        await characterHandlers.handleBackToAbility(interaction);
      }
      else if (interaction.customId.startsWith('back_to_guild_')) {
        await characterHandlers.handleBackToGuild(interaction);
      }
      else if (interaction.customId.startsWith('back_to_timezone_region_')) {
        await characterHandlers.handleBackToTimezoneRegion(interaction);
      }
      else if (interaction.customId.startsWith('back_to_timezone_country_')) {
        await characterHandlers.handleBackToTimezoneCountry(interaction);
      }
      
      // Update back buttons
      else if (interaction.customId.startsWith('back_to_update_menu_')) {
        await updateHandlers.handleBackToUpdateMenu(interaction);
      }
      else if (interaction.customId.startsWith('back_to_update_class_')) {
        await updateHandlers.handleBackToUpdateClass(interaction);
      }
      else if (interaction.customId.startsWith('back_to_update_timezone_region_')) {
        await updateHandlers.handleBackToUpdateTimezoneRegion(interaction);
      }
      else if (interaction.customId.startsWith('back_to_update_timezone_country_')) {
        await updateHandlers.handleBackToUpdateTimezoneCountry(interaction);
      }
      
      // Remove confirmation buttons
      else if (interaction.customId.startsWith('confirm_remove_main_')) {
        await removeHandlers.handleConfirmRemoveMain(interaction);
      }
      else if (interaction.customId.startsWith('cancel_remove_main_')) {
        await removeHandlers.handleCancelRemoveMain(interaction);
      }
      else if (interaction.customId.startsWith('confirm_remove_alt_')) {
        await removeHandlers.handleConfirmRemoveAlt(interaction);
      }
      else if (interaction.customId.startsWith('cancel_remove_alt_')) {
        await removeHandlers.handleCancelRemoveAlt(interaction);
      }
      
      // If no handler matched
      else {
        console.log(`⚠️ Unhandled button: ${interaction.customId}`);
        await interaction.update({
          content: '❌ This button is not yet implemented.',
          embeds: [],
          components: []
        });
        return;
      }
      
      console.log(`✅ Button handled: ${interaction.customId}`);
    } catch (error) {
      console.error(`❌ Error handling button ${interaction.customId}:`, error);
      console.error('Stack:', error.stack);
      
      const errorEmbed = { 
        content: `❌ An error occurred: ${error.message}`, 
        flags: 64 
      };
      
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorEmbed);
        } else {
          await interaction.update(errorEmbed);
        }
      } catch (replyError) {
        console.error('❌ Failed to send error response:', replyError);
      }
    }
  }

  // Handle select menu interactions
  if (interaction.isStringSelectMenu()) {
    console.log(`🔽 ${interaction.user.tag} selected: ${interaction.customId}`);
    
    try {
      // Subclass selects (MUST BE FIRST - more specific patterns)
      if (interaction.customId.startsWith('select_subclass_class_')) {
        await subclassHandlers.handleSubclassClassSelection(interaction);
      }
      else if (interaction.customId.startsWith('select_subclass_subclass_')) {
        await subclassHandlers.handleSubclassSubclassSelection(interaction);
      }
      else if (interaction.customId.startsWith('select_subclass_ability_score_')) {
        await subclassHandlers.handleSubclassAbilityScoreSelection(interaction);
      }
      else if (interaction.customId.startsWith('select_alt_for_subclass_')) {
        await subclassHandlers.handleAltSelectionForSubclass(interaction);
      }
      
      // Character registration selects
      else if (interaction.customId.startsWith('select_class_')) {
        await characterHandlers.handleClassSelection(interaction);
      }
      else if (interaction.customId.startsWith('select_subclass_')) {
        await characterHandlers.handleSubclassSelection(interaction);
      }
      else if (interaction.customId.startsWith('select_ability_score_')) {
        await characterHandlers.handleAbilityScoreSelection(interaction);
      }
      else if (interaction.customId.startsWith('select_guild_')) {
        await characterHandlers.handleGuildSelection(interaction);
      }
      
      // Timezone selects (ORDER MATTERS - most specific first!)
      else if (interaction.customId.startsWith('select_timezone_region_')) {
        await characterHandlers.handleTimezoneRegionSelection(interaction);
      }
      else if (interaction.customId.startsWith('select_timezone_country_')) {
        await characterHandlers.handleTimezoneCountrySelection(interaction);
      }
      else if (interaction.customId.startsWith('select_timezone_')) {
        await characterHandlers.handleTimezoneSelection(interaction);
      }
      
      // Update selects
      else if (interaction.customId.startsWith('update_option_')) {
        await updateHandlers.handleUpdateOptionSelection(interaction);
      }
      else if (interaction.customId.startsWith('update_class_')) {
        await updateHandlers.handleUpdateClassSelection(interaction);
      }
      else if (interaction.customId.startsWith('update_subclass_')) {
        await updateHandlers.handleUpdateSubclassSelection(interaction);
      }
      else if (interaction.customId.startsWith('update_ability_score_select_')) {
        await updateHandlers.handleUpdateAbilityScoreSelection(interaction);
      }
      else if (interaction.customId.startsWith('update_timezone_region_')) {
        await updateHandlers.handleUpdateTimezoneRegionSelection(interaction);
      }
      else if (interaction.customId.startsWith('update_timezone_country_')) {
        await updateHandlers.handleUpdateTimezoneCountrySelection(interaction);
      }
      else if (interaction.customId.startsWith('update_timezone_final_')) {
        await updateHandlers.handleUpdateTimezoneFinalSelection(interaction);
      }
      else if (interaction.customId.startsWith('update_guild_')) {
        await updateHandlers.handleUpdateGuildSelection(interaction);
      }
      
      // Remove selects
      else if (interaction.customId.startsWith('select_alt_remove_')) {
        await removeHandlers.handleAltSelectionForRemoval(interaction);
      }
      
      console.log(`✅ Select menu handled: ${interaction.customId}`);
    } catch (error) {
      console.error(`❌ Error handling select menu ${interaction.customId}:`, error);
      
      const errorMessage = { 
        content: '❌ An error occurred!', 
        flags: 64 
      };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    console.log(`📝 ${interaction.user.tag} submitted modal: ${interaction.customId}`);
    
    try {
      // IGN modals for character registration
      if (interaction.customId.startsWith('ign_modal_')) {
        await characterHandlers.handleIGNModal(interaction);
      }
      
      // Update modals (only IGN uses modal now)
      else if (interaction.customId.startsWith('update_ign_modal_')) {
        await updateHandlers.handleUpdateModal(interaction, 'ign');
      }
      
      console.log(`✅ Modal handled: ${interaction.customId}`);
    } catch (error) {
      console.error(`❌ Error handling modal ${interaction.customId}:`, error);
      
      const errorMessage = { 
        content: '❌ An error occurred!', 
        flags: 64 
      };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }
});

// Error handling
process.on('unhandledRejection', error => {
  console.error('❌ Unhandled promise rejection:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down bot...');
  
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    console.log('⏰ Auto-sync stopped');
  }
  
  try {
    await pool.end();
    console.log('💾 Database pool closed');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
  }
  
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Shutting down bot (SIGTERM)...');
  
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    console.log('⏰ Auto-sync stopped');
  }
  
  try {
    await pool.end();
    console.log('💾 Database pool closed');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
  }
  
  client.destroy();
  process.exit(0);
});

// Login
console.log('🔐 Logging in to Discord...\n');
client.login(process.env.DISCORD_TOKEN);
