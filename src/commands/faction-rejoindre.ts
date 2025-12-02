import { AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import fs from "fs";

// Replace static import of database.json with dynamic loading
function loadDatabase() {
    const data = fs.readFileSync("./databases/database.json", "utf-8");
    return JSON.parse(data);
}

export default {
    data: new SlashCommandBuilder()
        .setName("faction_rejoindre")
        .setDescription("Rejoindre une faction.")
        .addStringOption(option =>
            option
                .setName("faction")
                .setDescription("Nom de la faction à rejoindre (bleu, vert, jaune, rouge, violet).")
                .setRequired(true),
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const database = loadDatabase(); // Dynamically load the database
        const userId = interaction.user.id;
        const factionName = interaction.options.getString("faction") as keyof typeof database.factions;

        // Check if the faction exists in the database
        const faction = database.factions[factionName];
        if (!faction) {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("Faction Introuvable")
                .setDescription(`La faction \`${factionName as string}\` n'existe pas. Veuillez choisir parmi : bleu, vert, jaune, rouge, violet.`);

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Check if the user is already in a faction
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

        if (userData.faction.name) {
            const embed = new EmbedBuilder()
                .setColor("Yellow")
                .setTitle("Déjà Membre")
                .setDescription(`Vous êtes déjà membre de la faction \`${userData.faction.name}\`. Quittez votre faction actuelle avant d'en rejoindre une autre.`);

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Add the user to the faction
        userData.faction.name = factionName as unknown as typeof userData.faction.name;
        fs.writeFileSync("./databases/database.json", JSON.stringify(database, null, 2));

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("Rejoint avec Succès")
            .setDescription(`Vous avez rejoint la faction \`${factionName as string}\` !`);

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async autocomplete(interaction: AutocompleteInteraction) {
        const database = loadDatabase(); // Dynamically load the database
        const focusedValue = interaction.options.getFocused();
        const factionNames = Object.keys(database.factions);
        const filtered = factionNames.filter(name => name.startsWith(focusedValue));
        await interaction.respond(
            filtered.map(name => ({ name, value: name })),
        );
    },
};