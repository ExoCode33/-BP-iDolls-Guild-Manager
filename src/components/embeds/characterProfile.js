import { EmbedBuilder } from 'discord.js';
import { formatAbilityScore } from '../../utils/gameData.js';
import db from '../../services/database.js';

// Helper function to get class emoji from guild
function getClassEmoji(className, guild) {
  if (!guild) return '';
  
  const emojiName = className.replace(/\s+/g, ''); // Remove all spaces
  const emoji = guild.emojis.cache.find(e => e.name === emojiName);
  return emoji ? emoji.toString() : '';
}

const TZ_ABBR = {
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

export async function buildCharacterProfileEmbed(user, characters, interaction = null) {
  const mainChar = characters.find(c => c.character_type === 'main');
  const alts = characters.filter(c => c.character_type === 'alt');
  const subclasses = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

  let displayName = user.username;
  if (interaction && interaction.guild) {
    try {
      const member = await interaction.guild.members.fetch(user.id);
      if (member.nickname) displayName = member.nickname;
    } catch (error) {}
  }

  const guildName = mainChar?.guild || 'heal';

  // Get timezone info
  let timezoneText = '';
  const timezone = await db.getUserTimezone(user.id);
  if (timezone) {
    const abbr = TZ_ABBR[timezone] || timezone;
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      timeZone: timezone, 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
    timezoneText = `\n🌍 ${abbr} • ${timeString}`;
  }

  const embed = new EmbedBuilder()
    .setColor('#EC4899')
    .setDescription(`# __**Join ${guildName} • ${displayName}'s Profile**__ ${getClassEmoji(mainChar.class, interaction?.guild)}${timezoneText}`);

  if (!mainChar) {
    embed.setDescription('```ansi\n\u001b[0;31mNo main character registered\u001b[0m\n```');
    return embed;
  }

  // No thumbnail - removed per user request

  const roleEmoji = mainChar.role === 'Tank' ? '🛡️' : mainChar.role === 'DPS' ? '⚔️' : '💚';

  let mainSection = '```ansi\n';
  mainSection += `\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n`;
  mainSection += `\u001b[1;34m🎮 IGN:\u001b[0m ${mainChar.ign}\n`;
  mainSection += `\u001b[1;34m🆔 UID:\u001b[0m ${mainChar.uid}\n`;
  mainSection += `\u001b[1;34m🎭 Class:\u001b[0m ${mainChar.class} • ${mainChar.subclass} ${roleEmoji}\n`;
  mainSection += `\u001b[1;34m💪 Score:\u001b[0m ${formatAbilityScore(mainChar.ability_score)}\n`;
  mainSection += `\u001b[1;34m🏰 Guild:\u001b[0m ${mainChar.guild || 'None'}\n`;
  mainSection += `\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n`;
  mainSection += '```';

  embed.addFields({ name: '\u200b', value: mainSection, inline: false });

  if (subclasses.length > 0) {
    let subSection = '```ansi\n';
    subclasses.forEach((sub, i) => {
      const subRoleEmoji = sub.role === 'Tank' ? '🛡️' : sub.role === 'DPS' ? '⚔️' : '💚';
      if (i > 0) subSection += `\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n`;
      else subSection += `\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n`;
      subSection += `\u001b[1;34m🎭 Class:\u001b[0m ${sub.class} • ${sub.subclass} ${subRoleEmoji}\n`;
      subSection += `\u001b[1;34m💪 Score:\u001b[0m ${formatAbilityScore(sub.ability_score)}\n`;
    });
    subSection += `\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n`;
    subSection += '```';
    
    embed.addFields({ name: `📊 Subclass${subclasses.length > 1 ? 'es' : ''} (${subclasses.length})`, value: subSection, inline: false });
  }

  if (alts.length > 0) {
    let altSection = '```ansi\n';
    alts.forEach((alt, i) => {
      const altRoleEmoji = alt.role === 'Tank' ? '🛡️' : alt.role === 'DPS' ? '⚔️' : '💚';
      if (i > 0) altSection += `\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n`;
      else altSection += `\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n`;
      altSection += `\u001b[1;34m🎮 IGN:  \u001b[0m ${alt.ign}  \u001b[1;34m🆔 UID:\u001b[0m ${alt.uid}\n`;
      altSection += `\u001b[1;34m🎭 Class:\u001b[0m ${alt.class} • ${alt.subclass} ${altRoleEmoji}\n`;
      altSection += `\u001b[1;34m💪 Score:\u001b[0m ${formatAbilityScore(alt.ability_score)}\n`;
      altSection += `\u001b[1;34m🏰 Guild:\u001b[0m ${alt.guild || 'None'}\n`;
    });
    altSection += `\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n`;
    altSection += '```';
    
    embed.addFields({ name: `🎭 Alts (${alts.length})`, value: altSection, inline: false });
  }

  embed.setTimestamp();
  return embed;
}
