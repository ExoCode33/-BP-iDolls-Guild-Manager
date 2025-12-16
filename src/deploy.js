import discord from 'discord.js';
const { REST, Routes } = discord;
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import config from './utils/config.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const commands = [];

async function loadCommands() {
  const commandFolders = ['user', 'admin'];
  for (const folder of commandFolders) {
    const commandsPath = join(__dirname, 'commands', folder);
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const command = await import(`file://${filePath}`);
      if (command.default && 'data' in command.default) {
        commands.push(command.default.data.toJSON());
        logger.log(`Loaded: ${command.default.data.name}`);
      }
    }
  }
}

async function deploy() {
  try {
    await loadCommands();
    logger.log(`Deploying ${commands.length} commands...`);
    const rest = new REST().setToken(config.discord.token);
    const data = await rest.put(Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId), { body: commands });
    logger.success(`Deployed ${data.length} commands!`);
  } catch (error) {
    logger.error(`Deployment failed: ${error.message}`);
    process.exit(1);
  }
}

deploy();
