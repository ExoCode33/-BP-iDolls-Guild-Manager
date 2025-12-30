import { ApplicationRepo, CharacterRepo } from '../database/repositories.js';
import { addVotingFooter, createApplicationButtons, createOverrideButtons } from '../ui/applications.js';
import { profileEmbed } from '../ui/embeds.js';
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
      // ✅ Step 1: Create DB entry FIRST to get real ID
      const application = await ApplicationRepo.create({
        userId,
        characterId,
        guildName,
        messageId: null, // Will update after message is created
        channelId: config.channels.admin
      });

      const channel = await this.client.channels.fetch(config.channels.admin);
      const user = await this.client.users.fetch(userId);
      const characters = await CharacterRepo.findAllByUser(userId);
      
      const guild = await this.client.guilds.fetch(config.discord.guildId);

      // ✅ Step 2: Create Discord message with REAL application ID
      const embed = await profileEmbed(user, characters, { guild });
      const applicationEmbed = addVotingFooter(embed, application);
      const buttons = createApplicationButtons(application.id); // Real ID, not 'temp'

      const message = await channel.send({
        content: `<@&${config.roles.guild1}> **New Guild Application**`,
        embeds: [applicationEmbed],
        components: buttons
      });

      // ✅ Step 3: Update DB with message ID
      await ApplicationRepo.update(application.id, { messageId: message.id });

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

      const acceptCount = updated.acceptVotes?.length || 0;
      const denyCount = updated.denyVotes?.length || 0;

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

  async showOverrideMenu(interaction, applicationId) {
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

      const buttons = createOverrideButtons(applicationId);
      await interaction.reply({
        content: '👑 **Admin Override**\n\nChoose an action:',
        components: buttons,
        ephemeral: true
      });
    } catch (error) {
      console.error('[APP] Override menu error:', error);
      await interaction.reply({ content: '❌ Error showing override menu.', ephemeral: true });
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
        return interaction.update({ content: '❌ Application not found.', components: [] });
      }

      if (application.status !== 'pending') {
        return interaction.update({ content: '❌ This application is already processed.', components: [] });
      }

      if (decision === 'accept') {
        await this.approveApplication(application, interaction.user.id);
        await interaction.update({ content: '✅ Application approved via admin override.', components: [] });
      } else {
        await this.denyApplication(application, interaction.user.id);
        await interaction.update({ content: '❌ Application denied via admin override.', components: [] });
      }
    } catch (error) {
      console.error('[APP] Override error:', error);
      await interaction.update({ content: '❌ Error processing override.', components: [] });
    }
  }

  async approveApplication(application, overrideBy = null) {
    try {
      await ApplicationRepo.updateStatus(application.id, 'approved');

      const guild = await this.client.guilds.fetch(config.discord.guildId);
      const member = await guild.members.fetch(application.userId);

      if (config.roles.guild1) {
        await member.roles.add(config.roles.guild1);
        console.log(`[APP] Added guild role to ${application.userId}`);
      }

      if (config.roles.registered && !member.roles.cache.has(config.roles.registered)) {
        await member.roles.add(config.roles.registered);
      }

      if (config.roles.visitor && member.roles.cache.has(config.roles.visitor)) {
        await member.roles.remove(config.roles.visitor);
      }

      await this.updateApplicationMessage(application, 'approved', overrideBy);

      logger.info('Application approved', `User: ${application.userId} | Guild: ${application.guildName}`);
    } catch (error) {
      console.error('[APP] Approve error:', error);
    }
  }

  async denyApplication(application, overrideBy = null) {
    try {
      await ApplicationRepo.updateStatus(application.id, 'denied');

      const character = await CharacterRepo.findById(application.characterId);
      if (character) {
        await CharacterRepo.update(application.characterId, { guild: 'Visitor' });
      }

      const guild = await this.client.guilds.fetch(config.discord.guildId);
      const member = await guild.members.fetch(application.userId);

      if (config.roles.guild1 && member.roles.cache.has(config.roles.guild1)) {
        await member.roles.remove(config.roles.guild1);
        console.log(`[APP] Removed guild role from ${application.userId}`);
      }

      if (config.roles.visitor) {
        await member.roles.add(config.roles.visitor);
      }

      if (config.roles.registered && member.roles.cache.has(config.roles.registered)) {
        await member.roles.remove(config.roles.registered);
      }

      await this.updateApplicationMessage(application, 'denied', overrideBy);

      logger.info('Application denied', `User: ${application.userId} | Guild: ${application.guildName}`);
    } catch (error) {
      console.error('[APP] Deny error:', error);
    }
  }

  async updateApplicationMessage(application, finalStatus = null, overrideBy = null) {
    try {
      if (!application.messageId || !application.channelId) return;

      const channel = await this.client.channels.fetch(application.channelId);
      const message = await channel.messages.fetch(application.messageId);
      const user = await this.client.users.fetch(application.userId);
      const characters = await CharacterRepo.findAllByUser(application.userId);
      
      const guild = await this.client.guilds.fetch(config.discord.guildId);

      if (finalStatus) {
        const color = finalStatus === 'approved' ? '#00FF00' : '#FF0000';
        const statusText = finalStatus === 'approved' ? '✅ APPROVED' : '❌ DENIED';
        const description = overrideBy 
          ? `Admin override by <@${overrideBy}>`
          : finalStatus === 'approved' 
            ? 'Approved with 2+ votes' 
            : 'Denied with 2+ votes';

        const embed = await profileEmbed(user, characters, { guild });
        embed.addFields(
          { name: '\u200b', value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', inline: false },
          { name: `🏰 Application ${statusText}`, value: description, inline: false }
        );
        embed.setColor(color);

        await message.edit({ embeds: [embed], components: [] });
      } else {
        const embed = await profileEmbed(user, characters, { guild });
        const applicationEmbed = addVotingFooter(embed, application);
        const buttons = createApplicationButtons(application.id);
        await message.edit({ embeds: [applicationEmbed], components: buttons });
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

      if (pending.length === 0) return;

      const channel = await this.client.channels.fetch(config.channels.admin);
      const guild = await this.client.guilds.fetch(config.discord.guildId);

      for (const app of pending) {
        try {
          if (app.messageId) {
            try {
              const oldMessage = await channel.messages.fetch(app.messageId);
              await oldMessage.delete();
              console.log(`[APP] Deleted old message ${app.messageId}`);
            } catch (e) {
              console.log(`[APP] Old message ${app.messageId} not found (already deleted)`);
            }
          }

          // ✅ FIX: Fetch the FULL application with votes from findById
          const fullApp = await ApplicationRepo.findById(app.id);
          
          if (!fullApp) {
            console.log(`[APP] Could not find full app data for ID ${app.id}`);
            continue;
          }
          
          const user = await this.client.users.fetch(app.userId);
          const characters = await CharacterRepo.findAllByUser(app.userId);
          
          // Create new embed with PRESERVED votes from fullApp
          const embed = await profileEmbed(user, characters, { guild });
          const applicationEmbed = addVotingFooter(embed, fullApp);
          const buttons = createApplicationButtons(fullApp.id);

          const newMessage = await channel.send({
            content: `<@&${config.roles.guild1}> **Pending Application**`,
            embeds: [applicationEmbed],
            components: buttons
          });

          // UPDATE the existing application with new message ID
          await ApplicationRepo.update(fullApp.id, { messageId: newMessage.id });

          console.log(`[APP] Updated application ID ${fullApp.id} with new message ${newMessage.id}, preserved ${fullApp.acceptVotes?.length || 0} accept votes, ${fullApp.denyVotes?.length || 0} deny votes`);
        } catch (error) {
          console.error(`[APP] Error restoring application ${app.id}:`, error.message);
        }
      }

      console.log(`[APP] Restored ${pending.length} pending applications`);
    } catch (error) {
      console.error('[APP] Restore error:', error);
    }
  }
}

export default new ApplicationService();
