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
        .setName("faction_revendre_action")
        .setDescription("Revendre des actions d'une faction au serveur.")

        .addIntegerOption(option =>
            option
                .setName("nombre")
                .setDescription("Nombre d'actions à revendre.")
                .setRequired(true),
        )

        .addStringOption(option =>
            option
                .setName("faction")
                .setDescription("Nom de la faction concernée.")
                .setRequired(true),
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const userId = interaction.user.id;
            const nombre = interaction.options.getInteger("nombre") as number;
            const factionName = interaction.options.getString("faction") as string;

            const database = loadDatabase(); // Dynamically load the database
            const factions = database.factions as Record<string, Faction>;
            const faction = factions[factionName];

            // Ensure the specified faction exists
            if (!faction) {
                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("Faction Invalide")
                    .setDescription(`La faction **${factionName}** n'existe pas.`);

                log('Faction-Revendre-Action Command', `${interaction.user.tag} tried to sell shares in a non-existent faction: ${factionName}.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const userData = database.users[userId];

            // Ensure the user has shares in the specified faction
            if (!userData || !userData.faction || !userData.faction.shares || !userData.faction.shares[factionName] || userData.faction.shares[factionName] < nombre) {
                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("Actions Insuffisantes")
                    .setDescription(`Vous ne possédez pas assez d'actions dans la faction **${factionName}** pour effectuer cette revente.`);

                log('Faction-Revendre-Action Command', `${interaction.user.tag} tried to sell ${nombre} shares in ${factionName} but had insufficient shares.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Calculate the total value of the shares being sold
            const totalValue = nombre * faction.value;

            // Deduct shares from the user and add them back to the server
            userData.faction.shares[factionName] -= nombre;

            // Add the value of the shares to the user's points
            userData.points += totalValue;

            // Save the updated database
            fs.writeFileSync("./databases/database.json", JSON.stringify(database, null, 2));

            log('Faction-Revendre-Action Command', `${interaction.user.tag} sold ${nombre} shares in ${factionName} for ${totalValue} points.`);

            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("Revente Réussie")
                .setDescription(
                    `Vous avez revendu **${nombre} actions** de la faction **${factionName}** au serveur pour un total de **${totalValue} points**.`
                );

            return interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (e) {
            console.error('Faction-Revendre-Action Command Error:', e);
            log('Faction-Revendre-Action Command Error', `Error occurred: ${String(e)}`);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
            }
        }
    },
};