import { MessageFlags } from 'discord.js';
import state from '../services/state.js';
import logger from '../services/logger.js';
import config from '../config/index.js';
import { isEphemeral } from '../services/ephemeral.js';
import { CharacterRepo } from '../database/repositories.js';

const ephemeralFlag = { flags: MessageFlags.Ephemeral };
import { embed, errorEmbed, successEmbed, profileEmbed } from '../ui/embeds.js';
import { updateNickname } from '../services/nickname.js';
import sheets from '../services/sheets.js';
import * as ui from '../ui/components.js';
import * as reg from './registration.js';
import { validateUID, formatScore } from '../ui/utils.js';

async function returnToProfile(interaction, userId) {
  const chars = await CharacterRepo.findAllByUser(userId);
  const main = chars.find(c => c.character_type === 'main');
  const profileEmb = await profileEmbed(interaction.user, chars, interaction);
  const buttons = ui.profileButtons(userId, !!main);
  await interaction.update({ embeds: [profileEmb], components: buttons });
}

export async function showAddMenu(interaction, userId) {
  const subCount = await CharacterRepo.countSubclasses(userId);
  const e = embed('➕ Add Character', 'What would you like to add?');
  const row = ui.addTypeSelect(userId, subCount);
  const back = ui.backButton(`back_profile_${userId}`);
  await interaction.update({ embeds: [e], components: [row, back] });
}

export async function handleAddType(interaction, userId) {
  const type = interaction.values[0];

  if (type === 'subclass') {
    const subCount = await CharacterRepo.countSubclasses(userId);
    if (subCount >= 3) {
      return interaction.update({
        embeds: [errorEmbed('Maximum 3 subclasses allowed.')],
        components: [ui.backButton(`back_profile_${userId}`)]
      });
    }

    const main = await CharacterRepo.findMain(userId);
    const alts = await CharacterRepo.findAlts(userId);

    if (!main) {
      return interaction.update({
        embeds: [errorEmbed('Register a main character first.')],
        components: [ui.backButton(`back_profile_${userId}`)]
      });
    }

    if (alts.length === 0) {
      state.set(userId, 'reg', { type: 'subclass', parentId: main.id, parentType: 'main', step: 'class' });
      return reg.start(interaction, userId, 'subclass');
    }

    const e = embed('📊 Add Subclass', 'Which character is this subclass for?');
    const row = ui.parentSelect(userId, main, alts);
    const back = ui.backButton(`add_${userId}`);
    return interaction.update({ embeds: [e], components: [row, back] });
  }

  state.set(userId, 'reg', { type: 'alt', step: 'class' });
  return reg.start(interaction, userId, 'alt');
}

export async function handleParentSelect(interaction, userId) {
  const [parentType, parentId] = interaction.values[0].split('_');
  state.set(userId, 'reg', { type: 'subclass', parentId: parseInt(parentId), parentType, step: 'class' });
  return reg.start(interaction, userId, 'subclass');
}

export async function showEditMenu(interaction, userId) {
  const chars = await CharacterRepo.findAllByUser(userId);
  const main = chars.find(c => c.character_type === 'main');
  const alts = chars.filter(c => c.character_type === 'alt');
  const subs = chars.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

  const e = embed('✏️ Edit Character', 'What would you like to edit?');
  const row = ui.editTypeSelect(userId, !!main, alts.length > 0, subs.length > 0);
  const back = ui.backButton(`back_profile_${userId}`);
  await interaction.update({ embeds: [e], components: [row, back] });
}

export async function handleEditType(interaction, userId) {
  const type = interaction.values[0];
  state.set(userId, 'edit', { type });

  if (type === 'main') {
    const main = await CharacterRepo.findMain(userId);
    state.update(userId, 'edit', { charId: main.id, char: main });
    return showFieldSelect(interaction, userId, 'main');
  }

  if (type === 'subclass') {
    const chars = await CharacterRepo.findAllByUser(userId);
    const subs = chars.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

    if (subs.length === 1) {
      state.update(userId, 'edit', { charId: subs[0].id, char: subs[0] });
      return showFieldSelect(interaction, userId, 'subclass');
    }

    const e = embed('✏️ Edit Subclass', 'Which subclass?');
    const row = ui.characterListSelect(userId, subs, 'edit');
    const back = ui.backButton(`edit_${userId}`);
    return interaction.update({ embeds: [e], components: [row, back] });
  }

  const alts = await CharacterRepo.findAlts(userId);

  if (alts.length === 1) {
    state.update(userId, 'edit', { charId: alts[0].id, char: alts[0] });
    return showFieldSelect(interaction, userId, 'alt');
  }

  const e = embed('✏️ Edit Alt', 'Which alt?');
  const row = ui.characterListSelect(userId, alts, 'edit');
  const back = ui.backButton(`edit_${userId}`);
  return interaction.update({ embeds: [e], components: [row, back] });
}

export async function handleEditCharSelect(interaction, userId) {
  const charId = parseInt(interaction.values[0]);
  const char = await CharacterRepo.findById(charId);
  const s = state.get(userId, 'edit');
  state.update(userId, 'edit', { charId, char });
  return showFieldSelect(interaction, userId, s.type);
}

