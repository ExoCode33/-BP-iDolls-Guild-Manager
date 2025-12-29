import { MessageFlags } from 'discord.js';
import state from '../services/state.js';
import logger from '../services/logger.js';
import config from '../config/index.js';
import { isEphemeral } from '../services/ephemeral.js';
import { CharacterRepo, BattleImagineRepo, ApplicationRepo } from '../database/repositories.js';
import applicationService from '../services/applications.js';
import classRoleService from '../services/classRoles.js';

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
  
  let user;
  try {
    user = await interaction.client.users.fetch(userId);
  } catch (e) {
    user = interaction.user;
  }
  
  const profileEmb = await profileEmbed(user, chars, interaction);
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

    if (!main) {
      return interaction.update({
        embeds: [errorEmbed('Register a main character first.')],
        components: [ui.backButton(`back_profile_${userId}`)]
      });
    }

    state.set(userId, 'reg', { type: 'subclass', parentId: main.id, parentType: 'main', step: 'class' });
    return reg.start(interaction, userId, 'subclass');
  }
}

export async function showEditMenu(interaction, userId) {
  const chars = await CharacterRepo.findAllByUser(userId);
  const main = chars.find(c => c.character_type === 'main');
  const subs = chars.filter(c => c.character_type === 'main_subclass');

  if (!main && subs.length === 0) {
    return interaction.update({
      embeds: [errorEmbed('No characters to edit!')],
      components: [ui.backButton(`back_profile_${userId}`)]
    });
  }

  const e = embed('✏️ Edit Character', 'Which type of character do you want to edit?');
  const row = ui.editTypeSelect(userId, main, [], subs);
  const back = ui.backButton(`back_profile_${userId}`);
  await interaction.update({ embeds: [e], components: [row, back] });
}

export async function handleEditType(interaction, userId) {
  const type = interaction.values[0];
  state.set(userId, 'edit', { type });

  if (type === 'main') {
    const main = await CharacterRepo.findMain(userId);
    const bi = await BattleImagineRepo.findByCharacter(main.id);
    state.update(userId, 'edit', { charId: main.id, char: main });
    return showFieldSelect(interaction, userId, 'main', main, bi);
  }

  if (type === 'subclass') {
    const chars = await CharacterRepo.findAllByUser(userId);
    const subs = chars.filter(c => c.character_type === 'main_subclass');

    if (subs.length === 1) {
      state.update(userId, 'edit', { charId: subs[0].id, char: subs[0] });
      return showFieldSelect(interaction, userId, 'subclass', subs[0], []);
    }

    const e = embed('✏️ Edit Subclass', 'Which subclass do you want to edit?');
    const row = ui.subclassListSelect(userId, subs, 'edit');
    const back = ui.backButton(`edit_${userId}`);
    return interaction.update({ embeds: [e], components: [row, back] });
  }
}

export async function handleEditSubclassSelect(interaction, userId) {
  const charId = parseInt(interaction.values[0]);
  const char = await CharacterRepo.findById(charId);
  state.update(userId, 'edit', { charId, char });
  return showFieldSelect(interaction, userId, 'subclass', char, []);
}

async function showFieldSelect(interaction, userId, type, char, battleImagines) {
  const charInfo = type === 'subclass' 
    ? `**${char.class} - ${char.subclass}**` 
    : `**${char.ign}** - ${char.class}`;
  
  const e = embed('✏️ Edit Character', `Editing: ${charInfo}\n\nChoose what you want to edit:`);
  const row = ui.editFieldSelect(userId, char, type, battleImagines);
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
    const e = embed('🎭 Edit Class', `Current: **${s.char.class} - ${s.char.subclass}**\n\nChoose new class:`);
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

  if (field === 'battle_imagines') {
    const currentBI = await BattleImagineRepo.findByCharacter(s.charId);
    const e = embed('⚔️ Edit Battle Imagines', 'Select a Battle Imagine to edit:');
    const row = ui.editBattleImagineListSelect(userId, currentBI);
    const back = ui.backButton(`edit_field_back_${userId}`);
    return interaction.update({ embeds: [e], components: [row, back] });
  }
}

export async function handleEditBattleImagineSelect(interaction, userId) {
  const imagineName = interaction.values[0];
  const s = state.get(userId, 'edit');
  
  const currentBI = await BattleImagineRepo.findByCharacter(s.charId);
  const current = currentBI.find(bi => bi.imagine_name === imagineName);
  const imagine = config.battleImagines.find(bi => bi.name === imagineName);
  
  state.update(userId, 'edit', { editingBI: imagineName });
  
  const e = embed('⚔️ Edit Battle Imagine', `**${imagineName}**\n\nCurrent: ${current ? current.tier : 'Not set'}\n\nSelect new tier:`);
  const row = ui.editBattleImagineTierSelect(userId, imagine, current?.tier);
  const back = ui.backButton(`edit_bi_back_${userId}`);
  return interaction.update({ embeds: [e], components: [row, back] });
}

