import { ChatInputCommandInteraction, Client, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import { log } from '../index';
import { getUser, updatePoints } from '../legacy/db';

function generateRewards(type: 'calm' | 'storm' | 'abyss'): { name: string; value: number }[] {
    const materials = [
        { name: 'Fer', rarity: 'common', value: 10 },
        { name: 'Cuivre', rarity: 'common', value: 15 },
        { name: 'Argent', rarity: 'uncommon', value: 30 },
        { name: 'Or', rarity: 'rare', value: 50 },
        { name: 'Diamant', rarity: 'epic', value: 75 },
        { name: 'Émeraude', rarity: 'legendary', value: 100 }
    ];

    const rewards = [];
    const materialCounts: Record<'calm' | 'storm' | 'abyss', number> = {
        calm: 1, // 1 matériau pour une expédition "calm"
        storm: 3, // 3 matériaux pour une expédition "storm"
        abyss: 5  // 5 matériaux pour une expédition "abyss"
    };

    const materialCount = materialCounts[type];

    for (let i = 0; i < materialCount; i++) {
        const roll = Math.random();
        let material;

        if (roll < 0.5) {
            material = materials.find(m => m.rarity === 'common');
        } else if (roll < 0.8) {
            material = materials.find(m => m.rarity === 'uncommon');
        } else if (roll < 0.95) {
            material = materials.find(m => m.rarity === 'rare');
        } else if (roll < 0.99) {
            material = materials.find(m => m.rarity === 'epic');
        } else {
            material = materials.find(m => m.rarity === 'legendary');
        }

        if (material) rewards.push({ name: material.name, value: material.value });
    }

    return rewards;
}

async function checkExpeditions(client: Client) {
    const now = Date.now();
    const db = loadDatabase();
    for (const userId in db.users) {
        const user = getUser(userId);
        // console.log(`Vérification des expéditions pour l'utilisateur ${userId}...`);

        if (user.maritime?.active && user.maritime.endTime <= now) {
            // Générer les récompenses en fonction du type d'expédition
            const rewards = generateRewards(user.maritime.type);
            const totalValue = rewards.reduce((sum, reward) => sum + reward.value, 0);

            // Ajouter les points au joueur
            updatePoints(userId, totalValue);

            // Créer un joli embed pour les récompenses
            const embed = {
                color: 0x1abc9c,
                title: '🚢 Résultats de votre expédition',
                description: `Votre expédition vers **${user.maritime.type}** est terminée ! Voici vos récompenses :`,
                fields: rewards.map(r => ({
                    name: `${getMaterialEmoji(r.name)} ${r.name}`,
                    value: `Valeur : ${r.value} points`,
                    inline: true
                })),
                footer: {
                    text: `Total des points gagnés : ${totalValue}`
                }
            };
            user.maritime = { active: false }; // Supprimer l'expédition en cours
            db.users[userId] = user;
            saveDatabase(db);
            // Envoyer un message privé à l'utilisateur
            const discordUser = await client.users.fetch(userId);
            if (discordUser) {
                await discordUser.send({ embeds: [embed] });
            }

            // Marquer l'expédition comme terminée
        }
    }

    // Sauvegarder les modifications
}

function loadDatabase() {
    const data = fs.readFileSync("./databases/database.json", "utf-8");
    return JSON.parse(data);
}

function saveDatabase(db: any) {
    fs.writeFileSync("./databases/database.json", JSON.stringify(db, null, 2));
}

function getMaterialEmoji(material: string): string {
    const emojis: Record<string, string> = {
        'Fer': '⛓️',
        'Cuivre': '🪙',
        'Argent': '🥈',
        'Or': '🥇',
        'Diamant': '💎',
        'Émeraude': '🟢'
    };
    return emojis[material] || '❓';
}

function startExpeditionDaemon(client: Client) {
    setInterval(() => {
        checkExpeditions(client).catch(err => console.error('Erreur dans le daemon d\'expédition :', err));
    }, 5000); // Toutes les 5 secondes
}

const command = {
    data: new SlashCommandBuilder()
        .setName('expedition')
        .setDescription('Maritime: lancer une expédition')
        .addStringOption(o => o.setName('mode').setDescription('Terre à explorer').addChoices(
            { name: 'Crique (30m, 20 points de coût)', value: 'calm' },
            { name: 'Tempête (2h, 50 points de coût)', value: 'storm' },
            { name: 'Abysses (4h, 100 points de coût)', value: 'abyss' }
        ).setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const uid = interaction.user.id;
            type Mode = 'calm' | 'storm' | 'abyss';
            const mode = interaction.options.getString('mode', true) as Mode;
            const user = getUser(uid);

            const costs: Record<Mode, number> = { calm: 20, storm: 50, abyss: 100 };
            const durations: Record<Mode, number> = {
                calm: 30 * 60 * 1000,
                storm: 2 * 60 * 60 * 1000,
                abyss: 4 * 60 * 60 * 1000
            };

            const cost = costs[mode];
            const time = durations[mode];

            if (user.points < cost) {
                log('Expedition Command', `${interaction.user.tag} tried to start an expedition (${mode}) but had insufficient points.`);
                return interaction.reply({ content: 'Vous n\'avez pas assez de points pour cette expédition.', ephemeral: true });
            }

            if (user.maritime?.active) {
                log('Expedition Command', `${interaction.user.tag} tried to start an expedition (${mode}) but already has an active expedition.`);
                return interaction.reply({ content: 'Une expédition est déjà en cours.', ephemeral: true });
            }

            updatePoints(uid, -cost);

            user.maritime = {
                active: true,
                endTime: Date.now() + time,
                type: mode,
                rewards: []
            };

            const db = loadDatabase();
            db.users[uid] = user;

            saveDatabase(db);
            log('Expedition Command', `${interaction.user.tag} started an expedition (${mode}) costing ${cost} points.`);

            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("🚢 Expédition Lancée !")
                .setDescription(
                    `Votre expédition vers **${mode}** a été lancée avec succès !\n\n` +
                    `**Coût** : ${cost} points\n` +
                    `**Durée** : ${time / (60 * 1000)} minutes.`
                )
                .setFooter({ text: "Bonne chance dans votre aventure !" });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (e) {
            console.error('Erreur lors de l\'expédition :', e);
            log('Expedition Command Error', `Error occurred: ${String(e)}`);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
            }
        }
    }
};

export { startExpeditionDaemon };
export default command;

