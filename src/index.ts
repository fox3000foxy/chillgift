import { Client, Collection, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import registerInteractionCreate from "./events/interactionCreate";
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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.MessageContent
  ]
});

// Store commands in a collection
client.commands = new Collection<string, Command>();

// Load commands from files
async function loadCommands(client: Client): Promise<void> {
    const commandsPath = path.join(__dirname, "commands");
    if (!fs.existsSync(commandsPath)) return;

    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter(f => f.endsWith(".ts") || f.endsWith(".js"));

    const results = await Promise.all(
        commandFiles.map(async (file) => {
            const filePath = path.join(commandsPath, file);
            try {
                const mod = await import(filePath).then((m) => (m.default || m));
                return { mod, filePath };
            } catch (error) {
                console.error(`Failed to import command at ${filePath}:`, error);
                return null;
            }
        }),
    );

    for (const item of results) {
        if (!item) continue;
        const { mod, filePath } = item as { mod: unknown; filePath: string };
        if (mod && typeof mod === "object" && "data" in mod && "execute" in mod) {
            const command = mod as Command;
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
    // await registerCommands(client);
    registerInteractionCreate(client);

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

client.on("interactionCreate", async interaction => {
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName) as Command;
        if (interaction.isUserContextMenuCommand()) {
            const command = client.commands.get(interaction.commandName) as Command;
            if (!command) {
                console.error(
                    `No command matching ${interaction.commandName} was found.`,
                );
                await interaction.reply({
                    content: "Command not found!",
                    ephemeral: true,
                });
                return;
            }
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}:`, error);
                await interaction.reply({
                    content: "There was an error while executing this command!",
                    ephemeral: true,
                });
            }
            return;
        }

        if (!command) {
            console.error(
                `No command matching ${interaction.commandName} was found.`,
            );
            await interaction.reply({
                content: "Command not found!",
                ephemeral: true,
            });
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}:`, error);
            await interaction.reply({
                content: "There was an error while executing this command!",
                ephemeral: true,
            });
        }
    } else if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName) as Command;

        if (!command || !command.autocomplete) {
            console.error(
                `No command matching ${interaction.commandName} was found.`,
            );
            return;
        }

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(
                `Error executing autocomplete for ${interaction.commandName}:`,
                error,
            );
        }
    }
});

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message, TextChannel } from 'discord.js';
import { db, getUser, saveDatabase, updatePoints } from './legacy/db';

client.on('messageCreate', async (message: Message) => {
    console.log('messageCreate event triggered');
    if (message.author.bot) return;
    // Ensure this message is from a guild (not a DM)
    if (!message.guild) return;

    // Simple spam protection (like original)
    const cooldowns = (client as any).__legacyCooldowns ||= new Map<string, number>();
    const last = cooldowns.get(message.author.id) || 0;
    if (Date.now() - last < 2000) return;
    cooldowns.set(message.author.id, Date.now());

    const p = db.config.probs;
    const rand = Math.random() * 100;
    let type: string | null = null;
    if (rand < p.star) type = 'star';
    else if (rand < p.star + p.phoenix) type = 'phoenix';
    else if (rand < p.star + p.phoenix + p.tree) type = 'tree';
    else if (rand < p.star + p.phoenix + p.tree + p.snowball) type = 'snowball';
    else if (rand < p.star + p.phoenix + p.tree + p.snowball + p.quiz) type = 'quiz';

    try {
        if (type === 'star') {
            const m = await message.reply('🌠 **ÉTOILE !** Vite !');
            await m.react('🌠');
            const collector = m.createReactionCollector({ filter: (r, u) => r.emoji.name === '🌠' && !u.bot, time: 15000, max: 1 });
            collector.on('collect', async (r, u) => {
                // simple handling: reward
                const user = getUser(u.id);
                if (user.inventory?.dagger > 0) {
                    // ask for dagger choice
                    await (message.channel as TextChannel).send(`<@${u.id}> Dague ?`);
                } else {
                    if (Math.random() > 0.4) {
                        updatePoints(u.id, 50);
                        (message.channel as TextChannel).send(`🎉 <@${u.id}> +50`);
                    } else {
                        // bad reaction
                        if (user.inventory?.amulet > 0) { user.inventory.amulet--; saveDatabase(); (message.channel as TextChannel).send(`<@${u.id}> 🛡️ Amulette`); }
                        else if (user.inventory?.shield > 0) { user.inventory.shield--; saveDatabase(); (message.channel as TextChannel).send(`<@${u.id}> 🛡️ Bouclier`); }
                        else { updatePoints(u.id, -50); (message.channel as TextChannel).send(`<@${u.id}> 🔥 Piège -50`); }
                    }
                }
            });
        } else if (type === 'phoenix') {
            await message.react('🔥');
            const collector = message.createReactionCollector({ filter: (r, u) => r.emoji.name === '🔥' && !u.bot, time: 15000, max: 1 });
            collector.on('collect', (r, u) => {
                updatePoints(u.id, -10);
                (message.channel as TextChannel).send(`🔥 <@${u.id}> -10`);
            });
        } else if (type === 'tree') {
            await message.react('🎄');
            const collector = message.createReactionCollector({ filter: (r, u) => r.emoji.name === '🎄' && !u.bot, time: 15000, max: 1 });
            collector.on('collect', (r, u) => {
                updatePoints(u.id, 5);
                (message.channel as TextChannel).send(`🎄 <@${u.id}> +5`);
            });
        } else if (type === 'snowball') {
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('ev_snowball').setLabel('JETER').setStyle(ButtonStyle.Primary)
            );
            await (message.channel as TextChannel).send({ embeds: [new EmbedBuilder().setTitle('❄️ BATAILLE').setColor('#3498DB')], components: [row] });
        } else if (type === 'quiz') {
            const a = Math.floor(Math.random() * 50), b = Math.floor(Math.random() * 50);
            await (message.channel as TextChannel).send(`🧠 **QUIZ:** ${a} + ${b} ?`);
            // message.channel is safe here because message.guild is present
            const collector = (message.channel as TextChannel).createMessageCollector({ filter: m => !m.author.bot && m.content.trim() === (a + b).toString(), time: 10000, max: 1 });
            collector.on('collect', m => { updatePoints(m.author.id, 15); (message.channel as TextChannel).send(`✅ <@${m.author.id}> +15 pts`); });
        }
    } catch (e) {
        console.error('messageCreate event error:', e);
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