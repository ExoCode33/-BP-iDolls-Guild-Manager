// Commands index - manages all slash commands

import * as admin from './admin.js';
import * as editCharacter from './editCharacter.js';
import * as viewCharacter from './viewCharacter.js';

// Collection of all commands
const commands = {
  admin,
  editCharacter,
  viewCharacter
};

/**
 * Load all commands into a Map for easy access
 * @returns {Map<string, object>} Map of command name to command module
 */
export function loadCommands() {
  const commandMap = new Map();
  
  for (const [name, command] of Object.entries(commands)) {
    if (command.data && command.execute) {
      commandMap.set(command.data.name, command);
      console.log(`✅ Loaded command: /${command.data.name}`);
    } else {
      console.warn(`⚠️ Command ${name} missing data or execute function`);
    }
  }
  
  return commandMap;
}

/**
 * Get command data for registration with Discord
 * @returns {Array} Array of command data objects for Discord API
 */
export function getCommandData() {
  return Object.values(commands)
    .filter(cmd => cmd.data)
    .map(cmd => cmd.data.toJSON());
}

// Default export for direct access
export default commands;