async function showFieldSelect(interaction, userId, type) {
  const s = state.get(userId, 'edit');
  const charInfo = type === 'subclass' ? `**${s.char.class} - ${s.char.subclass}**` : `**${s.char.ign}**`;
  const e = embed('✏️ Edit Field', `Editing: ${charInfo}\n\nWhat do you want to change?`);
  const row = ui.editFieldSelect(userId, type);
  const back = ui.backButton(`edit_type_back_${userId}`);
  await interaction.update({ embeds: [e], components: [row, back] });
}

export async function handleFieldSelect(interaction, userId) {
  const field = interaction.values[0];
  const s = state.get(userId, 'edit');
  state.update(userId, 'edit', { field });

  if (field === 'ign' || field === 'uid') {
    return interaction.showModal(ui.editModal(userId, field, field === 'ign' ? s.char.ign : s.char.uid));
  }

  if (field === 'class') {
    const e = embed('🎭 Edit Class', 'Choose new class:');
    const row = ui.classSelect(userId);
    const back = ui.backButton(`edit_field_back_${userId}`);
    return interaction.update({ embeds: [e], components: [row, back] });
  }

  if (field === 'score') {
    const e = embed('💪 Edit Score', `Current: **${formatScore(s.char.ability_score)}**\n\nChoose new score:`);
    const row = ui.scoreSelect(userId);
    const back = ui.backButton(`edit_field_back_${userId}`);
    return interaction.update({ embeds: [e], components: [row, back] });
  }

  if (field === 'guild') {
    const e = embed('🏰 Edit Guild', `Current: **${s.char.guild || 'None'}**\n\nChoose new guild:`);
    const row = ui.guildSelect(userId);
    const back = ui.backButton(`edit_field_back_${userId}`);
    return interaction.update({ embeds: [e], components: [row, back] });
  }
}

export async function handleEditClass(interaction, userId) {
  const className = interaction.values[0];
  const s = state.get(userId, 'edit');
  state.update(userId, 'edit', { newClass: className });

  const e = embed('📋 Edit Subclass', `**Class:** ${className}\n\nChoose subclass:`);
  const row = ui.subclassSelect(userId, className);
  const back = ui.backButton(`edit_class_back_${userId}`);
  await interaction.update({ embeds: [e], components: [row, back] });
}

export async function handleEditSubclass(interaction, userId) {
  const subclass = interaction.values[0];
  const s = state.get(userId, 'edit');

  const oldVal = `${s.char.class} - ${s.char.subclass}`;
  const newVal = `${s.newClass} - ${subclass}`;

  await CharacterRepo.update(s.charId, { className: s.newClass, subclass });
  logger.edit(interaction.user.username, 'class', oldVal, newVal);

  state.clear(userId, 'edit');
  await returnToProfile(interaction, userId);
  sheets.sync(await CharacterRepo.findAll(), interaction.client);
}

export async function handleEditScore(interaction, userId) {
  const score = interaction.values[0];
  const s = state.get(userId, 'edit');

  const oldVal = formatScore(s.char.ability_score);
  const newVal = formatScore(score);

  await CharacterRepo.update(s.charId, { abilityScore: score });
  logger.edit(interaction.user.username, 'score', oldVal, newVal);

  state.clear(userId, 'edit');
  await returnToProfile(interaction, userId);
  sheets.sync(await CharacterRepo.findAll(), interaction.client);
}

export async function handleEditGuild(interaction, userId) {
  const guild = interaction.values[0];
  const s = state.get(userId, 'edit');

  const oldVal = s.char.guild || 'None';
  await CharacterRepo.update(s.charId, { guild });
  logger.edit(interaction.user.username, 'guild', oldVal, guild);

  state.clear(userId, 'edit');
  await returnToProfile(interaction, userId);
  sheets.sync(await CharacterRepo.findAll(), interaction.client);
}

export async function handleEditModal(interaction, userId, field) {
  const value = interaction.fields.getTextInputValue(field).trim();
  const s = state.get(userId, 'edit');

  if (field === 'uid' && !validateUID(value)) {
    return interaction.reply({ embeds: [errorEmbed('UID must contain only numbers.')], ...ephemeralFlag });
  }

  const oldVal = field === 'ign' ? s.char.ign : s.char.uid;
  await CharacterRepo.update(s.charId, { [field]: value });
  logger.edit(interaction.user.username, field, oldVal, value);

  if (field === 'ign' && s.type === 'main' && config.sync.nicknameEnabled) {
    await updateNickname(interaction.client, config.discord.guildId, userId, value);
  }

  state.clear(userId, 'edit');

  const chars = await CharacterRepo.findAllByUser(userId);
  const main = chars.find(c => c.character_type === 'main');
  const profileEmb = await profileEmbed(interaction.user, chars, interaction);
  const buttons = ui.profileButtons(userId, !!main);

  const isEph = await isEphemeral(interaction.guildId, 'edit');
  await interaction.reply({ embeds: [profileEmb], components: buttons, ...(isEph ? ephemeralFlag : {}) });
  sheets.sync(await CharacterRepo.findAll(), interaction.client);
}

