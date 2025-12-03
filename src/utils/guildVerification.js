import { EmbedBuilder } from 'discord.js';
import { getGuildByName } from '../config/gameData.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Verify if a user has the required role for their claimed guild
 * @param {GuildMember} member - The Discord guild member
 * @param {string} guildName - The name of the guild they claim to be in
 * @returns {Object} - { hasRole: boolean, guild: Object|null }
 */
export function verifyGuildRole(member, guildName) {
  const guild = getGuildByName(guildName);
  
  if (!guild) {
    return { hasRole: false, guild: null, reason: 'Guild not found' };
  }
  
  const hasRole = member.roles.cache.has(guild.roleId);
  
  return { 
    hasRole, 
    guild,
    reason: hasRole ? null : 'User does not have the required role'
  };
}

/**
 * Send a notification to moderators about a guild role mismatch
 * @param {Client} client - The Discord client
 * @param {GuildMember} member - The Discord guild member
 * @param {string} guildName - The guild name they claimed
 * @param {string} requiredRoleId - The role ID they should have
 * @param {string} characterIGN - The character's in-game name
 */
export async function notifyModerators(client, member, guildName, requiredRoleId, characterIGN) {
  const channelId = process.env.MODERATOR_NOTIFICATION_CHANNEL_ID;
  const moderatorRoleId = process.env.MODERATOR_ROLE_ID;
  
  if (!channelId) {
    console.error('⚠️  MODERATOR_NOTIFICATION_CHANNEL_ID not configured');
    return;
  }
  
  try {
    const channel = await client.channels.fetch(channelId);
    
    if (!channel) {
      console.error('❌ Could not find moderator notification channel');
      return;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('⚠️ Guild Role Verification Failed')
      .setDescription(`A user has registered with a guild but does not have the required role.`)
      .addFields(
        { name: '👤 User', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
        { name: '🎮 IGN', value: characterIGN, inline: true },
        { name: '🏰 Claimed Guild', value: guildName, inline: true },
        { name: '🎭 Required Role', value: `<@&${requiredRoleId}>`, inline: true },
        { name: '📋 Action Required', value: 'Please verify if this user should have the guild role and assign it if appropriate.', inline: false }
      )
      .setTimestamp()
      .setFooter({ text: 'Guild Role Verification System' });
    
    const mentionText = moderatorRoleId ? `<@&${moderatorRoleId}>` : '@Moderators';
    
    await channel.send({
      content: mentionText,
      embeds: [embed]
    });
    
    console.log(`✅ Moderator notification sent for ${member.user.tag} - Guild: ${guildName}`);
    
  } catch (error) {
    console.error('❌ Error sending moderator notification:', error);
  }
}

/**
 * Check if guilds are configured
 * @returns {boolean}
 */
export function areGuildsConfigured() {
  // Check if at least one guild is configured
  for (let i = 1; i <= 5; i++) {
    const guildName = process.env[`GUILD_${i}_NAME`];
    const guildRoleId = process.env[`GUILD_${i}_ROLE_ID`];
    
    if (guildName && guildName.trim() !== '' && guildRoleId && guildRoleId.trim() !== '') {
      return true;
    }
  }
  
  return false;
}

/**
 * Get a user-friendly warning message about guild role verification
 * @param {string} guildName - The guild name
 * @returns {string}
 */
export function getGuildVerificationWarning(guildName) {
  return `⚠️ **Note:** You selected **${guildName}** but you don't have the required guild role. ` +
         `A moderator has been notified to verify your guild membership. ` +
         `Your registration is complete, but you may need to contact a moderator if this was a mistake.`;
}
