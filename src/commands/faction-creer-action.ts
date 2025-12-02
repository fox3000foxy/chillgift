import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import fs from "fs";
import { Faction } from "../types"; // Import the Faction type

// Replace static import of database.json with dynamic loading
function loadDatabase() {
    const data = fs.readFileSync("./databases/database.json", "utf-8");
    return JSON.parse(data);
}

export default {
    data: new SlashCommandBuilder()
        .setName("faction_creer_action")
        .setDescription("Créer des actions pour votre faction (réservé au président).")
        .addIntegerOption(option =>
            option
                .setName("nombre")
                .setDescription("Nombre d'actions à créer.")
                .setRequired(true),
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const database = loadDatabase(); // Dynamically load the database
        const userId = interaction.user.id;
        const nombre = interaction.options.getInteger("nombre") as number;

        // Ensure user data exists in the database
        const users = database.users as Record<string, any>;
        let userData = users[userId];

        if (!userData) {
            const defaultUser = {
                points: 0,
                inventory: { shield: 0 },
                daily: { date: "", donjon: 0, traps: 0, works: 0, claimed: false },
                faction: { name: null, shares: {} },
                maritime: {},
            };
            users[userId] = defaultUser;
            userData = users[userId];
            fs.writeFileSync("./databases/database.json", JSON.stringify(database, null, 2));
        }

        // Check if the user is in a faction
        if (!userData.faction.name) {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("Pas de Faction")
                .setDescription("Vous n'êtes membre d'aucune faction.");

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const factionName = userData.faction.name;
        const factions = database.factions as Record<string, Faction>; // Dynamically load factions
        const faction = factions[factionName];

        // Ensure the faction exists in the database
        if (!faction) {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("Faction Introuvable")
                .setDescription(`La faction \`${factionName}\` n'existe pas dans la base de données.`);

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Check if the user is the president of the faction
        if (faction.president !== userId) {
            const embed = new EmbedBuilder()
                .setColor("Yellow")
                .setTitle("Accès Refusé")
                .setDescription("Seul le président de la faction peut créer des actions.");

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Validate the number of actions to create
        if (nombre <= 0) {
            const embed = new EmbedBuilder()
                .setColor("Yellow")
                .setTitle("Nombre Invalide")
                .setDescription("Le nombre d'actions à créer doit être supérieur à zéro.");

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Update the faction's actions and assign shares to the president
        faction.shares += nombre;
        faction.value = Math.max(1, Math.round(faction.value - 0.1 * nombre)); // Example formula

        if (!userData.faction.shares[factionName]) {
            userData.faction.shares[factionName] = 0;
        }
        userData.faction.shares[factionName] += nombre;

        fs.writeFileSync("./databases/database.json", JSON.stringify(database, null, 2));

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("Actions Créées")
            .setDescription(
                `Vous avez créé ${nombre} actions pour la faction \`${factionName}\`.\n` +
                `Ces actions vous ont été attribuées.\n` +
                `**Valeur actuelle d'une action :** ${faction.value} points.`
            );

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
};