import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';

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

  // Button Row
  const buttonRow = new ActionRowBuilder();
  buttonRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`add_character_${userId}`)
      .setLabel('➕ Add Character')
      .setStyle(ButtonStyle.Primary), // BLUE
    new ButtonBuilder()
      .setCustomId(`edit_character_${userId}`)
      .setLabel('✏️ Edit Character')
      .setStyle(ButtonStyle.Secondary), // GREY
    new ButtonBuilder()
      .setCustomId(`remove_character_${userId}`)
      .setLabel('🗑️ Remove Character')
      .setStyle(ButtonStyle.Secondary) // GREY
  );

  rows.push(buttonRow);
  return rows;
}

export function buildAddCharacterMenu(userId, subclassCount) {
  const options = [
    {
      label: 'Alt Character',
      value: 'alt',
      description: 'Add an alternate character',
      emoji: '🎭'
    },
    {
      label: 'Subclass',
      value: 'subclass',
      description: `Add a subclass (${subclassCount}/3 used)`,
      emoji: '📊'
    }
  ];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`add_character_select_${userId}`)
    .setPlaceholder('➕ Choose what to add')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);
  return [row];
}

export function buildEditCharacterMenu(userId, mainChar, alts, subclasses) {
  const options = [];

  // Main character option
  if (mainChar) {
    options.push({
      label: `Main: ${mainChar.ign}`,
      value: `main_${mainChar.id}`,
      description: `${mainChar.class} - ${mainChar.subclass}`,
      emoji: '⭐'
    });
  }

  // Subclass options
  subclasses.forEach((sub, index) => {
    options.push({
      label: `Subclass ${index + 1}: ${sub.class}`,
      value: `subclass_${sub.id}`,
      description: `${sub.subclass} (${sub.parent_ign || 'Main'})`,
      emoji: '📊'
    });
  });

  // Alt options
  alts.forEach((alt, index) => {
    options.push({
      label: `Alt ${index + 1}: ${alt.ign}`,
      value: `alt_${alt.id}`,
      description: `${alt.class} - ${alt.subclass}`,
      emoji: '🎭'
    });
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`edit_character_select_${userId}`)
    .setPlaceholder('✏️ Choose character to edit')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);
  return [row];
}

export function buildRemoveCharacterMenu(userId, mainChar, alts, subclasses) {
  const options = [];

  // Subclass options first (less destructive)
  subclasses.forEach((sub, index) => {
    options.push({
      label: `Subclass ${index + 1}: ${sub.class}`,
      value: `subclass_${sub.id}`,
      description: `${sub.subclass} (${sub.parent_ign || 'Main'})`,
      emoji: '📊'
    });
  });

  // Alt options
  alts.forEach((alt, index) => {
    options.push({
      label: `Alt ${index + 1}: ${alt.ign}`,
      value: `alt_${alt.id}`,
      description: `${alt.class} - ${alt.subclass}`,
      emoji: '🎭'
    });
  });

  // Main character option last (most destructive)
  if (mainChar) {
    options.push({
      label: `⚠️ Main: ${mainChar.ign}`,
      value: `main_${mainChar.id}`,
      description: '⚠️ Removes ALL alts and subclasses!',
      emoji: '⭐'
    });
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`remove_character_select_${userId}`)
    .setPlaceholder('🗑️ Choose character to remove')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);
  return [row];
}
