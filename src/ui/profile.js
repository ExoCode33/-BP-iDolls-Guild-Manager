import { EmbedBuilder } from 'discord.js';
import { BattleImagineRepo, ApplicationRepo } from '../database/repositories.js';
import { COLORS } from '../utils/constants.js';

// ═══════════════════════════════════════════════════════════════════
// PROFILE EMBED WITH ALT CHARACTERS
// ═══════════════════════════════════════════════════════════════════

export async function profileEmbed(user, characters, interaction) {
  const main = characters.find(c => c.character_type === 'main');
  const subclasses = characters.filter(c => c.character_type === 'main_subclass');
  const alts = characters.filter(c => c.character_type === 'alt');

  if (!main && alts.length === 0) {
    return new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setAuthor({ name: `${user.username}'s Profile`, iconURL: user.displayAvatarURL() })
      .setDescription(
        '# 📋 **Character Profile**\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '**No character registered yet!**\n\n' +
        'Click **Register Character** to get started.'
      )
      .setTimestamp();
  }

  let description = '# 📋 **Character Profile**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  // Main character section
  if (main) {
    const mainBattleImagines = await BattleImagineRepo.findByCharacterId(main.id);
    const mainApplication = await ApplicationRepo.findByCharacterId(main.id);

    description += '🎮 **IGN:** ' + main.ign + '\n';
    description += '🆔 **UID:** ' + main.uid + '\n';
    description += '🎭 **Class:** ' + main.class + ' - ' + main.subclass + '\n';
    description += '💪 **Score:** ' + main.ability_score + '\n';

    if (mainBattleImagines && mainBattleImagines.length > 0) {
      const biList = mainBattleImagines.map(bi => `${bi.name} ${bi.tier}`).join(', ');
      description += '⚔️ **Battle Imagines:** ' + biList + '\n';
    } else {
      description += '⚔️ **Battle Imagines:** None\n';
    }

    if (mainApplication && mainApplication.status === 'pending') {
      description += '🏰 **Guild:** ' + main.guild + ' (⏳ Pending)\n';
    } else {
      description += '🏰 **Guild:** ' + main.guild + '\n';
    }

    description += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
  }

  // Subclasses section
  if (subclasses.length > 0) {
    description += `📊 **Subclasses (${subclasses.length})**\n`;
    description += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

    for (const subclass of subclasses) {
      description += '🎭 **Class:** ' + subclass.class + ' - ' + subclass.subclass + '\n';
      description += '💪 **Score:** ' + subclass.ability_score + '\n';
      description += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    }
    
    description += '\n';
  }

  // Alt characters section
  if (alts.length > 0) {
    description += `🎮 **Alt Characters (${alts.length})**\n`;
    description += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

    for (const alt of alts) {
      const altBattleImagines = await BattleImagineRepo.findByCharacterId(alt.id);
      const altApplication = await ApplicationRepo.findByCharacterId(alt.id);

      description += '🎮 **IGN:** ' + alt.ign + '\n';
      description += '🆔 **UID:** ' + alt.uid + '\n';
      description += '🎭 **Class:** ' + alt.class + ' - ' + alt.subclass + '\n';
      description += '💪 **Score:** ' + alt.ability_score + '\n';

      if (altBattleImagines && altBattleImagines.length > 0) {
        const biList = altBattleImagines.map(bi => `${bi.name} ${bi.tier}`).join(', ');
        description += '⚔️ **Battle Imagines:** ' + biList + '\n';
      } else {
        description += '⚔️ **Battle Imagines:** None\n';
      }

      if (altApplication && altApplication.status === 'pending') {
        description += '🏰 **Guild:** ' + alt.guild + ' (⏳ Pending)\n';
      } else {
        description += '🏰 **Guild:** ' + alt.guild + '\n';
      }

      description += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    }
  }

  return new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setAuthor({ name: `${user.username}'s Profile`, iconURL: user.displayAvatarURL() })
    .setDescription(description)
    .setTimestamp();
}

export default {
  profileEmbed
};
