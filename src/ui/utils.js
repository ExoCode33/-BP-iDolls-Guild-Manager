// ═══════════════════════════════════════════════════════════════════
// UI UTILITIES
// ═══════════════════════════════════════════════════════════════════

export function formatScore(score) {
  if (!score) return 'Unknown';
  return score;
}

export function formatTime(timezone) {
  if (!timezone) return 'Unknown';
  
  try {
    // timezone is a string like "America/New_York", so show current time in that timezone
    const now = new Date();
    return now.toLocaleString('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('[FORMAT TIME] Invalid timezone:', timezone, error);
    return 'Unknown';
  }
}

export function getRoleEmoji(role) {
  const roleEmojis = {
    'Tank': '🛡️',
    'DPS': '⚔️',
    'Support': '💚',
    'Healer': '💚'
  };
  return roleEmojis[role] || '🎮';
}

export function getClassEmoji(className) {
  const classEmojis = {
    'Beat Performer': '🎵',
    'Frost Mage': '❄️',
    'Heavy Guardian': '🛡️',
    'Marksman': '🏹',
    'Shield Knight': '⚔️',
    'Stormblade': '⚡',
    'Verdant Oracle': '🌿',
    'Wind Knight': '💨'
  };
  return classEmojis[className] || '🎮';
}

export function centerText(text, width = 42) {
  const padding = Math.max(0, width - text.length);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
}

export function getCountryEmoji(countryName) {
  const emojiMap = {
    'United States': '🇺🇸',
    'Canada': '🇨🇦',
    'Mexico': '🇲🇽',
    'Brazil': '🇧🇷',
    'Argentina': '🇦🇷',
    'Chile': '🇨🇱',
    'Colombia': '🇨🇴',
    'Peru': '🇵🇪',
    'United Kingdom': '🇬🇧',
    'France': '🇫🇷',
    'Germany': '🇩🇪',
    'Italy': '🇮🇹',
    'Spain': '🇪🇸',
    'Netherlands': '🇳🇱',
    'Belgium': '🇧🇪',
    'Austria': '🇦🇹',
    'Poland': '🇵🇱',
    'Sweden': '🇸🇪',
    'Greece': '🇬🇷',
    'Turkey': '🇹🇷',
    'Russia': '🇷🇺',
    'Japan': '🇯🇵',
    'South Korea': '🇰🇷',
    'China': '🇨🇳',
    'Hong Kong': '🇭🇰',
    'Taiwan': '🇹🇼',
    'Singapore': '🇸🇬',
    'Thailand': '🇹🇭',
    'Vietnam': '🇻🇳',
    'Philippines': '🇵🇭',
    'Indonesia': '🇮🇩',
    'India': '🇮🇳',
    'UAE': '🇦🇪',
    'Saudi Arabia': '🇸🇦',
    'Australia': '🇦🇺',
    'New Zealand': '🇳🇿',
    'Fiji': '🇫🇯',
    'South Africa': '🇿🇦',
    'Egypt': '🇪🇬',
    'Nigeria': '🇳🇬',
    'Kenya': '🇰🇪',
    'Morocco': '🇲🇦'
  };
  return emojiMap[countryName] || '🌍';
}

export function getTimezoneCities(tzLabel) {
  const cityExamples = {
    'EST (Eastern)': 'New York, Toronto, Miami',
    'CST (Central)': 'Chicago, Mexico City, Winnipeg',
    'MST (Mountain)': 'Denver, Phoenix, Edmonton',
    'PST (Pacific)': 'Los Angeles, Vancouver, Seattle',
    'AKST (Alaska)': 'Anchorage, Juneau',
    'HST (Hawaii)': 'Honolulu, Hilo',
    'AST (Atlantic)': 'Halifax, San Juan',
    'GMT (London)': 'London, Dublin, Lisbon',
    'CET (Paris)': 'Paris, Berlin, Rome',
    'CET (Berlin)': 'Berlin, Amsterdam, Brussels',
    'CET (Rome)': 'Rome, Vienna, Stockholm',
    'CET (Madrid)': 'Madrid, Barcelona',
    'CET (Amsterdam)': 'Amsterdam, Copenhagen',
    'CET (Brussels)': 'Brussels, Luxembourg',
    'CET (Vienna)': 'Vienna, Prague',
    'CET (Warsaw)': 'Warsaw, Budapest',
    'CET (Stockholm)': 'Stockholm, Oslo',
    'EET (Athens)': 'Athens, Helsinki, Cairo',
    'TRT (Istanbul)': 'Istanbul, Ankara',
    'MSK (Moscow)': 'Moscow, St. Petersburg',
    'YEKT (Yekaterinburg)': 'Yekaterinburg',
    'NOVT (Novosibirsk)': 'Novosibirsk',
    'VLAT (Vladivostok)': 'Vladivostok',
    'JST (Tokyo)': 'Tokyo, Osaka, Seoul',
    'KST (Seoul)': 'Seoul, Busan',
    'CST (Beijing)': 'Beijing, Shanghai, Hong Kong',
    'HKT (Hong Kong)': 'Hong Kong, Macau',
    'CST (Taipei)': 'Taipei, Kaohsiung',
    'SGT (Singapore)': 'Singapore, Kuala Lumpur',
    'ICT (Bangkok)': 'Bangkok, Hanoi, Jakarta',
    'ICT (Ho Chi Minh)': 'Ho Chi Minh, Phnom Penh',
    'PST (Manila)': 'Manila, Cebu',
    'WIB (Jakarta)': 'Jakarta, Bandung',
    'WITA (Bali)': 'Bali, Makassar',
    'IST (New Delhi)': 'New Delhi, Mumbai, Bangalore',
    'GST (Dubai)': 'Dubai, Abu Dhabi',
    'AST (Riyadh)': 'Riyadh, Jeddah',
    'AEDT (Sydney)': 'Sydney, Melbourne',
    'AEST (Brisbane)': 'Brisbane, Gold Coast',
    'ACDT (Adelaide)': 'Adelaide',
    'AWST (Perth)': 'Perth',
    'ACST (Darwin)': 'Darwin',
    'NZDT (Auckland)': 'Auckland, Wellington',
    'FJT (Suva)': 'Suva, Nadi',
    'SAST (Johannesburg)': 'Johannesburg, Cape Town',
    'EET (Cairo)': 'Cairo, Alexandria',
    'WAT (Lagos)': 'Lagos, Accra',
    'EAT (Nairobi)': 'Nairobi, Kampala',
    'WET (Casablanca)': 'Casablanca, Rabat',
    'BRT (Brasília)': 'São Paulo, Rio de Janeiro',
    'AMT (Amazon)': 'Manaus',
    'ART (Buenos Aires)': 'Buenos Aires, Córdoba',
    'CLT (Santiago)': 'Santiago, Valparaíso',
    'COT (Bogotá)': 'Bogotá, Medellín',
    'PET (Lima)': 'Lima, Cusco',
    'CST (Central)': 'Mexico City, Guadalajara',
    'MST (Mountain)': 'Chihuahua, Hermosillo',
    'PST (Pacific)': 'Tijuana, Mexicali'
  };
  return cityExamples[tzLabel] || tzLabel.split('(')[1]?.replace(')', '') || tzLabel;
}

export function getTimezoneAbbr(timezoneLabel) {
  const match = timezoneLabel.match(/^([A-Z]+)/);
  return match ? match[1] : timezoneLabel;
}

export default {
  formatScore,
  formatTime,
  getRoleEmoji,
  getClassEmoji,
  centerText,
  getCountryEmoji,
  getTimezoneCities,
  getTimezoneAbbr
};
