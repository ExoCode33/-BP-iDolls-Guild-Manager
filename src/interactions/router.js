import { MessageFlags, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import logger from '../services/logger.js';
import state from '../services/state.js';
import * as reg from './registration.js';
import * as edit from './editing.js';
import applicationService from '../services/applications.js';
import { errorEmbed, successEmbed } from '../ui/embeds.js';

const ephemeralFlag = { flags: MessageFlags.Ephemeral };

// ✅ INTERACTION LOCK - Prevents duplicate processing from fast clicks
const activeInteractions = new Map();
const INTERACTION_TIMEOUT = 3000; // 3 seconds

function isInteractionLocked(userId, interactionId) {
  const active = activeInteractions.get(userId);
  if (!active) return false;
  
  // Clean up old locks
  if (Date.now() - active.timestamp > INTERACTION_TIMEOUT) {
    activeInteractions.delete(userId);
    return false;
  }
  
  // Different interaction = not locked
  return active.id !== interactionId;
}

function lockInteraction(userId, interactionId) {
  activeInteractions.set(userId, {
    id: interactionId,
    timestamp: Date.now()
  });
}

function unlockInteraction(userId) {
  activeInteractions.delete(userId);
}

// Clean up old locks every minute
setInterval(() => {
  const now = Date.now();
  for (const [userId, lock] of activeInteractions.entries()) {
    if (now - lock.timestamp > INTERACTION_TIMEOUT) {
      activeInteractions.delete(userId);
    }
  }
}, 60000);

function extractUserId(customId) {
  const parts = customId.split('_');
  return parts[parts.length - 1];
}

function isOwner(interaction, targetUserId) {
  return interaction.user.id === targetUserId;
}

function isAdmin(interaction) {
  return interaction.member?.permissions?.has('Administrator');
}

export async function route(interaction) {
  const customId = interaction.customId;
  const userId = extractUserId(customId);
  const isAdminAction = customId.startsWith('admin_');

  // ✅ CHECK FOR DUPLICATE INTERACTION
  if (isInteractionLocked(userId, interaction.id)) {
    console.log(`[ROUTER] Ignoring duplicate interaction for ${userId}`);
    return;
  }

  // ✅ VERIFICATION BUTTON - Handle before ownership check (anyone can register)
  if (customId === 'verification_register') {
    lockInteraction(interaction.user.id, interaction.id);
    try {
      // Defer with ephemeral so only user sees the registration
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      return await reg.start(interaction, interaction.user.id, 'main');
    } finally {
      unlockInteraction(interaction.user.id);
    }
  }

  // ✅ VERIFICATION NON-PLAYER - Show funny confirmation first
  if (customId === 'verification_non_player') {
    lockInteraction(interaction.user.id, interaction.id);
    try {
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('😢 Wait... You don\'t play Blue Protocol?!')
        .setDescription(
          '**Are you absolutely sure?**\n\n' +
          '💔 You\'ll miss out on:\n' +
          '• Miyako\n\n' +
          '🎮 **It\'s not too late!**\n' +
          'Download Blue Protocol and join the fun:\n' +
          '**https://www.playbpsr.com**\n\n' +
          '✨ Or... if you\'re really sure, click "I\'m Sure" below to get basic server access.'
        )
        .setFooter({ text: 'We believe in you! Come play with us! 💙' });

      const confirmRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`verify_nonplayer_confirm_${interaction.user.id}`)
            .setLabel('I\'m Sure (No Game Access)')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('😔'),
          new ButtonBuilder()
            .setLabel('Download Blue Protocol!')
            .setStyle(ButtonStyle.Link)
            .setURL('https://www.playbpsr.com')
            .setEmoji('🎮')
        );

      return interaction.reply({ 
        embeds: [embed], 
        components: [confirmRow], 
        ...ephemeralFlag 
      });
    } finally {
      unlockInteraction(interaction.user.id);
    }
  }

  // ✅ VERIFICATION NON-PLAYER CONFIRMED - Give verified role only
  if (customId.startsWith('verify_nonplayer_confirm_')) {
    lockInteraction(interaction.user.id, interaction.id);
    try {
      const member = interaction.member;
      const verifiedRoleId = process.env.VERIFIED_ROLE_ID;
      
      if (!verifiedRoleId) {
        return interaction.update({ 
          content: '⚠️ Verified role not configured. Please contact an admin.', 
          embeds: [],
          components: [],
          ...ephemeralFlag 
        });
      }

      // Check if already has role
      if (member.roles.cache.has(verifiedRoleId)) {
        return interaction.update({ 
          content: '✅ You already have access to the server!', 
          embeds: [],
          components: [],
          ...ephemeralFlag 
        });
      }

      // Add verified role
      await member.roles.add(verifiedRoleId);
      
      return interaction.update({ 
        content: '😢 Okay... You now have basic server access.\n\n💙 But remember, you can always download Blue Protocol later and register your character to unlock the full experience!\n\n**Download here:** https://www.playbpsr.com\n\nWelcome to iDolls! 💫', 
        embeds: [],
        components: [],
        ...ephemeralFlag 
      });
    } catch (error) {
      console.error('[VERIFICATION] Error giving verified role:', error);
      return interaction.update({ 
        content: '❌ Failed to verify. Please contact an admin.', 
        embeds: [],
        components: [],
        ...ephemeralFlag 
      });
    } finally {
      unlockInteraction(interaction.user.id);
    }
  }

  // ✅ APPLICATION HANDLERS - FIRST, before ownership checks
  if (customId.startsWith('app_vote_accept_')) {
    const appId = parseInt(customId.split('_')[3]);
    console.log(`[ROUTER] Accept vote button clicked, appId: ${appId}, customId: ${customId}`);
    lockInteraction(userId, interaction.id);
    try {
      await applicationService.handleVote(interaction, appId, 'accept');
    } finally {
      unlockInteraction(userId);
    }
    return;
  }
  
  if (customId.startsWith('app_vote_deny_')) {
    const appId = parseInt(customId.split('_')[3]);
    console.log(`[ROUTER] Deny vote button clicked, appId: ${appId}, customId: ${customId}`);
    lockInteraction(userId, interaction.id);
    try {
      await applicationService.handleVote(interaction, appId, 'deny');
    } finally {
      unlockInteraction(userId);
    }
    return;
  }
  
  if (customId.startsWith('app_override_') && !customId.includes('accept') && !customId.includes('deny') && !customId.includes('cancel')) {
    const appId = parseInt(customId.split('_')[2]);
    console.log(`[ROUTER] Override menu button clicked, appId: ${appId}, customId: ${customId}`);
    lockInteraction(userId, interaction.id);
    try {
      await applicationService.showOverrideMenu(interaction, appId);
    } finally {
      unlockInteraction(userId);
    }
    return;
  }
  
  if (customId.startsWith('app_override_accept_')) {
    const appId = parseInt(customId.split('_')[3]);
    console.log(`[ROUTER] Override accept button clicked, appId: ${appId}, customId: ${customId}`);
    lockInteraction(userId, interaction.id);
    try {
      await applicationService.handleOverride(interaction, appId, 'accept');
    } finally {
      unlockInteraction(userId);
    }
    return;
  }
  
  if (customId.startsWith('app_override_deny_')) {
    const appId = parseInt(customId.split('_')[3]);
    console.log(`[ROUTER] Override deny button clicked, appId: ${appId}, customId: ${customId}`);
    lockInteraction(userId, interaction.id);
    try {
      await applicationService.handleOverride(interaction, appId, 'deny');
    } finally {
      unlockInteraction(userId);
    }
    return;
  }
  
  if (customId.startsWith('app_override_cancel')) {
    console.log(`[ROUTER] Override cancel button clicked, customId: ${customId}`);
    await interaction.update({ content: '❌ Override cancelled.', components: [], flags: MessageFlags.Ephemeral });
    return;
  }

  // Check ownership - admins can bypass for admin_ prefixed actions
  if (!isOwner(interaction, userId) && !isAdminAction) {
    return interaction.reply({ content: 'This is not your session.', ...ephemeralFlag });
  }

  // For admin actions, verify they have admin perms
  if (isAdminAction && !isAdmin(interaction)) {
    return interaction.reply({ content: 'You need Administrator permission.', ...ephemeralFlag });
  }

  // ✅ LOCK INTERACTION BEFORE PROCESSING
  lockInteraction(userId, interaction.id);

  logger.interaction(interaction.isButton() ? 'button' : 'select', customId, interaction.user.username);

  try {
    // Admin actions (operate on other users)
    if (customId.startsWith('admin_settings_back_')) {
      const admin = await import('../commands/admin.js');
      return await admin.handleSettingsBackButton(interaction);
    }
    
    // ✅ NEW LOGGING SYSTEM BACK BUTTON
    if (customId.startsWith('admin_new_logging_back_')) {
      const adminSettings = await import('../services/adminSettings.js');
      return await adminSettings.handleNewLoggingBackButton(interaction);
    }
    
    if (customId.startsWith('admin_reg_start_')) return await reg.start(interaction, userId, 'main');
    if (customId.startsWith('admin_add_')) return await edit.showAddMenu(interaction, userId);
    if (customId.startsWith('admin_edit_')) return await edit.showEditMenu(interaction, userId);
    if (customId.startsWith('admin_remove_')) return await edit.showRemoveMenu(interaction, userId);

    // Registration - START
    if (customId.startsWith('reg_start_')) return await reg.start(interaction, userId, 'main');

    // Back buttons - handle all variations
    if (customId.startsWith('back_profile_')) return await edit.backToProfile(interaction, userId);
    if (customId.startsWith('back_to_profile_')) return await edit.backToProfile(interaction, userId);
    if (customId.startsWith('back_to_region_')) return await reg.backToRegion(interaction, userId);
    if (customId.startsWith('back_to_country_')) return await reg.backToCountry(interaction, userId);
    if (customId.startsWith('back_to_timezone_')) return await reg.backToTimezone(interaction, userId);
    if (customId.startsWith('back_to_class_')) return await reg.backToClass(interaction, userId);
    if (customId.startsWith('back_to_subclass_')) return await reg.backToSubclass(interaction, userId);
    if (customId.startsWith('back_to_score_')) return await reg.backToScore(interaction, userId);
    if (customId.startsWith('back_to_battle_imagine_')) return await reg.backToBattleImagine(interaction, userId);
    if (customId.startsWith('retry_ign_uid_')) return await reg.retryIGN(interaction, userId);

    // Add character
    if (customId.startsWith('add_type_')) return await edit.handleAddType(interaction, userId);
    if (customId.startsWith('add_')) return await edit.showAddMenu(interaction, userId);

    // Edit character - back buttons (MUST come before edit_ general handler)
    if (customId.startsWith('edit_type_back_')) return await edit.backToEditType(interaction, userId);
    if (customId.startsWith('edit_field_back_')) return await edit.backToFieldSelect(interaction, userId);
    if (customId.startsWith('edit_class_back_')) return await edit.backToClassSelect(interaction, userId);
    if (customId.startsWith('edit_bi_back_')) return await edit.backToBattleImagineList(interaction, userId);
    
    // Edit character - type selections (must come after specific back buttons)
    if (customId.startsWith('edit_type_')) return await edit.handleEditType(interaction, userId);
    if (customId.startsWith('edit_subclass_')) return await edit.handleEditSubclassSelect(interaction, userId);
    if (customId.startsWith('edit_field_')) return await edit.handleFieldSelect(interaction, userId);
    if (customId.startsWith('edit_bi_select_')) return await edit.handleEditBattleImagineSelect(interaction, userId);
    if (customId.startsWith('edit_bi_tier_')) return await edit.handleEditBattleImagineTier(interaction, userId);
    
    // Edit general button - goes back to edit type menu (must come LAST after all edit_* patterns)
    if (customId.startsWith('edit_')) return await edit.showEditMenu(interaction, userId);

    // Remove character - specific patterns first
    if (customId.startsWith('remove_type_')) return await edit.handleRemoveType(interaction, userId);
    if (customId.startsWith('remove_subclass_')) return await edit.handleRemoveSubclassSelect(interaction, userId);
    
    // Remove general button - goes back to remove type menu (must come LAST)
    if (customId.startsWith('remove_')) return await edit.showRemoveMenu(interaction, userId);

    // Confirm/cancel
    if (customId.startsWith('confirm_deleteall_')) return await edit.confirmDeleteAll(interaction, userId);
    if (customId.startsWith('confirm_delete_')) return await edit.confirmDelete(interaction, userId);
    if (customId.startsWith('cancel_')) return await edit.cancelAction(interaction, userId);

    logger.warning('Router', `Unknown customId: ${customId}`);
  } catch (e) {
    logger.error('Router', `Failed handling ${customId}`, e);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Something went wrong.', ...ephemeralFlag });
    }
  } finally {
    // ✅ ALWAYS UNLOCK AFTER PROCESSING
    unlockInteraction(userId);
  }
}

