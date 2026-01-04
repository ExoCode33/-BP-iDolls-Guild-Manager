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
      console.log(`[APP] handleVote called - appId: ${applicationId}, voteType: ${voteType}`);
      
      const application = await ApplicationRepo.findById(applicationId);
      if (!application) {
        console.log('[APP] Application not found');
        return interaction.reply({ content: '❌ Application not found.', ephemeral: true });
      }

      if (application.status !== 'pending') {
        console.log('[APP] Application already processed');
        return interaction.reply({ content: '❌ This application is already processed.', ephemeral: true });
      }

      // Add the vote
      await ApplicationRepo.addVote(applicationId, interaction.user.id, voteType);
      console.log(`[APP] Vote added for user ${interaction.user.id}`);
      
      // ✅ REFETCH to get updated vote counts AND message_id/channel_id
      const updated = await ApplicationRepo.findById(applicationId);
      console.log(`[APP] Refetched application - accept: ${updated.accept_votes?.length || 0}, deny: ${updated.deny_votes?.length || 0}`);
      
      // ✅ UPDATE THE MESSAGE TO SHOW NEW VOTE COUNTS
      await this.updateApplicationMessage(updated);

      const acceptCount = updated.accept_votes?.length || 0;
      const denyCount = updated.deny_votes?.length || 0;

      if (acceptCount >= 2) {
        console.log('[APP] 2 accept votes reached - approving');
        await this.approveApplication(updated);
        return interaction.reply({ content: '✅ Application approved! (2 accept votes)', ephemeral: true });
      }

      if (denyCount >= 2) {
        console.log('[APP] 2 deny votes reached - denying');
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
      console.log(`[APP] handleOverride called - appId: ${applicationId}, decision: ${decision}, userId: ${interaction.user.id}`);
      
      const application = await ApplicationRepo.findById(applicationId);
      if (!application) {
        return interaction.update({ content: '❌ Application not found.', components: [] });
      }

      if (application.status !== 'pending') {
        return interaction.update({ content: '❌ This application is already processed.', components: [] });
      }

      if (decision === 'accept') {
        console.log(`[APP] Approving via override by ${interaction.user.id}`);
        await this.approveApplication(application, interaction.user.id);
        await interaction.update({ content: '✅ Application approved via admin override.', components: [] });
      } else {
        console.log(`[APP] Denying via override by ${interaction.user.id}`);
        await this.denyApplication(application, interaction.user.id);
        await interaction.update({ content: '❌ Application denied via admin override.', components: [] });
      }
    } catch (error) {
      console.error('[APP] Override error:', error);
      await interaction.update({ content: '❌ Error processing override.', components: [] });
    }
  }

  async cancelOverride(interaction, applicationId) {
    await interaction.update({ content: '❌ Override cancelled.', components: [] });
  }

  async approveApplication(application, overrideBy = null) {
    try {
      console.log(`[APP] approveApplication - appId: ${application.id}, overrideBy: ${overrideBy}`);
      
      // Update status first
      await ApplicationRepo.updateStatus(application.id, 'approved');
      console.log('[APP] Status updated to approved');

      const guild = await this.client.guilds.fetch(config.discord.guildId);
      const member = await guild.members.fetch(application.user_id);

      // ✅ Add guild role
      if (config.roles.guild1) {
        await member.roles.add(config.roles.guild1);
        console.log(`[APP] Added guild role to ${application.user_id}`);
      }

      // ✅ Make sure they have verified role (they should already have it from pending)
      if (config.roles.verified && !member.roles.cache.has(config.roles.verified)) {
        await member.roles.add(config.roles.verified);
        console.log(`[APP] Added Verified role to ${application.user_id}`);
      }

      // ✅ Remove visitor role (they're now a full member)
      if (config.roles.visitor && member.roles.cache.has(config.roles.visitor)) {
        await member.roles.remove(config.roles.visitor);
        console.log(`[APP] Removed Visitor role from ${application.user_id}`);
      }

      // ✅ REFETCH the application to ensure we have ALL fields including message_id and channel_id
      const updatedApp = await ApplicationRepo.findById(application.id);
      console.log(`[APP] Refetched app - message_id: ${updatedApp.message_id}, channel_id: ${updatedApp.channel_id}`);
      
      // ✅ UPDATE MESSAGE TO SHOW APPROVAL
      console.log('[APP] Calling updateApplicationMessage with approved status');
      await this.updateApplicationMessage(updatedApp, 'approved', overrideBy);

      logger.info('Application approved', `User: ${application.user_id} | Guild: ${application.guild_name}`);
    } catch (error) {
      console.error('[APP] Approve error:', error);
      console.error('[APP] Stack:', error.stack);
    }
  }

  async denyApplication(application, overrideBy = null) {
    try {
      console.log(`[APP] denyApplication - appId: ${application.id}, overrideBy: ${overrideBy}`);
      
      await ApplicationRepo.updateStatus(application.id, 'denied');
      console.log('[APP] Status updated to denied');

      const character = await CharacterRepo.findById(application.character_id);
      if (character) {
        await CharacterRepo.update(application.character_id, { guild: 'Visitor' });
      }

      const guild = await this.client.guilds.fetch(config.discord.guildId);
      const member = await guild.members.fetch(application.user_id);

      // ✅ Remove guild role if they somehow have it
      if (config.roles.guild1 && member.roles.cache.has(config.roles.guild1)) {
        await member.roles.remove(config.roles.guild1);
        console.log(`[APP] Removed guild role from ${application.user_id}`);
      }

      // ✅ Make sure they have visitor role
      if (config.roles.visitor && !member.roles.cache.has(config.roles.visitor)) {
        await member.roles.add(config.roles.visitor);
        console.log(`[APP] Added Visitor role to ${application.user_id}`);
      }

      // ✅ Keep the Verified role - they're still a registered user!
      if (config.roles.verified && !member.roles.cache.has(config.roles.verified)) {
        await member.roles.add(config.roles.verified);
        console.log(`[APP] Ensured Verified role for ${application.user_id}`);
      }

      // ✅ REFETCH the application to ensure we have ALL fields including message_id and channel_id
      const updatedApp = await ApplicationRepo.findById(application.id);
      console.log(`[APP] Refetched app - message_id: ${updatedApp.message_id}, channel_id: ${updatedApp.channel_id}`);
      
      // ✅ UPDATE MESSAGE TO SHOW DENIAL
      console.log('[APP] Calling updateApplicationMessage with denied status');
      await this.updateApplicationMessage(updatedApp, 'denied', overrideBy);

      logger.info('Application denied', `User: ${application.user_id} | Guild: ${application.guild_name}`);
    } catch (error) {
      console.error('[APP] Deny error:', error);
      console.error('[APP] Stack:', error.stack);
    }
  }

  async updateApplicationMessage(application, finalStatus = null, overrideBy = null) {
    try {
      console.log(`[APP] updateApplicationMessage called - finalStatus: ${finalStatus}, overrideBy: ${overrideBy}`);
      console.log(`[APP] Application data - id: ${application.id}, message_id: ${application.message_id}, channel_id: ${application.channel_id}`);
      
      if (!application.message_id || !application.channel_id) {
        console.error('[APP] CRITICAL: Cannot update message - missing message_id or channel_id');
        console.error('[APP] Application:', JSON.stringify(application, null, 2));
        return;
      }

      console.log(`[APP] Fetching channel ${application.channel_id}`);
      const channel = await this.client.channels.fetch(application.channel_id);
      
      console.log(`[APP] Fetching message ${application.message_id}`);
      const message = await channel.messages.fetch(application.message_id);
      
      console.log(`[APP] Fetching user ${application.user_id}`);
      const user = await this.client.users.fetch(application.user_id);
      const characters = await CharacterRepo.findAllByUser(application.user_id);
      
      const guild = await this.client.guilds.fetch(config.discord.guildId);

      if (finalStatus) {
        // ✅ FINAL STATUS - Show approval or denial
        console.log(`[APP] Creating final status embed - ${finalStatus}`);
        const color = finalStatus === 'approved' ? '#00FF00' : '#FF0000';
        const statusText = finalStatus === 'approved' ? '✅ APPROVED' : '❌ DENIED';
        const description = overrideBy 
          ? `Admin override by <@${overrideBy}>`
          : finalStatus === 'approved' 
            ? 'Approved with 2+ votes' 
            : 'Denied with 2+ votes';

        console.log(`[APP] Status text: ${statusText}, Description: ${description}`);

        const embed = await profileEmbed(user, characters, { guild });
        embed.addFields(
          { name: '\u200b', value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', inline: false },
          { name: `🏰 Application ${statusText}`, value: description, inline: false }
        );
        embed.setColor(color);

        console.log('[APP] Editing message with final status');
        await message.edit({ embeds: [embed], components: [] });
        console.log(`[APP] ✅ Message updated to ${statusText}`);
      } else {
        // ✅ PENDING STATUS - Update vote counts
        console.log('[APP] Updating vote counts');
        console.log(`[APP] Accept votes: ${application.accept_votes?.length || 0}, Deny votes: ${application.deny_votes?.length || 0}`);
        
        const embed = await profileEmbed(user, characters, { guild });
        const applicationEmbed = addVotingFooter(embed, application);
        const buttons = createApplicationButtons(application.id);
        
        console.log('[APP] Editing message with updated votes');
        await message.edit({ embeds: [applicationEmbed], components: buttons });
        console.log('[APP] ✅ Message updated with vote counts');
      }
    } catch (error) {
      console.error('[APP] ❌ Update message error:', error);
      console.error('[APP] Error stack:', error.stack);
      console.error('[APP] Application data:', JSON.stringify(application, null, 2));
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
          if (app.message_id) {
            try {
              const oldMessage = await channel.messages.fetch(app.message_id);
              await oldMessage.delete();
              console.log(`[APP] Deleted old message ${app.message_id}`);
            } catch (e) {
              console.log(`[APP] Old message ${app.message_id} not found (already deleted)`);
            }
          }

          // ✅ Fetch the FULL application with votes
          const fullApp = await ApplicationRepo.findById(app.id);
          
          if (!fullApp) {
            console.log(`[APP] Could not find full app data for ID ${app.id}`);
            continue;
          }
          
          const user = await this.client.users.fetch(app.user_id);
          const characters = await CharacterRepo.findAllByUser(app.user_id);
          
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

          console.log(`[APP] Updated application ID ${fullApp.id} with new message ${newMessage.id}, preserved ${fullApp.accept_votes?.length || 0} accept votes, ${fullApp.deny_votes?.length || 0} deny votes`);
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
