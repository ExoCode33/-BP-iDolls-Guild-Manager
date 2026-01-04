import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { CharacterRepo } from '../database/repositories.js';
import { COLORS } from '../config/game.js';
import * as registration from './registration.js';

export async function showAddCharacterMenu(interaction, userId) {
  console.log('[ADD CHARACTER] Showing menu for user:', userId);

  const main = await CharacterRepo.findMain(userId);
  const subclasses = await CharacterRepo.findSubclasses(userId);
  const alts = await CharacterRepo.findAlts(userId);

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setDescription(
      '# ➕ **Add Character**\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      'What type of character would you like to add?'
    )
    .setTimestamp();

  const options = [];

  // Add Main option if no main exists
  if (!main) {
    options.push({
      label: 'Main Character',
      value: 'add_main',
      description: 'Register your main character',
      emoji: '👑'
    });
  }

  // ✅ FIXED: Add Subclass option (max 3 per main)
  if (main && subclasses.length < 3) {
    options.push({
      label: `Subclass (${subclasses.length}/3)`,
      value: 'add_subclass',
      description: 'Add a subclass to your main character',
      emoji: '📊'
    });
  }

  // Add Alt option (max 3)
  const altCount = alts.length;
  if (main && altCount < 3) {
    options.push({
      label: `Alt Character (${altCount}/3)`,
      value: 'add_alt',
      description: 'Add an alternate character',
      emoji: '🎭'
    });
  }

  // If no options available
  if (options.length === 0) {
    const noOptionsEmbed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setDescription(
        '# ❌ **Maximum Characters Reached**\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '**You have reached the maximum number of characters:**\n\n' +
        '✅ Main Character: 1/1\n' +
        '✅ Subclasses: 3/3\n' +
        '✅ Alt Characters: 3/3\n\n' +
        'Use **Remove Character** to delete a character before adding a new one.'
      )
      .setTimestamp();

    await interaction.update({ embeds: [noOptionsEmbed], components: [] });
    return;
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_add_character_type_${userId}`)
    .setPlaceholder('➕ Select character type')
    .addOptions(options);

  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_profile_${userId}`)
    .setLabel('◀️ Back to Profile')
    .setStyle(ButtonStyle.Secondary);

  const row1 = new ActionRowBuilder().addComponents(selectMenu);
  const row2 = new ActionRowBuilder().addComponents(backButton);

  await interaction.update({ embeds: [embed], components: [row1, row2] });
}

export async function handleAddCharacterType(interaction, userId) {
  const type = interaction.values[0];
  console.log('[ADD CHARACTER] Type selected:', type);

  switch (type) {
    case 'add_main':
      await registration.start(interaction, userId);
      break;
    case 'add_subclass':
      const main = await CharacterRepo.findMain(userId);
      await registration.startSubclassRegistration(interaction, userId, main.id);
      break;
    case 'add_alt':
      await registration.startAltRegistration(interaction, userId);
      break;
  }
}

export default {
  showAddCharacterMenu,
  handleAddCharacterType
};
