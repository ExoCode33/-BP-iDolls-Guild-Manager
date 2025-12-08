// ==================== FIX FOR src/handlers/update.js ====================
// Add this function at the top of the file (after the utility functions section)

// ✅ ADD THIS FUNCTION (around line 50, after extractUserIdFromCustomId)
function formatAbilityScore(score) {
  if (!score || score === '' || score === 0) return 'Not set';
  
  const numScore = parseInt(score);
  
  // Map stored values to display labels
  const scoreRanges = {
    10000: '≤10k',
    11000: '10-12k',
    13000: '12-14k',
    15000: '14-16k',
    17000: '16-18k',
    19000: '18-20k',
    21000: '20-22k',
    23000: '22-24k',
    25000: '24-26k',
    27000: '26-28k',
    29000: '28-30k',
    31000: '30-32k',
    33000: '32-34k',
    35000: '34-36k',
    37000: '36-38k',
    39000: '38-40k',
    41000: '40-42k',
    43000: '42-44k',
    45000: '44-46k',
    47000: '46-48k',
    49000: '48-50k',
    51000: '50-52k',
    53000: '52-54k',
    55000: '54-56k',
    57000: '56k+'
  };
  
  return scoreRanges[numScore] || `~${numScore.toLocaleString()}`;
}

// ==================== THEN FIND AND REPLACE THIS ====================
// Around line 370 in handleUpdateAbilityScoreSelection function

// ❌ FIND THIS:
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Ability Score Updated!')
      .setDescription('The ability score has been updated.')
      .addFields({
        name: '💪 New Ability Score',
        value: `~${parseInt(selectedScore).toLocaleString()}`,
        inline: false
      })
      .setFooter({ text: '💡 Update complete' })
      .setTimestamp();

// ✅ REPLACE WITH:
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Ability Score Updated!')
      .setDescription('The ability score has been updated.')
      .addFields({
        name: '💪 New Ability Score',
        value: formatAbilityScore(parseInt(selectedScore)),
        inline: false
      })
      .setFooter({ text: '💡 Update complete' })
      .setTimestamp();

// ==================== ALSO FIX THE DISPLAY IN showAbilityScoreSelectionForUpdate ====================
// Around line 290

// ❌ FIND THIS:
  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Ability Score')
    .setDescription('Select your new ability score range')
    .addFields({
      name: '💪 Current Ability Score',
      value: mainChar.ability_score ? `~${mainChar.ability_score.toLocaleString()}` : 'Not set',
      inline: false
    })

// ✅ REPLACE WITH:
  const embed = new EmbedBuilder()
    .setColor('#6640D9')
    .setTitle('✏️ Update Ability Score')
    .setDescription('Select your new ability score range')
    .addFields({
      name: '💪 Current Ability Score',
      value: formatAbilityScore(mainChar.ability_score),
      inline: false
    })
