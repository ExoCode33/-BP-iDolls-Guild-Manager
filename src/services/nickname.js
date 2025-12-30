import logger from './logger.js';

export async function updateNickname(client, guildId, userId, ign) {
  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) return { success: false, reason: 'Guild not found' };

    const member = await guild.members.fetch(userId);
    if (!member) return { success: false, reason: 'Member not found' };

    const current = member.nickname || member.user.username;
    if (current === ign) return { success: true };

    if (ign.length > 32) return { success: false, reason: 'IGN too long' };
    if (member.id === guild.ownerId) return { success: false, reason: 'Server owner' };

    const bot = guild.members.me;
    if (!bot.permissions.has('ManageNicknames')) {
      return { success: false, reason: 'Missing permission' };
    }

    if (member.roles.highest.position >= bot.roles.highest.position) {
      return { success: false, reason: 'Role hierarchy' };
    }

    await member.setNickname(ign, 'IGN sync');
    return { success: true };
  } catch (e) {
    if (e.code === 50013) return { success: false, reason: 'Permission denied' };
    if (e.code === 10007) return { success: false, reason: 'Member left' };
    return { success: false, reason: e.message };
  }
}

export async function syncAllNicknames(client, guildId, mainCharacters) {
  let updated = 0, failed = 0;
  const failures = [];

  for (const char of mainCharacters) {
    const result = await updateNickname(client, guildId, char.userId, char.ign);
    if (result.success) {
      updated++;
    } else {
      failed++;
      failures.push({ userId: char.userId, ign: char.ign, reason: result.reason });
      console.log(`⚠️  [NICKNAME] Failed to update ${char.ign}: ${result.reason}`);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  if (failed > 0) {
    console.log(`❌ [NICKNAME] ${failed} nickname(s) failed to sync:`);
    failures.forEach(f => {
      console.log(`   • ${f.ign}: ${f.reason}`);
    });
  }

  logger.nicknameSync(updated, failed);
  return { updated, failed, failures };
}
