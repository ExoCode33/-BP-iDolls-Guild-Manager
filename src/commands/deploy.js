import { REST, Routes } from 'discord.js';
import config from './config/index.js';
import { getCommandData } from './commands/index.js';

const rest = new REST().setToken(config.discord.token);

async function deploy() {
  try {
    console.log('Deploying commands...');

    const commands = getCommandData();

    if (config.discord.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands }
      );
      console.log(`Deployed ${commands.length} commands to guild ${config.discord.guildId}`);
    } else {
      await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands }
      );
      console.log(`Deployed ${commands.length} commands globally`);
    }
  } catch (e) {
    console.error('Deploy failed:', e);
    process.exit(1);
  }
}

deploy();
