import { ButtonInteraction, Client, Collection, GatewayIntentBits, GuildMember } from "discord.js";
import dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { Command } from "./types";

declare module "discord.js" {
    export interface Client {
        commands: Collection<unknown, unknown>;
    }
}

dotenv.config();
process.env.WEIGHTS_UNOFFICIAL_ENDPOINT = process.env.API_URL;

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
async function loadCommands(client: Client): Promise<Command[]> {
    const commandsPath = path.join(__dirname, "commands");
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
            // console.log(`Loaded command: ${command.data.name}`);
        } else {
            console.warn(
                `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
            );
        }
    }

    console.log(`Loaded ${client.commands.size} commands.`);

    return results
        .filter((item): item is { mod: Command; filePath: string } => item !== null)
        .map(item => item.mod as Command);
}

// Register commands to Discord API
async function registerCommands(commands: Command[]): Promise<void> {
    try {
        console.log("Registering application commands...");
        // Ensure client.application is populated (ready) before attempting to register
        await client.application?.fetch();
        console.log("Client application fetched.");

        // Convert commands to JSON and register them all at once
        const commandData = commands.map(command => command.data.toJSON());
        await client.application?.commands.set(commandData);

        console.log(`Successfully registered ${commands.length} application commands.`);
    } catch (error) {
        console.error("Error registering application commands:", error);
    }
}
// Event: Client is ready
client.once("clientReady", async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    const commands = await loadCommands(client);
    await registerCommands(commands);

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
        startExpeditionDaemon(client);
        startRandomEventDaemon(client);
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
    } else if (interaction.isButton()) {
        const btn = interaction as ButtonInteraction;
        // Ensure this interaction originates from a guild (buttons in DMs are unsupported for our flows)
        if (!btn.guild) return btn.reply({ content: 'Action disponible uniquement en serveur.', ephemeral: true });
        const [act, sub, data] = btn.customId.split('_');
        const user = getUser(btn.user.id);

        // Snowball event
        if (act === 'ev' && sub === 'snowball') {
            const claimedMessages = getClaimedMessages();

            // Log for debugging
            console.log(`Checking if message ${btn.message.id} is already claimed.`);

            if (claimedMessages.includes(btn.message.id)) {
                console.log(`Message ${btn.message.id} already claimed.`);
                if (!btn.replied && !btn.deferred) {
                    return btn.reply({ content: 'Trop tard.', ephemeral: true });
                }
                return;
            }

            // Mark the message as claimed
            addClaimedMessage(btn.message.id);
            console.log(`Message ${btn.message.id} marked as claimed.`);

            // Defer the reply to handle async operations
            if (!btn.replied && !btn.deferred) {
                await btn.deferReply();
            }

            await btn.message.edit({ components: [] });
            updatePoints(btn.user.id, 5);

            const guild = btn.guild;

            // Vérifier si les membres sont déjà dans le cache
            let members;
            try {
                members = guild.members.cache.size > 0
                    ? guild.members.cache
                    : await guild.members.fetch();
            } catch (err) {
                const errorAny = err as any;
                if (errorAny && typeof errorAny === 'object' && errorAny.name === 'GatewayRateLimitError') {
                    const retryAfter = errorAny.data?.retry_after ?? 1;
                    console.warn(`Rate limit hit: retrying after ${retryAfter} seconds.`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    members = await guild.members.fetch();
                } else {
                    console.error('Failed to fetch guild members:', err);
                    return btn.reply({ content: 'Erreur lors de la récupération des membres.', ephemeral: true });
                }
            }

            let txt = '❄️ **HIT**\n';
            let embed = new EmbedBuilder()
                .setTitle('❄️ Snowball Hit!')
                .setColor('#3498DB');

            if (members && members.size > 0) {
                let random = members.random() as GuildMember;
                // Le membre random ne peut pas etre le cliqueur, on while jusqu'a en avoir un autre, il y a au moins 2 membres dans le serveur car le cliqueur est la
                while ((random.id === btn.user.id || random.user.bot) && members.size > 1) {
                    random = members.random() as GuildMember;
                }

                const victim = getUser(random.id);
                if (victim.inventory.amulet > 0) {
                    victim.inventory.amulet--;
                    txt += `🛡️ <@${random.id}> protégé par une amulette.`;
                } else if (victim.inventory.shield > 0) {
                    victim.inventory.shield--;
                    txt += `🛡️ <@${random.id}> protégé par un bouclier.`;
                } else {
                    updatePoints(random.id, -3);
                    txt += `🎯 <@${random.id}> perd **3 points**.`;
                }
                saveDatabase();
            }

            embed.setDescription(txt);
            return btn.followUp({ embeds: [embed] });
        }
    }
});

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message, TextChannel } from 'discord.js';
import { startExpeditionDaemon } from "./commands/expedition";
import { addClaimedMessage, db, getClaimedMessages, getUser, saveDatabase, updatePoints } from './legacy/db';
import { startRandomEventDaemon } from "./lib/randomEvents";

client.on('messageCreate', async (message: Message) => {
    // console.log('messageCreate event triggered');
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
            const embed = new EmbedBuilder()
                .setTitle('🌠 ÉTOILE !')
                .setDescription('Vite, réagissez avec 🌠 pour gagner des points !')
                .setColor('#FFD700');

            const m = await message.reply({ embeds: [embed] });
            await m.react('🌠');
            const collector = m.createReactionCollector({ filter: (r, u) => r.emoji.name === '🌠' && !u.bot, time: 15000, max: 1 });
            collector.on('collect', async (r, u) => {
                const user = getUser(u.id);
                const rewardEmbed = new EmbedBuilder().setColor('#2ECC71');

                if (user.inventory?.dagger > 0) {
                    rewardEmbed
                        .setTitle('Dague trouvée !')
                        .setDescription(`<@${u.id}> a trouvé une dague !`);
                    user.inventory.dagger--;
                    saveDatabase();
                    log('Star Event', `${u.tag} used a dagger to avoid star damage.`);
                } else {
                    if (Math.random() > 0.4) {
                        updatePoints(u.id, 50);
                        rewardEmbed
                            .setTitle('🎉 Récompense !')
                            .setDescription(`<@${u.id}> gagne **250 points** !`);
                        log('Star Event', `${u.tag} reacted to star and earned 250 points.`);
                    } else {
                        if (user.inventory?.amulet > 0) {
                            user.inventory.amulet--;
                            saveDatabase();
                            rewardEmbed
                                .setTitle('🛡️ Amulette utilisée !')
                                .setDescription(`<@${u.id}> a utilisé une amulette pour se protéger.`);
                            log('Star Event', `${u.tag} used an amulet to protect themselves from star damage.`);
                        } else if (user.inventory?.shield > 0) {
                            user.inventory.shield--;
                            saveDatabase();
                            rewardEmbed
                                .setTitle('🛡️ Bouclier utilisé !')
                                .setDescription(`<@${u.id}> a utilisé un bouclier pour se protéger.`);
                            log('Star Event', `${u.tag} used a shield to protect themselves from star damage.`);
                        } else {
                            // updatePoints(u.id, -50);
                            // rewardEmbed
                            //     .setTitle('🔥 Piège !')
                            //     .setDescription(`<@${u.id}> perd **50 points** !`);

                            // Timeout le user pendant 2 minutes (120000 ms)
                            const guild = message.guild;
                            if (!guild) return;
                            const member = await guild.members.fetch(u.id).catch(() => null);
                            member?.timeout(120000, 'Touché par une étoile sans protection');
                            rewardEmbed
                                .setTitle('⏱️ Timeout !')
                                .setDescription(`<@${u.id}> a été mis en timeout pendant 2 minutes pour avoir touché une étoile sans protection.`);
                            log('Star Event', `${u.tag} was timed out for touching a star without protection.`);
                        }
                    }
                }

                await (message.channel as TextChannel).send({ embeds: [rewardEmbed] });
            });
        } else if (type === 'phoenix') {
            await message.react('🔥');
            const collector = message.createReactionCollector({ filter: (r, u) => r.emoji.name === '🔥' && !u.bot, time: 15000, max: 1 });
            collector.on('collect', (r, u) => {
                updatePoints(u.id, -10);
                const rewardEmbed = new EmbedBuilder()
                    .setTitle('🔥 Récompense Phoenix')
                    .setDescription(`<@${u.id}> perd **10 points**.`)
                    .setColor('#E74C3C');
                (message.channel as TextChannel).send({ embeds: [rewardEmbed] });
                log('Phoenix Event', `${u.tag} reacted to phoenix and lost 10 points.`);
            });
        } else if (type === 'tree') {
            // React directly on the original message like the 'phoenix' case (no embed)
            await message.react('🎄');
            const collector = message.createReactionCollector({ filter: (r, u) => r.emoji.name === '🎄' && !u.bot, time: 15000, max: 1 });
            collector.on('collect', (r, u) => {
                updatePoints(u.id, 5);
                const rewardEmbed = new EmbedBuilder()
                    .setTitle('🎉 Points Gagnés !')
                    .setDescription(`<@${u.id}> gagne **5 points** !`)
                    .setColor('#2ECC71');
                (message.channel as TextChannel).send({ embeds: [rewardEmbed] });
                log('Tree Event', `${u.tag} reacted to tree and earned 5 points.`);
            });
        } else if (type === 'snowball') {
            const embed = new EmbedBuilder()
                .setTitle('❄️ BATAILLE DE BOULES DE NEIGE !')
                .setDescription('Appuyez sur le bouton pour participer !')
                .setColor('#3498DB');

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('ev_snowball').setLabel('JETER').setStyle(ButtonStyle.Primary)
            );
            await (message.channel as TextChannel).send({ embeds: [embed], components: [row] });
        } else if (type === 'quiz') {
            const a = Math.floor(Math.random() * 50), b = Math.floor(Math.random() * 50);
            const embed = new EmbedBuilder()
                .setTitle('🧠 QUIZ !')
                .setDescription(`Quelle est la réponse à : **${a} + ${b}** ?`)
                .setColor('#9B59B6');

            await (message.channel as TextChannel).send({ embeds: [embed] });
            const collector = (message.channel as TextChannel).createMessageCollector({ filter: m => !m.author.bot && m.content.trim() === (a + b).toString(), time: 10000, max: 15 });
            collector.on('collect', m => {
                updatePoints(m.author.id, 15);
                const rewardEmbed = new EmbedBuilder()
                    .setTitle('✅ Réponse Correcte !')
                    .setDescription(`<@${m.author.id}> gagne **15 points** !`)
                    .setColor('#2ECC71');
                (message.channel as TextChannel).send({ embeds: [rewardEmbed] });
                log('Quiz Event', `${m.author.tag} answered the quiz question correctly and earned 15 points.`);
            });
        }
    } catch (e) {
        console.error('messageCreate event error:', e);
    }
});

export async function log(title: string, details: string, extraFields = []) {
    console.log(`[${title}] ${details}`);
    const chan = await client.channels.fetch(db.config.logChannelId).catch(() => null);
    if (!chan) return;

    const embed = new EmbedBuilder().setTitle(title).setDescription(details.substring(0, 4000)).setColor("#3498DB").setTimestamp();
    if (extraFields.length > 0) embed.addFields(extraFields);
    try { await (chan as TextChannel).send({ embeds: [embed] }); } catch (e) { }
}

// Log in to Discord with your client's token
client.login(db.config.bot_token);

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