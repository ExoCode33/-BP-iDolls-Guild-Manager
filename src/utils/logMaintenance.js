/**
 * Auto Log Maintenance System
 * 
 * Automatically maintains log channels by:
 * - Deleting old messages based on retention policy
 * - Keeping message count under limit
 * - Running on a schedule
 */

/**
 * Clear all messages from a Discord channel
 * @param {TextChannel} channel - The Discord channel to clear
 * @param {number} maxMessages - Maximum number of messages to delete (default: unlimited)
 * @returns {Promise<number>} - Number of messages deleted
 */
export async function clearChannel(channel, maxMessages = Infinity) {
  if (!channel) {
    console.log('[LOG CLEAR] No channel provided');
    return 0;
  }

  console.log(`[LOG CLEAR] Starting to clear channel: ${channel.name}`);
  let totalDeleted = 0;
  let hasMore = true;
  
  const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);

  try {
    while (hasMore && totalDeleted < maxMessages) {
      // Fetch up to 100 messages
      const fetchLimit = Math.min(100, maxMessages - totalDeleted);
      const messages = await channel.messages.fetch({ limit: fetchLimit });
      
      if (messages.size === 0) {
        hasMore = false;
        break;
      }

      // Separate recent vs old messages
      const recentMessages = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
      const oldMessages = messages.filter(msg => msg.createdTimestamp <= twoWeeksAgo);

      // Bulk delete recent messages (fast)
      if (recentMessages.size > 0) {
        try {
          await channel.bulkDelete(recentMessages, true);
          totalDeleted += recentMessages.size;
          console.log(`[LOG CLEAR] Bulk deleted ${recentMessages.size} recent messages (Total: ${totalDeleted})`);
        } catch (error) {
          console.error('[LOG CLEAR] Bulk delete failed:', error.message);
        }
      }

      // Individual delete old messages (slow)
      if (oldMessages.size > 0) {
        console.log(`[LOG CLEAR] Found ${oldMessages.size} old messages (>14 days). Deleting individually...`);
        
        for (const [, message] of oldMessages) {
          try {
            await message.delete();
            totalDeleted++;
            
            // Rate limit protection
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`[LOG CLEAR] Failed to delete message:`, error.message);
          }
          
          if (totalDeleted >= maxMessages) break;
        }
      }

      // If we fetched less than 100, we're done
      if (messages.size < 100) {
        hasMore = false;
      }
      
      // Rate limit protection between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[LOG CLEAR] ✅ Finished. Total deleted: ${totalDeleted}`);
    return totalDeleted;
    
  } catch (error) {
    console.error('[LOG CLEAR] ❌ Error:', error);
    return totalDeleted;
  }
}

/**
 * Delete messages older than retention period
 * @param {TextChannel} channel - The Discord channel
 * @param {number} retentionDays - Keep messages newer than this many days
 * @returns {Promise<number>} - Number of messages deleted
 */
export async function deleteOldMessages(channel, retentionDays = 7) {
  if (!channel || retentionDays <= 0) return 0;

  const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  console.log(`[LOG MAINTENANCE] Deleting messages older than ${retentionDays} days from ${channel.name}`);

  let totalDeleted = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      const messages = await channel.messages.fetch({ limit: 100 });
      
      if (messages.size === 0) break;

      // Filter messages older than retention period
      const oldMessages = messages.filter(msg => msg.createdTimestamp < cutoffTime);
      
      if (oldMessages.size === 0) {
        // All messages are within retention period
        hasMore = false;
        break;
      }

      // Delete old messages
      const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
      const recentOld = oldMessages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
      const veryOld = oldMessages.filter(msg => msg.createdTimestamp <= twoWeeksAgo);

      // Bulk delete recent old messages
      if (recentOld.size > 0) {
        await channel.bulkDelete(recentOld, true);
        totalDeleted += recentOld.size;
        console.log(`[LOG MAINTENANCE] Bulk deleted ${recentOld.size} old messages (Total: ${totalDeleted})`);
      }

      // Individual delete very old messages
      for (const [, message] of veryOld) {
        try {
          await message.delete();
          totalDeleted++;
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('[LOG MAINTENANCE] Failed to delete old message:', error.message);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (messages.size < 100) hasMore = false;
    }

    if (totalDeleted > 0) {
      console.log(`[LOG MAINTENANCE] ✅ Deleted ${totalDeleted} old messages`);
    } else {
      console.log(`[LOG MAINTENANCE] ✅ No old messages to delete`);
    }

    return totalDeleted;
  } catch (error) {
    console.error('[LOG MAINTENANCE] ❌ Error:', error);
    return totalDeleted;
  }
}

/**
 * Keep channel under message limit by deleting oldest messages
 * @param {TextChannel} channel - The Discord channel
 * @param {number} maxMessages - Maximum messages to keep in channel
 * @returns {Promise<number>} - Number of messages deleted
 */
