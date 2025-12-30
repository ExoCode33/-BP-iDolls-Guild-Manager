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

export function countrySelect(userId, region) {
  const countries = Object.keys(REGIONS[region]);
  const options = countries.map(c => {
    const emoji = c.split(' ')[0] || '🏳️';
    return {
      label: c,
      value: c,
      description: 'Select your location',
      emoji: emoji
    };
  });
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

export function guildSelect(userId) {
  const options = config.guilds.map(g => ({
    label: g.name,
    value: g.name,
    description: 'Choose your guild',
    emoji: '🏰'
  }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`select_guild_${userId}`)
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
        { label: `Subclass (${subCount}/3)`, value: 'subclass', description: 'Add subclass to main character', emoji: '📊' }
      ])
  );
}

export function editTypeSelect(userId, main, alts, subs) {
  const options = [];
  
  if (main) {
    options.push({ 
      label: 'Main Character', 
      value: 'main', 
      description: `${main.ign} - ${main.className}`,
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
  
  if (main || subs.length > 0) {
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

export function subclassListSelect(userId, subs, action) {
  const options = subs.map((sub, i) => ({
    label: `Subclass ${i + 1}: ${sub.className}`,
    value: String(sub.id),
    description: `${sub.subclass} - ${formatScore(sub.abilityScore)}`,
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
    { label: 'Class & Subclass', value: 'class', description: `${char.className} - ${char.subclass}`, emoji: '🎭' },
    { label: 'Ability Score', value: 'score', description: `Current: ${formatScore(char.abilityScore)}`, emoji: '💪' }
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
    const current = currentImagines.find(ci => ci.imagineName === bi.name);
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
