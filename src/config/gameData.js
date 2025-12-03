// Game data configuration
export const GAME_DATA = {
  classes: {
    'Beat Performer': {
      subclasses: ['Dissonance', 'Concerto'],
      role: 'Support'
    },
    'Frost Mage': {
      subclasses: ['Icicle', 'Frostbeam'],
      role: 'DPS'
    },
    'Heavy Guardian': {
      subclasses: ['Earthfort', 'Block'],
      role: 'Tank'
    },
    'Marksman': {
      subclasses: ['Wildpack', 'Falconry'],
      role: 'DPS'
    },
    'Shield Knight': {
      subclasses: ['Recovery', 'Shield'],
      role: 'Tank'
    },
    'Stormblade': {
      subclasses: ['Iaido', 'Moonstrike'],
      role: 'DPS'
    },
    'Verdant Oracle': {
      subclasses: ['Smite', 'Lifebind'],
      role: 'Support'
    },
    'Wind Knight': {
      subclasses: ['Vanguard', 'Skyward'],
      role: 'DPS'
    }
  },
  
  guilds: ['Guild 1', 'Guild 2', 'Guild 3'],
  
  timezones: [
    'UTC-12', 'UTC-11', 'UTC-10', 'UTC-9', 'UTC-8', 'UTC-7', 'UTC-6',
    'UTC-5', 'UTC-4', 'UTC-3', 'UTC-2', 'UTC-1', 'UTC+0', 'UTC+1',
    'UTC+2', 'UTC+3', 'UTC+4', 'UTC+5', 'UTC+6', 'UTC+7', 'UTC+8',
    'UTC+9', 'UTC+10', 'UTC+11', 'UTC+12'
  ]
};

// Helper function to get role from class
export function getRoleFromClass(className) {
  return GAME_DATA.classes[className]?.role || 'Unknown';
}

// Helper function to get subclasses for a class
export function getSubclassesForClass(className) {
  return GAME_DATA.classes[className]?.subclasses || [];
}

// Helper function to validate class and subclass combination
export function isValidClassSubclass(className, subclass) {
  const classData = GAME_DATA.classes[className];
  if (!classData) return false;
  return classData.subclasses.includes(subclass);
}
