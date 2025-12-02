import { ChatInputCommandInteraction, Client, EmbedBuilder, SlashCommandBuilder, User } from "discord.js";
import fs from "fs";
import { Faction } from "../types";

function loadDatabase() {
    const data = fs.readFileSync("./databases/database.json", "utf-8");
    return JSON.parse(data);
}

async function getDiscordUser(client: Client, userId: string): Promise<User | null> {
    const user = client.users.cache.get(userId);
    if (user) {
        return user;
    } else {
        const user = await client.users.fetch(userId).then(fetchedUser => {
            return fetchedUser;
        }).catch(() => {
            return null;
        });
        return user;
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName("faction_acheter_action")
        .setDescription("Acheter des actions d'un membre de votre faction.")

        .addIntegerOption(option =>
            option
                .setName("nombre")
                .setDescription("Nombre d'actions à acheter.")
                .setRequired(true),
        )

        .addStringOption(option =>
            option
                .setName("faction")
                .setDescription("Nom de la faction concernée.")
                .setRequired(true),
        )
        .addUserOption(option =>
            option
                .setName("joueur")
                .setDescription("Le joueur à qui acheter des actions. Si non spécifié, achat au président.")
                .setRequired(false),
        )
    ,
    async execute(interaction: ChatInputCommandInteraction) {
        const buyerId = interaction.user.id;
        const nombre = interaction.options.getInteger("nombre") as number;

        const database = loadDatabase(); // Dynamically load the database
        const factions = database.factions as Record<string, Faction>; // Dynamically load factions

        const factionName = interaction.options.getString("faction") as string;
        const faction = factions[factionName];

        // Ensure the specified faction exists
        if (!faction) {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("Faction Invalide")
                .setDescription(`La faction **${factionName}** n'existe pas.`);

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Ensure the seller is valid or default to the faction president
        const seller = interaction.options.getUser("joueur") || faction.president;

        let availiableShares = faction.shares;
        // iteration over users to find how many shares they have so we deduce availiables shares from the server
        for (const userId in database.users) {
            const user = database.users[userId];
            if (user.faction && user.faction.shares && user.faction.shares[factionName]) {
                availiableShares -= user.faction.shares[factionName];
            }
        }

        // Check if the faction has enough actions available
        if (availiableShares < nombre) {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("Actions Insuffisantes")
                .setDescription(
                    `La faction **${factionName}** n'a plus assez d'actions disponibles à la vente. ` +
                    `Actions restantes : **${availiableShares}**.`
                );

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // If no seller, actions are bought from the server directly
        if (!seller) {
            if (availiableShares < nombre) {
                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("Actions Insuffisantes")
                    .setDescription(
                        `Le serveur n'a plus assez d'actions disponibles à la vente pour la faction **${factionName}**. ` +
                        `Actions restantes : **${availiableShares}**.`
                    );

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Deduct shares from the server
            faction.shares -= nombre;

            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("Achat Réussi")
                .setDescription(
                    `Vous avez acheté **${nombre} actions** directement du serveur pour la faction **${factionName}**.`
                );

            const db = loadDatabase();
            const buyerData = db.users[buyerId];
            if (!buyerData.faction.shares[factionName]) {
                buyerData.faction.shares[factionName] = 0;
            }
            buyerData.faction.shares[factionName] += nombre;
            buyerData.points -= nombre * faction.value;

            fs.writeFileSync("./databases/database.json", JSON.stringify(db, null, 2));

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Check if the specified seller has enough shares
        const sellerId = (seller as User)?.id || seller as string;
        const sellerUser = await getDiscordUser(interaction.client, sellerId)
        const sellerData = database.users[sellerId];
        if (!sellerData || !sellerData.faction || !sellerData.faction.shares || !sellerData.faction.shares[factionName] || sellerData.faction.shares[factionName] < nombre) {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("Actions Insuffisantes")
                .setDescription(
                    `Le joueur **${sellerUser?.username}** n'a pas assez d'actions disponibles à la vente pour la faction **${factionName}**.`
                );

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Deduct shares from the seller
        sellerData.faction.shares[factionName] -= nombre;

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("Achat Réussi")
            .setDescription(
                `Vous avez acheté **${nombre} actions** de **${sellerUser?.username}** dans la faction **${factionName}**.`
            );


        const db = loadDatabase();

        const buyerData = db.users[buyerId];
        if (!buyerData.faction.shares[factionName]) {
            buyerData.faction.shares[factionName] = 0;
        }
        buyerData.faction.shares[factionName] += nombre;
        buyerData.points -= nombre * faction.value;

        const sellerDataDb = db.users[sellerId];
        sellerDataDb.faction.shares[factionName] -= nombre;
        sellerDataDb.points += nombre * faction.value;

        fs.writeFileSync("./databases/database.json", JSON.stringify(db, null, 2));
        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
};