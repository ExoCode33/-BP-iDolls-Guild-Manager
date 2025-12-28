import { ApplicationRepo, CharacterRepo } from '../database/repositories.js';
import { createApplicationEmbed, createApplicationButtons } from '../ui/applications.js';
import config from '../config/index.js';
import logger from './logger.js';

class ApplicationService {
  constructor() {
    this.client = null;
  }

  async init(client) {
    this.client = client;
    await this.restorePendingApplications();
  }

  async createApplication(userId, characterId, guildName) {
    if (!config.channels.admin) {
      console.error('[APP] Admin channel not configured');
      return null;
    }

    try {
      const channel = await this.client.channels.fetch(config.channels.admin);
      const user = await this.client.users.fetch(userId);
      const character = await CharacterRepo.findById(characterId);

      const embed = createApplicationEmbed(user, character, {
        id: 'pending',
        guild_name: guildName,
        accept_votes: [],
        deny_votes: [],
        created_at: new Date()
      });

      const buttons = createApplicationButtons('temp');
      const message = await channel.send({
        content: `<@&${config.roles.guild1}> **New Application**`,
        embeds: [embed],
        components: buttons
      });

      const application = await ApplicationRepo.create({
        userId,
        characterId,
        guildName,
        messageId: message.id,
        channelId: channel.id
      });

      const finalEmbed = createApplicationEmbed(user, character, application);
      const finalButtons = createApplicationButtons(application.id);
      await message.edit({ embeds: [finalEmbed], components: finalButtons });

      logger.info('Application created', `${user.username} -> ${guildName}`);
      return application;
    } catch (error) {
      console.error('[APP] Create error:', error);
      return null;
    }
  }

  async handleVote(interaction, applicationId, voteType) {
    try {
      const application = await ApplicationRepo.findById(applicationId);
      if (!application) {
        return interaction.reply({ content: '❌ Application not found.', ephemeral: true });
      }

      if (application.status !== 'pending') {
        return interaction.reply({ content: '❌ This application is already processed.', ephemeral: true });
      }

      const updated = await ApplicationRepo.addVote(applicationId, interaction.user.id, voteType);
      
      await this.updateApplicationMessage(updated);

      const acceptCount = updated.accept_votes?.length || 0;
      const denyCount = updated.deny_votes?.length || 0;

      if (acceptCount >= 2) {
        await this.approveApplication(updated);
        return interaction.reply({ content: '✅ Application approved! (2 accept votes)', ephemeral: true });
      }

      if (denyCount >= 2) {
        await this.denyApplication(updated);
        return interaction.reply({ content: '❌ Application denied! (2 deny votes)', ephemeral: true });
      }

      const voteLabel = voteType === 'accept' ? 'Accept' : 'Deny';
      await interaction.reply({ content: `✅ Your **${voteLabel}** vote has been recorded.`, ephemeral: true });
    } catch (error) {
      console.error('[APP] Vote error:', error);
      await interaction.reply({ content: '❌ Error processing vote.', ephemeral: true });
    }
  }

  async handleOverride(interaction, applicationId, decision) {
    if (!interaction.member.permissions.has('Administrator') && 
        !interaction.member.roles.cache.has(config.logging.adminRoleId)) {
      return interaction.reply({ content: '❌ You need Administrator permission for overrides.', ephemeral: true });
    }

    try {
      const application = await ApplicationRepo.findById(applicationId);
      if (!application) {
        return interaction.reply({ content: '❌ Application not found.', ephemeral: true });
      }

      if (application.status !== 'pending') {
        return interaction.reply({ content: '❌ This application is already processed.', ephemeral: true });
      }

      if (decision === 'accept') {
        await this.approveApplication(application, interaction.user.id);
        await interaction.reply({ content: '✅ Application approved via admin override.', ephemeral: true });
      } else {
        await this.denyApplication(application, interaction.user.id);
        await interaction.reply({ content: '❌ Application denied via admin override.', ephemeral: true });
      }
    } catch (error) {
      console.error('[APP] Override error:', error);
      await interaction.reply({ content: '❌ Error processing override.', ephemeral: true });
    }
  }

