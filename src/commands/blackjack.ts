import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getUser, updatePoints } from '../legacy/db';

function drawCard() { return ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][Math.floor(Math.random() * 13)] + ['♠', '♥', '♦', '♣'][Math.floor(Math.random() * 4)]; }

const command = {
    data: new SlashCommandBuilder().setName('blackjack').setDescription('BJ').addIntegerOption(o => o.setName('mise').setRequired(true).setDescription('Mise')),
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const m = interaction.options.getInteger('mise', true);
            const uid = interaction.user.id;
            const u = getUser(uid);
            if (u.points < m) return interaction.reply({ content: 'Pas de fonds.', ephemeral: true });
            updatePoints(uid, -m);
            const hand = [drawCard(), drawCard()];
            // store minimal state on interaction (not persistent)
            await interaction.reply({ content: `🃏 BlackJack: Tes cartes: ${hand.join(' ')} — (jeu simplifié, pas d'IA)`, ephemeral: false });
        } catch (e) {
            console.error('blackjack cmd error', e);
            if (!interaction.replied) await interaction.reply({ content: 'Erreur.', ephemeral: true });
        }
    }
};

export default command;
