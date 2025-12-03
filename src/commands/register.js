import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { GAME_DATA, getRoleFromClass, getTimezoneRegions, getCountriesInRegion, getTimezonesForCountry } from '../config/gameData.js';
import { queries } from '../database/queries.js';
import googleSheets from '../services/googleSheets.js';

// Smart timezone suggestions based on country
const SMART_TIMEZONE_SUGGESTIONS = {
  'United States': 'America/New_York',      // Eastern Time (40% of US population)
  'Canada': 'America/Toronto',              // Eastern Time (most populous)
  'Mexico': 'America/Mexico_City',          // Central Mexico (largest metro)
  'United Kingdom': 'Europe/London',        // Only option
  'Australia': 'Australia/Sydney',          // Most populous city
  'Germany': 'Europe/Berlin',               // Only option
  'France': 'Europe/Paris',                 // Only option
  'Brazil': 'America/Sao_Paulo',            // Most populous
  'Japan': 'Asia/Tokyo',                    // Only option
  'China': 'Asia/Shanghai',                 // Most populous
  'India': 'Asia/Kolkata',                  // Only option
  'Russia': 'Europe/Moscow',                // Most populous
  'South Korea': 'Asia/Seoul',              // Only option
  'Spain': 'Europe/Madrid',                 // Most populous
  'Italy': 'Europe/Rome',                   // Only option
  'Netherlands': 'Europe/Amsterdam',        // Only option
  'Poland': 'Europe/Warsaw',                // Only option
  'Argentina': 'America/Argentina/Buenos_Aires', // Only option
  'Colombia': 'America/Bogota',             // Only option
  'Indonesia': 'Asia/Jakarta',              // Most populous (WIB)
  'Turkey': 'Europe/Istanbul',              // Only option
};

