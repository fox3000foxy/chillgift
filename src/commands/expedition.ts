import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { db, getUser, saveDatabase, updatePoints } from '../legacy/db';

const command = {
    data: new SlashCommandBuilder()
        .setName('expedition')
        .setDescription('Maritime: lancer une expédition')
        .addStringOption(o => o.setName('mode').setDescription('Type d\'expédition').addChoices(
            { name: 'Crique (30m)', value: 'calm' },
            { name: 'Tempête (2h)', value: 'storm' },
            { name: 'Abysses (4h)', value: 'abyss' }
        ).setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply({ content: 'Commande désactivée temporairement.', ephemeral: true }); return;

        try {
            const uid = interaction.user.id;
            const mode = interaction.options.getString('mode', true);
            const user = getUser(uid);
            const cost = db.config.maritimeCosts?.[mode] ?? 20;
            const time = db.config.maritimeTimes?.[mode] ?? (30 * 60 * 1000);
            if (user.points < cost) return interaction.reply({ content: 'Pas de fonds.', ephemeral: true });
            if (user.maritime?.active) return interaction.reply({ content: 'Déjà en mer.', ephemeral: true });
            updatePoints(uid, -cost);
            user.maritime = { active: true, endTime: Date.now() + time, type: mode };
            saveDatabase();
            await interaction.reply({ content: `🚢 Expédition lancée (${mode}) — coût ${cost} pts.` });
        } catch (e) {
            console.error('expedition error', e);
            if (!interaction.replied) await interaction.reply({ content: 'Erreur.', ephemeral: true });
        }
    }
};

export default command;
