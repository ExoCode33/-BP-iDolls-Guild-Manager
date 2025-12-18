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

export const stepEmbed = (step, total, title, description) => {
  return embed(title, `${description}\n\n*Step ${step} of ${total}*`);
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
    return new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setDescription(`<:HelloThere:1451244468881591427> **Join Heal**\n\`\`\`ansi\n\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n\n    \u001b[1;34m♡₊˚\u001b[0m \u001b[1;34mWelcome\u001b[0m \u001b[33m${displayName}\u001b[0m \u001b[1;34m˚₊♡\u001b[0m\n\n    \u001b[1;34mNo character yet? No worries~\u001b[0m\n\n    \u001b[1;34m✿ Tap the button below\u001b[0m\n    \u001b[1;34m✿ We'll set you up in no time!\u001b[0m\n\n\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n\`\`\``)
      .setTimestamp();
  }

  const roleEmoji = getRoleEmoji(main.role);
  const classEmoji = getClassEmoji(interaction?.guild, main.class);

  let mainSection = '```ansi\n';
  mainSection += `\u001b[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m\n`;
  mainSection += `\u001b[1;34m🎮 IGN:\u001b[0m ${main.ign}\n`;
  mainSection += `\u001b[1;34m🆔 UID:\u001b[0m ${main.uid}\n`;
  mainSection += `\u001b[1;34m🎭 Class:\u001b[0m ${main.class} • ${main.subclass} ${roleEmoji}\n`;
  mainSection += `\u001b[1;34m💪 Score:\u001b[0m ${formatScore(main.ability_score)}\n`;

  const mainBI = await BattleImagineRepo.findByCharacter(
