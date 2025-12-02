import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import fs from "fs";
import { log } from '../index';

// Replace static import of database.json with dynamic loading
function loadDatabase() {
    const data = fs.readFileSync("./databases/database.json", "utf-8");
    return JSON.parse(data);
}

export default {
    data: new SlashCommandBuilder()
        .setName("faction_quitter")
        .setDescription("Quitter votre faction actuelle."),

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const database = loadDatabase(); // Dynamically load the database
            const userId = interaction.user.id;

            // Get user data from the database
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

            // If the user is not in any faction
            if (!userData.faction.name) {
                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("Pas de Faction")
                    .setDescription("Vous n'êtes membre d'aucune faction.");

                log('Faction-Quitter Command', `${interaction.user.tag} tried to leave a faction but is not in one.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Remove the user from the faction
            const factionName = userData.faction.name;
            userData.faction.name = null;
            fs.writeFileSync("./databases/database.json", JSON.stringify(database, null, 2));

            log('Faction-Quitter Command', `${interaction.user.tag} left the faction ${factionName}.`);

            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("Faction Quittée")
                .setDescription(`Vous avez quitté la faction \`${factionName}\`.`);

            return interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (e) {
            console.error('Faction-Quitter Command Error:', e);
            log('Faction-Quitter Command Error', `Error occurred: ${String(e)}`);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
            }
        }
    },
};