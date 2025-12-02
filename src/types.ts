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

// Define the faction data structure
export interface Faction {
    name: string; // Name of the faction
    president: string; // Discord ID of the faction president
    members: string[]; // List of Discord IDs of faction members
    shares: number; // Number of shares created by the faction
    value: number; // Current value of one share
}