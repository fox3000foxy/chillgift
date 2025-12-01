import { SlashCommandBuilder } from "@discordjs/builders";
import {
    AutocompleteInteraction,
    CommandInteraction,
} from "discord.js";

export interface Command {
  data: SlashCommandBuilder;
  execute: (
    interaction: CommandInteraction
  ) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export interface Config {
  DISCORD_TOKEN: string;
}