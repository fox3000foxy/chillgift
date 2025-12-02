import { Client, EmbedBuilder, TextChannel } from "discord.js";
import fs from "fs";
import { Faction } from "../types";

// Function to load the database dynamically
function loadDatabase() {
    return JSON.parse(fs.readFileSync("./databases/database.json", "utf-8"));
}

// Define random events
const randomEvents = [
    {
        name: "Boom Économique",
        description: "L'économie est florissante ! Les valeurs des actions de la faction {faction} augmentent de 10%.",
        effect: (faction: Faction) => {
            faction.value = Math.min(20, Math.max(5, Math.round(faction.value * 1.1)));
        },
        positive: true,
    },
    {
        name: "Krach Boursier",
        description: "Un krach boursier a frappé ! Les valeurs des actions de la faction {faction} diminuent de 15%.",
        effect: (faction: Faction) => {
            faction.value = Math.min(20, Math.max(5, Math.round(faction.value * 0.85)));
        },
        positive: false,
    },
    {
        name: "Nouvel Investissement",
        description: "Un investisseur majeur a rejoint la faction {faction} ! Les valeurs des actions augmentent de 20%.",
        effect: (faction: Faction) => {
            faction.value = Math.min(20, Math.max(5, Math.round(faction.value * 1.2)));
        },
        positive: true,
    },
    {
        name: "Scandale",
        description: "Un scandale a secoué la faction {faction}. Les valeurs des actions diminuent de 25%.",
        effect: (faction: Faction) => {
            faction.value = Math.min(20, Math.max(5, Math.round(faction.value * 0.75)));
        },
        positive: false,
    },
    {
        name: "Découverte Technologique",
        description: "La faction {faction} a fait une avancée technologique majeure ! Les valeurs des actions augmentent de 30%.",
        effect: (faction: Faction) => {
            faction.value = Math.min(20, Math.max(5, Math.round(faction.value * 1.3)));
        },
        positive: true,
    },
    {
        name: "Conflit Interne",
        description: "Des conflits internes ont éclaté dans la faction {faction}. Les valeurs des actions diminuent de 20%.",
        effect: (faction: Faction) => {
            faction.value = Math.min(20, Math.max(5, Math.round(faction.value * 0.8)));
        },
        positive: false,
    },
    {
        name: "Partenariat Stratégique",
        description: "La faction {faction} a conclu un partenariat stratégique ! Les valeurs des actions augmentent de 15%.",
        effect: (faction: Faction) => {
            faction.value = Math.min(20, Math.max(5, Math.round(faction.value * 1.15)));
        },
        positive: true,
    },
    {
        name: "Catastrophe Naturelle",
        description: "Une catastrophe naturelle a frappé la faction {faction}. Les valeurs des actions diminuent de 30%.",
        effect: (faction: Faction) => {
            faction.value = Math.min(20, Math.max(5, Math.round(faction.value * 0.7)));
        },
        positive: false,
    },
    {
        name: "Fusion de Factions",
        description: "Deux factions ont fusionné, augmentant leur valeur de 50% ! La faction {faction} en profite grandement.",
        effect: (faction: Faction) => {
            faction.value = Math.min(20, Math.max(5, Math.round(faction.value * 1.5)));
        },
        positive: true,
    },
    {
        name: "Trahison",
        description: "Un membre influent a quitté la faction {faction}, provoquant une chute de 40% de sa valeur.",
        effect: (faction: Faction) => {
            faction.value = Math.min(20, Math.max(5, Math.round(faction.value * 0.6)));
        },
        positive: false,
    },
    {
        name: "Découverte d'une Ressource Rare",
        description: "La faction {faction} a découvert une ressource rare, augmentant sa valeur de 25% !",
        effect: (faction: Faction) => {
            faction.value = Math.min(20, Math.max(5, Math.round(faction.value * 1.25)));
        },
        positive: true,
    },
    {
        name: "Cyberattaque",
        description: "Une cyberattaque a paralysé la faction {faction}, réduisant sa valeur de 35%.",
        effect: (faction: Faction) => {
            faction.value = Math.min(20, Math.max(5, Math.round(faction.value * 0.65)));
        },
        positive: false,
    },
    {
        name: "Soutien Gouvernemental",
        description: "Le gouvernement a décidé de soutenir la faction {faction}, augmentant sa valeur de 20% !",
        effect: (faction: Faction) => {
            faction.value = Math.min(20, Math.max(5, Math.round(faction.value * 1.2)));
        },
        positive: true,
    },
    {
        name: "Épidémie",
        description: "Une épidémie a frappé la faction {faction}, réduisant sa valeur de 30%.",
        effect: (faction: Faction) => {
            faction.value = Math.min(20, Math.max(5, Math.round(faction.value * 0.7)));
        },
        positive: false,
    },
    {
        name: "Rébellion",
        description: "Une rébellion interne affaiblit la faction {faction}, diminuant sa valeur de 50%.",
        effect: (faction: Faction) => {
            faction.value = Math.min(20, Math.max(5, Math.round(faction.value * 0.5)));
        },
        positive: false,
    },
    {
        name: "Découverte Archéologique",
        description: "Une découverte archéologique majeure met la faction {faction} sous les projecteurs, augmentant sa valeur de 40% !",
        effect: (faction: Faction) => {
            faction.value = Math.min(20, Math.max(5, Math.round(faction.value * 1.4)));
        },
        positive: true,
    },
];

// Daemon to trigger random events
export function startRandomEventDaemon(client: Client) {
    setInterval(() => {
        const database = loadDatabase(); // Load the database dynamically
        const event = randomEvents[Math.floor(Math.random() * randomEvents.length)];
        const factionKeys = Object.keys(database.factions) as (keyof typeof database.factions)[];

        // Select a random faction
        const randomFactionKey = factionKeys[Math.floor(Math.random() * factionKeys.length)];
        const faction = database.factions[randomFactionKey] as Faction;

        // Apply the event effect to the selected faction
        event.effect(faction);

        fs.writeFileSync("./databases/database.json", JSON.stringify(database, null, 2));

        // Announce the event
        const eventsChannelId = database.config.eventsChannelId;
        if (eventsChannelId) {
            const eventsChannel = client.channels.cache.get(eventsChannelId);
            if (eventsChannel && eventsChannel.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setColor(event.positive ? "Green" : "Red")
                    .setTitle(`${event.name}`)
                    .setDescription(
                        event.description.replace("{faction}", randomFactionKey as string) +
                        `\n\nNouvelle valeur par action pour la faction **${randomFactionKey as string}** : **${faction.value} points**`
                    );

                (eventsChannel as TextChannel).send({ embeds: [embed] });
            }
        }
    }, 3 * 60 * 1000); // Trigger every 3 minutes
}