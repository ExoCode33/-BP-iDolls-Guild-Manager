import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { GAME_DATA, getRoleFromClass, getTimezoneRegions, getCountriesInRegion, getTimezonesForCountry, getGuilds } from '../config/gameData.js';
import { queries } from '../database/queries.js';
import googleSheets from '../services/googleSheets.js';
import { verifyGuildRole, notifyModerators, getGuildVerificationWarning, areGuildsConfigured } from '../utils/guildVerification.js';

// Helper function to sync in background
const syncInBackground = () => {
  queries.getAllCharacters()
    .then(chars => queries.getAllAlts().then(alts => googleSheets.fullSync(chars, alts)))
    .catch(err => console.error('Background sync failed:', err.message));
};

// Smart timezone suggestions
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
};

export default {
  data: new SlashCommandBuilder()
    .setName('update')
    .setDescription('Update your main character information')
    .addStringOption(option =>
      option.setName('field')
        .setDescription('What do you want to update?')
        .setRequired(true)
        .addChoices(
          { name: 'Class/Subclass', value: 'class' },
          { name: 'Ability Score', value: 'ability_score' },
          { name: 'Guild', value: 'guild' },
          { name: 'Timezone', value: 'timezone' }
        )
    ),

  async execute(interaction) {
    try {
      const mainChar = await queries.getMainCharacter(interaction.user.id);
      
      if (!mainChar) {
        return interaction.reply({
          content: '❌ You need to register a main character first! Use `/register` to get started.',
          ephemeral: true
        });
      }

      const field = interaction.options.getString('field');

      // Initialize update state
      interaction.client.updateStates = interaction.client.updateStates || new Map();
      interaction.client.updateStates.set(interaction.user.id, {
        field,
        discordId: interaction.user.id,
        mainCharIGN: mainChar.ign,
        currentValue: mainChar
      });

      switch (field) {
        case 'class':
          await this.handleClassUpdate(interaction);
          break;
        case 'ability_score':
          await this.handleAbilityScoreUpdate(interaction);
          break;
        case 'guild':
          await this.handleGuildUpdate(interaction);
          break;
        case 'timezone':
          await this.handleTimezoneUpdate(interaction);
          break;
      }

    } catch (error) {
      console.error('Error in update command:', error);
      await interaction.reply({
        content: '❌ An error occurred. Please try again.',
        ephemeral: true
      });
    }
  },

  async handleClassUpdate(interaction) {
    const classMenu = new StringSelectMenuBuilder()
      .setCustomId('update_class_select')
      .setPlaceholder('Select your new class')
      .addOptions(
        Object.keys(GAME_DATA.classes).map(className => ({
          label: className,
          description: `Role: ${GAME_DATA.classes[className].role}`,
          value: className
        }))
      );

    const row = new ActionRowBuilder().addComponents(classMenu);

    await interaction.reply({
      content: '🔄 **Updating Class**\n\nSelect your new class:',
      components: [row],
      ephemeral: true
    });
  },

  async handleAbilityScoreUpdate(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('update_ability_score_modal')
      .setTitle('Update Ability Score');

    const abilityScoreInput = new TextInputBuilder()
      .setCustomId('ability_score_input')
      .setLabel('New Ability Score')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('e.g., 5000');

    const row = new ActionRowBuilder().addComponents(abilityScoreInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },

  async handleGuildUpdate(interaction) {
    // Check if guilds are configured
    if (!areGuildsConfigured()) {
      return interaction.reply({
        content: '❌ Guilds are not configured on this server.',
        ephemeral: true
      });
    }
    
    const guilds = getGuilds();
    
    const guildMenu = new StringSelectMenuBuilder()
      .setCustomId('update_guild_select')
      .setPlaceholder('Select your new guild')
      .addOptions(
        guilds.map(guild => ({
          label: guild.name,
          value: guild.name
        }))
      );

    const row = new ActionRowBuilder().addComponents(guildMenu);

    await interaction.reply({
      content: '🔄 **Updating Guild**\n\nSelect your new guild:',
      components: [row],
      ephemeral: true
    });
  },

  async handleTimezoneUpdate(interaction) {
    const regions = getTimezoneRegions();
    
    const regionMenu = new StringSelectMenuBuilder()
      .setCustomId('update_timezone_region_select')
      .setPlaceholder('Select your region')
      .addOptions(
        regions.map(region => ({
          label: region,
          value: region
        }))
      );

    const searchButton = new ButtonBuilder()
      .setCustomId('update_timezone_search')
      .setLabel('🔍 Search for Timezone')
      .setStyle(ButtonStyle.Primary);

    const row1 = new ActionRowBuilder().addComponents(regionMenu);
    const row2 = new ActionRowBuilder().addComponents(searchButton);

    await interaction.reply({
      content: '🔄 **Updating Timezone**\n\nSelect your region or search:',
      components: [row1, row2],
      ephemeral: true
    });
  },

  async handleUpdateClassSelect(interaction) {
    try {
      const selectedClass = interaction.values[0];
      const state = interaction.client.updateStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Update session expired. Please use `/update` again.',
          components: []
        });
      }

      state.newClass = selectedClass;
      state.newRole = getRoleFromClass(selectedClass);

      const subclassMenu = new StringSelectMenuBuilder()
        .setCustomId('update_subclass_select')
        .setPlaceholder('Select your new subclass')
        .addOptions(
          GAME_DATA.classes[selectedClass].subclasses.map(subclass => ({
            label: subclass,
            value: subclass
          }))
        );

      const row = new ActionRowBuilder().addComponents(subclassMenu);

      await interaction.update({
        content: `✅ New Class: **${selectedClass}** (${state.newRole})\n\nSelect your new subclass:`,
        components: [row]
      });

    } catch (error) {
      console.error('Error handling update class selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleUpdateSubclassSelect(interaction) {
    try {
      const selectedSubclass = interaction.values[0];
      const state = interaction.client.updateStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Update session expired. Please use `/update` again.',
          components: []
        });
      }

      state.newSubclass = selectedSubclass;

      // Check if role changed and guilds are configured
      if (state.newRole !== state.currentValue.role && areGuildsConfigured()) {
        const guilds = getGuilds();
        
        const guildMenu = new StringSelectMenuBuilder()
          .setCustomId('update_guild_after_class_select')
          .setPlaceholder('Select your new guild (role changed)')
          .addOptions(
            guilds.map(guild => ({
              label: guild.name,
              value: guild.name
            }))
          );

        const row = new ActionRowBuilder().addComponents(guildMenu);

        await interaction.update({
          content: `✅ New Class: **${state.newClass}** (${selectedSubclass})\n` +
            `⚠️ Your role changed from **${state.currentValue.role}** to **${state.newRole}**\n\n` +
            `Please select a guild:`,
          components: [row]
        });
      } else {
        await queries.updateCharacter(state.discordId, state.mainCharIGN, {
          class: state.newClass,
          subclass: selectedSubclass,
          role: state.newRole
        });

        syncInBackground();
        interaction.client.updateStates.delete(interaction.user.id);

        await interaction.update({
          content: `✅ **Character Updated!**\n\n` +
            `⚔️ **New Class:** ${state.newClass} (${selectedSubclass})\n` +
            `🛡️ **Role:** ${state.newRole}`,
          components: []
        });
      }

    } catch (error) {
      console.error('Error handling update subclass selection:', error);
      await interaction.update({
        content: '❌ An error occurred while updating. Please try again.',
        components: []
      });
    }
  },

  async handleUpdateGuildAfterClassSelect(interaction) {
    try {
      const selectedGuild = interaction.values[0];
      const state = interaction.client.updateStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Update session expired. Please use `/update` again.',
          components: []
        });
      }

      await queries.updateCharacter(state.discordId, state.mainCharIGN, {
        class: state.newClass,
        subclass: state.newSubclass,
        role: state.newRole,
        guild: selectedGuild
      });

      // Verify guild role
      let roleWarning = '';
      if (areGuildsConfigured()) {
        try {
          const member = await interaction.guild.members.fetch(state.discordId);
          const verification = verifyGuildRole(member, selectedGuild);
          
          if (!verification.hasRole) {
            await notifyModerators(
              interaction.client,
              member,
              selectedGuild,
              verification.guild.roleId,
              state.mainCharIGN
            );
            
            roleWarning = `\n\n${getGuildVerificationWarning(selectedGuild)}`;
          }
        } catch (verifyError) {
          console.error('Could not verify guild role:', verifyError.message);
        }
      }

      syncInBackground();
      interaction.client.updateStates.delete(interaction.user.id);

      await interaction.update({
        content: `✅ **Character Updated!**\n\n` +
          `⚔️ **New Class:** ${state.newClass} (${state.newSubclass})\n` +
          `🛡️ **New Role:** ${state.newRole}\n` +
          `🏰 **New Guild:** ${selectedGuild}` +
          roleWarning,
        components: []
      });

    } catch (error) {
      console.error('Error handling guild update after class change:', error);
      await interaction.update({
        content: '❌ An error occurred while updating. Please try again.',
        components: []
      });
    }
  },

  async handleUpdateGuildSelect(interaction) {
    try {
      const selectedGuild = interaction.values[0];
      const state = interaction.client.updateStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Update session expired. Please use `/update` again.',
          components: []
        });
      }

      await queries.updateCharacter(state.discordId, state.mainCharIGN, {
        guild: selectedGuild
      });

      // Verify guild role
      let roleWarning = '';
      if (areGuildsConfigured()) {
        try {
          const member = await interaction.guild.members.fetch(state.discordId);
          const verification = verifyGuildRole(member, selectedGuild);
          
          if (!verification.hasRole) {
            await notifyModerators(
              interaction.client,
              member,
              selectedGuild,
              verification.guild.roleId,
              state.mainCharIGN
            );
            
            roleWarning = `\n\n${getGuildVerificationWarning(selectedGuild)}`;
          }
        } catch (verifyError) {
          console.error('Could not verify guild role:', verifyError.message);
        }
      }

      syncInBackground();
      interaction.client.updateStates.delete(interaction.user.id);

      await interaction.update({
        content: `✅ **Guild Updated!**\n\n🏰 **New Guild:** ${selectedGuild}` + roleWarning,
        components: []
      });

    } catch (error) {
      console.error('Error handling guild update:', error);
      await interaction.update({
        content: '❌ An error occurred while updating. Please try again.',
        components: []
      });
    }
  },

  async handleUpdateTimezoneRegionSelect(interaction) {
    try {
      const selectedRegion = interaction.values[0];
      const state = interaction.client.updateStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Update session expired. Please use `/update` again.',
          components: []
        });
      }

      state.timezoneRegion = selectedRegion;
      
      const countries = getCountriesInRegion(selectedRegion);
      
      const countryMenu = new StringSelectMenuBuilder()
        .setCustomId('update_timezone_country_select')
        .setPlaceholder('Select your country')
        .addOptions(
          countries.map(country => ({
            label: country,
            value: country
          }))
        );

      const row = new ActionRowBuilder().addComponents(countryMenu);

      await interaction.update({
        content: `✅ Region: **${selectedRegion}**\n\nSelect your country:`,
        components: [row]
      });

    } catch (error) {
      console.error('Error handling region selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleUpdateTimezoneCountrySelect(interaction) {
    try {
      const selectedCountry = interaction.values[0];
      const state = interaction.client.updateStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Update session expired. Please use `/update` again.',
          components: []
        });
      }

      state.timezoneCountry = selectedCountry;
      
      const timezones = getTimezonesForCountry(selectedCountry);
      const suggestedTimezoneValue = SMART_TIMEZONE_SUGGESTIONS[selectedCountry];
      const suggestedTimezone = timezones.find(tz => tz.value === suggestedTimezoneValue) || timezones[0];
      
      state.suggestedTimezone = suggestedTimezone.value;

      if (timezones.length === 1) {
        state.timezone = timezones[0].value;
        await this.completeTimezoneUpdate(interaction, state);
        return;
      }

      const acceptButton = new ButtonBuilder()
        .setCustomId('update_accept_suggested_timezone')
        .setLabel(`✓ Use ${suggestedTimezone.label.split('(')[0].trim()}`)
        .setStyle(ButtonStyle.Success)
        .setEmoji('🌍');
      
      const chooseDifferentButton = new ButtonBuilder()
        .setCustomId('update_choose_different_timezone')
        .setLabel('Choose Different')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔍');

      const row = new ActionRowBuilder().addComponents(acceptButton, chooseDifferentButton);

      await interaction.update({
        content: `✅ Country: **${selectedCountry}**\n\n` +
          `**Suggested timezone:**\n` +
          `🌍 **${suggestedTimezone.label}**\n` +
          `${suggestedTimezone.utc}\n\n` +
          `Is this correct?`,
        components: [row]
      });

    } catch (error) {
      console.error('Error handling timezone country update:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleUpdateAcceptSuggestedTimezone(interaction) {
    try {
      const state = interaction.client.updateStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Update session expired. Please use `/update` again.',
          components: []
        });
      }

      state.timezone = state.suggestedTimezone;
      await this.completeTimezoneUpdate(interaction, state);

    } catch (error) {
      console.error('Error accepting suggested timezone:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleUpdateChooseDifferentTimezone(interaction) {
    try {
      const state = interaction.client.updateStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Update session expired. Please use `/update` again.',
          components: []
        });
      }

      const timezones = getTimezonesForCountry(state.timezoneCountry);
      
      const timezoneMenu = new StringSelectMenuBuilder()
        .setCustomId('update_timezone_select')
        .setPlaceholder('Select your timezone')
        .addOptions(
          timezones.map(tz => ({
            label: tz.label,
            description: tz.utc,
            value: tz.value
          }))
        );

      const row = new ActionRowBuilder().addComponents(timezoneMenu);

      await interaction.update({
        content: `Select your timezone from the list:`,
        components: [row]
      });

    } catch (error) {
      console.error('Error showing timezone list:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleUpdateTimezoneSelect(interaction) {
    try {
      const selectedTimezone = interaction.values[0];
      const state = interaction.client.updateStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Update session expired. Please use `/update` again.',
          components: []
        });
      }

      state.timezone = selectedTimezone;
      await this.completeTimezoneUpdate(interaction, state);

    } catch (error) {
      console.error('Error handling timezone update:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async handleUpdateTimezoneSearch(interaction) {
    try {
      const modal = new ModalBuilder()
        .setCustomId('update_timezone_search_modal')
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

  async handleUpdateTimezoneSearchSubmit(interaction) {
    try {
      const state = interaction.client.updateStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.reply({
          content: '❌ Update session expired. Please use `/update` again.',
          ephemeral: true
        });
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
        return interaction.reply({
          content: `❌ No timezones found for "${searchQuery}". Try:\n` +
            `• A major city name (e.g., "Tokyo", "London")\n` +
            `• A country name (e.g., "Japan", "United Kingdom")`,
          ephemeral: true
        });
      }

      const limitedResults = results.slice(0, 25);
      
      const resultMenu = new StringSelectMenuBuilder()
        .setCustomId('update_timezone_search_result_select')
        .setPlaceholder(`Found ${results.length} result(s)`)
        .addOptions(
          limitedResults.map(tz => ({
            label: `${tz.country}: ${tz.label.substring(0, 80)}`,
            description: tz.utc,
            value: tz.value
          }))
        );

      const row = new ActionRowBuilder().addComponents(resultMenu);

      await interaction.reply({
        content: `🔍 Found **${results.length}** result(s) for "${searchQuery}"${results.length > 25 ? ' (showing first 25)' : ''}:`,
        components: [row],
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

  async handleUpdateTimezoneSearchResultSelect(interaction) {
    try {
      const selectedTimezone = interaction.values[0];
      const state = interaction.client.updateStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.update({
          content: '❌ Update session expired. Please use `/update` again.',
          components: []
        });
      }

      state.timezone = selectedTimezone;
      
      await interaction.message.delete().catch(() => {});
      
      await this.completeTimezoneUpdate(interaction, state);

    } catch (error) {
      console.error('Error handling search result selection:', error);
      await interaction.update({
        content: '❌ An error occurred. Please try again.',
        components: []
      });
    }
  },

  async completeTimezoneUpdate(interaction, state) {
    await queries.updateCharacter(state.discordId, state.mainCharIGN, {
      timezone: state.timezone
    });

    syncInBackground();
    interaction.client.updateStates.delete(interaction.user.id);

    const message = {
      content: `✅ **Timezone Updated!**\n\n🌍 **New Timezone:** ${state.timezone}`,
      components: []
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(message);
    } else {
      await interaction.update(message);
    }
  },

  async handleAbilityScoreModalSubmit(interaction) {
    try {
      const state = interaction.client.updateStates.get(interaction.user.id);
      
      if (!state) {
        return interaction.reply({
          content: '❌ Update session expired. Please use `/update` again.',
          ephemeral: true
        });
      }

      const abilityScoreStr = interaction.fields.getTextInputValue('ability_score_input');
      const abilityScore = parseInt(abilityScoreStr);

      if (isNaN(abilityScore)) {
        return interaction.reply({
          content: '❌ Please enter a valid number for ability score.',
          ephemeral: true
        });
      }

      await queries.updateCharacter(state.discordId, state.mainCharIGN, {
        ability_score: abilityScore
      });

      syncInBackground();
      interaction.client.updateStates.delete(interaction.user.id);

      await interaction.reply({
        content: `✅ **Ability Score Updated!**\n\n💪 **New Ability Score:** ${abilityScore}`,
        ephemeral: true
      });

    } catch (error) {
      console.error('Error handling ability score update:', error);
      await interaction.reply({
        content: '❌ An error occurred while updating. Please try again.',
        ephemeral: true
      });
    }
  }
};
