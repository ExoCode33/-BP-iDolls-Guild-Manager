export const CLASSES = {
  'Beat Performer': { subclasses: ['Dissonance', 'Concerto'], role: 'Support', emoji: '🎵', iconId: '1448837920931840021' },
  'Frost Mage': { subclasses: ['Icicle', 'Frostbeam'], role: 'DPS', emoji: '❄️', iconId: '1448837917144387604' },
  'Heavy Guardian': { subclasses: ['Earthfort', 'Block'], role: 'Tank', emoji: '🛡️', iconId: '1448837916171309147' },
  'Marksman': { subclasses: ['Wildpack', 'Falconry'], role: 'DPS', emoji: '🏹', iconId: '1448837914338267350' },
  'Shield Knight': { subclasses: ['Recovery', 'Shield'], role: 'Tank', emoji: '⚔️', iconId: '1448837913218388000' },
  'Stormblade': { subclasses: ['Iaido Slash', 'Moonstrike'], role: 'DPS', emoji: '⚡', iconId: '1448837911838593188' },
  'Verdant Oracle': { subclasses: ['Smite', 'Lifebind'], role: 'Support', emoji: '🌿', iconId: '1448837910294958140' },
  'Wind Knight': { subclasses: ['Vanguard', 'Skyward'], role: 'DPS', emoji: '💨', iconId: '1448837908302925874' }
};

export const ABILITY_SCORES = [
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
];

export const REGIONS = {
  'North America': {
    '🇺🇸 United States': {
      'EST (Eastern)': 'America/New_York',
      'CST (Central)': 'America/Chicago',
      'MST (Mountain)': 'America/Denver',
      'PST (Pacific)': 'America/Los_Angeles',
      'AKST (Alaska)': 'America/Anchorage',
      'HST (Hawaii)': 'Pacific/Honolulu'
    },
    '🇨🇦 Canada': {
      'EST (Eastern)': 'America/Toronto',
      'CST (Central)': 'America/Winnipeg',
      'MST (Mountain)': 'America/Edmonton',
      'PST (Pacific)': 'America/Vancouver',
      'AST (Atlantic)': 'America/Halifax'
    },
    '🇲🇽 Mexico': {
      'CST (Central)': 'America/Mexico_City',
      'MST (Mountain)': 'America/Chihuahua',
      'PST (Pacific)': 'America/Tijuana'
    }
  },
  'South America': {
    '🇧🇷 Brazil': { 'BRT (Brasília)': 'America/Sao_Paulo', 'AMT (Amazon)': 'America/Manaus' },
    '🇦🇷 Argentina': { 'ART (Buenos Aires)': 'America/Buenos_Aires' },
    '🇨🇱 Chile': { 'CLT (Santiago)': 'America/Santiago' },
    '🇨🇴 Colombia': { 'COT (Bogotá)': 'America/Bogota' },
    '🇵🇪 Peru': { 'PET (Lima)': 'America/Lima' }
  },
  'Europe': {
    '🇬🇧 United Kingdom': { 'GMT (London)': 'Europe/London' },
    '🇫🇷 France': { 'CET (Paris)': 'Europe/Paris' },
    '🇩🇪 Germany': { 'CET (Berlin)': 'Europe/Berlin' },
    '🇮🇹 Italy': { 'CET (Rome)': 'Europe/Rome' },
    '🇪🇸 Spain': { 'CET (Madrid)': 'Europe/Madrid' },
    '🇳🇱 Netherlands': { 'CET (Amsterdam)': 'Europe/Amsterdam' },
    '🇧🇪 Belgium': { 'CET (Brussels)': 'Europe/Brussels' },
    '🇦🇹 Austria': { 'CET (Vienna)': 'Europe/Vienna' },
    '🇵🇱 Poland': { 'CET (Warsaw)': 'Europe/Warsaw' },
    '🇸🇪 Sweden': { 'CET (Stockholm)': 'Europe/Stockholm' },
    '🇬🇷 Greece': { 'EET (Athens)': 'Europe/Athens' },
    '🇹🇷 Turkey': { 'TRT (Istanbul)': 'Europe/Istanbul' },
    '🇷🇺 Russia': {
      'MSK (Moscow)': 'Europe/Moscow',
      'YEKT (Yekaterinburg)': 'Asia/Yekaterinburg',
      'NOVT (Novosibirsk)': 'Asia/Novosibirsk',
      'VLAT (Vladivostok)': 'Asia/Vladivostok'
    }
  },
  'Asia': {
    '🇯🇵 Japan': { 'JST (Tokyo)': 'Asia/Tokyo' },
    '🇰🇷 South Korea': { 'KST (Seoul)': 'Asia/Seoul' },
    '🇨🇳 China': { 'CST (Beijing)': 'Asia/Shanghai' },
    '🇭🇰 Hong Kong': { 'HKT (Hong Kong)': 'Asia/Hong_Kong' },
    '🇹🇼 Taiwan': { 'CST (Taipei)': 'Asia/Taipei' },
    '🇸🇬 Singapore': { 'SGT (Singapore)': 'Asia/Singapore' },
    '🇹🇭 Thailand': { 'ICT (Bangkok)': 'Asia/Bangkok' },
    '🇻🇳 Vietnam': { 'ICT (Ho Chi Minh)': 'Asia/Ho_Chi_Minh' },
    '🇵🇭 Philippines': { 'PST (Manila)': 'Asia/Manila' },
    '🇮🇩 Indonesia': { 'WIB (Jakarta)': 'Asia/Jakarta', 'WITA (Bali)': 'Asia/Makassar' },
    '🇮🇳 India': { 'IST (New Delhi)': 'Asia/Kolkata' },
    '🇦🇪 UAE': { 'GST (Dubai)': 'Asia/Dubai' },
    '🇸🇦 Saudi Arabia': { 'AST (Riyadh)': 'Asia/Riyadh' }
  },
  'Oceania': {
    '🇦🇺 Australia': {
      'AEDT (Sydney)': 'Australia/Sydney',
      'AEST (Brisbane)': 'Australia/Brisbane',
      'ACDT (Adelaide)': 'Australia/Adelaide',
      'AWST (Perth)': 'Australia/Perth',
      'ACST (Darwin)': 'Australia/Darwin'
    },
    '🇳🇿 New Zealand': { 'NZDT (Auckland)': 'Pacific/Auckland' },
    '🇫🇯 Fiji': { 'FJT (Suva)': 'Pacific/Fiji' }
  },
  'Africa': {
    '🇿🇦 South Africa': { 'SAST (Johannesburg)': 'Africa/Johannesburg' },
    '🇪🇬 Egypt': { 'EET (Cairo)': 'Africa/Cairo' },
    '🇳🇬 Nigeria': { 'WAT (Lagos)': 'Africa/Lagos' },
    '🇰🇪 Kenya': { 'EAT (Nairobi)': 'Africa/Nairobi' },
    '🇲🇦 Morocco': { 'WET (Casablanca)': 'Africa/Casablanca' }
  }
};

