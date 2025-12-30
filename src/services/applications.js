import { MessageFlags } from 'discord.js';
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
      logger.error('Application', 'Admin channel not configured');
      return null;
    }

    try {
      const application = await ApplicationRepo.create({
        userId,
        characterId,
        guildName,
        messageId: null,
        channelId: config.channels.admin
      });

      const channel = await this.client.channels.fetch(config.channels.admin);
      const user = await this.client.users.fetch(userId);
      const characters = await CharacterRepo.findAllByUser(userId);
      const mainChar = characters.find(c => c.characterType === 'main');
      
      const guild = await this.client.guilds.fetch(config.discord.guildId);

      const embed = await profileEmbed(user, characters, { guild });
      const applicationEmbed = addVotingFooter(embed, application);
      const buttons = createApplicationButtons(application.id);

      const message = await channel.send({
        content: `<@&${config.roles.guild1}> **New Guild Application**`,
        embeds: [applicationEmbed],
        components: buttons
      });

      await ApplicationRepo.update(application.id, { messageId: message.id });

      // Console log with detailed info
      logger.applicationCreated({
        username: user.username,
        userId: userId,
        ign: mainChar?.ign || 'Unknown',
        guildName: guildName,
        class: mainChar?.className || 'Unknown',
        subclass: mainChar?.subclass || 'Unknown',
        abilityScore: mainChar?.abilityScore || 'N/A',
        applicationId: application.id
      });

      // Discord channel log
      await logger.logApplicationCreated(config.discord.guildId, {
        userId,
        ign: mainChar?.ign || 'Unknown',
        class: mainChar?.className || 'Unknown',
        subclass: mainChar?.subclass || 'Unknown',
        abilityScore: mainChar?.abilityScore || 'N/A',
        guildName,
        applicationId: application.id
      });

      return application;
    } catch (error) {
      logger.error('Application', 'Create error', error);
      return null;
    }
  }

  async handleVote(interaction, applicationId, voteType) {
    try {
      const application = await ApplicationRepo.findById(applicationId);
      if (!application) {
        return interaction.reply({ 
          content: '❌ Application not found.', 
          flags: MessageFlags.Ephemeral 
        });
      }

      if (application.status !== 'pending') {
        return interaction.reply({ 
          content: '❌ This application is already processed.', 
          flags: MessageFlags.Ephemeral 
        });
      }

      // Check if user already voted
      const existingAccept = application.acceptVotes?.includes(interaction.user.id);
      const existingDeny = application.denyVotes?.includes(interaction.user.id);

      if (existingAccept || existingDeny) {
        // Remove old vote first
        if (existingAccept) {
          await ApplicationRepo.removeVote(applicationId, interaction.user.id, 'accept');
        }
        if (existingDeny) {
          await ApplicationRepo.removeVote(applicationId, interaction.user.id, 'deny');
        }
      }

      const updated = await ApplicationRepo.addVote(applicationId, interaction.user.id, voteType);
      
      // Get voter and applicant names for logging
      const voter = interaction.user;
      const applicant = await this.client.users.fetch(application.userId);
      const character = await CharacterRepo.findById(application.characterId);

      // Console log
      logger.applicationVote({
        voterName: voter.username,
        voterId: voter.id,
        applicantName: applicant.username,
        applicantId: application.userId,
        ign: character?.ign || 'Unknown',
        vote: voteType,
        acceptCount: updated.acceptVotes?.length || 0,
        denyCount: updated.denyVotes?.length || 0
      });

      // Discord channel log
      const acceptVoterNames = [];
      const denyVoterNames = [];
      
      for (const id of (updated.acceptVotes || [])) {
        try {
          const u = await this.client.users.fetch(id);
          acceptVoterNames.push(u.username);
        } catch (e) {
          acceptVoterNames.push(id);
        }
      }
      
      for (const id of (updated.denyVotes || [])) {
        try {
          const u = await this.client.users.fetch(id);
          denyVoterNames.push(u.username);
        } catch (e) {
          denyVoterNames.push(id);
        }
      }

      await logger.logApplicationVote(config.discord.guildId, {
        voterId: voter.id,
        applicantId: application.userId,
        ign: character?.ign || 'Unknown',
        guildName: application.guildName,
        vote: voteType,
        acceptCount: updated.acceptVotes?.length || 0,
        denyCount: updated.denyVotes?.length || 0,
        acceptVoters: updated.acceptVotes || [],
        denyVoters: updated.denyVotes || [],
        applicationId: applicationId
      });

      await this.updateApplicationMessage(updated);

      const acceptCount = updated.acceptVotes?.length || 0;
      const denyCount = updated.denyVotes?.length || 0;

      if (acceptCount >= 2) {
        await this.approveApplication(updated);
        return interaction.reply({ 
          content: '✅ Application approved! (2 accept votes)', 
          flags: MessageFlags.Ephemeral 
        });
      }

      if (denyCount >= 2) {
        await this.denyApplication(updated);
        return interaction.reply({ 
          content: '❌ Application denied! (2 deny votes)', 
          flags: MessageFlags.Ephemeral 
        });
      }

      const voteLabel = voteType === 'accept' ? 'Accept' : 'Deny';
      const changeNote = (existingAccept || existingDeny) ? ' (changed from previous vote)' : '';
      await interaction.reply({ 
        content: `✅ Your **${voteLabel}** vote has been recorded.${changeNote}`, 
        flags: MessageFlags.Ephemeral 
      });
    } catch (error) {
      logger.error('Application', 'Vote error', error);
      await interaction.reply({ 
        content: '❌ Error processing vote.', 
        flags: MessageFlags.Ephemeral 
      });
    }
  }

  async showOverrideMenu(interaction, applicationId) {
    if (!interaction.member.permissions.has('Administrator') && 
        !interaction.member.roles.cache.has(config.logging.adminRoleId)) {
      return interaction.reply({ 
        content: '❌ You need Administrator permission for overrides.', 
        flags: MessageFlags.Ephemeral 
      });
    }

    try {
      const application = await ApplicationRepo.findById(applicationId);
      if (!application) {
        return interaction.reply({ 
          content: '❌ Application not found.', 
          flags: MessageFlags.Ephemeral 
        });
      }

      if (application.status !== 'pending') {
        return interaction.reply({ 
          content: '❌ This application is already processed.', 
          flags: MessageFlags.Ephemeral 
        });
      }

      const buttons = createOverrideButtons(applicationId);
      await interaction.reply({
        content: '👑 **Admin Override**\n\nChoose an action:',
        components: buttons,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      logger.error('Application', 'Override menu error', error);
      await interaction.reply({ 
        content: '❌ Error showing override menu.', 
        flags: MessageFlags.Ephemeral 
      });
    }
  }

  async handleOverride(interaction, applicationId, decision) {
    if (!interaction.member.permissions.has('Administrator') && 
        !interaction.member.roles.cache.has(config.logging.adminRoleId)) {
      return interaction.reply({ 
        content: '❌ You need Administrator permission for overrides.', 
        flags: MessageFlags.Ephemeral 
      });
    }

    try {
      const application = await ApplicationRepo.findById(applicationId);
      if (!application) {
        return interaction.update({ content: '❌ Application not found.', components: [] });
      }

      if (application.status !== 'pending') {
        return interaction.update({ content: '❌ This application is already processed.', components: [] });
      }

      // Get names for logging
      const admin = interaction.user;
      const applicant = await this.client.users.fetch(application.userId);
      const character = await CharacterRepo.findById(application.characterId);

      // Console log the override
      logger.applicationOverride({
        adminName: admin.username,
        adminId: admin.id,
        applicantName: applicant.username,
        applicantId: application.userId,
        ign: character?.ign || 'Unknown',
        guildName: application.guildName,
        decision: decision === 'accept' ? 'approved' : 'denied',
        acceptCount: application.acceptVotes?.length || 0,
        denyCount: application.denyVotes?.length || 0
      });

      // Discord channel log
      await logger.logApplicationOverride(config.discord.guildId, {
        adminId: admin.id,
        userId: application.userId,
        ign: character?.ign || 'Unknown',
        guildName: application.guildName,
        decision: decision === 'accept' ? 'approved' : 'denied',
        acceptCount: application.acceptVotes?.length || 0,
        denyCount: application.denyVotes?.length || 0,
        applicationId: applicationId
      });

      if (decision === 'accept') {
        await this.approveApplication(application, interaction.user.id);
        await interaction.update({ content: '✅ Application approved via admin override.', components: [] });
      } else {
        await this.denyApplication(application, interaction.user.id);
        await interaction.update({ content: '❌ Application denied via admin override.', components: [] });
      }
    } catch (error) {
      logger.error('Application', 'Override error', error);
      await interaction.update({ content: '❌ Error processing override.', components: [] });
    }
  }

  async approveApplication(application, overrideBy = null) {
    try {
      await ApplicationRepo.updateStatus(application.id, 'approved');

      const guild = await this.client.guilds.fetch(config.discord.guildId);
      const member = await guild.members.fetch(application.userId);
      const character = await CharacterRepo.findById(application.characterId);
      const user = await this.client.users.fetch(application.userId);

      if (config.roles.guild1) {
        await member.roles.add(config.roles.guild1);
        logger.roles(`Added guild role to ${user.username}`);
      }

      if (config.roles.verified && !member.roles.cache.has(config.roles.verified)) {
        await member.roles.add(config.roles.verified);
      }

      if (config.roles.visitor && member.roles.cache.has(config.roles.visitor)) {
        await member.roles.remove(config.roles.visitor);
      }

      // Get voter names for logging
      const acceptVoterNames = [];
      const denyVoterNames = [];
      
      for (const id of (application.acceptVotes || [])) {
        try {
          const u = await this.client.users.fetch(id);
          acceptVoterNames.push(u.username);
        } catch (e) {
          acceptVoterNames.push(id);
        }
      }
      
      for (const id of (application.denyVotes || [])) {
        try {
          const u = await this.client.users.fetch(id);
          denyVoterNames.push(u.username);
        } catch (e) {
          denyVoterNames.push(id);
        }
      }

      // Console log
      logger.applicationDecision({
        username: user.username,
        ign: character?.ign || 'Unknown',
        guildName: application.guildName,
        status: 'approved',
        acceptCount: application.acceptVotes?.length || 0,
        denyCount: application.denyVotes?.length || 0,
        acceptVoters: acceptVoterNames,
        denyVoters: denyVoterNames
      });

      // Discord channel log
      await logger.logApplicationDecision(config.discord.guildId, {
        userId: application.userId,
        ign: character?.ign || 'Unknown',
        guildName: application.guildName,
        status: 'approved',
        acceptCount: application.acceptVotes?.length || 0,
        denyCount: application.denyVotes?.length || 0,
        acceptVoters: application.acceptVotes || [],
        denyVoters: application.denyVotes || [],
        applicationId: application.id
      });

      await this.updateApplicationMessage(application, 'approved', overrideBy);

    } catch (error) {
      logger.error('Application', 'Approve error', error);
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
      const user = await this.client.users.fetch(application.userId);

      if (config.roles.guild1 && member.roles.cache.has(config.roles.guild1)) {
        await member.roles.remove(config.roles.guild1);
        logger.roles(`Removed guild role from ${user.username}`);
      }

      if (config.roles.visitor) {
        await member.roles.add(config.roles.visitor);
      }

      if (config.roles.verified && member.roles.cache.has(config.roles.verified)) {
        await member.roles.remove(config.roles.verified);
      }

      // Get voter names for logging
      const acceptVoterNames = [];
      const denyVoterNames = [];
      
      for (const id of (application.acceptVotes || [])) {
        try {
          const u = await this.client.users.fetch(id);
          acceptVoterNames.push(u.username);
        } catch (e) {
          acceptVoterNames.push(id);
        }
      }
      
      for (const id of (application.denyVotes || [])) {
        try {
          const u = await this.client.users.fetch(id);
          denyVoterNames.push(u.username);
        } catch (e) {
          denyVoterNames.push(id);
        }
      }

      // Console log
      logger.applicationDecision({
        username: user.username,
        ign: character?.ign || 'Unknown',
        guildName: application.guildName,
        status: 'denied',
        acceptCount: application.acceptVotes?.length || 0,
        denyCount: application.denyVotes?.length || 0,
        acceptVoters: acceptVoterNames,
        denyVoters: denyVoterNames
      });

      // Discord channel log
      await logger.logApplicationDecision(config.discord.guildId, {
        userId: application.userId,
        ign: character?.ign || 'Unknown',
        guildName: application.guildName,
        status: 'denied',
        acceptCount: application.acceptVotes?.length || 0,
        denyCount: application.denyVotes?.length || 0,
        acceptVoters: application.acceptVotes || [],
        denyVoters: application.denyVotes || [],
        applicationId: application.id
      });

      await this.updateApplicationMessage(application, 'denied', overrideBy);

    } catch (error) {
      logger.error('Application', 'Deny error', error);
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
      logger.error('Application', 'Update message error', error);
    }
  }

  async restorePendingApplications() {
    if (!this.client || !config.channels.admin) return;

    try {
      const pending = await ApplicationRepo.findPending();
      logger.info('Application', `Found ${pending.length} pending applications`);

      if (pending.length === 0) return;

      const channel = await this.client.channels.fetch(config.channels.admin);
      const guild = await this.client.guilds.fetch(config.discord.guildId);

      for (const app of pending) {
        try {
          if (app.messageId) {
            try {
              const oldMessage = await channel.messages.fetch(app.messageId);
              await oldMessage.delete();
              logger.debug('Application', `Deleted old message ${app.messageId}`);
            } catch (e) {
              logger.debug('Application', `Old message ${app.messageId} not found`);
            }
          }

          const fullApp = await ApplicationRepo.findById(app.id);
          
          if (!fullApp) {
            logger.warn('Application', `Could not find full app data for ID ${app.id}`);
            continue;
          }
          
          const user = await this.client.users.fetch(app.userId);
          const characters = await CharacterRepo.findAllByUser(app.userId);
          
          const embed = await profileEmbed(user, characters, { guild });
          const applicationEmbed = addVotingFooter(embed, fullApp);
          const buttons = createApplicationButtons(fullApp.id);

          const newMessage = await channel.send({
            content: `<@&${config.roles.guild1}> **Pending Application**`,
            embeds: [applicationEmbed],
            components: buttons
          });

          await ApplicationRepo.update(fullApp.id, { messageId: newMessage.id });

          logger.info('Application', `Restored app ID ${fullApp.id} with ${fullApp.acceptVotes?.length || 0} accepts, ${fullApp.denyVotes?.length || 0} denies`);
        } catch (error) {
          logger.error('Application', `Error restoring application ${app.id}`, error);
        }
      }

      logger.info('Application', `Restored ${pending.length} pending applications`);
    } catch (error) {
      logger.error('Application', 'Restore error', error);
    }
  }
}

export default new ApplicationService();
