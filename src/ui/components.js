import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { CLASSES, ABILITY_SCORES, REGIONS, TIERS } from '../config/game.js';
import config from '../config/index.js';

export function profileButtons(userId, hasMain) {
  if (!hasMain) {
    return [new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`reg_start_${userId}`)
        .setLabel('📝 Register Main Character')
        .setStyle(ButtonStyle.Primary)
    )];
  }

  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`add_${userId}`).setLabel('➕ Add').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`edit_${userId}`).setLabel('✏️ Edit').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`remove_${userId}`).setLabel('🗑️ Remove').setStyle(ButtonStyle.Secondary)
  )];
}

export function backButton(customId, label = '◀️ Back') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(ButtonStyle.Secondary)
  );
}

export function confirmButtons(userId, action) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`confirm_${action}_${userId}`).setLabel('✅ Confirm').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`cancel_${action}_${userId}`).setLabel('❌ Cancel').setStyle(ButtonStyle.Secondary)
  )];
}

export function regionSelect(userId) {
  const options = Object.keys(REGIONS).map(r => ({ label: r, value: r, emoji: '🌍' }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`reg_region_${userId}`)
      .setPlaceholder('🌍 Pick your region')
      .addOptions(options)
  );
}

export function countrySelect(userId, region) {
  const countries = Object.keys(REGIONS[region]);
  const options = countries.map(c => ({ label: c, value: c }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`reg_country_${userId}`)
      .setPlaceholder('🏳️ Pick your country')
      .addOptions(options)
  );
}

export function timezoneSelect(userId, region, country) {
  const timezones = REGIONS[region][country];
  const options = Object.entries(timezones).map(([label, value]) => ({
    label, value, description: label
  }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`reg_timezone_${userId}`)
      .setPlaceholder('🕐 Pick your timezone')
      .addOptions(options)
  );
}

export function classSelect(userId) {
  const options = Object.entries(CLASSES).map(([name, data]) => ({
    label: name,
    value: name,
    description: data.role,
    emoji: data.iconId ? { id: data.iconId } : data.emoji
  }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`reg_class_${userId}`)
      .setPlaceholder('🎭 Pick your class')
      .addOptions(options)
  );
}

export function subclassSelect(userId, className) {
  const data = CLASSES[className];
  const options = data.subclasses.map(s => ({
    label: s,
    value: s,
    description: data.role,
    emoji: data.iconId ? { id: data.iconId } : data.emoji
  }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`reg_subclass_${userId}`)
      .setPlaceholder('📋 Pick your subclass')
      .addOptions(options)
  );
}

export function scoreSelect(userId) {
  const options = ABILITY_SCORES.map(s => ({ label: s.label, value: s.value }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`reg_score_${userId}`)
      .setPlaceholder('💪 Pick your score')
      .addOptions(options)
  );
}

export function battleImagineSelect(userId, imagine) {
  const options = [
    { label: 'Skip / Don\'t own', value: 'skip', emoji: '⏭️' },
    ...TIERS.map(t => ({
      label: t,
      value: t,
      emoji: imagine.logo ? { id: imagine.logo } : '⭐'
    }))
  ];
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`reg_bi_${userId}`)
      .setPlaceholder(`Choose tier for ${imagine.name}`)
      .addOptions(options)
  );
}

export function guildSelect(userId) {
  const options = config.guilds.map(g => ({ label: g.name, value: g.name }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`reg_guild_${userId}`)
      .setPlaceholder('🏰 Pick your guild')
      .addOptions(options)
  );
}

export function ignModal(userId) {
  return new ModalBuilder()
    .setCustomId(`reg_ign_${userId}`)
    .setTitle('Enter Character Details')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('ign')
          .setLabel('In-Game Name (IGN)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('uid')
          .setLabel('UID (Numbers only)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50)
      )
    );
}

export function addTypeSelect(userId, subCount) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`add_type_${userId}`)
      .setPlaceholder('➕ What to add?')
      .addOptions([
        { label: 'Alt Character', value: 'alt', emoji: '🎭' },
        { label: `Subclass (${subCount}/3)`, value: 'subclass', emoji: '📊' }
      ])
  );
}

export function editTypeSelect(userId, hasMain, hasAlts, hasSubs) {
  const options = [];
  if (hasMain) options.push({ label: 'Main Character', value: 'main', emoji: '⭐' });
  if (hasSubs) options.push({ label: 'Subclass', value: 'subclass', emoji: '📊' });
  if (hasAlts) options.push({ label: 'Alt Character', value: 'alt', emoji: '🎭' });
  
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`edit_type_${userId}`)
      .setPlaceholder('✏️ What to edit?')
      .addOptions(options)
  );
}

export function removeTypeSelect(userId, hasMain, hasAlts, hasSubs) {
  const options = [];
  if (hasSubs) options.push({ label: 'Subclass', value: 'subclass', emoji: '📊' });
  if (hasAlts) options.push({ label: 'Alt Character', value: 'alt', emoji: '🎭' });
  if (hasMain) options.push({ label: '⚠️ Main Character', value: 'main', emoji: '⭐' });
  
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`remove_type_${userId}`)
      .setPlaceholder('🗑️ What to remove?')
      .addOptions(options)
  );
}

export function characterListSelect(userId, characters, action) {
  const options = characters.map((c, i) => ({
    label: `${c.character_type === 'alt' ? 'Alt' : 'Subclass'} ${i + 1}: ${c.ign || c.class}`,
    value: String(c.id),
    description: `${c.class} - ${c.subclass}`,
    emoji: c.character_type === 'alt' ? '🎭' : '📊'
  }));
  
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`${action}_char_${userId}`)
      .setPlaceholder(`Select character`)
      .addOptions(options)
  );
}

export function editFieldSelect(userId, type) {
  const options = [
    { label: 'Class & Subclass', value: 'class', emoji: '🎭' },
    { label: 'Ability Score', value: 'score', emoji: '💪' }
  ];

  if (type !== 'subclass') {
    options.unshift(
      { label: 'IGN', value: 'ign', emoji: '🎮' },
      { label: 'UID', value: 'uid', emoji: '🆔' }
    );
    options.push({ label: 'Guild', value: 'guild', emoji: '🏰' });
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`edit_field_${userId}`)
      .setPlaceholder('✏️ What to edit?')
      .addOptions(options)
  );
}

export function editModal(userId, field, currentValue = '') {
  const labels = {
    ign: 'New In-Game Name',
    uid: 'New UID (Numbers only)'
  };

  return new ModalBuilder()
    .setCustomId(`edit_${field}_${userId}`)
    .setTitle(`Edit ${field.toUpperCase()}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(field)
          .setLabel(labels[field] || `New ${field}`)
          .setStyle(TextInputStyle.Short)
          .setValue(currentValue)
          .setRequired(true)
          .setMaxLength(50)
      )
    );
}

export function parentSelect(userId, main, alts) {
  const options = [
    { label: `Main: ${main.ign}`, value: `main_${main.id}`, emoji: '⭐' },
    ...alts.map(a => ({ label: `Alt: ${a.ign}`, value: `alt_${a.id}`, emoji: '🎭' }))
  ];
  
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`parent_${userId}`)
      .setPlaceholder('📊 Which character?')
      .addOptions(options)
  );
}
