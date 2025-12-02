import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { log } from '../index';
import { getUser } from '../legacy/db';

const command = {
    data: new SlashCommandBuilder()
        .setName('navire')
        .setDescription('Menu Navire / récupérer expédition'),

    async execute(interaction: CommandInteraction) {
        try {
            const uid = interaction.user.id;
            const u = getUser(uid);
            if (u.maritime?.active) {
                const remainingTime = Math.ceil((u.maritime.endTime - Date.now()) / 60000);
                log('Navire Command', `${interaction.user.tag} checked their active expedition. Remaining time: ${remainingTime} minutes.`);
                return interaction.reply({ content: `En mer. Retour dans ${remainingTime} min.`, ephemeral: true });
            } else {
                log('Navire Command', `${interaction.user.tag} checked their expeditions but has no active expedition.`);
                return interaction.reply({ content: 'Aucun navire actif.', ephemeral: true });
            }
        }
        catch (e) {
            console.error('navire error', e);
            log('Navire Command Error', `Error occurred: ${String(e)}`);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Erreur.', ephemeral: true });
            }
        }
    }
};

export default command;
