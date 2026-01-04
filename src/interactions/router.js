import * as registration from './registration.js';
import * as editing from './editing.js';
import * as deletion from './deletion.js';
import { MessageFlags } from 'discord.js';

// ═══════════════════════════════════════════════════════════════════
// BUTTON INTERACTION ROUTER
// ═══════════════════════════════════════════════════════════════════

export async function route(interaction) {
  const customId = interaction.customId;
  const userId = interaction.user.id;

  console.log('[ROUTER] Button interaction:', customId);

  try {
    // Verification Register Button (welcome channel)
    if (customId === 'verification_register') {
      await registration.start(interaction, userId);
    }
    // Registration - Main Character
    else if (customId === `register_${userId}`) {
      await registration.start(interaction, userId);
    }
    else if (customId === `confirm_replace_main_${userId}`) {
      await registration.confirmReplaceMain(interaction, userId);
    }
    else if (customId === `cancel_replace_main_${userId}`) {
      await registration.cancelReplaceMain(interaction, userId);
    }
    else if (customId === `retry_ign_uid_${userId}`) {
      await registration.retryIGN(interaction, userId);
    }

    // Registration - Subclass
    else if (customId.startsWith('add_subclass_')) {
      const parentId = parseInt(customId.split('_')[2]);
      await registration.startSubclassRegistration(interaction, userId, parentId);
    }

    // Registration - Alt
    else if (customId === `add_alt_${userId}`) {
      await registration.startAltRegistration(interaction, userId);
    }

    // Registration - Back Buttons
    else if (customId === `back_to_region_${userId}`) {
      await registration.backToRegion(interaction, userId);
    }
    else if (customId === `back_to_country_${userId}`) {
      await registration.backToCountry(interaction, userId);
    }
    else if (customId === `back_to_timezone_${userId}`) {
      await registration.backToTimezone(interaction, userId);
    }
    else if (customId === `back_to_class_${userId}`) {
      await registration.backToClass(interaction, userId);
    }
    else if (customId === `back_to_subclass_${userId}`) {
      await registration.backToSubclass(interaction, userId);
    }
    else if (customId === `back_to_score_${userId}`) {
      await registration.backToScore(interaction, userId);
    }
    else if (customId === `back_to_battle_imagine_${userId}`) {
      await registration.backToBattleImagine(interaction, userId);
    }

    // Editing
    else if (customId === `edit_character_${userId}`) {
      await editing.start(interaction, userId);
    }
    else if (customId === `back_to_edit_select_${userId}`) {
      await editing.backToEditSelect(interaction, userId);
    }
    else if (customId === `back_to_edit_field_${userId}`) {
      await editing.backToEditField(interaction, userId);
    }
    else if (customId === `back_to_edit_class_${userId}`) {
      await editing.backToEditClass(interaction, userId);
    }
    else if (customId === `back_to_edit_bi_list_${userId}`) {
      await editing.backToBIList(interaction, userId);
    }
    else if (customId === `retry_edit_uid_${userId}`) {
      await editing.retryUIDEdit(interaction, userId);
    }

    // Deletion
    else if (customId === `delete_character_${userId}`) {
      await deletion.start(interaction, userId);
    }
    else if (customId.startsWith('confirm_delete_')) {
      const parts = customId.split('_');
      const characterId = parseInt(parts[parts.length - 1]);
      await deletion.confirmDelete(interaction, userId, characterId);
    }
    else if (customId === `cancel_delete_${userId}`) {
      await deletion.cancelDelete(interaction, userId);
    }

    // Profile / Back to Profile
    else if (customId === `back_to_profile_${userId}`) {
      const { profileEmbed } = await import('../ui/embeds.js');
      const { profileButtons } = await import('../ui/components.js');
      const { CharacterRepo } = await import('../database/repositories.js');

      const characters = await CharacterRepo.findAllByUser(userId);
      const main = characters.find(c => c.character_type === 'main');

      const embed = await profileEmbed(interaction.user, characters, interaction);
      const buttons = profileButtons(userId, !!main);

      await interaction.update({ embeds: [embed], components: buttons });
    }

    else {
      console.log('[ROUTER] Unknown button interaction:', customId);
      await interaction.reply({
        content: '❌ Unknown interaction. Please try again.',
        flags: MessageFlags.Ephemeral
      });
    }

  } catch (error) {
    console.error('[ROUTER] Error handling button:', error);
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ An error occurred. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: '❌ An error occurred. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (replyError) {
      console.error('[ROUTER] Failed to send error message:', replyError);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// SELECT MENU ROUTER
// ═══════════════════════════════════════════════════════════════════

export async function routeSelectMenu(interaction) {
  const customId = interaction.customId;
  const userId = interaction.user.id;

  console.log('[ROUTER] Select menu interaction:', customId);

  try {
    // Registration - Region, Country, Timezone
    if (customId === `select_region_${userId}`) {
      await registration.handleRegion(interaction, userId);
    }
    else if (customId === `select_country_${userId}`) {
      await registration.handleCountry(interaction, userId);
    }
    else if (customId === `select_timezone_${userId}`) {
      await registration.handleTimezone(interaction, userId);
    }

    // Registration - Class, Subclass, Score
    else if (customId === `select_class_${userId}`) {
      await registration.handleClass(interaction, userId);
    }
    else if (customId === `select_subclass_${userId}`) {
      await registration.handleSubclass(interaction, userId);
    }
    else if (customId === `select_ability_score_${userId}`) {
      await registration.handleScore(interaction, userId);
    }

    // Registration - Battle Imagines
    else if (customId === `select_battle_imagine_${userId}`) {
      await registration.handleBattleImagine(interaction, userId);
    }

    // Registration - Guild
    else if (customId === `select_guild_${userId}`) {
      await registration.handleGuild(interaction, userId);
    }

    // Editing - Character Selection
    else if (customId === `select_edit_character_${userId}`) {
      await editing.selectCharacter(interaction, userId);
    }
    else if (customId === `select_edit_field_${userId}`) {
      await editing.selectField(interaction, userId);
    }

    // Editing - Class/Subclass
    else if (customId === `edit_select_class_${userId}`) {
      await editing.handleClassEdit(interaction, userId);
    }
    else if (customId === `edit_select_subclass_${userId}`) {
      await editing.handleSubclassEdit(interaction, userId);
    }

    // Editing - Score
    else if (customId === `edit_select_score_${userId}`) {
      await editing.handleScoreEdit(interaction, userId);
    }

    // Editing - Guild
    else if (customId === `edit_select_guild_${userId}`) {
      await editing.handleGuildEdit(interaction, userId);
    }

    // Editing - Battle Imagines
    else if (customId === `edit_select_bi_${userId}`) {
      await editing.selectBattleImagine(interaction, userId);
    }
    else if (customId === `edit_select_bi_tier_${userId}`) {
      await editing.handleBattleImagineTierEdit(interaction, userId);
    }

    // Deletion - Character Selection
    else if (customId === `select_delete_character_${userId}`) {
      await deletion.selectCharacter(interaction, userId);
    }

    else {
      console.log('[ROUTER] Unknown select menu interaction:', customId);
      await interaction.reply({
        content: '❌ Unknown interaction. Please try again.',
        flags: MessageFlags.Ephemeral
      });
    }

  } catch (error) {
    console.error('[ROUTER] Error handling select menu:', error);
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ An error occurred. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: '❌ An error occurred. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (replyError) {
      console.error('[ROUTER] Failed to send error message:', replyError);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// MODAL ROUTER
// ═══════════════════════════════════════════════════════════════════

export async function routeModal(interaction) {
  const customId = interaction.customId;
  const userId = interaction.user.id;

  console.log('[ROUTER] Modal interaction:', customId);

  try {
    // Registration - IGN/UID Modal
    if (customId === `ign_modal_${userId}`) {
      await registration.handleIGN(interaction, userId);
    }

    // Editing - IGN Modal
    else if (customId === `edit_ign_modal_${userId}`) {
      await editing.handleIGNEdit(interaction, userId);
    }

    // Editing - UID Modal
    else if (customId === `edit_uid_modal_${userId}`) {
      await editing.handleUIDEdit(interaction, userId);
    }

    else {
      console.log('[ROUTER] Unknown modal interaction:', customId);
      await interaction.reply({
        content: '❌ Unknown interaction. Please try again.',
        flags: MessageFlags.Ephemeral
      });
    }

  } catch (error) {
    console.error('[ROUTER] Error handling modal:', error);
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ An error occurred. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: '❌ An error occurred. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (replyError) {
      console.error('[ROUTER] Failed to send error me
