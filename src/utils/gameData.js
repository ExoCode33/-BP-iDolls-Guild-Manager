export const gameData = {
  classes: {
    'Beat Performer': { subclasses: ['Song Weaver', 'Rhythm Master'], role: 'Support', emoji: '🎵' },
    'Frost Mage': { subclasses: ['Ice Caller', 'Winter\'s Embrace'], role: 'DPS', emoji: '❄️' },
    'Heavy Guardian': { subclasses: ['Iron Wall', 'Fortress Defender'], role: 'Tank', emoji: '🛡️' },
    'Marksman': { subclasses: ['Sniper', 'Hawk Eye'], role: 'DPS', emoji: '🏹' },
    'Shield Knight': { subclasses: ['Holy Defender', 'Aegis Bearer'], role: 'Tank', emoji: '⚔️' },
    'Stormblade': { subclasses: ['Thunder Strike', 'Lightning Edge'], role: 'DPS', emoji: '⚡' },
    'Verdant Oracle': { subclasses: ['Nature\'s Blessing', 'Life Bringer'], role: 'Support', emoji: '🌿' },
    'Wind Knight': { subclasses: ['Gale Rider', 'Tempest Warrior'], role: 'DPS', emoji: '💨' }
  },
  abilityScores: [
    { label: '≤10,000', value: '10000' },
    { label: '11,000', value: '11000' },
    { label: '12,000', value: '12000' },
    { label: '13,000', value: '13000' },
    { label: '14,000', value: '14000' },
    { label: '15,000', value: '15000' },
    { label: '16,000', value: '16000' },
    { label: '17,000', value: '17000' },
    { label: '18,000', value: '18000' },
    { label: '19,000', value: '19000' },
    { label: '20,000', value: '20000' },
    { label: '21,000', value: '21000' },
    { label: '22,000', value: '22000' },
    { label: '23,000', value: '23000' },
    { label: '24,000', value: '24000' },
    { label: '25,000', value: '25000' },
    { label: '26,000', value: '26000' },
    { label: '28,000', value: '28000' },
    { label: '30,000', value: '30000' },
    { label: '32,000', value: '32000' },
    { label: '36,000', value: '36000' },
    { label: '40,000', value: '40000' },
    { label: '44,000', value: '44000' },
    { label: '52,000', value: '52000' },
    { label: '56,000+', value: '56000' }
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
  if (num >= 56000) return '56k+';
  if (num <= 10000) return '≤10k';
  return `${(num / 1000).toFixed(0)}k`;
}

export default gameData;
