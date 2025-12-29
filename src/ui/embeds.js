import { EmbedBuilder } from 'discord.js';
import { COLORS } from '../config/game.js';
import { formatScore, formatTime, getRoleEmoji, getClassEmoji } from './utils.js';
import { TimezoneRepo, BattleImagineRepo, ApplicationRepo } from '../database/repositories.js';

export const embed = (title, description) => {
  const centerText = (text, width = 42) => text.padStart((text.length + width) / 2).padEnd(width);
  const descLines = description.split('\n').map(line => centerText(line));
  
  const ansiText = [
    '\u001b[1;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m',
    '',
    ...descLines.map(line => `\u001b[1;34m${line}\u001b[0m`),
    '',
    '\u001b[1;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m'
  ].join('\n');
  
  return new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle(title)
    .setDescription(`\`\`\`ansi\n${ansiText}\n\`\`\``)
    .setTimestamp();
};

export const errorEmbed = (message) => {
  const centerText = (text, width = 42) => text.padStart((text.length + width) / 2).padEnd(width);
  const descLines = message.split('\n').map(line => centerText(line));
  
  const ansiText = [
    '\u001b[1;31m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m',
    '',
    ...descLines.map(line => `\u001b[1;31m${line}\u001b[0m`),
    '',
    '\u001b[1;31m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m'
  ].join('\n');
  
  return new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setTitle('❌ Error')
    .setDescription(`\`\`\`ansi\n${ansiText}\n\`\`\``)
    .setTimestamp();
};

export const successEmbed = (message) => {
  const centerText = (text, width = 42) => text.padStart((text.length + width) / 2).padEnd(width);
  const descLines = message.split('\n').map(line => centerText(line));
  
  const ansiText = [
    '\u001b[1;32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m',
    '',
    ...descLines.map(line => `\u001b[1;32m${line}\u001b[0m`),
    '',
    '\u001b[1;32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m'
  ].join('\n');
  
  return new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle('✅ Success')
    .setDescription(`\`\`\`ansi\n${ansiText}\n\`\`\``)
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

  const tz = await TimezoneRepo.get(user.id);
  const timeText = tz ? `\n🌍 ${formatTime(tz)}` : '';

  if (!main) {
    const centerText = (text, width = 42) => text.padStart((text.length + width) / 2).padEnd(width);
    
    const welcomeLine = `♡₊˚ Welcome ${displayName} ˚₊♡`;
    const noCharLine = 'No character yet? No worries~';
    const tapLine = '• Tap the button below';
    const setupLine = '• We\'ll set you up in no time!';
    
    const welcomeText = [
      '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m',
      '',
      '\u001b[1;34m' + centerText(welcomeLine) + '\u001b[0m',
      '',
      '\u001b[1;34m' + centerText(noCharLine) + '\u001b[0m',
      '',
      '\u001b[1;34m' + centerText(tapLine) + '\u001b[0m',
      '\u001b[1;34m' + centerText(setupLine) + '\u001b[0m',
      '',
      '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m'
    ].join('\n');

    return new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setDescription('## **iDolls 💫**\n```ansi\n' + welcomeText + '\n```')
      .setTimestamp();
  }

  const roleEmoji = getRoleEmoji(main.role);
  const classEmoji = getClassEmoji(interaction?.guild, main.class);

  // ✅ Check for pending application
  let guildDisplay = main.guild || 'None';
  if (main.guild === 'iDolls') {
    try {
      const pendingApp = await ApplicationRepo.findAllByUserAndCharacter(user.id, main.id);
      if (pendingApp && pendingApp.status === 'pending') {
        guildDisplay = '⏳ Pending - iDolls';
      }
    } catch (error) {
      console.error('[EMBED] Error checking pending application:', error);
    }
  }

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

  mainSection += '\u001b[1;34m🏰 Guild:\u001b[0m ' + guildDisplay + '\n'; // ✅ Use guildDisplay instead of main.guild
  mainSection += '\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n';
  mainSection += '```';

  const e = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription('# **iDolls 💫 • ' + displayName + '\'s Profile** ' + classEmoji + timeText + '\n' + mainSection)
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
