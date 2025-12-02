import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import fs from "fs";
import { log } from '../index';
import { Faction } from "../types";

function loadDatabase() {
    const data = fs.readFileSync("./databases/database.json", "utf-8");
    return JSON.parse(data);
}
export default {
    data: new SlashCommandBuilder()
        .setName("faction_valeur")
        .setDescription("Afficher les valeurs actuelles de toutes les factions."),

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const database = await loadDatabase(); // Dynamically load the database
            const factions = database.factions as Record<string, Faction>; // Dynamically load factions

            // Define faction emojis
            const factionEmojis: Record<string, string> = {
                bleu: "🔵",
                rouge: "🔴",
                vert: "🟢",
                jaune: "🟡",
                violet: "🟣",
            };

            // Create an embed with the values of all factions
            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("Valeurs des Factions")
                .setDescription("Voici les valeurs actuelles des factions :");

            for (const [factionName, faction] of Object.entries(factions)) {
                const totalValue = faction.shares * faction.value;
                const emoji = factionEmojis[factionName] || "⚪"; // Default to white circle if no emoji

                embed.addFields({
                    name: `${emoji} ${factionName.charAt(0).toUpperCase() + factionName.slice(1)}`,
                    value: `**Valeur totale :** ${totalValue.toFixed(2)} points\n` +
                           `**Valeur par action :** ${faction.value.toFixed(2)} points\n` +
                           `**Nombre d'actions :** ${faction.shares}`,
                    inline: false,
                });
            }

            log('Faction-Valeur Command', `${interaction.user.tag} viewed faction values.`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (e) {
            console.error('Faction-Valeur Command Error:', e);
            log('Faction-Valeur Command Error', `Error occurred: ${String(e)}`);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
            }
        }
    },
};