export async function enforceMessageLimit(channel, maxMessages = 1000) {
  if (!channel || maxMessages <= 0) return 0;

  console.log(`[LOG MAINTENANCE] Checking message count in ${channel.name} (limit: ${maxMessages})`);

  try {
    // Count all messages
    let messageCount = 0;
    let lastId = null;
    
    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;
      
      const messages = await channel.messages.fetch(options);
      if (messages.size === 0) break;
      
      messageCount += messages.size;
      lastId = messages.last().id;
      
      if (messages.size < 100) break;
    }

    console.log(`[LOG MAINTENANCE] Channel has ${messageCount} messages`);

    if (messageCount <= maxMessages) {
      console.log(`[LOG MAINTENANCE] ✅ Under limit, no action needed`);
      return 0;
    }

    // Delete oldest messages to get under limit
    const toDelete = messageCount - maxMessages;
    console.log(`[LOG MAINTENANCE] Need to delete ${toDelete} oldest messages`);

    let totalDeleted = 0;
    lastId = null;
    
    while (totalDeleted < toDelete) {
      const options = { limit: Math.min(100, toDelete - totalDeleted) };
      if (lastId) options.before = lastId;
      
      const messages = await channel.messages.fetch(options);
      if (messages.size === 0) break;

      // Delete from oldest first
      const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
      const recent = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
      const old = messages.filter(msg => msg.createdTimestamp <= twoWeeksAgo);

      if (recent.size > 0) {
        await channel.bulkDelete(recent, true);
        totalDeleted += recent.size;
      }

      for (const [, message] of old) {
        try {
          await message.delete();
          totalDeleted++;
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('[LOG MAINTENANCE] Failed to delete:', error.message);
        }
        if (totalDeleted >= toDelete) break;
      }

      lastId = messages.last().id;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[LOG MAINTENANCE] ✅ Deleted ${totalDeleted} messages to enforce limit`);
    return totalDeleted;
    
  } catch (error) {
    console.error('[LOG MAINTENANCE] ❌ Error:', error);
    return 0;
  }
}

/**
 * Clear log channel on bot startup if configured
 */
export async function clearLogChannelOnStartup(client, channelId) {
  if (!channelId) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return;

    console.log(`[LOG CLEAR] Clearing log channel: ${channel.name}`);
    const deleted = await clearChannel(channel);
    console.log(`[LOG CLEAR] ✅ Cleared ${deleted} messages`);
  } catch (error) {
    console.error('[LOG CLEAR] ❌ Failed:', error);
  }
}

/**
 * Start automatic log maintenance
 * @param {Client} client - Discord client
 * @param {Object} config - Configuration object
 * @returns {NodeJS.Timeout} - Interval timer (save to clear on shutdown)
 */
export function startAutoMaintenance(client, config) {
  if (!config.logging.autoMaintenance) {
    console.log('[LOG MAINTENANCE] Auto-maintenance disabled');
    return null;
  }

  const channelId = config.channels.log;
  if (!channelId) {
    console.log('[LOG MAINTENANCE] No log channel configured');
    return null;
  }

  console.log(`[LOG MAINTENANCE] ✅ Starting auto-maintenance:`);
  console.log(`  - Interval: ${config.logging.maintenanceInterval / 60000} minutes`);
  console.log(`  - Retention: ${config.logging.retentionDays} days`);
  console.log(`  - Max messages: ${config.logging.maxMessages}`);

  const intervalId = setInterval(async () => {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel?.isTextBased()) return;

      console.log('[LOG MAINTENANCE] Running scheduled maintenance...');

      // Step 1: Delete messages older than retention period
      if (config.logging.retentionDays > 0) {
        await deleteOldMessages(channel, config.logging.retentionDays);
      }

      // Step 2: Enforce message limit
      if (config.logging.maxMessages > 0) {
        await enforceMessageLimit(channel, config.logging.maxMessages);
      }

      console.log('[LOG MAINTENANCE] ✅ Maintenance complete');
    } catch (error) {
      console.error('[LOG MAINTENANCE] ❌ Error:', error);
    }
  }, config.logging.maintenanceInterval);

  // Run immediately on startup
  setTimeout(async () => {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel?.isTextBased()) return;

      console.log('[LOG MAINTENANCE] Running initial maintenance...');
      
      if (config.logging.retentionDays > 0) {
        await deleteOldMessages(channel, config.logging.retentionDays);
      }
      
      if (config.logging.maxMessages > 0) {
        await enforceMessageLimit(channel, config.logging.maxMessages);
      }
    } catch (error) {
      console.error('[LOG MAINTENANCE] ❌ Initial maintenance error:', error);
    }
  }, 5000); // Wait 5 seconds after bot ready

  return intervalId;
}

export default { 
  clearChannel, 
  clearLogChannelOnStartup,
  deleteOldMessages,
  enforceMessageLimit,
  startAutoMaintenance
};