export default {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register your main character'),

  async execute(interaction) {
    console.log(`🔍 [REGISTER] Starting execution for user: ${interaction.user.tag}`);
    
    try {
      console.log(`🔍 [REGISTER] Checking for existing character...`);
      const existingChar = await queries.getMainCharacter(interaction.user.id);
      console.log(`🔍 [REGISTER] Existing character check result:`, existingChar ? 'Found' : 'None');
      
      if (existingChar) {
        console.log(`⚠️  [REGISTER] User already has character, sending warning`);
        return interaction.reply({
          content: '⚠️ You already have a main character registered! Use `/update` to modify your character or `/viewchar` to see your current registration.',
          ephemeral: true
        });
      }

      console.log(`🔍 [REGISTER] Building class selection menu...`);
      const classMenu = new StringSelectMenuBuilder()
        .setCustomId('class_select')
        .setPlaceholder('Select your main class')
        .addOptions(
          Object.keys(GAME_DATA.classes).map(className => ({
            label: className,
            description: `Role: ${GAME_DATA.classes[className].role}`,
            value: className
          }))
        );

      const row = new ActionRowBuilder().addComponents(classMenu);

      console.log(`🔍 [REGISTER] Sending reply with class menu...`);
      await interaction.reply({
        content: '🎮 **Character Registration**\n\nStep 1: Select your main class',
        components: [row],
        ephemeral: true
      });
      console.log(`✅ [REGISTER] Reply sent successfully`);

      console.log(`🔍 [REGISTER] Storing registration state...`);
      interaction.client.registrationStates = interaction.client.registrationStates || new Map();
      interaction.client.registrationStates.set(interaction.user.id, {
        step: 'class_selected',
        discordId: interaction.user.id,
        discordName: interaction.user.tag
      });

    } catch (error) {
      console.error('❌ [REGISTER] Error in register command:', error);
      console.error('❌ [REGISTER] Error stack:', error.stack);
      await interaction.reply({
        content: '❌ An error occurred during registration. Please try again.',
        ephemeral: true
      }).catch(err => console.error('❌ [REGISTER] Failed to send error message:', err));
    }
  },

  async handleClassSelect(interaction) {
    try {
      const selectedClass = interaction.values[0];
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/register` again.',
          components: []
        });
      }

      state.className = selectedClass;
      state.role = getRoleFromClass(selectedClass);

      const subclassMenu = new StringSelectMenuBuilder()
        .setCustomId('subclass_select')
        .setPlaceholder('Select your subclass')
        .addOptions(
          GAME_DATA.classes[selectedClass].subclasses.map(subclass => ({
            label: subclass,
            value: subclass
          }))
        );

      const row = new ActionRowBuilder().addComponents(subclassMenu);

      await interaction.update({
        content: `✅ Class: **${selectedClass}** (${state.role})\n\nStep 2: Select your subclass`,
        components: [row]
      });

    } catch (error) {
      console.error('Error handling class selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleSubclassSelect(interaction) {
    try {
      const selectedSubclass = interaction.values[0];
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/register` again.',
          components: []
        });
      }

      state.subclass = selectedSubclass;

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
        content: `✅ Class: **${state.className}** (${state.role})\n✅ Subclass: **${selectedSubclass}**\n\nStep 3: Select your guild`,
        components: [row]
      });

    } catch (error) {
      console.error('Error handling subclass selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleGuildSelect(interaction) {
    try {
      const selectedGuild = interaction.values[0];
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/register` again.',
          components: []
        });
      }

      state.guild = selectedGuild;

      // Show region selection for timezone
      const regions = getTimezoneRegions();
      
      const regionMenu = new StringSelectMenuBuilder()
        .setCustomId('timezone_region_select')
        .setPlaceholder('Select your region')
        .addOptions(
          regions.map(region => ({
            label: region,
            value: region
          }))
        );

      // Add search button
      const searchButton = new ButtonBuilder()
        .setCustomId('timezone_search')
        .setLabel('🔍 Search for Timezone')
        .setStyle(ButtonStyle.Primary);

      const row1 = new ActionRowBuilder().addComponents(regionMenu);
      const row2 = new ActionRowBuilder().addComponents(searchButton);

      await interaction.update({
        content: `✅ Class: **${state.className}** (${state.role})\n✅ Subclass: **${state.subclass}**\n✅ Guild: **${selectedGuild}**\n\nStep 4: Select your region or search for your timezone`,
        components: [row1, row2]
      });

    } catch (error) {
      console.error('Error handling guild selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleTimezoneRegionSelect(interaction) {
    try {
      const selectedRegion = interaction.values[0];
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/register` again.',
          components: []
        });
      }

      state.timezoneRegion = selectedRegion;
      
      const countries = getCountriesInRegion(selectedRegion);
      
      const countryMenu = new StringSelectMenuBuilder()
        .setCustomId('timezone_country_select')
        .setPlaceholder('Select your country')
        .addOptions(
          countries.map(country => ({
            label: country,
            value: country
          }))
        );

      // Back button
      const backButton = new ButtonBuilder()
        .setCustomId('timezone_back_to_region')
        .setLabel('← Back to Regions')
        .setStyle(ButtonStyle.Secondary);

      const row1 = new ActionRowBuilder().addComponents(countryMenu);
      const row2 = new ActionRowBuilder().addComponents(backButton);

      await interaction.update({
        content: `✅ Region: **${selectedRegion}**\n\nSelect your country:`,
        components: [row1, row2]
      });

    } catch (error) {
      console.error('Error handling region selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleTimezoneCountrySelect(interaction) {
    try {
      const selectedCountry = interaction.values[0];
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/register` again.',
          components: []
        });
      }

      state.timezoneCountry = selectedCountry;
      
      // Get timezones for country
      const timezones = getTimezonesForCountry(selectedCountry);
      
      // Get smart suggestion
      const suggestedTimezoneValue = SMART_TIMEZONE_SUGGESTIONS[selectedCountry];
      const suggestedTimezone = timezones.find(tz => tz.value === suggestedTimezoneValue) || timezones[0];
      
      state.suggestedTimezone = suggestedTimezone.value;

      // If only one timezone, use it automatically
      if (timezones.length === 1) {
        state.timezone = timezones[0].value;
        await this.showFinalModal(interaction);
        return;
      }

      // Show smart suggestion with quick accept
      const acceptButton = new ButtonBuilder()
        .setCustomId('accept_suggested_timezone')
        .setLabel(`✓ Use ${suggestedTimezone.label.split('(')[0].trim()}`)
        .setStyle(ButtonStyle.Success)
        .setEmoji('🌍');
      
      const chooseDifferentButton = new ButtonBuilder()
        .setCustomId('choose_different_timezone')
        .setLabel('Choose Different')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔍');

      const backButton = new ButtonBuilder()
        .setCustomId('timezone_back_to_country')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary);

      const row1 = new ActionRowBuilder().addComponents(acceptButton, chooseDifferentButton);
      const row2 = new ActionRowBuilder().addComponents(backButton);

      await interaction.update({
        content: `✅ Country: **${selectedCountry}**\n\n` +
          `**Suggested timezone:**\n` +
          `🌍 **${suggestedTimezone.label}**\n` +
          `${suggestedTimezone.utc}\n\n` +
          `Is this correct?`,
        components: [row1, row2]
      });

    } catch (error) {
      console.error('Error handling timezone country selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleAcceptSuggestedTimezone(interaction) {
    try {
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/register` again.',
          components: []
        });
      }

      state.timezone = state.suggestedTimezone;
      await this.showFinalModal(interaction);

    } catch (error) {
      console.error('Error accepting suggested timezone:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleChooseDifferentTimezone(interaction) {
    try {
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/register` again.',
          components: []
        });
      }

      const timezones = getTimezonesForCountry(state.timezoneCountry);
      
      const timezoneMenu = new StringSelectMenuBuilder()
        .setCustomId('timezone_select')
        .setPlaceholder('Select your timezone')
        .addOptions(
          timezones.map(tz => ({
            label: tz.label,
            description: tz.utc,
            value: tz.value
          }))
        );

      const backButton = new ButtonBuilder()
        .setCustomId('timezone_back_to_suggestion')
        .setLabel('← Back to Suggestion')
        .setStyle(ButtonStyle.Secondary);

      const row1 = new ActionRowBuilder().addComponents(timezoneMenu);
      const row2 = new ActionRowBuilder().addComponents(backButton);

      await interaction.update({
        content: `Select your timezone from the list:`,
        components: [row1, row2]
      });

    } catch (error) {
      console.error('Error showing timezone list:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleTimezoneSelect(interaction) {
    try {
      const selectedTimezone = interaction.values[0];
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/register` again.',
          components: []
        });
      }

      state.timezone = selectedTimezone;
      await this.showFinalModal(interaction);

    } catch (error) {
      console.error('Error handling timezone selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleTimezoneSearch(interaction) {
    try {
      const modal = new ModalBuilder()
        .setCustomId('timezone_search_modal')
        .setTitle('Search for Timezone');

      const searchInput = new TextInputBuilder()
        .setCustomId('timezone_search_input')
        .setLabel('City or Country Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Tokyo, London, New York')
        .setRequired(true)
        .setMaxLength(50);

      const row = new ActionRowBuilder().addComponents(searchInput);
      modal.addComponents(row);

      await interaction.showModal(modal);

    } catch (error) {
      console.error('Error showing search modal:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleTimezoneSearchSubmit(interaction) {
    try {
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.reply({
          content: '❌ Registration session expired. Please use `/register` again.',
          ephemeral: true
        });
      }

      const searchQuery = interaction.fields.getTextInputValue('timezone_search_input').toLowerCase();
      
      // Search through all countries and timezones
      const allCountries = Object.keys(GAME_DATA.timezonesByCountry);
      const results = [];
      
      for (const country of allCountries) {
        const timezones = GAME_DATA.timezonesByCountry[country].timezones;
        
        // Check if country name matches
        if (country.toLowerCase().includes(searchQuery)) {
          results.push(...timezones.map(tz => ({
            ...tz,
            country: country
          })));
        } else {
          // Check if any timezone label matches
          for (const tz of timezones) {
            if (tz.label.toLowerCase().includes(searchQuery) || 
                tz.value.toLowerCase().includes(searchQuery)) {
              results.push({
                ...tz,
                country: country
              });
            }
          }
        }
      }

      if (results.length === 0) {
        return interaction.reply({
          content: `❌ No timezones found for "${searchQuery}". Try:\n` +
            `• A major city name (e.g., "Tokyo", "London")\n` +
            `• A country name (e.g., "Japan", "United Kingdom")\n` +
            `• Use the region selector instead`,
          ephemeral: true
        });
      }

      // Limit to 25 results (Discord limit)
      const limitedResults = results.slice(0, 25);
      
      const resultMenu = new StringSelectMenuBuilder()
        .setCustomId('timezone_search_result_select')
        .setPlaceholder(`Found ${results.length} result(s)`)
        .addOptions(
          limitedResults.map(tz => ({
            label: `${tz.country}: ${tz.label.substring(0, 80)}`,
            description: tz.utc,
            value: tz.value
          }))
        );

      const backButton = new ButtonBuilder()
        .setCustomId('timezone_search_back')
        .setLabel('← Search Again')
        .setStyle(ButtonStyle.Secondary);

      const row1 = new ActionRowBuilder().addComponents(resultMenu);
      const row2 = new ActionRowBuilder().addComponents(backButton);

      await interaction.reply({
        content: `🔍 Found **${results.length}** result(s) for "${searchQuery}"${results.length > 25 ? ' (showing first 25)' : ''}:`,
        components: [row1, row2],
        ephemeral: true
      });

    } catch (error) {
      console.error('Error handling timezone search:', error);
      await interaction.reply({
        content: '❌ An error occurred during search. Please try again.',
        ephemeral: true
      });
    }
  },

  async handleTimezoneSearchResultSelect(interaction) {
    try {
      const selectedTimezone = interaction.values[0];
      const state = interaction.client.registrationStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Registration session expired. Please use `/register` again.',
          components: []
        });
      }

      state.timezone = selectedTimezone;
      
      // Delete the search result message
      await interaction.message.delete().catch(() => {});
      
      await this.showFinalModal(interaction);

    } catch (error) {
      console.error('Error handling search result selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async showFinalModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('register_modal')
      .setTitle('Final Registration Details');

    const ignInput = new TextInputBuilder()
      .setCustomId('ign_input')
      .setLabel('In-Game Name (IGN)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);

    const abilityScoreInput = new TextInputBuilder()
      .setCustomId('ability_score_input')
      .setLabel('Ability Score (Total CP/GS)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setPlaceholder('e.g., 5000');

    const ignRow = new ActionRowBuilder().addComponents(ignInput);
    const abilityRow = new ActionRowBuilder().addComponents(abilityScoreInput);

    modal.addComponents(ignRow, abilityRow);

    await interaction.showModal(modal);
  },

  async handleModalSubmit(interaction) {
    console.log(`🔍 [REGISTER-MODAL] Starting modal submission for user: ${interaction.user.tag}`);
    
    await interaction.deferReply({ ephemeral: true });
    console.log(`🔍 [REGISTER-MODAL] Reply deferred`);
    
    try {
      const state = interaction.client.registrationStates.get(interaction.user.id);
      console.log(`🔍 [REGISTER-MODAL] Registration state:`, state ? 'Found' : 'Missing');
      
      if (!state) {
        console.log(`⚠️  [REGISTER-MODAL] State expired`);
        return interaction.editReply({
          content: '❌ Registration session expired. Please use `/register` again.'
        });
      }

      console.log(`🔍 [REGISTER-MODAL] Extracting form data...`);
      const ign = interaction.fields.getTextInputValue('ign_input');
      const abilityScoreStr = interaction.fields.getTextInputValue('ability_score_input');
      const abilityScore = abilityScoreStr ? parseInt(abilityScoreStr) : null;
      console.log(`🔍 [REGISTER-MODAL] IGN: ${ign}, Ability Score: ${abilityScore}`);

      console.log(`🔍 [REGISTER-MODAL] Saving to database...`);
      const character = await queries.createCharacter({
        discordId: state.discordId,
        discordName: state.discordName,
        ign,
        role: state.role,
        className: state.className,
        subclass: state.subclass,
        abilityScore,
        timezone: state.timezone,
        guild: state.guild
      });
      console.log(`✅ [REGISTER-MODAL] Character saved to database`);

      console.log(`🔍 [REGISTER-MODAL] Attempting to update nickname...`);
      try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        await member.setNickname(ign);
        console.log(`✅ [REGISTER-MODAL] Nickname updated successfully`);
      } catch (nickError) {
        console.error('⚠️  [REGISTER-MODAL] Could not update nickname:', nickError.message);
      }

      console.log(`🔍 [REGISTER-MODAL] Triggering background sync...`);
      queries.getAllCharacters()
        .then(chars => {
          console.log(`🔍 [SYNC] Got ${chars.length} characters for sync`);
          return queries.getAllAlts().then(alts => {
            console.log(`🔍 [SYNC] Got ${alts.length} alts for sync`);
            return googleSheets.fullSync(chars, alts);
          });
        })
        .then(() => console.log(`✅ [SYNC] Background sync completed`))
        .catch(err => console.error('⚠️  [SYNC] Background sync failed:', err.message));

      console.log(`🔍 [REGISTER-MODAL] Cleaning up state...`);
      interaction.client.registrationStates.delete(interaction.user.id);

      console.log(`🔍 [REGISTER-MODAL] Sending success reply...`);
      await interaction.editReply({
        content: `✅ **Registration Complete!**\n\n` +
          `👤 **Discord:** ${state.discordName}\n` +
          `🎮 **IGN:** ${ign}\n` +
          `⚔️ **Class:** ${state.className} (${state.subclass})\n` +
          `🛡️ **Role:** ${state.role}\n` +
          `💪 **Ability Score:** ${abilityScore || 'Not provided'}\n` +
          `🌍 **Timezone:** ${state.timezone}\n` +
          `🏰 **Guild:** ${state.guild}\n\n` +
          `Your nickname has been updated to your IGN!\n` +
          `Use \`/addalt\` to register alt characters.`
      });
      console.log(`✅ [REGISTER-MODAL] Success reply sent!`);

    } catch (error) {
      console.error('❌ [REGISTER-MODAL] Error handling modal submission:', error);
      console.error('❌ [REGISTER-MODAL] Error stack:', error.stack);
      
      try {
        await interaction.editReply({
          content: '❌ An error occurred while saving your character. Please try again.'
        });
      } catch (replyError) {
        console.error('❌ [REGISTER-MODAL] Failed to send error reply:', replyError);
      }
    }
  }
};
