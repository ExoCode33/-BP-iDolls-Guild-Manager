import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function buildCharacterButtons(mainChar, altCount, subclassCount, userId) {
  const rows = [];

  if (!mainChar) {
    const registerButton = new ButtonBuilder()
      .setCustomId(`register_main_${userId}`)
      .setLabel('📝 Register Main Character')
      .setStyle(ButtonStyle.Primary);
    rows.push(new ActionRowBuilder().addComponents(registerButton));
    return rows;
  }

  const row1 = new ActionRowBuilder();
  const row2 = new ActionRowBuilder();

  row1.addComponents(
    new ButtonBuilder().setCustomId(`edit_main_${userId}`).setLabel('✏️ Edit Main').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`add_subclass_${userId}`).setLabel('📊 Add Subclass').setStyle(ButtonStyle.Success).setDisabled(subclassCount >= 3),
    new ButtonBuilder().setCustomId(`add_alt_${userId}`).setLabel('🎭 Add Alt').setStyle(ButtonStyle.Success)
  );

  row2.addComponents(
    new ButtonBuilder().setCustomId(`remove_alt_${userId}`).setLabel('🗑️ Remove Alt').setStyle(ButtonStyle.Danger).setDisabled(altCount === 0),
    new ButtonBuilder().setCustomId(`remove_subclass_${userId}`).setLabel('🗑️ Remove Subclass').setStyle(ButtonStyle.Danger).setDisabled(subclassCount === 0),
    new ButtonBuilder().setCustomId(`remove_main_${userId}`).setLabel('⚠️ Remove Main').setStyle(ButtonStyle.Danger)
  );

  rows.push(row1, row2);
  return rows;
}
