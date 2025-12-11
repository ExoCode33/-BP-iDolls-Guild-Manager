import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { 
  editButtonHandler, 
  deleteButtonHandler 
} from '../components/buttons/characterButtons.js';
import { 
  handleMainCharSelect, 
  handleAltCharSelect 
} from '../components/selects/characterSelects.js';
import * as modalHandler from '../components/modals/characterModals.js';
import * as adminToolsHandler from '../handlers/adminToolsHandler.js';
import logger from '../utils/logger.js';

// ============================================================================
// BUTTON INTERACTION HANDLER
// ============================================================================

export async function handleButtonInteraction(interaction) {
  const [action, type, ...rest] = interaction.customId.split('_');
  
  try {
    // Admin Tools Handlers
    if (interaction.customId.startsWith('admin_toggle_error_ping_')) {
      const userId = rest[rest.length - 1];
      if (interaction.user.id !== userId) {
        return await interaction.reply({ content: '❌ This is not your menu.', ephemeral: true });
      }
      return await adminToolsHandler.handleToggleErrorPing(interaction, userId);
    }
    
    if (interaction.customId.startsWith('admin_set_error_role_')) {
      const userId = rest[rest.length - 1];
      if (interaction.user.id !== userId) {
        return await interaction.reply({ content: '❌ This is not your menu.', ephemeral: true });
      }
      return await adminToolsHandler.handleSetErrorRoleModal(interaction, userId);
    }
    
    if (interaction.customId.startsWith('admin_toggle_warn_ping_')) {
      const userId = rest[rest.length - 1];
      if (interaction.user.id !== userId) {
        return await interaction.reply({ content: '❌ This is not your menu.', ephemeral: true });
      }
      return await adminToolsHandler.handleToggleWarnPing(interaction, userId);
    }
    
    if (interaction.customId.startsWith('admin_set_warn_role_')) {
      const userId = rest[rest.length - 1];
      if (interaction.user.id !== userId) {
        return await interaction.reply({ content: '❌ This is not your menu.', ephemeral: true });
      }
      return await adminToolsHandler.handleSetWarnRoleModal(interaction, userId);
    }
    
    // Character Action Handlers
    if (action === 'edit') {
      return await editButtonHandler(interaction, type, rest);
    }
    
    if (action === 'delete') {
      return await deleteButtonHandler(interaction, type, rest);
    }
    
  } catch (error) {
    logger.error(`Button interaction error: ${error.message}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
    }
  }
}

// ============================================================================
// SELECT MENU INTERACTION HANDLER
// ============================================================================

export async function handleSelectMenuInteraction(interaction) {
  try {
    // Admin Tools Logger Config
    if (interaction.customId.startsWith('admin_logger_config_')) {
      const userId = interaction.customId.split('_').pop();
      if (interaction.user.id !== userId) {
        return await interaction.reply({ content: '❌ This is not your menu.', ephemeral: true });
      }
      return await adminToolsHandler.handleLoggerConfigSelect(interaction, userId);
    }
    
    if (interaction.customId.startsWith('admin_set_log_level_')) {
      const userId = interaction.customId.split('_').pop();
      if (interaction.user.id !== userId) {
        return await interaction.reply({ content: '❌ This is not your menu.', ephemeral: true });
      }
      return await adminToolsHandler.handleSetLogLevel(interaction, userId);
    }
    
    // Character Selection Handlers
    if (interaction.customId.startsWith('select_main_')) {
      return await handleMainCharSelect(interaction);
    }
    
    if (interaction.customId.startsWith('select_alt_')) {
      return await handleAltCharSelect(interaction);
    }
    
  } catch (error) {
    logger.error(`Select menu interaction error: ${error.message}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
    }
  }
}

// ============================================================================
// MODAL SUBMIT HANDLER
// ============================================================================

export async function handleModalSubmit(interaction) {
  try {
    // Admin Tools Logger Config Modals
    if (interaction.customId.startsWith('admin_set_log_channel_')) {
      const userId = interaction.customId.split('_').pop();
      if (interaction.user.id !== userId) {
        return await interaction.reply({ content: '❌ This is not your modal.', ephemeral: true });
      }
      return await adminToolsHandler.handleSetLogChannelModal(interaction, userId);
    }
    
    if (interaction.customId.startsWith('admin_set_error_role_modal_')) {
      const userId = interaction.customId.split('_').pop();
      if (interaction.user.id !== userId) {
        return await interaction.reply({ content: '❌ This is not your modal.', ephemeral: true });
      }
      return await adminToolsHandler.handleSetErrorRoleSubmit(interaction, userId);
    }
    
    if (interaction.customId.startsWith('admin_set_warn_role_modal_')) {
      const userId = interaction.customId.split('_').pop();
      if (interaction.user.id !== userId) {
        return await interaction.reply({ content: '❌ This is not your modal.', ephemeral: true });
      }
      return await adminToolsHandler.handleSetWarnRoleSubmit(interaction, userId);
    }
    
    // Character Action Modals
    if (interaction.customId.startsWith('edit_main_')) {
      return await modalHandler.handleMainCharEditSubmit(interaction);
    }
    
    if (interaction.customId.startsWith('edit_alt_')) {
      return await modalHandler.handleAltEditSubmit(interaction);
    }
    
    if (interaction.customId.startsWith('edit_subclass_')) {
      return await modalHandler.handleSubclassEditSubmit(interaction);
    }
    
    if (interaction.customId.startsWith('delete_confirm_')) {
      return await modalHandler.handleDeleteConfirm(interaction);
    }
    
  } catch (error) {
    logger.error(`Modal submit error: ${error.message}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
    }
  }
}
