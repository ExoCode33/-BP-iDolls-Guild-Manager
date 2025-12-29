import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from '../database/index.js';

export class VerificationSystem {
  static createVerificationEmbed() {
    const embed = new EmbedBuilder()
      .setColor('#EC4899')
      .setTitle('🎮 Character Registration')
      .setDescription(
        '**Welcome to the server!**\n\n' +
        'Click the button below to register your character and gain access to the server.\n\n' +
        '**What you\'ll need:**\n' +
        '• Your in-game name (IGN)\n' +
        '• Your User ID (UID)\n' +
        '• Your character class\n' +
        '• Your guild affiliation\n\n' +
        '**After registration:**\n' +
        '✅ Verified role\n' +
        '✅ Guild role\n' +
        '✅ Class role\n' +
        '✅ Full server access'
      )
      .setFooter({ text: 'Click the button below to get started!' })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('verification_register')
          .setLabel('📝 Register Character')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎮')
      );

    return { embeds: [embed], components: [row] };
  }

  static async sendOrUpdateVerificationMessage(channel) {
    try {
      console.log('[VERIFICATION] Fetching messages from channel:', channel.name);
      const messages = await channel.messages.fetch({ limit: 10 });
      console.log('[VERIFICATION] Fetched', messages.size, 'messages');
      
      const botMessages = messages.filter(m => 
        m.author.id === channel.client.user.id && 
        m.embeds.length > 0 && 
        m.embeds[0].title === '🎮 Character Registration'
      );

      console.log('[VERIFICATION] Found', botMessages.size, 'existing verification messages');

      const content = this.createVerificationEmbed();

      if (botMessages.size > 0) {
        // Update existing message
        const existingMessage = botMessages.first();
        console.log('[VERIFICATION] Updating existing message:', existingMessage.id);
        await existingMessage.edit(content);
        console.log('[VERIFICATION] ✅ Message updated successfully');
        return existingMessage;
      } else {
        // Send new message
        console.log('[VERIFICATION] Sending new verification message...');
        const message = await channel.send(content);
        console.log('[VERIFICATION] ✅ Message sent successfully, ID:', message.id);
        return message;
      }
    } catch (error) {
      console.error('[VERIFICATION] ❌ Error sending/updating message:', error.message);
      throw error;
    }
  }

  static async getVerificationChannelId(guildId) {
    try {
      // Try to get from database first - using pg (node-postgres) syntax
      const result = await db.query(
        'SELECT verification_channel_id FROM guild_settings WHERE guild_id = $1',
        [guildId]
      );
      
      if (result.rows && result.rows.length > 0 && result.rows[0].verification_channel_id) {
        console.log('[VERIFICATION] Found channel ID in database:', result.rows[0].verification_channel_id);
        return result.rows[0].verification_channel_id;
      }
      
      // Fallback to environment variable if database is empty
      const envChannelId = process.env.VERIFICATION_CHANNEL_ID;
      if (envChannelId) {
        console.log('[VERIFICATION] Using channel ID from environment:', envChannelId);
        return envChannelId;
      }
      
      return null;
    } catch (error) {
      console.error('[VERIFICATION] Error reading from database:', error.message);
      // Fallback to environment variable on error
      return process.env.VERIFICATION_CHANNEL_ID || null;
    }
  }

  static async setVerificationChannelId(guildId, channelId) {
    try {
      await db.query(
        `INSERT INTO guild_settings (guild_id, verification_channel_id, updated_at) 
         VALUES ($1, $2, NOW())
         ON CONFLICT (guild_id) 
         DO UPDATE SET verification_channel_id = $2, updated_at = NOW()`,
        [guildId, channelId]
      );
      console.log('[VERIFICATION] Saved channel ID to database:', channelId);
      return true;
    } catch (error) {
      console.error('[VERIFICATION] Error saving to database:', error.message);
      return false;
    }
  }

  static async setupVerificationChannel(client, guildId) {
    console.log('[VERIFICATION] ════════════════════════════════');
    console.log('[VERIFICATION] Starting verification setup...');
    
    const channelId = await this.getVerificationChannelId(guildId);
    
    console.log('[VERIFICATION] Config check:', {
      guildId: guildId,
      channelId: channelId || 'NOT SET',
      source: channelId ? 'database or env' : 'not configured'
    });

    if (!channelId) {
      console.log('[VERIFICATION] ⚠️ No verification channel configured');
      console.log('[VERIFICATION] Use /admin settings → Verification to set channel');
      console.log('[VERIFICATION] ════════════════════════════════');
      return;
    }

    try {
      console.log('[VERIFICATION] Attempting to fetch channel:', channelId);
      const channel = await client.channels.fetch(channelId);
      
      if (!channel) {
        console.error('[VERIFICATION] ❌ Channel not found with ID:', channelId);
        console.log('[VERIFICATION] ════════════════════════════════');
        return;
      }

      console.log('[VERIFICATION] ✅ Channel found:', {
        name: channel.name,
        id: channel.id,
        type: channel.type,
        guild: channel.guild?.name
      });

      // Check permissions
      const permissions = channel.permissionsFor(client.user);
      const hasPermissions = permissions?.has('SendMessages') && permissions?.has('EmbedLinks');
      
      console.log('[VERIFICATION] Bot permissions:', {
        sendMessages: permissions?.has('SendMessages') || false,
        embedLinks: permissions?.has('EmbedLinks') || false,
        readMessageHistory: permissions?.has('ReadMessageHistory') || false
      });

      if (!hasPermissions) {
        console.error('[VERIFICATION] ❌ Bot lacks required permissions');
        console.log('[VERIFICATION] ════════════════════════════════');
        return;
      }

      console.log('[VERIFICATION] Sending/updating verification message...');
      await this.sendOrUpdateVerificationMessage(channel);
      
      console.log('[VERIFICATION] ════════════════════════════════');
      console.log('[VERIFICATION] ✅ Verification system ready!');
      console.log('[VERIFICATION] Channel:', channel.name);
      console.log('[VERIFICATION] Users can now click the button to register');
      console.log('[VERIFICATION] ════════════════════════════════');
    } catch (error) {
      console.error('[VERIFICATION] ════════════════════════════════');
      console.error('[VERIFICATION] ❌ Setup failed:', error.message);
      console.error('[VERIFICATION] ════════════════════════════════');
    }
  }
}