export async function showRemoveMenu(interaction, userId) {
  const chars = await CharacterRepo.findAllByUser(userId);
  const main = chars.find(c => c.character_type === 'main');
  const alts = chars.filter(c => c.character_type === 'alt');
  const subs = chars.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

  const e = embed('🗑️ Remove Character', 'What would you like to remove?');
  const row = ui.removeTypeSelect(userId, !!main, alts.length > 0, subs.length > 0);
  const back = ui.backButton(`back_profile_${userId}`);
  await interaction.update({ embeds: [e], components: [row, back] });
}

export async function handleRemoveType(interaction, userId) {
  const type = interaction.values[0];
  state.set(userId, 'remove', { type });

  if (type === 'main') {
    const e = embed('⚠️ Delete All Data', 
      '**This will permanently delete:**\n• Your main character\n• All alt characters\n• All subclasses\n\nAre you sure?');
    const buttons = ui.confirmButtons(userId, 'deleteall');
    return interaction.update({ embeds: [e], components: buttons });
  }

  if (type === 'subclass') {
    const chars = await CharacterRepo.findAllByUser(userId);
    const subs = chars.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');

    if (subs.length === 1) {
      state.update(userId, 'remove', { charId: subs[0].id, char: subs[0] });
      const e = embed('🗑️ Delete Subclass', 
        `Delete **${subs[0].class} - ${subs[0].subclass}**?`);
      const buttons = ui.confirmButtons(userId, 'delete');
      return interaction.update({ embeds: [e], components: buttons });
    }

    const e = embed('🗑️ Delete Subclass', 'Which subclass?');
    const row = ui.characterListSelect(userId, subs, 'remove');
    const back = ui.backButton(`remove_${userId}`);
    return interaction.update({ embeds: [e], components: [row, back] });
  }

  const alts = await CharacterRepo.findAlts(userId);

  if (alts.length === 1) {
    state.update(userId, 'remove', { charId: alts[0].id, char: alts[0] });
    const e = embed('🗑️ Delete Alt', `Delete **${alts[0].ign}**?`);
    const buttons = ui.confirmButtons(userId, 'delete');
    return interaction.update({ embeds: [e], components: buttons });
  }

  const e = embed('🗑️ Delete Alt', 'Which alt?');
  const row = ui.characterListSelect(userId, alts, 'remove');
  const back = ui.backButton(`remove_${userId}`);
  return interaction.update({ embeds: [e], components: [row, back] });
}

export async function handleRemoveCharSelect(interaction, userId) {
  const charId = parseInt(interaction.values[0]);
  const char = await CharacterRepo.findById(charId);
  const s = state.get(userId, 'remove');
  state.update(userId, 'remove', { charId, char });

  const label = s.type === 'subclass' ? `${char.class} - ${char.subclass}` : char.ign;
  const e = embed('🗑️ Confirm Delete', `Delete **${label}**?`);
  const buttons = ui.confirmButtons(userId, 'delete');
  await interaction.update({ embeds: [e], components: buttons });
}

export async function confirmDelete(interaction, userId) {
  const s = state.get(userId, 'remove');

  await CharacterRepo.delete(s.charId);
  const label = s.type === 'subclass' ? `${s.char.class} - ${s.char.subclass}` : s.char.ign;
  logger.delete(interaction.user.username, s.type, label);

  state.clear(userId, 'remove');
  await returnToProfile(interaction, userId);
  sheets.sync(await CharacterRepo.findAll(), interaction.client);
}

export async function confirmDeleteAll(interaction, userId) {
  await CharacterRepo.deleteAllByUser(userId);
  logger.delete(interaction.user.username, 'all', 'All characters');

  state.clear(userId, 'remove');

  const e = successEmbed('All your character data has been deleted.');
  const buttons = ui.profileButtons(userId, false);
  await interaction.update({ embeds: [e], components: buttons });
  sheets.sync(await CharacterRepo.findAll(), interaction.client);
}

export async function cancelAction(interaction, userId) {
  state.clear(userId, 'remove');
  state.clear(userId, 'edit');
  await returnToProfile(interaction, userId);
}

export async function backToProfile(interaction, userId) {
  state.clear(userId, 'edit');
  state.clear(userId, 'remove');
  state.clear(userId, 'reg');
  await returnToProfile(interaction, userId);
}

export async function backToEditType(interaction, userId) {
  return showEditMenu(interaction, userId);
}

export async function backToFieldSelect(interaction, userId) {
  const s = state.get(userId, 'edit');
  return showFieldSelect(interaction, userId, s.type);
}

export async function backToClassSelect(interaction, userId) {
  const s = state.get(userId, 'edit');
  const e = embed('🎭 Edit Class', 'Choose new class:');
  const row = ui.classSelect(userId);
  const back = ui.backButton(`edit_field_back_${userId}`);
  await interaction.update({ embeds: [e], components: [row, back] });
}