export async function handleEditBattleImagineTier(interaction, userId) {
  const tier = interaction.values[0];
  const s = state.get(userId, 'edit');
  
  if (tier === 'remove') {
    await BattleImagineRepo.deleteByCharacterAndName(s.charId, s.editingBI);
    logger.edit(interaction.user.username, 'battle_imagine', s.editingBI, 'removed');
  } else {
    await BattleImagineRepo.add(s.charId, s.editingBI, tier);
    logger.edit(interaction.user.username, 'battle_imagine', s.editingBI, tier);
  }
  
  state.update(userId, 'edit', { editingBI: null });
  
  const currentBI = await BattleImagineRepo.findByCharacter(s.charId);
  const e = embed('⚔️ Edit Battle Imagines', 'Select a Battle Imagine to edit:');
  const row = ui.editBattleImagineListSelect(userId, currentBI);
  const back = ui.backButton(`edit_field_back_${userId}`);
  
  await interaction.update({ embeds: [e], components: [row, back] });
  sheets.sync(await CharacterRepo.findAll(), interaction.client);
}

export async function backToBattleImagineList(interaction, userId) {
  const s = state.get(userId, 'edit');
  const currentBI = await BattleImagineRepo.findByCharacter(s.charId);
  const e = embed('⚔️ Edit Battle Imagines', 'Select a Battle Imagine to edit:');
  const row = ui.editBattleImagineListSelect(userId, currentBI);
  const back = ui.backButton(`edit_field_back_${userId}`);
  return interaction.update({ embeds: [e], components: [row, back] });
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
  const oldClass = s.char.class;
  const newClass = s.newClass;

  await CharacterRepo.update(s.charId, { className: s.newClass, subclass });
  logger.edit(interaction.user.username, 'class', oldVal, newVal);

  // ✅ UPDATE CLASS ROLES - Remove old, add new
  if (oldClass !== newClass) {
    await classRoleService.removeClassRoleIfUnused(userId, oldClass);
    await classRoleService.addClassRole(userId, newClass);
  }

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

  const isMain = s.type === 'main';
  if (isMain) {
    try {
      const guildObj = await interaction.client.guilds.fetch(config.discord.guildId);
      const member = await guildObj.members.fetch(userId);
      
      if (oldVal === 'iDolls' || guild === 'iDolls') {
        const existingApp = await ApplicationRepo.findAllByUserAndCharacter(userId, s.charId);
        
        if (existingApp) {
          console.log(`[EDIT] Deleting existing application ID ${existingApp.id} (status: ${existingApp.status})`);
          
          if (existingApp.message_id && config.channels.admin) {
            try {
              const adminChannel = await interaction.client.channels.fetch(config.channels.admin);
              const oldMessage = await adminChannel.messages.fetch(existingApp.message_id);
              await oldMessage.delete();
              console.log(`[EDIT] Deleted message ${existingApp.message_id}`);
            } catch (e) {
              console.log(`[EDIT] Could not delete message: ${e.message}`);
            }
          }
          
          await ApplicationRepo.delete(existingApp.id);
          console.log(`[EDIT] Deleted application from database`);
        }
      }
      
      if (guild === 'Visitor') {
        if (config.roles.guild1 && member.roles.cache.has(config.roles.guild1)) {
          await member.roles.remove(config.roles.guild1);
          console.log(`[EDIT] Removed guild role from ${userId}`);
        }
        
        if (config.roles.visitor) {
          await member.roles.add(config.roles.visitor);
          console.log(`[EDIT] Added Visitor role to ${userId}`);
        }
        
        if (config.roles.registered && member.roles.cache.has(config.roles.registered)) {
          await member.roles.remove(config.roles.registered);
          console.log(`[EDIT] Removed Registered role from ${userId}`);
        }
      } else if (guild === 'iDolls' && config.roles.guild1) {
        if (config.roles.registered) {
          await member.roles.add(config.roles.registered);
          console.log(`[EDIT] Added Registered role to ${userId}`);
        }
        
        if (config.roles.visitor && member.roles.cache.has(config.roles.visitor)) {
          await member.roles.remove(config.roles.visitor);
          console.log(`[EDIT] Removed Visitor role from ${userId}`);
        }
        
        await applicationService.createApplication(userId, s.charId, guild);
        console.log(`[EDIT] Created NEW application for ${userId} to join ${guild}`);
      } else {
        if (config.roles.registered) {
          await member.roles.add(config.roles.registered);
          console.log(`[EDIT] Added Registered role to ${userId}`);
        }
        
        if (config.roles.visitor && member.roles.cache.has(config.roles.visitor)) {
          await member.roles.remove(config.roles.visitor);
          console.log(`[EDIT] Removed Visitor role from ${userId}`);
        }
      }
    } catch (error) {
      console.error('[EDIT] Role/application error:', error.message);
    }
  }

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

  let user;
  try {
    user = await interaction.client.users.fetch(userId);
  } catch (e) {
    user = interaction.user;
  }

  const chars = await CharacterRepo.findAllByUser(userId);
  const main = chars.find(c => c.character_type === 'main');
  const profileEmb = await profileEmbed(user, chars, interaction);
  const buttons = ui.profileButtons(userId, !!main);

  const isEph = await isEphemeral(interaction.guildId, 'character');
  await interaction.reply({ embeds: [profileEmb], components: buttons, ...(isEph ? ephemeralFlag : {}) });
  sheets.sync(await CharacterRepo.findAll(), interaction.client);
}

