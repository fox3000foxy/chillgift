import { Client, Collection } from "discord.js";
import dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { Command, Config } from "./types";

declare module "discord.js" {
    export interface Client {
        commands: Collection<unknown, unknown>;
    }
}

dotenv.config();
process.env.WEIGHTS_UNOFFICIAL_ENDPOINT = process.env.API_URL;

const config: Config = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN || ""
};

// Initialize Discord Client
const client = new Client({ intents: [] });

// Store commands in a collection
client.commands = new Collection<string, Command>();

// Load commands from files
async function loadCommands(client: Client): Promise<void> {
    const commandsPath = path.join(__dirname, "commands");
    const commandFiles = fs.readdirSync(commandsPath);

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = await import(filePath).then((m) => m.default || m);

        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
            console.log(`Loaded command: ${command.data.name}`);
        } else {
            console.warn(
                `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
            );
        }
    }
}

// Register commands to Discord API
async function registerCommands(client: Client): Promise<void> {
    try {
        const commands = client.application?.commands;
        if (!commands) return;

        for (const command of client.commands.values() as IterableIterator<Command>) {
            await commands.create({
                ...command.data.toJSON(),
                integration_types: [0, 1],
                contexts: [0, 1, 2],
            });
        }
        console.log("Successfully registered application commands.");
    } catch (error) {
        console.error("Failed to register application commands:", error);
    }
}

// Event: Client is ready
client.on("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    await loadCommands(client);
    await registerCommands(client);

    // Load event handlers from `src/events`
    try {
        const eventsPath = path.join(__dirname, "events");
        if (fs.existsSync(eventsPath)) {
            const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
            for (const file of eventFiles) {
                const filePath = path.join(eventsPath, file);
                const mod = await import(filePath).then(m => m.default || m);
                if (typeof mod === 'function') mod(client);
            }
            console.log('Loaded event handlers.');
        }
    } catch (e) {
        console.error('Failed to load events:', e);
    }
});

// Log in to Discord with your client's token
client.login(config.DISCORD_TOKEN);

// Error handling
process.on("uncaughtException", (error: Error) => {
    console.error("🚨 Uncaught Exception: An error occurred!", error);
});

process.on(
    "unhandledRejection",
    (reason: unknown, promise: Promise<unknown>) => {
        console.warn("⚠️ Unhandled Rejection at:", promise, "reason:", reason);
    },
);