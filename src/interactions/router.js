import * as registration from './registration.js';
import * as editing from './editing.js';
import * as deletion from './deletion.js';
import { CharacterRepo } from '../database/repositories.js';
import { profileEmbed } from '../ui/profile.js';
import * as ui from '../ui/components.js';

// ═══════════════════════════════════════════════════════════════════
// INTERACTION ROUTER
// ═══════════════════════════════════════════════════════════════════

export async function routeInteraction(interaction) {
  const customId = interaction.customId;
  const userId = interaction.user.id;

  console.log('[ROUTER] Routing interaction:', customId);

  try {
    // ═══════════════════════════════════════════════════════════════
    // REGISTRATION ROUTES
    // ═══════════════════════════════════════════════════════════════

    if (customId.startsWith('reg_start_')) {
      await registration.start(interaction, userId);
    }
    else if (customId.startsWith('reg_alt_')) {
      await registration.startAltRegistration(interaction, userId);
    }
    else if (customId.startsWith('reg_subclass_')) {
      const parentId = parseInt(customId.split('_')[2]);
      await registration.startSubclassRegistration(interaction, userId, parentId);
    }
    else if (customId.startsWith('confirm_replace_main_')) {
      await registration.confirmReplaceMain(interaction, userId);
    }
    else if (customId.startsWith('cancel_replace_main_')) {
      await registration.cancelReplaceMain(interaction, userId);
    }

    // Region, Country, Timezone
    else if (customId.startsWith('select_region_')) {
      await registration.handleRegion(interaction, userId);
    }
    else if (customId.startsWith('select_country_')) {
      await registration.handleCountry(interaction, userId);
    }
    else if (customId.startsWith('select_timezone_')) {
      await registration.handleTimezone(interaction, userId);
    }

    // Class, Subclass, Score
    else if (customId.startsWith('select_class_')) {
      await registration.handleClass(interaction, userId);
    }
    else if (customId.startsWith('select_subclass_')) {
      await registration.handleSubclass(interaction, userId);
    }
    else if (customId.startsWith('select_ability_score_')) {
      await registration.handleScore(interaction, userId);
    }

    // Battle Imagine
    else if (customId.startsWith('select_battle_imagine_')) {
      await registration.handleBattleImagine(interaction, userId);
    }

    // Guild
    else if (customId.startsWith('select_guild_')) {
      await registration.handleGuild(interaction, userId);
    }

    // IGN/UID Modals
    else if (customId.startsWith('ign_modal_')) {
      await registration.handleIGN(interaction, userId);
    }
    else if (customId.startsWith('retry_ign_uid_')) {
      await registration.retryIGN(interaction, userId);
    }

    // Back buttons (registration)
    else if (customId.startsWith('back_to_region_')) {
      await registration.backToRegion(interaction, userId);
    }
    else if (customId.startsWith('back_to_country_')) {
      await registration.backToCountry(interaction, userId);
    }
    else if (customId.startsWith('back_to_timezone_')) {
      await registration.backToTimezone(interaction, userId);
    }
    else if (customId.startsWith('back_to_class_')) {
      await registration.backToClass(interaction, userId);
    }
    else if (customId.startsWith('back_to_subclass_')) {
      await registration.backToSubclass(interaction, userId);
    }
    else if (customId.startsWith('back_to_score_')) {
      await registration.backToScore(interaction, userId);
    }
    else if (customId.startsWith('back_to_battle_imagine_')) {
      await registration.backToBattleImagine(interaction, userId);
    }

    // ═══════════════════════════════════════════════════════════════
    // EDITING ROUTES
    // ═══════════════════════════════════════════════════════════════

    else if (customId.startsWith('edit_character_')) {
      await editing.showEditCharacterChoice(interaction, userId);
    }
    else if (customId.startsWith('select_character_to_edit_')) {
      const selection = interaction.values[0];
      await editing.handleCharacterToEditSelection(interaction, userId, selection);
    }

    // Edit IGN/UID
    else if (customId.startsWith('edit_ign_') && !customId.includes('modal')) {
      await editing.showEditIGNModal(interaction, userId);
    }
    else if (customId.startsWith('edit_ign_modal_')) {
      await editing.handleEditIGN(interaction, userId);
    }
    else if (customId.startsWith('edit_uid_') && !customId.includes('modal')) {
      await editing.showEditUIDModal(interaction, userId);
    }
    else if (customId.startsWith('edit_uid_modal_')) {
      await editing.handleEditUID(interaction, userId);
    }

    // Edit Class
    else if (customId.startsWith('edit_class_')) {
      await editing.showEditClass(interaction, userId);
    }
    else if (customId.startsWith('edit_select_class_')) {
      await editing.handleEditClassSelection(interaction, userId);
    }
    else if (customId.startsWith('edit_select_subclass_')) {
      await editing.handleEditSubclassSelection(interaction, userId);
    }

    // Edit Score
    else if (customId.startsWith('edit_score_')) {
      await editing.showEditScore(interaction, userId);
    }
    else if (customId.startsWith('edit_select_score_')) {
      await editing.handleEditScoreSelection(interaction, userId);
    }

    // Edit Guild
    else if (customId.startsWith('edit_guild_')) {
      await editing.showEditGuild(interaction, userId);
    }
    else if (customId.startsWith('edit_select_guild_')) {
      await editing.handleEditGuildSelection(interaction, userId);
    }

    // Edit Battle Imagines
    else if (customId.startsWith('edit_battle_imagines_')) {
      await editing.showEditBattleImagines(interaction, userId);
    }
    else if (customId.startsWith('edit_select_battle_imagine_')) {
      await editing.handleEditBattleImagineSelection(interaction, userId);
    }
    else if (customId.startsWith('edit_select_bi_tier_')) {
      await editing.handleEditBattleImagineTierSelection(interaction, userId);
    }

    // Back to edit options
    else if (customId.startsWith('back_to_edit_options_')) {
      await editing.backToEditOptions(interaction, userId);
    }

    // ═══════════════════════════════════════════════════════════════
    // DELETION ROUTES
    // ═══════════════════════════════════════════════════════════════

    else if (customId.startsWith('delete_character_')) {
      await deletion.handleDelete(interaction, userId);
    }
    else if (customId.startsWith('confirm_delete_main_') && !customId.includes('only')) {
      await deletion.handleDelete(interaction, userId);
    }
    else if (customId.startsWith('confirm_delete_main_only_')) {
      await deletion.confirmDeleteMainOnly(interaction, userId);
    }

    // Alt promotion
    else if (customId.startsWith('promote_alt_')) {
      await deletion.showAltPromotionSelection(interaction, userId);
    }
    else if (customId.startsWith('select_alt_promote_')) {
      const altId = parseInt(interaction.values[0]);
      await deletion.confirmAltPromotion(interaction, userId, altId);
    }

    // Delete all data
    else if (customId.startsWith('delete_all_data_')) {
      await deletion.confirmDeleteAll(interaction, userId);
    }
    else if (customId.startsWith('confirm_delete_main_sub_')) {
      await deletion.confirmDeleteMainAndSub(interaction, userId);
    }
    else if (customId.startsWith('confirm_delete_everything_')) {
      await deletion.confirmDeleteEverything(interaction, userId);
    }

    // Delete specific alt
    else if (customId.startsWith('delete_alt_')) {
      await deletion.showDeleteAltSelection(interaction, userId);
    }
    else if (customId.startsWith('select_alt_delete_')) {
      const altId = parseInt(interaction.values[0]);
      await deletion.confirmDeleteAlt(interaction, userId, altId);
    }

    // Cancel/Back
    else if (customId.startsWith('cancel_delete_')) {
      await deletion.cancelDelete(interaction, userId);
    }
    else if (customId.startsWith('back_to_delete_')) {
      await deletion.backToDelete(interaction, userId);
    }

    // ═══════════════════════════════════════════════════════════════
    // PROFILE ROUTES
    // ═══════════════════════════════════════════════════════════════

    else if (customId.startsWith('back_to_profile_')) {
      await backToProfile(interaction, userId);
    }

    // ═══════════════════════════════════════════════════════════════
    // UNKNOWN ROUTE
    // ═══════════════════════════════════════════════════════════════

    else {
      console.warn('[ROUTER] Unknown interaction:', customId);
      await interaction.reply({
        content: '❌ Unknown action. Please try again.',
        ephemeral: true
      });
    }

  } catch (error) {
    console.error('[ROUTER] Error routing interaction:', error);
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ An error occurred. Please try again.',
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: '❌ An error occurred. Please try again.',
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error('[ROUTER] Failed to send error message:', replyError);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

async function backToProfile(interaction, userId) {
  const characters = await CharacterRepo.findAllByUser(userId);
  const main = characters.find(c => c.character_type === 'main');

  const embed = await profileEmbed(interaction.user, characters, interaction);
  const buttons = ui.profileButtons(userId, !!main);

  await interaction.update({ 
    embeds: [embed], 
    components: buttons
  });
}

export default {
  routeInteraction
};
