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
  
  // Role-based guilds
  guilds: {
    Tank: ['Tank Guild 1', 'Tank Guild 2', 'Tank Guild 3'],
    DPS: ['DPS Guild 1', 'DPS Guild 2', 'DPS Guild 3'],
    Support: ['Support Guild 1', 'Support Guild 2', 'Support Guild 3']
  },
  
  // Comprehensive timezone data organized by country/region
  timezonesByCountry: {
    'United States': {
      timezones: [
        { value: 'America/New_York', label: 'Eastern Time (New York, Miami, Atlanta)', utc: 'UTC-5/-4' },
        { value: 'America/Chicago', label: 'Central Time (Chicago, Houston, Dallas)', utc: 'UTC-6/-5' },
        { value: 'America/Denver', label: 'Mountain Time (Denver, Salt Lake City)', utc: 'UTC-7/-6' },
        { value: 'America/Phoenix', label: 'Arizona (Phoenix - No DST)', utc: 'UTC-7' },
        { value: 'America/Los_Angeles', label: 'Pacific Time (LA, San Francisco, Seattle)', utc: 'UTC-8/-7' },
        { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)', utc: 'UTC-9/-8' },
        { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)', utc: 'UTC-10' }
      ]
    },
    'Canada': {
      timezones: [
        { value: 'America/St_Johns', label: 'Newfoundland (St. John\'s)', utc: 'UTC-3:30/-2:30' },
        { value: 'America/Halifax', label: 'Atlantic Time (Halifax, Moncton)', utc: 'UTC-4/-3' },
        { value: 'America/Toronto', label: 'Eastern Time (Toronto, Ottawa, Montreal)', utc: 'UTC-5/-4' },
        { value: 'America/Winnipeg', label: 'Central Time (Winnipeg)', utc: 'UTC-6/-5' },
        { value: 'America/Edmonton', label: 'Mountain Time (Edmonton, Calgary)', utc: 'UTC-7/-6' },
        { value: 'America/Vancouver', label: 'Pacific Time (Vancouver, Victoria)', utc: 'UTC-8/-7' }
      ]
    },
    'Mexico': {
      timezones: [
        { value: 'America/Mexico_City', label: 'Central Mexico (Mexico City, Guadalajara)', utc: 'UTC-6' },
        { value: 'America/Cancun', label: 'Eastern Mexico (Cancún, Playa del Carmen)', utc: 'UTC-5' },
        { value: 'America/Tijuana', label: 'Northwest Mexico (Tijuana, Mexicali)', utc: 'UTC-8/-7' },
        { value: 'America/Chihuahua', label: 'North Mexico (Chihuahua, Hermosillo)', utc: 'UTC-7/-6' }
      ]
    },
    'United Kingdom': {
      timezones: [
        { value: 'Europe/London', label: 'London, Edinburgh, Manchester, Birmingham', utc: 'UTC+0/+1' }
      ]
    },
    'Ireland': {
      timezones: [
        { value: 'Europe/Dublin', label: 'Dublin, Cork, Galway', utc: 'UTC+0/+1' }
      ]
    },
    'France': {
      timezones: [
        { value: 'Europe/Paris', label: 'Paris, Marseille, Lyon, Toulouse', utc: 'UTC+1/+2' }
      ]
    },
    'Germany': {
      timezones: [
        { value: 'Europe/Berlin', label: 'Berlin, Munich, Hamburg, Frankfurt', utc: 'UTC+1/+2' }
      ]
    },
    'Italy': {
      timezones: [
        { value: 'Europe/Rome', label: 'Rome, Milan, Naples, Turin', utc: 'UTC+1/+2' }
      ]
    },
    'Spain': {
      timezones: [
        { value: 'Europe/Madrid', label: 'Madrid, Barcelona, Valencia, Seville', utc: 'UTC+1/+2' },
        { value: 'Atlantic/Canary', label: 'Canary Islands', utc: 'UTC+0/+1' }
      ]
    },
    'Netherlands': {
      timezones: [
        { value: 'Europe/Amsterdam', label: 'Amsterdam, Rotterdam, The Hague', utc: 'UTC+1/+2' }
      ]
    },
    'Belgium': {
      timezones: [
        { value: 'Europe/Brussels', label: 'Brussels, Antwerp, Ghent', utc: 'UTC+1/+2' }
      ]
    },
    'Switzerland': {
      timezones: [
        { value: 'Europe/Zurich', label: 'Zurich, Geneva, Basel, Bern', utc: 'UTC+1/+2' }
      ]
    },
    'Austria': {
      timezones: [
        { value: 'Europe/Vienna', label: 'Vienna, Salzburg, Innsbruck', utc: 'UTC+1/+2' }
      ]
    },
    'Poland': {
      timezones: [
        { value: 'Europe/Warsaw', label: 'Warsaw, Krakow, Gdansk', utc: 'UTC+1/+2' }
      ]
    },
    'Sweden': {
      timezones: [
        { value: 'Europe/Stockholm', label: 'Stockholm, Gothenburg, Malmö', utc: 'UTC+1/+2' }
      ]
    },
    'Norway': {
      timezones: [
        { value: 'Europe/Oslo', label: 'Oslo, Bergen, Trondheim', utc: 'UTC+1/+2' }
      ]
    },
    'Denmark': {
      timezones: [
        { value: 'Europe/Copenhagen', label: 'Copenhagen, Aarhus, Odense', utc: 'UTC+1/+2' }
      ]
    },
    'Finland': {
      timezones: [
        { value: 'Europe/Helsinki', label: 'Helsinki, Espoo, Tampere', utc: 'UTC+2/+3' }
      ]
    },
    'Greece': {
      timezones: [
        { value: 'Europe/Athens', label: 'Athens, Thessaloniki, Patras', utc: 'UTC+2/+3' }
      ]
    },
    'Portugal': {
      timezones: [
        { value: 'Europe/Lisbon', label: 'Lisbon, Porto, Braga', utc: 'UTC+0/+1' },
        { value: 'Atlantic/Azores', label: 'Azores', utc: 'UTC-1/+0' }
      ]
    },
    'Russia': {
      timezones: [
        { value: 'Europe/Moscow', label: 'Moscow, St. Petersburg (MSK)', utc: 'UTC+3' },
        { value: 'Europe/Samara', label: 'Samara (SAMT)', utc: 'UTC+4' },
        { value: 'Asia/Yekaterinburg', label: 'Yekaterinburg (YEKT)', utc: 'UTC+5' },
        { value: 'Asia/Omsk', label: 'Omsk (OMST)', utc: 'UTC+6' },
        { value: 'Asia/Krasnoyarsk', label: 'Krasnoyarsk, Novosibirsk (KRAT)', utc: 'UTC+7' },
        { value: 'Asia/Irkutsk', label: 'Irkutsk (IRKT)', utc: 'UTC+8' },
        { value: 'Asia/Yakutsk', label: 'Yakutsk (YAKT)', utc: 'UTC+9' },
        { value: 'Asia/Vladivostok', label: 'Vladivostok (VLAT)', utc: 'UTC+10' },
        { value: 'Asia/Kamchatka', label: 'Kamchatka (PETT)', utc: 'UTC+12' }
      ]
    },
    'Turkey': {
      timezones: [
        { value: 'Europe/Istanbul', label: 'Istanbul, Ankara, Izmir', utc: 'UTC+3' }
      ]
    },
    'Australia': {
      timezones: [
        { value: 'Australia/Sydney', label: 'Sydney, Melbourne, Canberra (AEDT/AEST)', utc: 'UTC+10/+11' },
        { value: 'Australia/Brisbane', label: 'Brisbane, Gold Coast (AEST - No DST)', utc: 'UTC+10' },
        { value: 'Australia/Adelaide', label: 'Adelaide (ACDT/ACST)', utc: 'UTC+9:30/+10:30' },
        { value: 'Australia/Darwin', label: 'Darwin (ACST - No DST)', utc: 'UTC+9:30' },
        { value: 'Australia/Perth', label: 'Perth (AWST - No DST)', utc: 'UTC+8' }
      ]
    },
    'New Zealand': {
      timezones: [
        { value: 'Pacific/Auckland', label: 'Auckland, Wellington, Christchurch', utc: 'UTC+12/+13' }
      ]
    },
    'Japan': {
      timezones: [
        { value: 'Asia/Tokyo', label: 'Tokyo, Osaka, Yokohama, Kyoto', utc: 'UTC+9' }
      ]
    },
    'South Korea': {
      timezones: [
        { value: 'Asia/Seoul', label: 'Seoul, Busan, Incheon', utc: 'UTC+9' }
      ]
    },
    'China': {
      timezones: [
        { value: 'Asia/Shanghai', label: 'Beijing, Shanghai, Guangzhou, Shenzhen', utc: 'UTC+8' }
      ]
    },
    'Taiwan': {
      timezones: [
        { value: 'Asia/Taipei', label: 'Taipei, Kaohsiung, Taichung', utc: 'UTC+8' }
      ]
    },
    'Hong Kong': {
      timezones: [
        { value: 'Asia/Hong_Kong', label: 'Hong Kong', utc: 'UTC+8' }
      ]
    },
    'Singapore': {
      timezones: [
        { value: 'Asia/Singapore', label: 'Singapore', utc: 'UTC+8' }
      ]
    },
    'Malaysia': {
      timezones: [
        { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur, Penang, Johor Bahru', utc: 'UTC+8' }
      ]
    },
    'Philippines': {
      timezones: [
        { value: 'Asia/Manila', label: 'Manila, Quezon City, Cebu', utc: 'UTC+8' }
      ]
    },
    'Thailand': {
      timezones: [
        { value: 'Asia/Bangkok', label: 'Bangkok, Phuket, Chiang Mai', utc: 'UTC+7' }
      ]
    },
    'Vietnam': {
      timezones: [
        { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh City, Hanoi, Da Nang', utc: 'UTC+7' }
      ]
    },
    'Indonesia': {
      timezones: [
        { value: 'Asia/Jakarta', label: 'Jakarta, Bandung, Surabaya (WIB)', utc: 'UTC+7' },
        { value: 'Asia/Makassar', label: 'Bali, Makassar (WITA)', utc: 'UTC+8' },
        { value: 'Asia/Jayapura', label: 'Papua (WIT)', utc: 'UTC+9' }
      ]
    },
    'India': {
      timezones: [
        { value: 'Asia/Kolkata', label: 'Delhi, Mumbai, Bangalore, Kolkata', utc: 'UTC+5:30' }
      ]
    },
    'Pakistan': {
      timezones: [
        { value: 'Asia/Karachi', label: 'Karachi, Lahore, Islamabad', utc: 'UTC+5' }
      ]
    },
    'Bangladesh': {
      timezones: [
        { value: 'Asia/Dhaka', label: 'Dhaka, Chittagong', utc: 'UTC+6' }
      ]
    },
    'United Arab Emirates': {
      timezones: [
        { value: 'Asia/Dubai', label: 'Dubai, Abu Dhabi, Sharjah', utc: 'UTC+4' }
      ]
    },
    'Saudi Arabia': {
      timezones: [
        { value: 'Asia/Riyadh', label: 'Riyadh, Jeddah, Mecca, Medina', utc: 'UTC+3' }
      ]
    },
    'Israel': {
      timezones: [
        { value: 'Asia/Jerusalem', label: 'Jerusalem, Tel Aviv, Haifa', utc: 'UTC+2/+3' }
      ]
    },
    'South Africa': {
      timezones: [
        { value: 'Africa/Johannesburg', label: 'Johannesburg, Cape Town, Durban', utc: 'UTC+2' }
      ]
    },
    'Egypt': {
      timezones: [
        { value: 'Africa/Cairo', label: 'Cairo, Alexandria, Giza', utc: 'UTC+2' }
      ]
    },
    'Nigeria': {
      timezones: [
        { value: 'Africa/Lagos', label: 'Lagos, Abuja, Kano', utc: 'UTC+1' }
      ]
    },
    'Kenya': {
      timezones: [
        { value: 'Africa/Nairobi', label: 'Nairobi, Mombasa', utc: 'UTC+3' }
      ]
    },
    'Brazil': {
      timezones: [
        { value: 'America/Sao_Paulo', label: 'São Paulo, Rio de Janeiro, Brasília (BRT)', utc: 'UTC-3' },
        { value: 'America/Manaus', label: 'Manaus (AMT)', utc: 'UTC-4' },
        { value: 'America/Fortaleza', label: 'Fortaleza, Recife (BRT)', utc: 'UTC-3' },
        { value: 'America/Noronha', label: 'Fernando de Noronha (FNT)', utc: 'UTC-2' }
      ]
    },
    'Argentina': {
      timezones: [
        { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires, Córdoba, Rosario', utc: 'UTC-3' }
      ]
    },
    'Chile': {
      timezones: [
        { value: 'America/Santiago', label: 'Santiago, Valparaíso, Concepción', utc: 'UTC-3/-4' },
        { value: 'Pacific/Easter', label: 'Easter Island', utc: 'UTC-5/-6' }
      ]
    },
    'Colombia': {
      timezones: [
        { value: 'America/Bogota', label: 'Bogotá, Medellín, Cali', utc: 'UTC-5' }
      ]
    },
    'Peru': {
      timezones: [
        { value: 'America/Lima', label: 'Lima, Arequipa, Cusco', utc: 'UTC-5' }
      ]
    },
    'Venezuela': {
      timezones: [
        { value: 'America/Caracas', label: 'Caracas, Maracaibo, Valencia', utc: 'UTC-4' }
      ]
    },
    'Iceland': {
      timezones: [
        { value: 'Atlantic/Reykjavik', label: 'Reykjavik', utc: 'UTC+0' }
      ]
    },
    'Other': {
      timezones: [
        { value: 'UTC', label: 'UTC (Coordinated Universal Time)', utc: 'UTC+0' },
        { value: 'Pacific/Fiji', label: 'Fiji', utc: 'UTC+12/+13' },
        { value: 'Pacific/Guam', label: 'Guam', utc: 'UTC+10' },
        { value: 'Pacific/Samoa', label: 'Samoa', utc: 'UTC-11' },
        { value: 'America/Jamaica', label: 'Jamaica', utc: 'UTC-5' },
        { value: 'America/Costa_Rica', label: 'Costa Rica', utc: 'UTC-6' },
        { value: 'America/Panama', label: 'Panama', utc: 'UTC-5' }
      ]
    }
  }
};

// Helper function to get role from class
export function getRoleFromClass(className) {
  return GAME_DATA.classes[className]?.role || 'Unknown';
}

// Helper function to get subclasses for a class
export function getSubclassesForClass(className) {
  return GAME_DATA.classes[className]?.subclasses || [];
}

// Helper function to get guilds for a role
export function getGuildsForRole(role) {
  return GAME_DATA.guilds[role] || [];
}

// Helper function to validate class and subclass combination
export function isValidClassSubclass(className, subclass) {
  const classData = GAME_DATA.classes[className];
  if (!classData) return false;
  return classData.subclasses.includes(subclass);
}

// Region grouping for pagination (Discord's 25 option limit)
export const TIMEZONE_REGIONS = {
  'North America': [
    'United States', 'Canada', 'Mexico'
  ],
  'Europe (West)': [
    'United Kingdom', 'Ireland', 'France', 'Germany', 'Italy', 'Spain',
    'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Portugal'
  ],
  'Europe (North)': [
    'Sweden', 'Norway', 'Denmark', 'Finland', 'Iceland'
  ],
  'Europe (East & Other)': [
    'Poland', 'Greece', 'Russia', 'Turkey'
  ],
  'Asia (East)': [
    'Japan', 'South Korea', 'China', 'Taiwan', 'Hong Kong'
  ],
  'Asia (Southeast)': [
    'Singapore', 'Malaysia', 'Philippines', 'Thailand', 'Vietnam', 'Indonesia'
  ],
  'Asia (South & Central)': [
    'India', 'Pakistan', 'Bangladesh'
  ],
  'Middle East': [
    'United Arab Emirates', 'Saudi Arabia', 'Israel'
  ],
  'Oceania': [
    'Australia', 'New Zealand'
  ],
  'Africa': [
    'South Africa', 'Egypt', 'Nigeria', 'Kenya'
  ],
  'South America': [
    'Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Venezuela'
  ],
  'Other': [
    'Other'
  ]
};

// Helper function to get all countries for timezone selection
export function getTimezoneCountries() {
  return Object.keys(GAME_DATA.timezonesByCountry);
}

// Helper function to get timezones for a specific country
export function getTimezonesForCountry(country) {
  return GAME_DATA.timezonesByCountry[country]?.timezones || [];
}

// Helper function to get regions
export function getTimezoneRegions() {
  return Object.keys(TIMEZONE_REGIONS);
}

// Helper function to get countries in a region
export function getCountriesInRegion(region) {
  return TIMEZONE_REGIONS[region] || [];
}