export async function routeSelectMenu(interaction) {
  const customId = interaction.customId;
  const userId = extractUserId(customId);
  const isAdminAction = customId.startsWith('admin_');

  // ✅ CHECK FOR DUPLICATE INTERACTION
  if (isInteractionLocked(userId, interaction.id)) {
    console.log(`[ROUTER] Ignoring duplicate select menu for ${userId}`);
    return;
  }

  if (!isOwner(interaction, userId) && !isAdminAction) {
    return interaction.reply({ content: 'This is not your session.', ...ephemeralFlag });
  }

  if (isAdminAction && !isAdmin(interaction)) {
    return interaction.reply({ content: 'You need Administrator permission.', ...ephemeralFlag });
  }

  // ✅ LOCK INTERACTION BEFORE PROCESSING
  lockInteraction(userId, interaction.id);

  logger.interaction('select', customId, interaction.user.username);

  try {
    // Admin settings menus (check these first, before userId validation)
    if (customId.startsWith('admin_settings_menu_')) {
      const admin = await import('../commands/admin.js');
      return await admin.handleSettingsMenuSelect(interaction);
    }
    if (customId.startsWith('admin_verification_channel_')) {
      const admin = await import('../commands/admin.js');
      return await admin.handleVerificationChannelSelect(interaction);
    }
    if (customId.startsWith('admin_logs_channel_')) {
      const admin = await import('../commands/admin.js');
      return await admin.handleLogChannelSelect(interaction);
    }
    if (customId.startsWith('admin_logs_batch_')) {
      const admin = await import('../commands/admin.js');
      return await admin.handleLogBatchSelect(interaction);
    }
    if (customId.startsWith('admin_logs_categories_')) {
      const admin = await import('../commands/admin.js');
      return await admin.handleLogCategoriesSelect(interaction);
    }
    if (customId.startsWith('admin_ephemeral_')) {
      const admin = await import('../commands/admin.js');
      return await admin.handleEphemeralSelect(interaction);
    }

    // ✅ NEW LOGGING SYSTEM SELECT MENUS
    if (customId.startsWith('admin_new_logging_menu_')) {
      const adminSettings = await import('../services/adminSettings.js');
      return await adminSettings.handleNewLoggingMenuSelect(interaction);
    }

    if (customId === 'toggle_log_event') {
      const eventType = interaction.values[0];
      const { BotLogger } = await import('../services/botLogger.js');
      await BotLogger.toggleLogSetting(interaction.guildId, eventType);
      
      const config = await BotLogger.getLogSettings(interaction.guildId);
      const status = config.settings[eventType] ? 'enabled' : 'disabled';
      
      return interaction.reply({ 
        embeds: [successEmbed(`**${eventType}** logging ${status}`)], 
        ephemeral: true 
      });
    }

    if (customId === 'toggle_log_grouping') {
      const selection = interaction.values[0];
      
      if (selection === 'change_window') {
        const modal = new ModalBuilder()
          .setCustomId('log_grouping_window')
          .setTitle('Change Grouping Window');

        const windowInput = new TextInputBuilder()
          .setCustomId('window_minutes')
          .setLabel('Grouping Window (minutes)')
          .setPlaceholder('10')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(windowInput));
        return interaction.showModal(modal);
      }

      const { BotLogger } = await import('../services/botLogger.js');
      await BotLogger.toggleGroupingSetting(interaction.guildId, selection);
      const config = await BotLogger.getLogSettings(interaction.guildId);
      const status = config.grouping[selection] ? 'grouped' : 'instant';
      
      return interaction.reply({ 
        embeds: [successEmbed(`**${selection}** is now ${status}`)], 
        ephemeral: true 
      });
    }

    if (customId.startsWith('select_region_')) return await reg.handleRegion(interaction, userId);
    if (customId.startsWith('select_country_')) return await reg.handleCountry(interaction, userId);
    if (customId.startsWith('select_timezone_')) return await reg.handleTimezone(interaction, userId);
    
    // Class selection - check context
    if (customId.startsWith('select_class_')) {
      const s = state.get(userId, 'edit');
      if (s?.field === 'class') {
        return await edit.handleEditClass(interaction, userId);
      }
      return await reg.handleClass(interaction, userId);
    }
    
    // Subclass selection - check context
    if (customId.startsWith('select_subclass_')) {
      const s = state.get(userId, 'edit');
      if (s?.field === 'class') {
        return await edit.handleEditSubclass(interaction, userId);
      }
      return await reg.handleSubclass(interaction, userId);
    }
    
    // Ability score - check context
    if (customId.startsWith('select_ability_score_')) {
      const s = state.get(userId, 'edit');
      if (s?.field === 'score') {
        return await edit.handleEditScore(interaction, userId);
      }
      return await reg.handleScore(interaction, userId);
    }
    
    if (customId.startsWith('select_battle_imagine_')) return await reg.handleBattleImagine(interaction, userId);
    
    // Guild selection - check context
    if (customId.startsWith('select_guild_')) {
      const s = state.get(userId, 'edit');
      if (s?.field === 'guild') {
        return await edit.handleEditGuild(interaction, userId);
      }
      return await reg.handleGuild(interaction, userId);
    }

    // Add/Edit/Remove type selections
    if (customId.startsWith('add_type_')) return await edit.handleAddType(interaction, userId);
    if (customId.startsWith('edit_type_')) return await edit.handleEditType(interaction, userId);
    if (customId.startsWith('remove_type_')) return await edit.handleRemoveType(interaction, userId);
    
    // Character selections for edit/remove
    if (customId.startsWith('edit_subclass_')) return await edit.handleEditSubclassSelect(interaction, userId);
    if (customId.startsWith('remove_subclass_')) return await edit.handleRemoveSubclassSelect(interaction, userId);
    
    // Field selections
    if (customId.startsWith('edit_field_')) return await edit.handleFieldSelect(interaction, userId);
    if (customId.startsWith('edit_bi_select_')) return await edit.handleEditBattleImagineSelect(interaction, userId);
    if (customId.startsWith('edit_bi_tier_')) return await edit.handleEditBattleImagineTier(interaction, userId);

    logger.warning('Router', `Unknown select customId: ${customId}`);
  } catch (e) {
    logger.error('Router', `Failed handling select ${customId}`, e);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Something went wrong.', ...ephemeralFlag });
    }
  } finally {
    // ✅ ALWAYS UNLOCK AFTER PROCESSING
    unlockInteraction(userId);
  }
}

