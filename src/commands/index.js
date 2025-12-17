import { Collection } from 'discord.js';
import * as character from './character.js';
import * as admin from './admin.js';

export function loadCommands() {
  const commands = new Collection();

  commands.set(character.data.name, character);
  commands.set(admin.data.name, admin);

  return commands;
}

export function getCommandData() {
  return [character.data.toJSON(), admin.data.toJSON()];
}
