export const LOG_CATEGORIES = {
  // System Events
  STARTUP: { id: 'startup', label: 'Bot Startup', emoji: '🚀', group: 'System' },
  SHUTDOWN: { id: 'shutdown', label: 'Bot Shutdown', emoji: '🛑', group: 'System' },
  MEMORY: { id: 'memory', label: 'Memory Alerts', emoji: '💾', group: 'System' },

  // Commands
  CMD_CHARACTER: { id: 'cmd_character', label: '/character Command', emoji: '⚡', group: 'Commands' },
  CMD_ADMIN: { id: 'cmd_admin', label: '/admin Command', emoji: '🔧', group: 'Commands' },

  // Registration Flow
  REG_START: { id: 'reg_start', label: 'Registration Started', emoji: '📝', group: 'Registration' },
  REG_COMPLETE: { id: 'reg_complete', label: 'Registration Complete', emoji: '✅', group: 'Registration' },

  // Character Edits
  EDIT_CHARACTER: { id: 'edit_character', label: 'Character Edited', emoji: '✏️', group: 'Editing' },
  DELETE_CHARACTER: { id: 'delete_character', label: 'Character Deleted', emoji: '🗑️', group: 'Editing' },

  // Sync Operations
  SYNC_SHEETS: { id: 'sync_sheets', label: 'Google Sheets Sync', emoji: '📊', group: 'Sync' },
  SYNC_NICKNAME: { id: 'sync_nickname', label: 'Nickname Sync', emoji: '🏷️', group: 'Sync' },

  // Database
  DB_QUERY: { id: 'db_query', label: 'Database Queries', emoji: '💿', group: 'Database' },
  DB_ERROR: { id: 'db_error', label: 'Database Errors', emoji: '🔴', group: 'Database' },

  // Errors & Warnings
  ERROR: { id: 'error', label: 'All Errors', emoji: '❌', group: 'Alerts' },
  WARNING: { id: 'warning', label: 'All Warnings', emoji: '⚠️', group: 'Alerts' },

  // High Volume (off by default)
  VIEW_PROFILE: { id: 'view_profile', label: 'Profile Views', emoji: '👁️', group: 'Activity' },
  INTERACTION: { id: 'interaction', label: 'All Interactions', emoji: '🖱️', group: 'Activity' }
};

export const DEFAULT_ENABLED = [
  'startup', 'shutdown', 'error', 'warning',
  'reg_complete', 'delete_character',
  'sync_sheets', 'sync_nickname', 'db_error'
];

export const CATEGORY_GROUPS = ['System', 'Commands', 'Registration', 'Editing', 'Sync', 'Database', 'Alerts', 'Activity'];
