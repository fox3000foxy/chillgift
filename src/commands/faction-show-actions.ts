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
        .setName("faction_show_actions")
        .setDescription("Afficher les actions détenues par un joueur dans les factions."),

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const database = loadDatabase(); // Dynamically load the database
            const userId = interaction.user.id;

            // Ensure user data exists in the database
            const users = database.users as Record<string, any>;
            const userData = users[userId];

            if (!userData) {
                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("Aucune Donnée Trouvée")
                    .setDescription("Vous n'avez pas de données enregistrées.");

                log('Faction-Show-Actions Command', `${interaction.user.tag} has no data recorded.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const shares = userData.faction.shares as Record<string, number>;
            let totalPortfolioValue = 0;
            const shareDetails = Object.entries(shares)
                .map(([factionName, shareCount]) => {
                    const faction = database.factions[factionName];
                    const shareValue = faction ? faction.value : 0;
                    const totalValue = (shareCount ?? 0) * shareValue;
                    totalPortfolioValue += totalValue;
                    return `Faction: **${factionName}**, Actions: **${shareCount}**, Valeur par action: **${shareValue}**, Valeur totale: **${totalValue}**`;
                })
                .join("\n");

            if (!shareDetails) {
                const embed = new EmbedBuilder()
                    .setColor("Yellow")
                    .setTitle("Aucune Action Détenue")
                    .setDescription("Vous ne détenez aucune action dans les factions.");

                log('Faction-Show-Actions Command', `${interaction.user.tag} owns no shares in any faction.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("Vos Actions dans les Factions")
                .setDescription(`${shareDetails}\n\n**Valeur totale du portefeuille : ${totalPortfolioValue}**`);

            log('Faction-Show-Actions Command', `${interaction.user.tag} viewed their faction shares. Total portfolio value: ${totalPortfolioValue}.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (e) {
            console.error('Faction-Show-Actions Command Error:', e);
            log('Faction-Show-Actions Command Error', `Error occurred: ${String(e)}`);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
            }
        }
    },
};