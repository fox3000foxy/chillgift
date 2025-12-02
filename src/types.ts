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
  superAdminRoles: string[]; // Roles with admin privileges
  logChannelId: string; // Channel ID for logging
  adventChannelId: string; // Channel ID for advent calendar

  // Economy & Rewards
  dailyReward: number;
  inviteReward: number;
  starGain: number;
  treeGain: number;
  snowballHit: number;
  snowballDmg: number;

  // Costs
  costTrap: number;
  costExpedition: number;
  costRouletteMin: number;
  costShield: number;
  costAmulet: number;
  costDagger: number;

  // Limits
  limitTraps: number;
  limitExpedition: number;

  // Probabilities
  probs: {
    star: number;
    phoenix: number;
    tree: number;
    snowball: number;
    quiz: number;
  };

  // Advent Calendar
  prizesStock: {
    netflix: number;
    canal: number;
    deco: number;
  };
  adventProbs: {
    prize: number;
    mute: number;
    xp: number;
    nothing: number;
    curse: number;
  };
}

// Define the faction data structure
export interface Faction {
    name: string; // Name of the faction
    president: string; // Discord ID of the faction president
    members: string[]; // List of Discord IDs of faction members
    shares: number; // Number of shares created by the faction
    value: number; // Current value of one share
}