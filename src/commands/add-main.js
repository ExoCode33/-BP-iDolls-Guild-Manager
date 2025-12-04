import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } from 'discord.js';
import { GAME_DATA, getRoleFromClass, getTimezoneRegions, getCountriesInRegion, getTimezonesForCountry, getGuilds } from '../config/gameData.js';
import { queries } from '../database/queries.js';
import googleSheets from '../services/googleSheets.js';
import { verifyGuildRole, notifyModerators, getGuildVerificationWarning, areGuildsConfigured } from '../utils/guildVerification.js';
import { clearRegistrationState, getRegistrationState, setRegistrationState } from '../utils/stateManager.js';

// Smart timezone suggestions based on country
const SMART_TIMEZONE_SUGGESTIONS = {
  'United States': 'America/New_York',
  'Canada': 'America/Toronto',
  'Mexico': 'America/Mexico_City',
  'United Kingdom': 'Europe/London',
  'Australia': 'Australia/Sydney',
  'Germany': 'Europe/Berlin',
  'France': 'Europe/Paris',
  'Brazil': 'America/Sao_Paulo',
  'Japan': 'Asia/Tokyo',
  'China': 'Asia/Shanghai',
  'India': 'Asia/Kolkata',
  'Russia': 'Europe/Moscow',
  'South Korea': 'Asia/Seoul',
  'Spain': 'Europe/Madrid',
  'Italy': 'Europe/Rome',
  'Netherlands': 'Europe/Amsterdam',
  'Poland': 'Europe/Warsaw',
  'Argentina': 'America/Argentina/Buenos_Aires',
  'Colombia': 'America/Bogota',
  'Indonesia': 'Asia/Jakarta',
  'Turkey': 'Europe/Istanbul',
};

