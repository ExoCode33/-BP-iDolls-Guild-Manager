import { TIMEZONE_ABBR, CLASSES, ABILITY_SCORES } from '../config/game.js';

export const formatScore = (score) => {
  const found = ABILITY_SCORES.find(s => s.value === String(score));
  return found?.label || score;
};

export const formatTime = (timezone) => {
  if (!timezone) return '';
  const abbr = TIMEZONE_ABBR[timezone] || timezone;
  const time = new Date().toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return `${abbr} • ${time}`;
};

export const getRoleEmoji = (role) => {
  if (role === 'Tank') return '🛡️';
  if (role === 'DPS') return '⚔️';
  return '💚';
};

export const getClassEmoji = (guild, className) => {
  if (!guild) return '';
  const name = className.replace(/\s+/g, '');
  const emoji = guild.emojis.cache.find(e => e.name === name);
  return emoji ? emoji.toString() : '';
};

export const validateUID = (uid) => /^\d+$/.test(uid);

export const truncate = (str, len) => str.length > len ? str.slice(0, len - 3) + '...' : str;
