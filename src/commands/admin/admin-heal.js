import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { buildCharacterProfileEmbed } from '../../components/embeds/characterProfile.js';
import { buildCharacterButtons } from '../../components/buttons/characterButtons.js';
import db from '../../services/database.js';
import sheetsService from '../../services/sheets.js';
import logger from '../../utils/logger.js';
import config from '../../utils/config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin-heal')
    .setDescription('Admin commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => 
      sub.setName('sync')
        .setDescription('Force sync to Google Sheets')
    )
    .addSubcommand(sub => 
      sub.setName('edit-character')
        .setDescription('Edit user character')
        .addUserOption(opt => 
          opt.setName('user')
            .setDescription('User to edit')
            .setRequired(true)
        )
    )
    .addSubcommand(sub => 
      sub.setName('stats')
        .setDescription('View bot statistics')
    ),
  async execute(interaction) {
    try {
      const sub = interaction.options.getSubcommand();
      
      if (sub === 'sync') {
        await handleSync(interaction);
      } else if (sub === 'edit-character') {
        await handleEdit(interaction);
      } else if (sub === 'stats') {
        await handleStats(interaction);
      }
    } catch (error) {
      logger.error(`Admin error: ${error.message}`);
      await interaction.reply({ 
        content: '❌ Error.', 
        ephemeral: config.ephemeral.admin 
      });
    }
  }
};

async function handleSync(interaction) {
  await interaction.deferReply({ ephemeral: config.ephemeral.admin });
  
  try {
    // ✅ Get all characters with subclasses for all users
    const allChars = await db.getAllUsersWithCharacters();
    
    // ✅ Enrich with Discord usernames
    const enrichedChars = await Promise.all(
      allChars.map(async (char) => {
        let discordName = char.user_id; // Fallback to user ID
        
        try {
          const user = await interaction.client.users.fetch(char.user_id);
          discordName = user.username;
          
          // Try to get server nickname if in guild
          if (interaction.guild) {
            try {
              const member = await interaction.guild.members.fetch(char.user_id);
              if (member.nickname) {
                discordName = member.nickname;
              }
            } catch (error) {
              // User not in guild, use username
            }
          }
        } catch (error) {
          // User not found, use user ID as fallback
        }
        
        return {
          ...char,
          discord_name: discordName
        };
      })
    );
    
    await sheetsService.syncAllCharacters(enrichedChars);
    
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Sync Complete')
      .setDescription(`Synced ${enrichedChars.length} characters.`)
      .setTimestamp();
      
    await interaction.editReply({ embeds: [embed] });
    logger.success('Manual sync done');
  } catch (error) {
    logger.error(`Sync error: ${error.message}`);
    await interaction.editReply({ content: '❌ Sync failed.' });
  }
}

async function handleEdit(interaction) {
  await interaction.deferReply({ ephemeral: config.ephemeral.admin });
  
  try {
    const targetUser = interaction.options.getUser('user');
    const characters = await db.getAllCharactersWithSubclasses(targetUser.id);
    const mainChar = characters.find(c => c.character_type === 'main');
    const alts = characters.filter(c => c.character_type === 'alt');
    const subs = characters.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
    
    const embed = await buildCharacterProfileEmbed(targetUser, characters, interaction);
    const buttons = buildCharacterButtons(mainChar, alts.length, subs.length, targetUser.id);
    
    await interaction.editReply({ embeds: [embed], components: buttons });
    logger.logAction(interaction.user.username, `editing ${targetUser.username}`);
  } catch (error) {
    logger.error(`Edit error: ${error.message}`);
    await interaction.editReply({ content: '❌ Error occurred.' });
  }
}

async function handleStats(interaction) {
  await interaction.deferReply({ ephemeral: config.ephemeral.admin });
  
  try {
    const stats = await db.getStats();
    const allChars = await db.getAllCharacters();
    const mains = allChars.filter(c => c.character_type === 'main');
    const alts = allChars.filter(c => c.character_type === 'alt');
    const subs = allChars.filter(c => c.character_type === 'main_subclass' || c.character_type === 'alt_subclass');
    
    const guildCounts = {};
    mains.forEach(char => {
      if (char.guild) {
        guildCounts[char.guild] = (guildCounts[char.guild] || 0) + 1;
      }
    });
    
    let guildStats = '';
    for (const [guild, count] of Object.entries(guildCounts)) {
      guildStats += `**${guild}:** ${count}\n`;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#6640D9')
      .setTitle('📊 Statistics')
      .addFields(
        { name: '👥 Total Users', value: stats.totalUsers.toString(), inline: true },
        { name: '⭐ Main', value: mains.length.toString(), inline: true },
        { name: '🎭 Alts', value: alts.length.toString(), inline: true },
        { name: '📊 Subclasses', value: subs.length.toString(), inline: true },
        { name: '🏰 Guilds', value: guildStats || 'None', inline: false }
      )
      .setTimestamp();
      
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error(`Stats error: ${error.message}`);
    await interaction.editReply({ content: '❌ Failed.' });
  }
}
