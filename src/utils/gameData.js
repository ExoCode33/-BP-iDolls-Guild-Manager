export const gameData = {
  classes: {
    'Beat Performer': { subclasses: ['Dissonance', 'Concerto'], role: 'Support', emoji: '🎵' },
    'Frost Mage': { subclasses: ['Icicle', 'Frostbeam'], role: 'DPS', emoji: '❄️' },
    'Heavy Guardian': { subclasses: ['Earthfort', 'Block'], role: 'Tank', emoji: '🛡️' },
    'Marksman': { subclasses: ['Wildpack', 'Falconry'], role: 'DPS', emoji: '🏹' },
    'Shield Knight': { subclasses: ['Recovery', 'Shield'], role: 'Tank', emoji: '⚔️' },
    'Stormblade': { subclasses: ['Iaido Slash', 'Moonstrike'], role: 'DPS', emoji: '⚡' },
    'Verdant Oracle': { subclasses: ['Smite', 'Lifebind'], role: 'Support', emoji: '🌿' },
    'Wind Knight': { subclasses: ['Vanguard', 'Skyward'], role: 'DPS', emoji: '💨' }
  },
  abilityScores: [
    { label: '≤10k', value: '10000' },
    { label: '10-12k', value: '11000' },
    { label: '12-14k', value: '13000' },
    { label: '14-16k', value: '15000' },
    { label: '16-18k', value: '17000' },
    { label: '18-20k', value: '19000' },
    { label: '20-22k', value: '21000' },
    { label: '22-24k', value: '23000' },
    { label: '24-26k', value: '25000' },
    { label: '26-28k', value: '27000' },
    { label: '28-30k', value: '29000' },
    { label: '30-32k', value: '31000' },
    { label: '32-34k', value: '33000' },
    { label: '34-36k', value: '35000' },
    { label: '36-38k', value: '37000' },
    { label: '38-40k', value: '39000' },
    { label: '40-42k', value: '41000' },
    { label: '42-44k', value: '43000' },
    { label: '44-46k', value: '45000' },
    { label: '46-48k', value: '47000' },
    { label: '48-50k', value: '49000' },
    { label: '50-52k', value: '51000' },
    { label: '52-54k', value: '53000' },
    { label: '54-56k', value: '55000' },
    { label: '56k+', value: '57000' }
  ],
  timezones: {
    'PST': { offset: -8, name: 'Pacific Standard Time' },
    'MST': { offset: -7, name: 'Mountain Standard Time' },
    'CST': { offset: -6, name: 'Central Standard Time' },
    'EST': { offset: -5, name: 'Eastern Standard Time' },
    'GMT': { offset: 0, name: 'Greenwich Mean Time' },
    'CET': { offset: 1, name: 'Central European Time' },
    'JST': { offset: 9, name: 'Japan Standard Time' }
  }
};

export function getClassEmoji(className) {
  return gameData.classes[className]?.emoji || '❓';
}

export function getSubclassesForClass(className) {
  return gameData.classes[className]?.subclasses || [];
}

export function getRoleFromClass(className) {
  return gameData.classes[className]?.role || 'Unknown';
}

export function formatAbilityScore(score) {
  const num = parseInt(score);
  const scoreRanges = {
    10000: '≤10k',
    11000: '10-12k',
    13000: '12-14k',
    15000: '14-16k',
    17000: '16-18k',
    19000: '18-20k',
    21000: '20-22k',
    23000: '22-24k',
    25000: '24-26k',
    27000: '26-28k',
    29000: '28-30k',
    31000: '30-32k',
    33000: '32-34k',
    35000: '34-36k',
    37000: '36-38k',
    39000: '38-40k',
    41000: '40-42k',
    43000: '42-44k',
    45000: '44-46k',
    47000: '46-48k',
    49000: '48-50k',
    51000: '50-52k',
    53000: '52-54k',
    55000: '54-56k',
    57000: '56k+'
  };
  return scoreRanges[num] || num.toLocaleString();
}

export default gameData;
