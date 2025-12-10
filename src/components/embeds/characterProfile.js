import { EmbedBuilder } from 'discord.js';
import { formatAbilityScore } from '../../utils/gameData.js';
import db from '../../services/database.js';

// Timezone to abbreviation mapping
const TIMEZONE_ABBR = {
  'America/New_York': 'EST',
  'America/Chicago': 'CST',
  'America/Denver': 'MST',
  'America/Los_Angeles': 'PST',
  'America/Anchorage': 'AKST',
  'Pacific/Honolulu': 'HST',
  'America/Toronto': 'EST',
  'America/Winnipeg': 'CST',
  'America/Edmonton': 'MST',
  'America/Vancouver': 'PST',
  'America/Halifax': 'AST',
  'America/Mexico_City': 'CST',
  'America/Chihuahua': 'MST',
  'America/Tijuana': 'PST',
  'America/Sao_Paulo': 'BRT',
  'America/Manaus': 'AMT',
  'America/Buenos_Aires': 'ART',
  'America/Santiago': 'CLT',
  'America/Bogota': 'COT',
  'America/Lima': 'PET',
  'Europe/London': 'GMT',
  'Europe/Paris': 'CET',
  'Europe/Berlin': 'CET',
  'Europe/Rome': 'CET',
  'Europe/Madrid': 'CET',
  'Europe/Amsterdam': 'CET',
  'Europe/Brussels': 'CET',
  'Europe/Vienna': 'CET',
  'Europe/Warsaw': 'CET',
  'Europe/Stockholm': 'CET',
  'Europe/Athens': 'EET',
  'Europe/Istanbul': 'TRT',
  'Europe/Moscow': 'MSK',
  'Asia/Yekaterinburg': 'YEKT',
  'Asia/Novosibirsk': 'NOVT',
  'Asia/Vladivostok': 'VLAT',
  'Asia/Tokyo': 'JST',
  'Asia/Seoul': 'KST',
  'Asia/Shanghai': 'CST',
  'Asia/Hong_Kong': 'HKT',
  'Asia/Taipei': 'CST',
  'Asia/Singapore': 'SGT',
  'Asia/Bangkok': 'ICT',
  'Asia/Ho_Chi_Minh': 'ICT',
  'Asia/Manila': 'PST',
  'Asia/Jakarta': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Kolkata': 'IST',
  'Asia/Dubai': 'GST',
  'Asia/Riyadh': 'AST',
  'Australia/Sydney': 'AEDT',
  'Australia/Brisbane': 'AEST',
  'Australia/Adelaide': 'ACDT',
  'Australia/Perth': 'AWST',
  'Australia/Darwin': 'ACST',
  'Pacific/Auckland': 'NZDT',
  'Pacific/Fiji': 'FJT',
  'Africa/Johannesburg': 'SAST',
  'Africa/Cairo': 'EET',
  'Africa/Lagos': 'WAT',
  'Africa/Nairobi': 'EAT',
  'Africa/Casablanca': 'WET'
};

export async function buildCharacterProfileEmbed(user, characters, interaction = null) {
  const mainChar = characters.find(c => c.character_type === 'main');
  const alts = characters.filter(c => c.character_type === 'alt');
  const subclasses = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

  // Get nickname if interaction is available
  let displayName = user.username;
  if (interaction && interaction.guild) {
    try {
      const member = await interaction.guild.members.fetch(user.id);
      if (member.nickname) {
        displayName = member.nickname;
      }
    } catch (error) {
      // Fallback to username if fetch fails
      displayName = user.username;
    }
  }

  const embed = new EmbedBuilder()
    .setColor('#EC4899')
    .setThumbnail(user.displayAvatarURL({ dynamic: true }));

  // Get user timezone
  const timezone = await db.getUserTimezone(user.id);
  
  let titleText = `# **Join heal - ${displayName}'s Profile**`;
  
  // Add timezone display if set
  if (timezone) {
    const abbr = TIMEZONE_ABBR[timezone] || 'UTC';
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      timeZone: timezone, 
      month: 'short', 
      day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
      timeZone: timezone, 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    titleText += `\n🌍 ${abbr} • ${dateStr} ${timeStr}`;
  }

  let description = titleText;

  if (!mainChar && alts.length === 0) {
    description += '\n\n*No character registered*\n\nClick "📝 Register Main Character" to start!';
    embed.setDescription(description);
    return embed;
  }

  description += '\n';

  // Main character section
  if (mainChar) {
    const roleEmoji = mainChar.role === 'Tank' ? '🛡️' : mainChar.role === 'DPS' ? '⚔️' : '💚';
    description += '\n## ⭐ Main\n';
    description += `**🎮 IGN:** ${mainChar.ign}\n`;
    description += `**🏰 Guild:** ${mainChar.guild}\n`;
    description += `**🎭 Class:** ${mainChar.class}\n`;
    description += `**📋 Subclass:** ${mainChar.subclass} ${roleEmoji}\n`;
    description += `**💪 Score:** ${formatAbilityScore(mainChar.ability_score)}`;
  }

  // Subclasses section
  const mainSubclasses = subclasses.filter(s => s.character_type === 'main_subclass');
  const altSubclasses = subclasses.filter(s => s.character_type === 'alt_subclass');
  const totalSubclasses = mainSubclasses.length + altSubclasses.length;

  if (totalSubclasses > 0) {
    description += `\n\n## 🔄 Subclasses (${totalSubclasses})`;
    
    mainSubclasses.forEach((sub, index) => {
      const roleEmoji = sub.role === 'Tank' ? '🛡️' : sub.role === 'DPS' ? '⚔️' : '💚';
      description += `\n**${index + 1}. ${sub.class}**\n`;
      description += `**📋 Subclass:** ${sub.subclass} ${roleEmoji}\n`;
      description += `**💪 Score:** ${formatAbilityScore(sub.ability_score)}`;
      if (index < mainSubclasses.length - 1) description += '\n';
    });
  }

  // Alts section
  if (alts.length > 0) {
    description += `\n\n## 🎭 Alts (${alts.length})`;
    
    alts.forEach((alt, index) => {
      const altSubs = altSubclasses.filter(s => s.parent_character_id === alt.id);
      const roleEmoji = alt.role === 'Tank' ? '🛡️' : alt.role === 'DPS' ? '⚔️' : '💚';
      
      description += `\n**${index + 1}. ${alt.ign}**\n`;
      description += `**🏰 Guild:** ${alt.guild}\n`;
      description += `**🎭 Class:** ${alt.class}\n`;
      description += `**📋 Subclass:** ${alt.subclass} ${roleEmoji}\n`;
      description += `**💪 Score:** ${formatAbilityScore(alt.ability_score)}`;
      
      if (altSubs.length > 0) {
        description += '\n**🔄 Alt Subclasses:**';
        altSubs.forEach(sub => {
          const subRoleEmoji = sub.role === 'Tank' ? '🛡️' : sub.role === 'DPS' ? '⚔️' : '💚';
          description += `\n  • ${sub.class} (${sub.subclass}) ${subRoleEmoji} - ${formatAbilityScore(sub.ability_score)}`;
        });
      }
      
      if (index < alts.length - 1) description += '\n';
    });
  }

  embed.setDescription(description);
  embed.setTimestamp();

  return embed;
}

export default { buildCharacterProfileEmbed };
