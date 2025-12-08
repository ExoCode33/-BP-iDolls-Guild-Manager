import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

// Import the 3 commands
import editMemberDetails from './src/commands/edit-member-details.js';
import admin from './src/commands/admin.js';
import viewChar from './src/commands/view-char.js';

dotenv.config();

const commands = [
  editMemberDetails.data.toJSON(),
  admin.data.toJSON(),
  viewChar.data.toJSON()
];

console.log('📋 Deploying 3 commands:\n');
commands.forEach(cmd => {
  const subcommands = cmd.options?.filter(opt => opt.type === 1).map(opt => opt.name) || [];
  if (subcommands.length > 0) {
    console.log(`   ✅ /${cmd.name} (${subcommands.join(', ')})`);
  } else {
    console.log(`   ✅ /${cmd.name}`);
  }
});

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('\n🚀 Registering commands with Discord...\n');

    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log(`✅ Successfully registered ${data.length} commands!\n`);
    
    data.forEach(cmd => {
      const subcommands = cmd.options?.filter(opt => opt.type === 1).map(opt => opt.name) || [];
      if (subcommands.length > 0) {
        console.log(`   /${cmd.name} (${subcommands.join(', ')})`);
      } else {
        console.log(`   /${cmd.name}`);
      }
    });
    
    console.log('\n🎉 Deployment complete!');
    console.log('   Commands should appear in Discord within 1-2 minutes.\n');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    
    if (error.code === 50001) {
      console.log('\n⚠️  Missing Access!');
      console.log('   Your bot needs the "applications.commands" scope.');
      console.log(`\n   Re-invite with this URL:`);
      console.log(`   https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands\n`);
    } else if (error.rawError?.message) {
      console.log(`\n⚠️  Error: ${error.rawError.message}\n`);
    }
  }
})();
