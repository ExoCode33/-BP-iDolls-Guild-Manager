import { EmbedBuilder } from 'discord.js';
import { formatAbilityScore } from '../../utils/gameData.js';
import db from '../../services/database.js';

export async function buildCharacterProfileEmbed(user, characters) {
  const mainChar = characters.find(c => c.character_type === 'main');
  const alts = characters.filter(c => c.character_type === 'alt');
  const subclasses = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle(`${user.username}'s Character Profile`);

  if (!mainChar) {
    embed.setDescription('```ansi\n\u001b[0;31mNo main character registered\u001b[0m\n```');
    return embed;
  }

  const roleEmoji = mainChar.role === 'Tank' ? '🛡️' : mainChar.role === 'DPS' ? '⚔️' : '💚';

  let mainSection = '```ansi\n';
  mainSection += `\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n`;
  mainSection += `\u001b[1;34m🎮 IGN:\u001b[0m ${mainChar.ign} ${roleEmoji}\n`;
  mainSection += `\u001b[1;34m🏰 Guild:\u001b[0m ${mainChar.guild || 'None'}\n`;
  mainSection += `\u001b[1;34m🎭 Class:\u001b[0m ${mainChar.class} - ${mainChar.subclass}\n`;
  mainSection += `\u001b[1;34m💪 Score:\u001b[0m ${formatAbilityScore(mainChar.ability_score)}\n`;
  mainSection += `\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n`;
  mainSection += '```';

  embed.addFields({ name: '⭐ Main Character', value: mainSection, inline: false });

  if (subclasses.length > 0) {
    let subSection = '```ansi\n';
    subclasses.forEach((sub, i) => {
      const subRoleEmoji = sub.role === 'Tank' ? '🛡️' : sub.role === 'DPS' ? '⚔️' : '💚';
      if (i > 0) subSection += `\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n`;
      else subSection += `\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n`;
      subSection += `\u001b[1;34m🎮 IGN:\u001b[0m ${sub.ign} ${subRoleEmoji}\n`;
      subSection += `\u001b[1;34m🎭 Class:\u001b[0m ${sub.class} - ${sub.subclass}\n`;
      subSection += `\u001b[1;34m💪 Score:\u001b[0m ${formatAbilityScore(sub.ability_score)}\n`;
    });
    subSection += `\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n`;
    subSection += '```';
    embed.addFields({ name: `📊 Subclasses (${subclasses.length}/3)`, value: subSection, inline: false });
  }

  if (alts.length > 0) {
    let altSection = '```ansi\n';
    alts.forEach((alt, i) => {
      const altRoleEmoji = alt.role === 'Tank' ? '🛡️' : alt.role === 'DPS' ? '⚔️' : '💚';
      if (i > 0) altSection += `\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n`;
      else altSection += `\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n`;
      altSection += `\u001b[1;34m🎮 IGN:\u001b[0m ${alt.ign} ${altRoleEmoji}\n`;
      altSection += `\u001b[1;34m🏰 Guild:\u001b[0m ${alt.guild || 'None'}\n`;
      altSection += `\u001b[1;34m🎭 Class:\u001b[0m ${alt.class} - ${alt.subclass}\n`;
      altSection += `\u001b[1;34m💪 Score:\u001b[0m ${formatAbilityScore(alt.ability_score)}\n`;
    });
    altSection += `\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n`;
    altSection += '```';
    embed.addFields({ name: `🎭 Alt Characters (${alts.length})`, value: altSection, inline: false });
  }

  const timezone = await db.getUserTimezone(user.id);
  if (timezone) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true });
    embed.setFooter({ text: `🌍 ${timezone} • ${timeString}` });
  }

  embed.setTimestamp();
  return embed;
}