export async function routeModal(interaction) {
  const customId = interaction.customId;
  const userId = extractUserId(customId);

  // ✅ CHECK FOR DUPLICATE INTERACTION
  if (isInteractionLocked(userId, interaction.id)) {
    console.log(`[ROUTER] Ignoring duplicate modal for ${userId}`);
    return;
  }

  // ✅ LOCK INTERACTION BEFORE PROCESSING
  lockInteraction(userId, interaction.id);

  logger.interaction('modal', customId, interaction.user.username);

  try {
    // ✅ NEW LOGGING SYSTEM MODALS
    if (customId === 'admin_general_logs') {
      const channelId = interaction.fields.getTextInputValue('channel_id');
      
      try {
        const channel = await interaction.guild.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
          return interaction.reply({ 
            embeds: [errorEmbed('Invalid channel ID or not a text channel.')], 
            ephemeral: true 
          });
        }

        const { BotLogger } = await import('../services/botLogger.js');
        await BotLogger.setGeneralLogChannel(interaction.guildId, channelId);
        
        await interaction.reply({ 
          embeds: [successEmbed(`General log channel set to <#${channelId}>`)], 
          ephemeral: true 
        });
      } catch (error) {
        await interaction.reply({ 
          embeds: [errorEmbed('Could not find that channel. Make sure the ID is correct.')], 
          ephemeral: true 
        });
      }
      return;
    }

    if (customId === 'admin_application_logs') {
      const channelId = interaction.fields.getTextInputValue('channel_id');
      
      try {
        const channel = await interaction.guild.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
          return interaction.reply({ 
            embeds: [errorEmbed('Invalid channel ID or not a text channel.')], 
            ephemeral: true 
          });
        }

        const { BotLogger } = await import('../services/botLogger.js');
        await BotLogger.setApplicationLogChannel(interaction.guildId, channelId);
        
        await interaction.reply({ 
          embeds: [successEmbed(`Application log channel set to <#${channelId}>`)], 
          ephemeral: true 
        });
      } catch (error) {
        await interaction.reply({ 
          embeds: [errorEmbed('Could not find that channel. Make sure the ID is correct.')], 
          ephemeral: true 
        });
      }
      return;
    }

    if (customId === 'log_grouping_window') {
      const minutes = parseInt(interaction.fields.getTextInputValue('window_minutes'));
      
      if (isNaN(minutes) || minutes < 1 || minutes > 60) {
        return interaction.reply({ 
          embeds: [errorEmbed('Window must be between 1 and 60 minutes.')], 
          ephemeral: true 
        });
      }

      const { BotLogger } = await import('../services/botLogger.js');
      await BotLogger.setGroupingWindow(interaction.guildId, minutes);
      
      await interaction.reply({ 
        embeds: [successEmbed(`Grouping window set to ${minutes} minutes`)], 
        ephemeral: true 
      });
      return;
    }

    // EXISTING MODAL HANDLERS
    if (customId.startsWith('ign_modal_')) {
      return await reg.handleIGN(interaction, userId);
    }

    if (customId.startsWith('edit_ign_')) {
      return await edit.handleEditModal(interaction, userId, 'ign');
    }

    if (customId.startsWith('edit_uid_')) {
      return await edit.handleEditModal(interaction, userId, 'uid');
    }

    logger.warning('Router', `Unknown modal customId: ${customId}`);
  } catch (e) {
    logger.error('Router', `Failed handling modal ${customId}`, e);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Something went wrong.', ...ephemeralFlag });
    }
  } finally {
    // ✅ ALWAYS UNLOCK AFTER PROCESSING
    unlockInteraction(userId);
  }
}