export default {
  data: new SlashCommandBuilder()
    .setName('add-main')
    .setDescription('Register your main character'),

  async execute(interaction) {
    console.log(`🔍 [ADD-MAIN] Starting execution for user: ${interaction.user.tag}`);
    
    try {
      console.log(`🔍 [ADD-MAIN] Checking for existing character...`);
      const existingChar = await queries.getMainCharacter(interaction.user.id);
      console.log(`🔍 [ADD-MAIN] Existing character check result:`, existingChar ? 'Found' : 'None');
      
      if (existingChar) {
        console.log(`⚠️  [ADD-MAIN] User already has character, sending warning`);
        
        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⚠️ Already Registered')
          .setDescription('You already have a main character registered!')
          .addFields(
            { name: '📝 Update Character', value: 'Use `/update-main` to modify your character information', inline: false },
            { name: '👀 View Character', value: 'Use `/view-char` to see your current registration', inline: false }
          )
          .setFooter({ text: '💡 Tip: You can register alt characters with /add-alt' })
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      console.log(`🔍 [ADD-MAIN] Building class selection menu...`);
      
      const embed = new EmbedBuilder()
        .setColor('#6640D9')
        .setTitle('🎮 Character Registration')
        .setDescription('Welcome to character registration! Let\'s get started by selecting your main class.')
        .addFields({ name: '📍 Step 1 of 4', value: 'Select your main class from the dropdown below', inline: false })
        .setFooter({ text: '✨ Your journey begins here' })
        .setTimestamp();
      
      const classMenu = new StringSelectMenuBuilder()
        .setCustomId('class_select')
        .setPlaceholder('🎯 Select your main class')
        .addOptions(
          Object.keys(GAME_DATA.classes).map(className => ({
            label: className,
            description: `Role: ${GAME_DATA.classes[className].role}`,
            value: className,
            emoji: this.getClassEmoji(className)
          }))
        );

      const row = new ActionRowBuilder().addComponents(classMenu);

      console.log(`🔍 [ADD-MAIN] Sending reply with class menu...`);
      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
      console.log(`✅ [ADD-MAIN] Reply sent successfully`);

      console.log(`🔍 [ADD-MAIN] Storing registration state...`);
      setRegistrationState(interaction.user.id, {
        step: 'class_selected',
        discordId: interaction.user.id,
        discordName: interaction.user.tag,
        startTime: Date.now()
      });

    } catch (error) {
      console.error('❌ [ADD-MAIN] Error in add-main command:', error);
      console.error('❌ [ADD-MAIN] Error stack:', error.stack);
      
      // Clean up state on error
      clearRegistrationState(interaction.user.id);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Registration Error')
        .setDescription('An error occurred during registration. Please try again.')
        .setFooter({ text: 'If this persists, contact a moderator' })
        .setTimestamp();
      
      const replyMethod = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
      await interaction[replyMethod]({ embeds: [errorEmbed], ephemeral: true }).catch(err => 
        console.error('❌ [ADD-MAIN] Failed to send error message:', err)
      );
    }
  },

  getClassEmoji(className) {
    const emojis = {
      'Beat Performer': '🎵',
      'Frost Mage': '❄️',
      'Heavy Guardian': '🛡️',
      'Marksman': '🏹',
      'Shield Knight': '⚔️',
      'Stormblade': '⚡',
      'Verdant Oracle': '🌿',
      'Wind Knight': '💨'
    };
    return emojis[className] || '⭐';
  },

  getRoleEmoji(role) {
    const emojis = {
      'Tank': '🛡️',
      'DPS': '⚔️',
      'Support': '💚'
    };
    return emojis[role] || '⭐';
  },

  async handleClassSelect(interaction) {
    try {
      const selectedClass = interaction.values[0];
      const state = getRegistrationState(interaction.user.id);
      
      if (!state) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('⏱️ Session Expired')
          .setDescription('Your registration session has expired. Please use `/add-main` to start again.')
          .setTimestamp();
        
        return interaction.update({ embeds: [embed], components: [] });
      }

      state.className = selectedClass;
      state.role = getRoleFromClass(selectedClass);
      setRegistrationState(interaction.user.id, state);

      const embed = new EmbedBuilder()
        .setColor('#6640D9')
        .setTitle('🎮 Character Registration')
        .setDescription('Great choice! Now let\'s pick your subclass.')
        .addFields(
          { name: '✅ Class Selected', value: `${this.getClassEmoji(selectedClass)} **${selectedClass}**`, inline: true },
          { name: '🎭 Role', value: `${this.getRoleEmoji(state.role)} **${state.role}**`, inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: '📍 Step 2 of 4', value: 'Select your subclass from the dropdown below', inline: false }
        )
        .setFooter({ text: '✨ Building your character' })
        .setTimestamp();

      const subclassMenu = new StringSelectMenuBuilder()
        .setCustomId('subclass_select')
        .setPlaceholder('🎯 Select your subclass')
        .addOptions(
          GAME_DATA.classes[selectedClass].subclasses.map(subclass => ({
            label: subclass,
            value: subclass
          }))
        );

      const row = new ActionRowBuilder().addComponents(subclassMenu);

      await interaction.update({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Error handling class selection:', error);
      clearRegistrationState(interaction.user.id);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred. Please try again.')
        .setTimestamp();
      
      await interaction.update({ embeds: [errorEmbed], components: [] });
    }
  },

  async handleSubclassSelect(interaction) {
    try {
      const selectedSubclass = interaction.values[0];
      const state = getRegistrationState(interaction.user.id);
      
      if (!state) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('⏱️ Session Expired')
          .setDescription('Your registration session has expired. Please use `/add-main` to start again.')
          .setTimestamp();
        
        return interaction.update({ embeds: [embed], components: [] });
      }

      state.subclass = selectedSubclass;
      setRegistrationState(interaction.user.id, state);

      // Check if guilds are configured
      if (!areGuildsConfigured()) {
        // Skip guild selection, go straight to timezone
        const regions = getTimezoneRegions();
        
        const embed = new EmbedBuilder()
          .setColor('#6640D9')
          .setTitle('🎮 Character Registration')
          .setDescription('Excellent! Now let\'s set your timezone.')
          .addFields(
            { name: '✅ Class', value: `${this.getClassEmoji(state.className)} **${state.className}**`, inline: true },
            { name: '✅ Subclass', value: `**${selectedSubclass}**`, inline: true },
            { name: '🎭 Role', value: `${this.getRoleEmoji(state.role)} **${state.role}**`, inline: true },
            { name: '📍 Step 3 of 4', value: 'Select your region or search for your timezone', inline: false }
          )
          .setFooter({ text: '🌍 Almost there!' })
          .setTimestamp();
        
        const regionMenu = new StringSelectMenuBuilder()
          .setCustomId('timezone_region_select')
          .setPlaceholder('🌍 Select your region')
          .addOptions(
            regions.map(region => ({
              label: region,
              value: region
            }))
          );

        const searchButton = new ButtonBuilder()
          .setCustomId('timezone_search')
          .setLabel('Search for Timezone')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔍');

        const row1 = new ActionRowBuilder().addComponents(regionMenu);
        const row2 = new ActionRowBuilder().addComponents(searchButton);

        await interaction.update({ embeds: [embed], components: [row1, row2] });
        
        return;
      }

      // Show guild selection
      const guilds = getGuilds();
      
      const embed = new EmbedBuilder()
        .setColor('#6640D9')
        .setTitle('🎮 Character Registration')
        .setDescription('Perfect! Now select your guild.')
        .addFields(
          { name: '✅ Class', value: `${this.getClassEmoji(state.className)} **${state.className}**`, inline: true },
          { name: '✅ Subclass', value: `**${selectedSubclass}**`, inline: true },
          { name: '🎭 Role', value: `${this.getRoleEmoji(state.role)} **${state.role}**`, inline: true },
          { name: '📍 Step 3 of 4', value: 'Select your guild from the dropdown below', inline: false }
        )
        .setFooter({ text: '🏰 Choose your guild' })
        .setTimestamp();
      
      const guildMenu = new StringSelectMenuBuilder()
        .setCustomId('guild_select')
        .setPlaceholder('🏰 Select your guild')
        .addOptions(
          guilds.map(guild => ({
            label: guild.name,
            value: guild.name
          }))
        );

      const row = new ActionRowBuilder().addComponents(guildMenu);

      await interaction.update({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Error handling subclass selection:', error);
      clearRegistrationState(interaction.user.id);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred. Please try again.')
        .setTimestamp();
      
      await interaction.update({ embeds: [errorEmbed], components: [] });
    }
  },

  async handleGuildSelect(interaction) {
    try {
      const selectedGuild = interaction.values[0];
      const state = getRegistrationState(interaction.user.id);
      
      if (!state) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('⏱️ Session Expired')
          .setDescription('Your registration session has expired. Please use `/add-main` to start again.')
          .setTimestamp();
        
        return interaction.update({ embeds: [embed], components: [] });
      }

      state.guild = selectedGuild;
      setRegistrationState(interaction.user.id, state);

      // Show region selection for timezone
      const regions = getTimezoneRegions();
      
      const embed = new EmbedBuilder()
        .setColor('#6640D9')
        .setTitle('🎮 Character Registration')
        .setDescription('Almost done! Let\'s set your timezone.')
        .addFields(
          { name: '✅ Class', value: `${this.getClassEmoji(state.className)} **${state.className}**`, inline: true },
          { name: '✅ Subclass', value: `**${state.subclass}**`, inline: true },
          { name: '🎭 Role', value: `${this.getRoleEmoji(state.role)} **${state.role}**`, inline: true },
          { name: '✅ Guild', value: `🏰 **${selectedGuild}**`, inline: false },
          { name: '📍 Step 4 of 4', value: 'Select your region or search for your timezone', inline: false }
        )
        .setFooter({ text: '🌍 Final step!' })
        .setTimestamp();
      
      const regionMenu = new StringSelectMenuBuilder()
        .setCustomId('timezone_region_select')
        .setPlaceholder('🌍 Select your region')
        .addOptions(
          regions.map(region => ({
            label: region,
            value: region
          }))
        );

      const searchButton = new ButtonBuilder()
        .setCustomId('timezone_search')
        .setLabel('Search for Timezone')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔍');

      const row1 = new ActionRowBuilder().addComponents(regionMenu);
      const row2 = new ActionRowBuilder().addComponents(searchButton);

      await interaction.update({ embeds: [embed], components: [row1, row2] });

    } catch (error) {
      console.error('Error handling guild selection:', error);
      clearRegistrationState(interaction.user.id);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred. Please try again.')
        .setTimestamp();
      
      await interaction.update({ embeds: [errorEmbed], components: [] });
    }
  },

  async handleTimezoneRegionSelect(interaction) {
    try {
      const selectedRegion = interaction.values[0];
      const state = getRegistrationState(interaction.user.id);
      
      if (!state) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('⏱️ Session Expired')
          .setDescription('Your registration session has expired. Please use `/add-main` to start again.')
          .setTimestamp();
        
        return interaction.update({ embeds: [embed], components: [] });
      }

      state.timezoneRegion = selectedRegion;
      setRegistrationState(interaction.user.id, state);
      
      const countries = getCountriesInRegion(selectedRegion);
      
      const embed = new EmbedBuilder()
        .setColor('#6640D9')
        .setTitle('🌍 Timezone Selection')
        .setDescription(`Region: **${selectedRegion}**\n\nNow select your country.`)
        .setFooter({ text: 'Almost there!' })
        .setTimestamp();
      
      const countryMenu = new StringSelectMenuBuilder()
        .setCustomId('timezone_country_select')
        .setPlaceholder('🗺️ Select your country')
        .addOptions(
          countries.map(country => ({
            label: country,
            value: country
          }))
        );

      const backButton = new ButtonBuilder()
        .setCustomId('timezone_back_to_region')
        .setLabel('Back to Regions')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('◀️');

      const row1 = new ActionRowBuilder().addComponents(countryMenu);
      const row2 = new ActionRowBuilder().addComponents(backButton);

      await interaction.update({ embeds: [embed], components: [row1, row2] });

    } catch (error) {
      console.error('Error handling region selection:', error);
      clearRegistrationState(interaction.user.id);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred. Please try again.')
        .setTimestamp();
      
      await interaction.update({ embeds: [errorEmbed], components: [] });
    }
  },

  async handleTimezoneCountrySelect(interaction) {
    try {
      const selectedCountry = interaction.values[0];
      const state = getRegistrationState(interaction.user.id);
      
      if (!state) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('⏱️ Session Expired')
          .setDescription('Your registration session has expired. Please use `/add-main` to start again.')
          .setTimestamp();
        
        return interaction.update({ embeds: [embed], components: [] });
      }

      state.timezoneCountry = selectedCountry;
      
      const timezones = getTimezonesForCountry(selectedCountry);
      const suggestedTimezoneValue = SMART_TIMEZONE_SUGGESTIONS[selectedCountry];
      const suggestedTimezone = timezones.find(tz => tz.value === suggestedTimezoneValue) || timezones[0];
      
      state.suggestedTimezone = suggestedTimezone.value;
      setRegistrationState(interaction.user.id, state);

      if (timezones.length === 1) {
        state.timezone = timezones[0].value;
        setRegistrationState(interaction.user.id, state);
        await this.showFinalModal(interaction);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#6640D9')
        .setTitle('🌍 Timezone Selection')
        .setDescription(`Country: **${selectedCountry}**\n\n**Suggested timezone:**\n🌍 ${suggestedTimezone.label}\n${suggestedTimezone.utc}`)
        .addFields({ name: '❓ Is this correct?', value: 'Click the button below to confirm or choose a different timezone.', inline: false })
        .setFooter({ text: 'We detected your timezone automatically' })
        .setTimestamp();

      const acceptButton = new ButtonBuilder()
        .setCustomId('accept_suggested_timezone')
        .setLabel(`Use ${suggestedTimezone.label.split('(')[0].trim()}`)
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅');
      
      const chooseDifferentButton = new ButtonBuilder()
        .setCustomId('choose_different_timezone')
        .setLabel('Choose Different')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔍');

      const backButton = new ButtonBuilder()
        .setCustomId('timezone_back_to_country')
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('◀️');

      const row1 = new ActionRowBuilder().addComponents(acceptButton, chooseDifferentButton);
      const row2 = new ActionRowBuilder().addComponents(backButton);

      await interaction.update({ embeds: [embed], components: [row1, row2] });

    } catch (error) {
      console.error('Error handling timezone country selection:', error);
      clearRegistrationState(interaction.user.id);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred. Please try again.')
        .setTimestamp();
      
      await interaction.update({ embeds: [errorEmbed], components: [] });
    }
  },

  async handleAcceptSuggestedTimezone(interaction) {
    try {
      const state = getRegistrationState(interaction.user.id);
      
      if (!state) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('⏱️ Session Expired')
          .setDescription('Your registration session has expired. Please use `/add-main` to start again.')
          .setTimestamp();
        
        return interaction.update({ embeds: [embed], components: [] });
      }

      state.timezone = state.suggestedTimezone;
      setRegistrationState(interaction.user.id, state);
      await this.showFinalModal(interaction);

    } catch (error) {
      console.error('Error accepting suggested timezone:', error);
      clearRegistrationState(interaction.user.id);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred. Please try again.')
        .setTimestamp();
      
      await interaction.update({ embeds: [errorEmbed], components: [] });
    }
  },

  async handleChooseDifferentTimezone(interaction) {
    try {
      const state = getRegistrationState(interaction.user.id);
      
      if (!state) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('⏱️ Session Expired')
          .setDescription('Your registration session has expired. Please use `/add-main` to start again.')
          .setTimestamp();
        
        return interaction.update({ embeds: [embed], components: [] });
      }

      const timezones = getTimezonesForCountry(state.timezoneCountry);
      
      const embed = new EmbedBuilder()
        .setColor('#6640D9')
        .setTitle('🌍 Timezone Selection')
        .setDescription('Select your timezone from the list below.')
        .setFooter({ text: 'Choose the timezone that matches your location' })
        .setTimestamp();
      
      const timezoneMenu = new StringSelectMenuBuilder()
        .setCustomId('timezone_select')
        .setPlaceholder('🕐 Select your timezone')
        .addOptions(
          timezones.map(tz => ({
            label: tz.label,
            description: tz.utc,
            value: tz.value
          }))
        );

      const backButton = new ButtonBuilder()
        .setCustomId('timezone_back_to_suggestion')
        .setLabel('Back to Suggestion')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('◀️');

      const row1 = new ActionRowBuilder().addComponents(timezoneMenu);
      const row2 = new ActionRowBuilder().addComponents(backButton);

      await interaction.update({ embeds: [embed], components: [row1, row2] });

    } catch (error) {
      console.error('Error showing timezone list:', error);
      clearRegistrationState(interaction.user.id);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred. Please try again.')
        .setTimestamp();
      
      await interaction.update({ embeds: [errorEmbed], components: [] });
    }
  },

  async handleTimezoneSelect(interaction) {
    try {
      const selectedTimezone = interaction.values[0];
      const state = getRegistrationState(interaction.user.id);
      
      if (!state) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('⏱️ Session Expired')
          .setDescription('Your registration session has expired. Please use `/add-main` to start again.')
          .setTimestamp();
        
        return interaction.update({ embeds: [embed], components: [] });
      }

      state.timezone = selectedTimezone;
      setRegistrationState(interaction.user.id, state);
      await this.showFinalModal(interaction);

    } catch (error) {
      console.error('Error handling timezone selection:', error);
      clearRegistrationState(interaction.user.id);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred. Please try again.')
        .setTimestamp();
      
      await interaction.update({ embeds: [errorEmbed], components: [] });
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
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred. Please try again.')
        .setTimestamp();
      
      await interaction.update({ embeds: [errorEmbed], components: [] });
    }
  },

  async handleTimezoneSearchSubmit(interaction) {
    try {
      const state = getRegistrationState(interaction.user.id);
      
      if (!state) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('⏱️ Session Expired')
          .setDescription('Your registration session has expired. Please use `/add-main` to start again.')
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const searchQuery = interaction.fields.getTextInputValue('timezone_search_input').toLowerCase();
      
      const allCountries = Object.keys(GAME_DATA.timezonesByCountry);
      const results = [];
      
      for (const country of allCountries) {
        const timezones = GAME_DATA.timezonesByCountry[country].timezones;
        
        if (country.toLowerCase().includes(searchQuery)) {
          results.push(...timezones.map(tz => ({
            ...tz,
            country: country
          })));
        } else {
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
        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('🔍 No Results Found')
          .setDescription(`No timezones found for **"${searchQuery}"**`)
          .addFields(
            { name: '💡 Try:', value: '• A major city name (e.g., "Tokyo", "London")\n• A country name (e.g., "Japan", "United Kingdom")\n• Use the region selector instead', inline: false }
          )
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const limitedResults = results.slice(0, 25);
      
      const embed = new EmbedBuilder()
        .setColor('#6640D9')
        .setTitle('🔍 Search Results')
        .setDescription(`Found **${results.length}** result(s) for **"${searchQuery}"**${results.length > 25 ? ' (showing first 25)' : ''}`)
        .setFooter({ text: 'Select your timezone from the dropdown' })
        .setTimestamp();
      
      const resultMenu = new StringSelectMenuBuilder()
        .setCustomId('timezone_search_result_select')
        .setPlaceholder(`${results.length} result(s) found`)
        .addOptions(
          limitedResults.map(tz => ({
            label: `${tz.country}: ${tz.label.substring(0, 80)}`,
            description: tz.utc,
            value: tz.value
          }))
        );

      const backButton = new ButtonBuilder()
        .setCustomId('timezone_search_back')
        .setLabel('Search Again')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('◀️');

      const row1 = new ActionRowBuilder().addComponents(resultMenu);
      const row2 = new ActionRowBuilder().addComponents(backButton);

      await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });

    } catch (error) {
      console.error('Error handling timezone search:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred during search. Please try again.')
        .setTimestamp();
      
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },

  async handleTimezoneSearchResultSelect(interaction) {
    try {
      const selectedTimezone = interaction.values[0];
      const state = getRegistrationState(interaction.user.id);
      
      if (!state) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('⏱️ Session Expired')
          .setDescription('Your registration session has expired. Please use `/add-main` to start again.')
          .setTimestamp();
        
        return interaction.update({ embeds: [embed], components: [] });
      }

      state.timezone = selectedTimezone;
      setRegistrationState(interaction.user.id, state);
      
      await interaction.message.delete().catch(() => {});
      
      await this.showFinalModal(interaction);

    } catch (error) {
      console.error('Error handling search result selection:', error);
      clearRegistrationState(interaction.user.id);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred. Please try again.')
        .setTimestamp();
      
      await interaction.update({ embeds: [errorEmbed], components: [] });
    }
  },

  async showFinalModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('register_modal')
      .setTitle('📝 Final Registration Details');

    const ignInput = new TextInputBuilder()
      .setCustomId('ign_input')
      .setLabel('In-Game Name (IGN)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100)
      .setPlaceholder('Enter your character name');

    const abilityScoreInput = new TextInputBuilder()
      .setCustomId('ability_score_input')
      .setLabel('Ability Score (Total CP/GS) - Optional')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setPlaceholder('e.g., 5000');

    const ignRow = new ActionRowBuilder().addComponents(ignInput);
    const abilityRow = new ActionRowBuilder().addComponents(abilityScoreInput);

    modal.addComponents(ignRow, abilityRow);

    await interaction.showModal(modal);
  },

  async handleModalSubmit(interaction) {
    console.log(`🔍 [ADD-MAIN-MODAL] Starting modal submission for user: ${interaction.user.tag}`);
    
    await interaction.deferReply({ ephemeral: true });
    console.log(`🔍 [ADD-MAIN-MODAL] Reply deferred`);
    
    try {
      const state = getRegistrationState(interaction.user.id);
      console.log(`🔍 [ADD-MAIN-MODAL] Registration state:`, state ? 'Found' : 'Missing');
      
      if (!state) {
        console.log(`⚠️  [ADD-MAIN-MODAL] State expired`);
        
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('⏱️ Session Expired')
          .setDescription('Your registration session has expired. Please use `/add-main` to start again.')
          .setTimestamp();
        
        return interaction.editReply({ embeds: [embed] });
      }

      console.log(`🔍 [ADD-MAIN-MODAL] Extracting form data...`);
      const ign = interaction.fields.getTextInputValue('ign_input');
      const abilityScoreStr = interaction.fields.getTextInputValue('ability_score_input');
      const abilityScore = abilityScoreStr ? parseInt(abilityScoreStr) : null;
      console.log(`🔍 [ADD-MAIN-MODAL] IGN: ${ign}, Ability Score: ${abilityScore}`);

      console.log(`🔍 [ADD-MAIN-MODAL] Saving to database...`);
      const character = await queries.createCharacter({
        discordId: state.discordId,
        discordName: state.discordName,
        ign,
        role: state.role,
        className: state.className,
        subclass: state.subclass,
        abilityScore,
        timezone: state.timezone,
        guild: state.guild || null
      });
      console.log(`✅ [ADD-MAIN-MODAL] Character saved to database`);

      // Verify guild role if guilds are configured
      let roleWarning = '';
      if (areGuildsConfigured() && state.guild) {
        console.log(`🔍 [ADD-MAIN-MODAL] Verifying guild role...`);
        try {
          const member = await interaction.guild.members.fetch(interaction.user.id);
          const verification = verifyGuildRole(member, state.guild);
          
          if (!verification.hasRole) {
            console.log(`⚠️  [ADD-MAIN-MODAL] User does not have required guild role`);
            
            await notifyModerators(
              interaction.client,
              member,
              state.guild,
              verification.guild.roleId,
              ign
            );
            
            roleWarning = `\n\n⚠️ **Note:** You selected **${state.guild}** but you don't have the required guild role. A moderator has been notified to verify your guild membership.`;
          } else {
            console.log(`✅ [ADD-MAIN-MODAL] User has required guild role`);
          }
        } catch (verifyError) {
          console.error('⚠️  [ADD-MAIN-MODAL] Could not verify guild role:', verifyError.message);
        }
      }

      console.log(`🔍 [ADD-MAIN-MODAL] Attempting to update nickname...`);
      try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        await member.setNickname(ign);
        console.log(`✅ [ADD-MAIN-MODAL] Nickname updated successfully`);
      } catch (nickError) {
        console.error('⚠️  [ADD-MAIN-MODAL] Could not update nickname:', nickError.message);
      }

      console.log(`🔍 [ADD-MAIN-MODAL] Triggering background sync...`);
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

      console.log(`🔍 [ADD-MAIN-MODAL] Cleaning up state...`);
      clearRegistrationState(interaction.user.id);

      console.log(`🔍 [ADD-MAIN-MODAL] Sending success reply...`);
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Registration Complete!')
        .setDescription(`Welcome to the guild, ${ign}! Your character has been registered successfully.`)
        .addFields(
          { name: '👤 Discord', value: state.discordName, inline: true },
          { name: '🎮 IGN', value: ign, inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: `${this.getClassEmoji(state.className)} Class`, value: `**${state.className}**\n${state.subclass}`, inline: true },
          { name: `${this.getRoleEmoji(state.role)} Role`, value: state.role, inline: true },
          { name: '💪 Ability Score', value: abilityScore ? abilityScore.toLocaleString() : 'Not provided', inline: true }
        )
        .setFooter({ text: '💡 Use /add-alt to register alt characters' })
        .setTimestamp();

      if (state.guild) {
        embed.addFields({ name: '🏰 Guild', value: state.guild, inline: true });
      }
      
      embed.addFields({ name: '🌍 Timezone', value: state.timezone, inline: true });

      if (roleWarning) {
        embed.addFields({ name: '⚠️ Notice', value: roleWarning.replace('\n\n⚠️ **Note:** ', ''), inline: false });
      }
      
      await interaction.editReply({ embeds: [embed] });
      console.log(`✅ [ADD-MAIN-MODAL] Success reply sent!`);

    } catch (error) {
      console.error('❌ [ADD-MAIN-MODAL] Error handling modal submission:', error);
      console.error('❌ [ADD-MAIN-MODAL] Error stack:', error.stack);
      
      // Clean up state on error
      clearRegistrationState(interaction.user.id);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Registration Failed')
        .setDescription('An error occurred while saving your character. Please try again.')
        .setFooter({ text: 'If this persists, contact a moderator' })
        .setTimestamp();
      
      try {
        await interaction.editReply({ embeds: [errorEmbed] });
      } catch (replyError) {
        console.error('❌ [ADD-MAIN-MODAL] Failed to send error reply:', replyError);
      }
    }
  }
};