  async approveApplication(application, overrideBy = null) {
    try {
      await ApplicationRepo.updateStatus(application.id, 'approved');

      const guild = await this.client.guilds.fetch(config.discord.guildId);
      const member = await guild.members.fetch(application.user_id);

      if (config.roles.guild1) {
        await member.roles.add(config.roles.guild1);
        console.log(`[APP] Added guild role to ${application.user_id}`);
      }

      if (config.roles.registered && !member.roles.cache.has(config.roles.registered)) {
        await member.roles.add(config.roles.registered);
      }

      if (config.roles.visitor && member.roles.cache.has(config.roles.visitor)) {
        await member.roles.remove(config.roles.visitor);
      }

      await this.updateApplicationMessage(application, 'approved', overrideBy);

      logger.info('Application approved', `User: ${application.user_id} | Guild: ${application.guild_name}`);
    } catch (error) {
      console.error('[APP] Approve error:', error);
    }
  }

  async denyApplication(application, overrideBy = null) {
    try {
      await ApplicationRepo.updateStatus(application.id, 'denied');

      const character = await CharacterRepo.findById(application.character_id);
      if (character) {
        await CharacterRepo.update(application.character_id, { guild: 'Visitor' });
      }

      const guild = await this.client.guilds.fetch(config.discord.guildId);
      const member = await guild.members.fetch(application.user_id);

      if (config.roles.visitor) {
        await member.roles.add(config.roles.visitor);
      }

      if (config.roles.registered && member.roles.cache.has(config.roles.registered)) {
        await member.roles.remove(config.roles.registered);
      }

      await this.updateApplicationMessage(application, 'denied', overrideBy);

      logger.info('Application denied', `User: ${application.user_id} | Guild: ${application.guild_name}`);
    } catch (error) {
      console.error('[APP] Deny error:', error);
    }
  }

  async updateApplicationMessage(application, finalStatus = null, overrideBy = null) {
    try {
      if (!application.message_id || !application.channel_id) return;

      const channel = await this.client.channels.fetch(application.channel_id);
      const message = await channel.messages.fetch(application.message_id);
      const user = await this.client.users.fetch(application.user_id);
      const character = await CharacterRepo.findById(application.character_id);

      if (finalStatus) {
        const color = finalStatus === 'approved' ? '#00FF00' : '#FF0000';
        const title = finalStatus === 'approved' ? '✅ Application Approved' : '❌ Application Denied';
        const description = overrideBy 
          ? `Admin override by <@${overrideBy}>`
          : finalStatus === 'approved' 
            ? 'Approved with 2+ votes' 
            : 'Denied with 2+ votes';

        const finalEmbed = createApplicationEmbed(user, character, application)
          .setColor(color)
          .setTitle(title)
          .setDescription(description);

        await message.edit({ embeds: [finalEmbed], components: [] });
      } else {
        const embed = createApplicationEmbed(user, character, application);
        const buttons = createApplicationButtons(application.id);
        await message.edit({ embeds: [embed], components: buttons });
      }
    } catch (error) {
      console.error('[APP] Update message error:', error);
    }
  }

  async restorePendingApplications() {
    if (!this.client || !config.channels.admin) return;

    try {
      const pending = await ApplicationRepo.findPending();
      console.log(`[APP] Found ${pending.length} pending applications`);

      const channel = await this.client.channels.fetch(config.channels.admin);
      const messages = await channel.messages.fetch({ limit: 100 });

      for (const app of pending) {
        try {
          const oldMessage = messages.get(app.message_id);
          if (oldMessage) {
            await oldMessage.delete();
          }
        } catch (e) {
          // Message already deleted
        }

        const user = await this.client.users.fetch(app.user_id);
        const character = await CharacterRepo.findById(app.character_id);
        
        const embed = createApplicationEmbed(user, character, app);
        const buttons = createApplicationButtons(app.id);

        const newMessage = await channel.send({
          content: `<@&${config.roles.guild1}> **Pending Application**`,
          embeds: [embed],
          components: buttons
        });

        await ApplicationRepo.create({
          userId: app.user_id,
          characterId: app.character_id,
          guildName: app.guild_name,
          messageId: newMessage.id,
          channelId: channel.id
        });

        await ApplicationRepo.delete(app.id);
      }

      console.log(`[APP] Restored ${pending.length} pending applications`);
    } catch (error) {
      console.error('[APP] Restore error:', error);
    }
  }
}

export default new ApplicationService();
