import { EmbedBuilder } from 'discord.js';
import { COLORS } from '../config/game.js';
import { formatScore, formatTime, getRoleEmoji, getClassEmoji } from './utils.js';
import { TimezoneRepo, BattleImagineRepo } from '../database/repositories.js';

export const embed = (title, description) => {
  return new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(`# **${title}**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${description}`)
    .setTimestamp();
};

// ✨ NEW: Centered cute registration embeds
export const stepEmbed = (step, total, title, description) => {
  const ansiText = [
    '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m',
    `\u001b[1;34m${title}\u001b[0m`,
    '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m',
    '',
    description,
    '',
    `\u001b[0;36m✨ Step ${step} of ${total}\u001b[0m`,
    '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m'
  ].join('\n');

  return new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(`\`\`\`ansi\n${ansiText}\n\`\`\``)
    .setTimestamp();
};

export const errorEmbed = (message) => {
  return new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setDescription(`# ❌ **Error**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${message}`)
    .setTimestamp();
};

export const successEmbed = (message) => {
  return new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setDescription(`# ✅ **Success**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${message}`)
    .setTimestamp();
};

export async function profileEmbed(user, characters, interaction = null) {
  const main = characters.find(c => c.character_type === 'main');
  const alts = characters.filter(c => c.character_type === 'alt');
  const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

  let displayName = user.username;
  if (interaction?.guild) {
    try {
      const member = await interaction.guild.members.fetch(user.id);
      if (member.nickname) displayName = member.nickname;
    } catch (e) {}
  }

  const guildName = main?.guild || 'heal';
  const tz = await TimezoneRepo.get(user.id);
  const timeText = tz ? `\n🌍 ${formatTime(tz)}` : '';

  if (!main) {
    const welcomeText = [
      '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m',
      '',
      '\u001b[1;34m          \u2661\u208A\u02DA Welcome\u001b[0m \u001b[33m' + displayName + '\u001b[0m \u001b[1;34m\u02DA\u208A\u2661\u001b[0m',
      '',
      '\u001b[1;34m    No character yet? No worries~\u001b[0m',
      '',
      '\u001b[1;34m    \u2022 Tap the button below\u001b[0m',
      '\u001b[1;34m    \u2022 We\'ll set you up in no time!\u001b[0m',
      '',
      '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m'
    ].join('\n');

    return new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setDescription('## 🩷 **Join Heal**\n```ansi\n' + welcomeText + '\n```')
      .setTimestamp();
  }

  const roleEmoji = getRoleEmoji(main.role);
  const classEmoji = getClassEmoji(interaction?.guild, main.class);

  let mainSection = '```ansi\n';
  mainSection += '\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n';
  mainSection += '\u001b[1;34m🎮 IGN:\u001b[0m ' + main.ign + '\n';
  mainSection += '\u001b[1;34m🆔 UID:\u001b[0m ' + main.uid + '\n';
  mainSection += '\u001b[1;34m🎭 Class:\u001b[0m ' + main.class + ' • ' + main.subclass + ' ' + roleEmoji + '\n';
  mainSection += '\u001b[1;34m💪 Score:\u001b[0m ' + formatScore(main.ability_score) + '\n';

  const mainBI = await BattleImagineRepo.findByCharacter(main.id);
  if (mainBI.length > 0) {
    mainSection += '\u001b[1;34m⚔️ Battle Imagines:\u001b[0m ' + mainBI.map(b => b.imagine_name + ' ' + b.tier).join(', ') + '\n';
  }

  mainSection += '\u001b[1;34m🏰 Guild:\u001b[0m ' + (main.guild || 'None') + '\n';
  mainSection += '\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n';
  mainSection += '```';

  const e = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription('# __**Join ' + guildName + ' • ' + displayName + '\'s Profile**__ ' + classEmoji + timeText + '\n' + mainSection)
    .setTimestamp();

  if (subs.length > 0) {
    let subSection = '```ansi\n';
    subs.forEach((sub, i) => {
      const subRoleEmoji = getRoleEmoji(sub.role);
      subSection += '\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n';
      subSection += '\u001b[1;34m🎭 Class:\u001b[0m ' + sub.class + ' • ' + sub.subclass + ' ' + subRoleEmoji + '\n';
      subSection += '\u001b[1;34m💪 Score:\u001b[0m ' + formatScore(sub.ability_score) + '\n';
    });
    subSection += '\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n';
    subSection += '```';
    e.addFields({ name: '📊 Subclass' + (subs.length > 1 ? 'es' : '') + ' (' + subs.length + ')', value: subSection, inline: false });
  }

  if (alts.length > 0) {
    let altSection = '```ansi\n';
    for (const alt of alts) {
      const altRoleEmoji = getRoleEmoji(alt.role);
      altSection += '\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n';
      altSection += '\u001b[1;34m🎮 IGN:\u001b[0m ' + alt.ign + '  \u001b[1;34m🆔 UID:\u001b[0m ' + alt.uid + '\n';
      altSection += '\u001b[1;34m🎭 Class:\u001b[0m ' + alt.class + ' • ' + alt.subclass + ' ' + altRoleEmoji + '\n';
      altSection += '\u001b[1;34m💪 Score:\u001b[0m ' + formatScore(alt.ability_score) + '\n';

      const altBI = await BattleImagineRepo.findByCharacter(alt.id);
      if (altBI.length > 0) {
        altSection += '\u001b[1;34m⚔️ Battle Imagines:\u001b[0m ' + altBI.map(b => b.imagine_name + ' ' + b.tier).join(', ') + '\n';
      }

      altSection += '\u001b[1;34m🏰 Guild:\u001b[0m ' + (alt.guild || 'None') + '\n';
    }
    altSection += '\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n';
    altSection += '```';
    e.addFields({ name: '🎭 Alts (' + alts.length + ')', value: altSection, inline: false });
  }

  return e;
}
