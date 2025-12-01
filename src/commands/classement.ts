import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { db } from '../legacy/db';

const command = {
    data: new SlashCommandBuilder().setName('classement').setDescription('Top'),
    async execute(interaction: CommandInteraction) {
        try {
            const sortedUsers = Object.entries(db.users)
                .filter(([id]) => !interaction.guild?.members.cache.get(id)?.user.bot) // Exclude bots
                .sort(([, a], [, b]) => (b as { points: number }).points - (a as { points: number }).points)
                .slice(0, 15);

            const medals = ['🥇', '🥈', '🥉'];
            const leaderboard = sortedUsers
                .map((user, index) => {
                    const medal = medals[index] || `${index + 1}.`;
                    const points = (user[1] as { points: number }).points.toLocaleString();
                    return `${medal} <@${user[0]}>: **${points}** points`;
                })
                .join('\n');

            const embed = new EmbedBuilder()
                .setTitle('🏆 Classement des Points')
                .setDescription(leaderboard || 'Aucun utilisateur dans le classement.')
                .setColor('#FFD700')
                .setFooter({ text: 'Continuez à jouer pour grimper dans le classement !' });

            await interaction.reply({ embeds: [embed] });
        } catch (e) {
            console.error('classement error', e);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Une erreur est survenue lors de la récupération du classement.', ephemeral: true });
            }
        }
    }
};

export default command;
