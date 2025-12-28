import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

// This function adds vote count footer to existing profile embed
export function addVotingFooter(profileEmbed, application) {
  const acceptVotes = application.accept_votes || [];
  const denyVotes = application.deny_votes || [];
  
  const acceptList = acceptVotes.length > 0 
    ? acceptVotes.map(id => `<@${id}>`).join(', ')
    : '*None*';
  
  const denyList = denyVotes.length > 0 
    ? denyVotes.map(id => `<@${id}>`).join(', ')
    : '*None*';

  // Add voting fields to the profile embed
  profileEmbed.addFields(
    { name: '\u200b', value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', inline: false },
    { name: '🏰 Guild Application', value: `Applied to: **${application.guild_name}**`, inline: false },
    { name: `✅ Accept Votes (${acceptVotes.length}/2)`, value: acceptList, inline: true },
    { name: `❌ Deny Votes (${denyVotes.length}/2)`, value: denyList, inline: true }
  );

  return profileEmbed;
}

export function createApplicationButtons(applicationId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`app_vote_accept_${applicationId}`)
        .setLabel('Vote Accept')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`app_vote_deny_${applicationId}`)
        .setLabel('Vote Deny')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`app_override_${applicationId}`)
        .setLabel('Admin Override')
        .setEmoji('👑')
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function createOverrideButtons(applicationId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`app_override_accept_${applicationId}`)
        .setLabel('Override: Accept')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`app_override_deny_${applicationId}`)
        .setLabel('Override: Deny')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`app_override_cancel_${applicationId}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}
