import { COLORS, ABILITY_SCORES } from '../config/game.js';

export function formatScore(score) {
  return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ✅ NEW: Get the score range label from the stored value
export function getScoreRange(abilityScore) {
  const scoreObj = ABILITY_SCORES.find(s => s.value === abilityScore);
  return scoreObj ? scoreObj.label : abilityScore;
}

export function formatTime(timezone) {
  try {
    const now = new Date();
    const timeString = now.toLocaleString('en-US', { 
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return timeString;
  } catch (error) {
    console.error('[UTILS] Invalid timezone:', timezone);
    return timezone;
  }
}

export function getRoleEmoji(role) {
  const roleEmojis = {
    'Tank': '🛡️',
    'DPS': '⚔️',
    'Healer': '💚'
  };
  return roleEmojis[role] || '❓';
}

export function getClassEmoji(guild, className) {
  if (!guild) return '';
  
  try {
    const classData = guild.emojis.cache.find(e => e.name === className.replace(/\s+/g, ''));
    return classData ? `<:${classData.name}:${classData.id}>` : '';
  } catch (error) {
    return '';
  }
}
