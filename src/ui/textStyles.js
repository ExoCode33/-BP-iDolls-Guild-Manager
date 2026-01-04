// ═══════════════════════════════════════════════════════════════════
// UNICODE TEXT STYLES FOR DISCORD NICKNAMES
// ═══════════════════════════════════════════════════════════════════

// Unicode character mappings for different styles
const STYLES = {
  normal: {
    name: 'Normal',
    emoji: '📝',
    number: '1️⃣',
    convert: (text) => text
  },
  bold_sans: {
    name: 'Bold Sans',
    emoji: '💪',
    number: '2️⃣',
    convert: (text) => convertToUnicode(text, 0x1D5D4, 0x1D5EE)
  },
  italic_sans: {
    name: 'Italic Sans',
    emoji: '✨',
    number: '3️⃣',
    convert: (text) => convertToUnicode(text, 0x1D608, 0x1D622)
  },
  bold_italic: {
    name: 'Bold Italic',
    emoji: '⚡',
    number: '4️⃣',
    convert: (text) => convertToUnicode(text, 0x1D63C, 0x1D656)
  },
  small_caps: {
    name: 'Small Caps',
    emoji: '🔹',
    number: '5️⃣',
    convert: (text) => convertToSmallCaps(text)
  },
  double_struck: {
    name: 'Double-Struck',
    emoji: '🎯',
    number: '6️⃣',
    convert: (text) => convertToUnicode(text, 0x1D538, 0x1D552)
  },
  cursive_bold: {
    name: 'Cursive Bold',
    emoji: '💫',
    number: '7️⃣',
    convert: (text) => convertToUnicode(text, 0x1D4D0, 0x1D4EA)
  },
  fraktur: {
    name: 'Fraktur',
    emoji: '🌟',
    number: '8️⃣',
    convert: (text) => convertToUnicode(text, 0x1D504, 0x1D51E)
  },
  monospace: {
    name: 'Monospace',
    emoji: '⌨️',
    number: '9️⃣',
    convert: (text) => convertToUnicode(text, 0x1D670, 0x1D68A)
  },
  serif: {
    name: 'Serif',
    emoji: '📰',
    number: '🔟',
    convert: (text) => convertToUnicode(text, 0x1D5A0, 0x1D5BA)
  }
};

/**
 * Convert text to Unicode mathematical alphanumeric symbols
 * @param {string} text - Input text
 * @param {number} upperOffset - Unicode offset for uppercase letters
 * @param {number} lowerOffset - Unicode offset for lowercase letters
 * @returns {string} Converted text
 */
function convertToUnicode(text, upperOffset, lowerOffset) {
  return text.split('').map(char => {
    const code = char.charCodeAt(0);
    
    // Uppercase A-Z (65-90)
    if (code >= 65 && code <= 90) {
      return String.fromCodePoint(upperOffset + (code - 65));
    }
    
    // Lowercase a-z (97-122)
    if (code >= 97 && code <= 122) {
      return String.fromCodePoint(lowerOffset + (code - 97));
    }
    
    // Numbers 0-9 for some fonts
    if (code >= 48 && code <= 57 && upperOffset >= 0x1D7CE) {
      return String.fromCodePoint(upperOffset + (code - 48));
    }
    
    // Return as-is (spaces, special chars, etc.)
    return char;
  }).join('');
}

/**
 * Convert text to small caps
 * @param {string} text - Input text
 * @returns {string} Small caps text
 */
function convertToSmallCaps(text) {
  const smallCapsMap = {
    'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ꜰ', 'g': 'ɢ', 'h': 'ʜ',
    'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ',
    'q': 'ǫ', 'r': 'ʀ', 's': 'ꜱ', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x',
    'y': 'ʏ', 'z': 'ᴢ',
    'A': 'ᴀ', 'B': 'ʙ', 'C': 'ᴄ', 'D': 'ᴅ', 'E': 'ᴇ', 'F': 'ꜰ', 'G': 'ɢ', 'H': 'ʜ',
    'I': 'ɪ', 'J': 'ᴊ', 'K': 'ᴋ', 'L': 'ʟ', 'M': 'ᴍ', 'N': 'ɴ', 'O': 'ᴏ', 'P': 'ᴘ',
    'Q': 'ǫ', 'R': 'ʀ', 'S': 'ꜱ', 'T': 'ᴛ', 'U': 'ᴜ', 'V': 'ᴠ', 'W': 'ᴡ', 'X': 'x',
    'Y': 'ʏ', 'Z': 'ᴢ'
  };
  
  return text.split('').map(char => smallCapsMap[char] || char).join('');
}

/**
 * Apply style to text
 * @param {string} text - Input text
 * @param {string} styleKey - Style key from STYLES object
 * @returns {string} Styled text
 */
export function applyStyle(text, styleKey = 'normal') {
  const style = STYLES[styleKey];
  if (!style) return text;
  return style.convert(text);
}

/**
 * Get all available styles for dropdown
 * @param {string} previewNickname - Nickname to show as example
 * @returns {Array} Array of style options
 */
export function getStyleOptions(previewNickname = 'Example') {
  return Object.entries(STYLES).map(([key, style]) => ({
    label: style.name,
    value: key,
    emoji: style.number,
    description: styleNickname(previewNickname, key)
  }));
}

/**
 * Apply style to nickname (styles character names, not separators)
 * @param {string} nickname - Full nickname with separators
 * @param {string} styleKey - Style to apply
 * @returns {string} Styled nickname
 */
export function styleNickname(nickname, styleKey = 'normal') {
  if (!nickname || styleKey === 'normal') return nickname;
  
  // Split by middle dot separator
  const parts = nickname.split(' · ');
  
  // Apply style to each part
  const styledParts = parts.map(part => applyStyle(part.trim(), styleKey));
  
  // Rejoin with original separator
  return styledParts.join(' · ');
}

/**
 * Get examples of all styles applied to a nickname
 * @param {string} nickname - Nickname to preview
 * @returns {string} Formatted preview text
 */
export function getStylePreviews(nickname) {
  if (!nickname) return '';
  
  const previews = [];
  for (const [key, style] of Object.entries(STYLES)) {
    const styled = styleNickname(nickname, key);
    previews.push(`${style.number} **${style.name}:** ${styled}`);
  }
  
  return previews.join('\n');
}

export default {
  applyStyle,
  getStyleOptions,
  styleNickname,
  getStylePreviews,
  STYLES
};
