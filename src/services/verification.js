import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { COLORS } from '../config/game.js';
import db from '../database/index.js';

export class VerificationSystem {
  static createVerificationEmbed() {
    const centerText = (text, width = 37) => text.padStart((text.length + width) / 2).padEnd(width);
    
    const welcomeText = [
      '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m',
      '',
      '\u001b[1;34m' + centerText('≽^•⩊•^≼') + '\u001b[0m',
      '',
      '\u001b[1;36m' + centerText('💫 For BP Players') + '\u001b[0m',
      '\u001b[0;37m' + centerText('Register your character &') + '\u001b[0m',
      '\u001b[0;37m' + centerText('unlock the full server! ♡') + '\u001b[0m',
      '',
      '\u001b[1;36m' + centerText('🌸 Just Vibing?') + '\u001b[0m',
      '\u001b[0;37m' + centerText('Get basic access to chat!') + '\u001b[0m',
      '\u001b[0;37m' + centerText('No character needed ^_^') + '\u001b[0m',
      '',
      '\u001b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\u001b[0m'
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle('Welcome to iDolls ✨')
      .setDescription('```ansi\n' + welcomeText + '\n```')
      .setFooter({ text: 'iDolls • Registration' })
      .setTimestamp();

    // ✅ CHANGED: Use thumbnail instead of image for better PC layout
    const bannerUrl = process.env.VERIFICATION_BANNER_URL;
    if (bannerUrl) {
      embed.setThumbnail(bannerUrl);  // Small image on the right side
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('verification_register')
          .setLabel('I play BP!')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎮'),
        new ButtonBuilder()
          .setCustomId('verification_non_player')
          .setLabel('Just here to vibe')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('✨')
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
        m.embeds[0].title?.includes('Welcome to iDolls')
      );

      console.log('[VERIFICATION] Found', botMessages.size, 'existing verification messages');

      const content = this.createVerificationEmbed();

      if (botMessages.size > 0) {
        const existingMessage = botMessages.first();
        console.log('[VERIFICATION] Updating existing message:', existingMessage.id);
        await existingMessage.edit(content);
        console.log('[VERIFICATION] ✅ Message updated successfully');
        return existingMessage;
      } else {
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
      const result = await db.query(
        'SELECT verification_channel_id FROM guild_settings WHERE guild_id = $1',
        [guildId]
      );
      
      if (result.rows && result.rows.length > 0 && result.rows[0].verification_channel_id) {
        console.log('[VERIFICATION] Found channel ID in database:', result.rows[0].verification_channel_id);
        return result.rows[0].verification_channel_id;
      }
      
      const envChannelId = process.env.VERIFICATION_CHANNEL_ID;
      if (envChannelId) {
        console.log('[VERIFICATION] Using channel ID from environment:', envChannelId);
        return envChannelId;
      }
      
      return null;
    } catch (error) {
      console.error('[VERIFICATION] Error reading from database:', error.message);
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
