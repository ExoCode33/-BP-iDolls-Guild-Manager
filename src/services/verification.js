import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import config from '../config/index.js';

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
      const messages = await channel.messages.fetch({ limit: 10 });
      const botMessages = messages.filter(m => 
        m.author.id === channel.client.user.id && 
        m.embeds.length > 0 && 
        m.embeds[0].title === '🎮 Character Registration'
      );

      const content = this.createVerificationEmbed();

      if (botMessages.size > 0) {
        // Update existing message
        const existingMessage = botMessages.first();
        await existingMessage.edit(content);
        return existingMessage;
      } else {
        // Send new message
        return await channel.send(content);
      }
    } catch (error) {
      console.error('[VERIFICATION] Error sending/updating message:', error);
      throw error;
    }
  }

  static async setupVerificationChannel(client) {
    const channelId = config.channels.verification;
    if (!channelId) {
      console.log('[VERIFICATION] No verification channel configured');
      return;
    }

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        console.error('[VERIFICATION] Channel not found:', channelId);
        return;
      }

      await this.sendOrUpdateVerificationMessage(channel);
      console.log('[VERIFICATION] ✅ Verification message ready in', channel.name);
    } catch (error) {
      console.error('[VERIFICATION] Setup failed:', error);
    }
  }
}