export const TIMEZONE_ABBR = {
  'America/New_York': 'EST', 'America/Chicago': 'CST', 'America/Denver': 'MST',
  'America/Los_Angeles': 'PST', 'America/Anchorage': 'AKST', 'Pacific/Honolulu': 'HST',
  'America/Toronto': 'EST', 'America/Winnipeg': 'CST', 'America/Edmonton': 'MST',
  'America/Vancouver': 'PST', 'America/Halifax': 'AST', 'America/Mexico_City': 'CST',
  'America/Chihuahua': 'MST', 'America/Tijuana': 'PST', 'America/Sao_Paulo': 'BRT',
  'America/Manaus': 'AMT', 'America/Buenos_Aires': 'ART', 'America/Santiago': 'CLT',
  'America/Bogota': 'COT', 'America/Lima': 'PET', 'Europe/London': 'GMT',
  'Europe/Paris': 'CET', 'Europe/Berlin': 'CET', 'Europe/Rome': 'CET',
  'Europe/Madrid': 'CET', 'Europe/Amsterdam': 'CET', 'Europe/Brussels': 'CET',
  'Europe/Vienna': 'CET', 'Europe/Warsaw': 'CET', 'Europe/Stockholm': 'CET',
  'Europe/Athens': 'EET', 'Europe/Istanbul': 'TRT', 'Europe/Moscow': 'MSK',
  'Asia/Yekaterinburg': 'YEKT', 'Asia/Novosibirsk': 'NOVT', 'Asia/Vladivostok': 'VLAT',
  'Asia/Tokyo': 'JST', 'Asia/Seoul': 'KST', 'Asia/Shanghai': 'CST',
  'Asia/Hong_Kong': 'HKT', 'Asia/Taipei': 'CST', 'Asia/Singapore': 'SGT',
  'Asia/Bangkok': 'ICT', 'Asia/Ho_Chi_Minh': 'ICT', 'Asia/Manila': 'PST',
  'Asia/Jakarta': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Kolkata': 'IST',
  'Asia/Dubai': 'GST', 'Asia/Riyadh': 'AST', 'Australia/Sydney': 'AEDT',
  'Australia/Brisbane': 'AEST', 'Australia/Adelaide': 'ACDT', 'Australia/Perth': 'AWST',
  'Australia/Darwin': 'ACST', 'Pacific/Auckland': 'NZDT', 'Pacific/Fiji': 'FJT',
  'Africa/Johannesburg': 'SAST', 'Africa/Cairo': 'EET', 'Africa/Lagos': 'WAT',
  'Africa/Nairobi': 'EAT', 'Africa/Casablanca': 'WET'
};

export const TIERS = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5'];

export const COLORS = {
  PRIMARY: '#EC4899',
  SUCCESS: '#00FF00',
  ERROR: '#FF0000',
  WARNING: '#FFAA00'
};
