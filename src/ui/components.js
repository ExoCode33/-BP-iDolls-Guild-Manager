import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { CLASSES, ABILITY_SCORES, REGIONS, TIERS } from '../config/game.js';
import config from '../config/index.js';
import { formatScore } from './utils.js';

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

export function adminProfileButtons(userId, hasMain) {
  if (!hasMain) {
    return [new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_reg_start_${userId}`)
        .setLabel('📝 Register Main Character')
        .setStyle(ButtonStyle.Primary)
    )];
  }

  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`admin_add_${userId}`).setLabel('➕ Add').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`admin_edit_${userId}`).setLabel('✏️ Edit').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`admin_remove_${userId}`).setLabel('🗑️ Remove').setStyle(ButtonStyle.Danger)
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

// ✨ UPDATED: Added descriptions and emojis
export function regionSelect(userId) {
  const options = Object.keys(REGIONS).map(r => ({
    label: r,
    value: r,
    emoji: '🌍',
    description: 'Where you\'re playing from'
  }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`reg_region_${userId}`)
      .setPlaceholder('🌍 Pick your region')
      .addOptions(options)
  );
}

// ✨ UPDATED: Added descriptions
export function countrySelect(userId, region) {
  const countries = Object.keys(REGIONS[region]);
  const options = countries.map(c => ({
    label: c,
    value: c,
    description: 'Select your location'
  }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`reg_country_${userId}`)
      .setPlaceholder('🏳️ Pick your country')
      .addOptions(options)
  );
}

// ✨ UPDATED: Added descriptions and emojis
export function timezoneSelect(userId, region, country) {
  const timezones = REGIONS[region][country];
  const options = Object.entries(timezones).map(([label, value]) => ({
    label,
    value,
    description: label.split('(')[1]?.replace(')', '') || 'Timezone',
    emoji: '🕐'
  }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`reg_timezone_${userId}`)
      .setPlaceholder('🕐 Pick your timezone')
      .addOptions(options)
  );
}

// ✨ UPDATED: Added descriptions and emojis
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

// ✨ UPDATED: Added descriptions and emojis
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

// ✨ UPDATED: Added descriptions and emojis
export function scoreSelect(userId) {
  const options = ABILITY_SCORES.map(s => ({
    label: s.label,
    value: s.value,
    description: 'Your ability score range',
    emoji: '💪'
  }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`reg_score_${userId}`)
      .setPlaceholder('💪 Pick your score')
      .addOptions(options)
  );
}

// ✨ UPDATED: Added descriptions and emojis
export function battleImagineSelect(userId, imagine) {
  const options = [
    { label: 'Skip / Don\'t own', value: 'skip', emoji: '⏭️', description: 'I don\'t have this imagine' },
    ...TIERS.map(t => ({
      label: t,
      value: t,
      emoji: imagine.logo ? { id: imagine.logo } : '⭐',
      description: `Highest tier: ${t}`
    }))
  ];
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`reg_bi_${userId}`)
      .setPlaceholder(`Choose tier for ${imagine.name}`)
      .addOptions(options)
  );
}

// ✨ UPDATED: Added descriptions and emojis
export function guildSelect(userId) {
  const options = config.guilds.map(g => ({
    label: g.name,
    value: g.name,
    description: 'Choose your guild',
    emoji: '🏰'
  }));
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
        { label: 'Alt Character', value: 'alt', description: 'Register a new alt character', emoji: '🎭' },
        { label: `Subclass (${subCount}/3)`, value: 'subclass', description: 'Add subclass to existing character', emoji: '📊' }
      ])
  );
}

export function editTypeSelect(userId, main, alts, subs) {
  const options = [];
  
  if (main) {
    options.push({ 
      label: 'Main Character', 
      value: 'main', 
      description: `${main.ign} - ${main.class}`,
      emoji: '⭐' 
    });
  }
  
  if (subs.length > 0) {
    options.push({ 
      label: 'Subclass', 
      value: 'subclass', 
      description: `Edit one of ${subs.length} subclass${subs.length > 1 ? 'es' : ''}`,
      emoji: '📊' 
    });
  }
  
  if (alts.length > 0) {
    options.push({ 
      label: 'Alt Character', 
      value: 'alt', 
      description: `Edit one of ${alts.length} alt${alts.length > 1 ? 's' : ''}`,
      emoji: '🎭' 
    });
  }
  
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`edit_type_${userId}`)
      .setPlaceholder('✏️ What to edit?')
      .addOptions(options)
  );
}

export function removeTypeSelect(userId, main, alts, subs) {
  const options = [];
  
  if (main) {
    options.push({ 
      label: 'Main Character', 
      value: 'main', 
      description: `${main.ign} - Remove main only`,
      emoji: '⭐' 
    });
  }
  
  if (subs.length > 0) {
    options.push({ 
      label: 'Subclass', 
      value: 'subclass', 
      description: `Remove one of ${subs.length} subclass${subs.length > 1 ? 'es' : ''}`,
      emoji: '📊' 
    });
  }
  
  if (alts.length > 0) {
    options.push({ 
      label: 'Alt Character', 
      value: 'alt', 
      description: `Remove one of ${alts.length} alt${alts.length > 1 ? 's' : ''}`,
      emoji: '🎭' 
    });
  }
  
  if (main || alts.length > 0 || subs.length > 0) {
    options.push({ 
      label: '⚠️ Delete All Data', 
      value: 'all', 
      description: 'Remove everything',
      emoji: '🗑️' 
    });
  }
  
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`remove_type_${userId}`)
      .setPlaceholder('🗑️ What to remove?')
      .addOptions(options)
  );
}

export function altListSelect(userId, alts, action) {
  const options = alts.map((alt, i) => ({
    label: `Alt ${i + 1}: ${alt.ign}`,
    value: String(alt.id),
    description: `${alt.class} - ${alt.subclass}`,
    emoji: '🎭'
  }));
  
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`${action}_alt_${userId}`)
      .setPlaceholder(`Select alt`)
      .addOptions(options)
  );
}

export function subclassListSelect(userId, subs, action) {
  const options = subs.map((sub, i) => ({
    label: `Subclass ${i + 1}: ${sub.class}`,
    value: String(sub.id),
    description: `${sub.subclass} - ${formatScore(sub.ability_score)}`,
    emoji: '📊'
  }));
  
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`${action}_subclass_${userId}`)
      .setPlaceholder(`Select subclass`)
      .addOptions(options)
  );
}

export function editFieldSelect(userId, char, type, battleImagines = []) {
  const options = [];
  
  if (type !== 'subclass') {
    options.push(
      { label: 'IGN', value: 'ign', description: `Current: ${char.ign}`, emoji: '🎮' },
      { label: 'UID', value: 'uid', description: `Current: ${char.uid || 'Not set'}`, emoji: '🆔' }
    );
  }
  
  options.push(
    { label: 'Class & Subclass', value: 'class', description: `${char.class} - ${char.subclass}`, emoji: '🎭' },
    { label: 'Ability Score', value: 'score', description: `Current: ${formatScore(char.ability_score)}`, emoji: '💪' }
  );
  
  if (type !== 'subclass') {
    options.push(
      { label: 'Guild', value: 'guild', description: `Current: ${char.guild || 'None'}`, emoji: '🏰' }
    );
    
    if (config.battleImagines.length > 0) {
      const biCount = battleImagines.length;
      options.push({
        label: 'Battle Imagines',
        value: 'battle_imagines',
        description: biCount > 0 ? `${biCount} configured` : 'Not set',
        emoji: '⚔️'
      });
    }
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`edit_field_${userId}`)
      .setPlaceholder('✏️ What to edit?')
      .addOptions(options)
  );
}

export function editBattleImagineListSelect(userId, currentImagines) {
  const options = config.battleImagines.map(bi => {
    const current = currentImagines.find(ci => ci.imagine_name === bi.name);
    return {
      label: bi.name,
      value: bi.name,
      description: current ? `Current: ${current.tier}` : 'Not set',
      emoji: bi.logo ? { id: bi.logo } : '⚔️'
    };
  });
  
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`edit_bi_select_${userId}`)
      .setPlaceholder('⚔️ Select Battle Imagine to edit')
      .addOptions(options)
  );
}

export function editBattleImagineTierSelect(userId, imagine, currentTier = null) {
  const options = [
    { label: 'Remove / Don\'t own', value: 'remove', emoji: '❌', default: !currentTier },
    ...TIERS.map(t => ({
      label: t,
      value: t,
      emoji: imagine.logo ? { id: imagine.logo } : '⭐',
      default: currentTier === t
    }))
  ];
  
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`edit_bi_tier_${userId}`)
      .setPlaceholder(`Set tier for ${imagine.name}`)
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
    { label: `Main: ${main.ign}`, value: `main_${main.id}`, description: `${main.class} - ${main.subclass}`, emoji: '⭐' },
    ...alts.map(a => ({ 
      label: `Alt: ${a.ign}`, 
      value: `alt_${a.id}`, 
      description: `${a.class} - ${a.subclass}`,
      emoji: '🎭' 
    }))
  ];
  
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`parent_${userId}`)
      .setPlaceholder('📊 Which character is this subclass for?')
      .addOptions(options)
  );
}
