import { Client, Collection, Events, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { queries } from './database/queries.js';
import googleSheets from './services/googleSheets.js';
import { GAME_DATA } from './config/gameData.js';

// Commands
import register from './commands/register.js';
import addalt from './commands/addalt.js';
import viewchar from './commands/viewchar.js';
import update from './commands/update.js';
import sync from './commands/sync.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting Guild Manager Bot...\n');

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
const commands = [register, addalt, viewchar, update, sync];
commands.forEach(command => {
  client.commands.set(command.data.name, command);
  console.log(`📝 Loaded command: /${command.data.name}`);
});

console.log(`\n✅ Loaded ${commands.length} commands total\n`);

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
    await googleSheets.initialize();
  } catch (error) {
    console.error('⚠️  Google Sheets not configured (this is optional)');
    console.error('   Commands will work, but data won\'t sync to sheets.');
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('🎮 Bot is ready to accept commands!');
  console.log('═══════════════════════════════════════════════════');
  console.log('\n⚠️  IMPORTANT: If commands are not showing in Discord:');
  console.log('   Run: npm run deploy');
  console.log('   This registers the slash commands with Discord.\n');
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
    } catch (error) {
      console.error(`❌ Error executing /${interaction.commandName}:`, error);
      
      const errorMessage = { 
        content: '❌ There was an error executing this command!', 
        ephemeral: true 
      };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }

  // Handle select menu interactions
  if (interaction.isStringSelectMenu()) {
    console.log(`🔽 ${interaction.user.tag} selected: ${interaction.customId}`);
    
    try {
      // Register command select menus
      if (interaction.customId === 'class_select') {
        await register.handleClassSelect(interaction);
      } else if (interaction.customId === 'subclass_select') {
        await register.handleSubclassSelect(interaction);
      } else if (interaction.customId === 'guild_select') {
        await register.handleGuildSelect(interaction);
      } else if (interaction.customId === 'timezone_region_select') {
        await register.handleTimezoneRegionSelect(interaction);
      } else if (interaction.customId === 'timezone_country_select') {
        await register.handleTimezoneCountrySelect(interaction);
      } else if (interaction.customId === 'timezone_select') {
        await register.handleTimezoneSelect(interaction);
      } else if (interaction.customId === 'timezone_search_result_select') {
        await register.handleTimezoneSearchResultSelect(interaction);
      }
      
      // Addalt command select menus
      else if (interaction.customId === 'alt_class_select') {
        await addalt.handleAltClassSelect(interaction);
      } else if (interaction.customId === 'alt_subclass_select') {
        await addalt.handleAltSubclassSelect(interaction);
      }
      
      // Update command select menus
      else if (interaction.customId === 'update_class_select') {
        await update.handleUpdateClassSelect(interaction);
      } else if (interaction.customId === 'update_subclass_select') {
        await update.handleUpdateSubclassSelect(interaction);
      } else if (interaction.customId === 'update_guild_select') {
        await update.handleUpdateGuildSelect(interaction);
      } else if (interaction.customId === 'update_guild_after_class_select') {
        await update.handleUpdateGuildAfterClassSelect(interaction);
      } else if (interaction.customId === 'update_timezone_region_select') {
        await update.handleUpdateTimezoneRegionSelect(interaction);
      } else if (interaction.customId === 'update_timezone_country_select') {
        await update.handleUpdateTimezoneCountrySelect(interaction);
      } else if (interaction.customId === 'update_timezone_select') {
        await update.handleUpdateTimezoneSelect(interaction);
      } else if (interaction.customId === 'update_timezone_search_result_select') {
        await update.handleUpdateTimezoneSearchResultSelect(interaction);
      }
      
      console.log(`✅ Select menu handled: ${interaction.customId}`);
    } catch (error) {
      console.error(`❌ Error handling select menu ${interaction.customId}:`, error);
      
      const errorMessage = { 
        content: '❌ An error occurred!', 
        ephemeral: true 
      };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }

  // Handle button interactions
  if (interaction.isButton()) {
    console.log(`🔘 ${interaction.user.tag} clicked button: ${interaction.customId}`);
    
    try {
      // Register timezone buttons
      if (interaction.customId === 'timezone_search') {
        await register.handleTimezoneSearch(interaction);
      } else if (interaction.customId === 'accept_suggested_timezone') {
        await register.handleAcceptSuggestedTimezone(interaction);
      } else if (interaction.customId === 'choose_different_timezone') {
        await register.handleChooseDifferentTimezone(interaction);
      } else if (interaction.customId === 'timezone_back_to_region') {
        // Show guild selection again
        const state = client.registrationStates?.get(interaction.user.id);
        if (state) {
          const guildMenu = new StringSelectMenuBuilder()
            .setCustomId('guild_select')
            .setPlaceholder('Select your guild')
            .addOptions(
              GAME_DATA.guilds[state.role].map(guild => ({
                label: guild,
                value: guild
              }))
            );

          const row = new ActionRowBuilder().addComponents(guildMenu);

          await interaction.update({
            content: `✅ Class: **${state.className}** (${state.role})\n✅ Subclass: **${state.subclass}**\n\nStep 3: Select your guild`,
            components: [row]
          });
        }
      } else if (interaction.customId === 'timezone_back_to_country') {
        const state = client.registrationStates?.get(interaction.user.id);
        if (state) {
          await register.handleTimezoneRegionSelect({
            ...interaction,
            values: [state.timezoneRegion]
          });
        }
      } else if (interaction.customId === 'timezone_back_to_suggestion') {
        const state = client.registrationStates?.get(interaction.user.id);
        if (state) {
          await register.handleTimezoneCountrySelect({
            ...interaction,
            values: [state.timezoneCountry]
          });
        }
      } else if (interaction.customId === 'timezone_search_back') {
        await register.handleTimezoneSearch(interaction);
      }
      
      // Update timezone buttons
      else if (interaction.customId === 'update_timezone_search') {
        await update.handleUpdateTimezoneSearch(interaction);
      } else if (interaction.customId === 'update_accept_suggested_timezone') {
        await update.handleUpdateAcceptSuggestedTimezone(interaction);
      } else if (interaction.customId === 'update_choose_different_timezone') {
        await update.handleUpdateChooseDifferentTimezone(interaction);
      }
      
      console.log(`✅ Button handled: ${interaction.customId}`);
    } catch (error) {
      console.error(`❌ Error handling button ${interaction.customId}:`, error);
      
      const errorMessage = { 
        content: '❌ An error occurred!', 
        ephemeral: true 
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
      if (interaction.customId === 'register_modal') {
        await register.handleModalSubmit(interaction);
      } else if (interaction.customId === 'alt_register_modal') {
        await addalt.handleAltModalSubmit(interaction);
      } else if (interaction.customId === 'update_ability_score_modal') {
        await update.handleAbilityScoreModalSubmit(interaction);
      } else if (interaction.customId === 'timezone_search_modal') {
        await register.handleTimezoneSearchSubmit(interaction);
      } else if (interaction.customId === 'update_timezone_search_modal') {
        await update.handleUpdateTimezoneSearchSubmit(interaction);
      }
      
      console.log(`✅ Modal handled: ${interaction.customId}`);
    } catch (error) {
      console.error(`❌ Error handling modal ${interaction.customId}:`, error);
      
      const errorMessage = { 
        content: '❌ An error occurred!', 
        ephemeral: true 
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
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down bot...');
  client.destroy();
  process.exit(0);
});

// Login
console.log('🔐 Logging in to Discord...\n');
client.login(process.env.DISCORD_TOKEN);