export async function showRemoveMenu(interaction, userId) {
  const chars = await CharacterRepo.findAllByUser(userId);
  const main = chars.find(c => c.character_type === 'main');
  const subs = chars.filter(c => c.character_type === 'main_subclass');

  const e = embed('🗑️ Remove Character', 'What would you like to remove?');
  const row = ui.removeTypeSelect(userId, main, [], subs);
  const back = ui.backButton(`back_profile_${userId}`);
  await interaction.update({ embeds: [e], components: [row, back] });
}

export async function handleRemoveType(interaction, userId) {
  const type = interaction.values[0];
  state.set(userId, 'remove', { type });

  if (type === 'all') {
    const e = embed('⚠️ Delete All Data', 
      '**This will permanently delete:**\n• Your main character\n• All subclasses\n\nAre you sure?');
    const buttons = ui.confirmButtons(userId, 'deleteall');
    return interaction.update({ embeds: [e], components: buttons });
  }

  if (type === 'main') {
    const main = await CharacterRepo.findMain(userId);
    state.update(userId, 'remove', { charId: main.id, char: main });
    const e = embed('🗑️ Remove Main Character', 
      `**Are you sure you want to remove your main character?**\n\n🎮 **${main.ign}**\n🎭 ${main.class} • ${main.subclass}\n\n⚠️ Your subclasses will NOT be deleted.`);
    const buttons = ui.confirmButtons(userId, 'delete');
    return interaction.update({ embeds: [e], components: buttons });
  }

  if (type === 'subclass') {
    const chars = await CharacterRepo.findAllByUser(userId);
    const subs = chars.filter(c => c.character_type === 'main_subclass');

    if (subs.length === 1) {
      state.update(userId, 'remove', { charId: subs[0].id, char: subs[0] });
      const e = embed('🗑️ Remove Subclass', 
        `**Are you sure you want to remove this subclass?**\n\n🎭 **${subs[0].class} • ${subs[0].subclass}**\n💪 ${formatScore(subs[0].ability_score)}`);
      const buttons = ui.confirmButtons(userId, 'delete');
      return interaction.update({ embeds: [e], components: buttons });
    }

    const e = embed('🗑️ Remove Subclass', 'Which subclass do you want to remove?');
    const row = ui.subclassListSelect(userId, subs, 'remove');
    const back = ui.backButton(`remove_${userId}`);
    return interaction.update({ embeds: [e], components: [row, back] });
  }
}

export async function handleRemoveSubclassSelect(interaction, userId) {
  const charId = parseInt(interaction.values[0]);
  const char = await CharacterRepo.findById(charId);
  state.update(userId, 'remove', { charId, char });

  const e = embed('🗑️ Remove Subclass', 
    `**Are you sure you want to remove this subclass?**\n\n🎭 **${char.class} • ${char.subclass}**\n💪 ${formatScore(char.ability_score)}`);
  const buttons = ui.confirmButtons(userId, 'delete');
  await interaction.update({ embeds: [e], components: buttons });
}

export async function confirmDelete(interaction, userId) {
  const s = state.get(userId, 'remove');
  const deletedClass = s.char.class;

  await CharacterRepo.delete(s.charId);
  const label = s.type === 'subclass' ? `${s.char.class} - ${s.char.subclass}` : s.char.ign;
  logger.delete(interaction.user.username, s.type, label);

  // ✅ REMOVE CLASS ROLE IF NO LONGER USED
  await classRoleService.removeClassRoleIfUnused(userId, deletedClass);

  state.clear(userId, 'remove');
  await returnToProfile(interaction, userId);
  sheets.sync(await CharacterRepo.findAll(), interaction.client);
}

export async function confirmDeleteAll(interaction, userId) {
  await CharacterRepo.deleteAllByUser(userId);
  logger.delete(interaction.user.username, 'all', 'All characters');

  // ✅ SYNC ALL CLASS ROLES (will remove all since no characters)
  await classRoleService.fullSync(userId);

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
  const bi = s.type !== 'subclass' ? await BattleImagineRepo.findByCharacter(s.charId) : [];
  return showFieldSelect(interaction, userId, s.type, s.char, bi);
}

export async function backToClassSelect(interaction, userId) {
  const s = state.get(userId, 'edit');
  const e = embed('🎭 Edit Class', `Current: **${s.char.class} - ${s.char.subclass}**\n\nChoose new class:`);
  const row = ui.classSelect(userId);
  const back = ui.backButton(`edit_field_back_${userId}`);
  await interaction.update({ embeds: [e], components: [row, back] });
}
