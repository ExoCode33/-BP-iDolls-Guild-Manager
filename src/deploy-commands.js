import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

// Import commands
import editMemberDetails from './commands/edit-member-details.js';
import admin from './commands/admin.js';
import viewChar from './commands/view-char.js';

dotenv.config();

const commands = [
  editMemberDetails.data.toJSON(),
  admin.data.toJSON(),
  viewChar.data.toJSON(),
];

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // For guild-based commands (faster during development)
    if (process.env.GUILD_ID) {
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands },
      );
      console.log(`✅ Successfully reloaded ${data.length} guild (/) commands.`);
    } 
    // For global commands (takes up to 1 hour to propagate)
    else {
      const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );
      console.log(`✅ Successfully reloaded ${data.length} global (/) commands.`);
    }
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
})();
