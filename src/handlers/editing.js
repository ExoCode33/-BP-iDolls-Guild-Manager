// Add these functions to your editing.js file

// After handleRemoveAltChoice, add this function:
export async function handleRemoveAlt(interaction, userId, altId) {
  try {
    const alt = await db.getCharacterById(altId);
    if (!alt) {
      const embed = createEditEmbed('⚠️ Not Found', 'Alt character not found!');
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const embed = createEditEmbed(
      '⚠️ Remove Alt Character', 
      `**Are you sure you want to remove this alt?**\n\n🎮 **${alt.ign}**\n🎭 ${alt.class} • ${alt.subclass}\n\n⚠️ This will permanently delete this alt character.`
    );
    
    const confirmButton = new ButtonBuilder()
      .setCustomId(`confirm_remove_alt_${userId}_${altId}`)
      .setLabel('✅ Yes, Remove')
      .setStyle(ButtonStyle.Danger);
      
    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_remove_alt_${userId}`)
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary);
      
    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
    
    await interaction.update({ embeds: [embed], components: [row] });
    stateManager.setRemovalState(userId, { characterId: altId, type: 'alt' });
  } catch (error) {
    logger.error(`Remove alt error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Something went wrong!', 
      ephemeral: config.ephemeral.editChar 
    });
  }
}

// After handleRemoveSubclassChoice, add this function:
export async function handleRemoveSubclass(interaction, userId, subclassId) {
  try {
    const subclass = await db.getCharacterById(subclassId);
    if (!subclass) {
      const embed = createEditEmbed('⚠️ Not Found', 'Subclass not found!');
      return await interaction.update({ embeds: [embed], components: [] });
    }
    
    const embed = createEditEmbed(
      '⚠️ Remove Subclass', 
      `**Are you sure you want to remove this subclass?**\n\n🎭 **${subclass.class} • ${subclass.subclass}**\n💪 ${formatAbilityScore(subclass.ability_score)}\n\n⚠️ This will permanently delete this subclass.`
    );
    
    const confirmButton = new ButtonBuilder()
      .setCustomId(`confirm_remove_subclass_${userId}_${subclassId}`)
      .setLabel('✅ Yes, Remove')
      .setStyle(ButtonStyle.Danger);
      
    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_remove_subclass_${userId}`)
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary);
      
    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
    
    await interaction.update({ embeds: [embed], components: [row] });
    stateManager.setRemovalState(userId, { characterId: subclassId, type: 'subclass' });
  } catch (error) {
    logger.error(`Remove subclass error: ${error.message}`);
    await interaction.reply({ 
      content: '❌ Something went wrong!', 
      ephemeral: config.ephemeral.editChar 
    });
  }
}

// Update the export at the bottom to include these new functions:
export default {
  handleEditCharacter,
  handleEditMain,
  handleEditAltChoice,
  handleEditSubclassChoice,
  handleEditAlt,
  handleEditSubclass,
  handleEditOption,
  handleEditIGNModal,
  handleEditUIDModal,
  handleEditClassSelect,
  handleEditSubclassSelect,
  handleEditScoreSelect,
  handleEditGuildSelect,
  handleAddAlt,
  handleAddSubclass,
  handleRemoveCharacter,
  handleRemoveMain,
  handleRemoveAltChoice,
  handleRemoveSubclassChoice,
  handleRemoveAlt,  // NEW
  handleRemoveSubclass,  // NEW
  handleConfirmRemove,
  handleCancelRemove,
  handleSelectParentForSubclass
};
