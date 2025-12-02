import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { log } from '..';
import { getUser, saveDatabase, updatePoints } from '../legacy/db';

const command = {
    data: new SlashCommandBuilder()
        .setName('chifumi')
        .setDescription('PvP chifumi')
        .addUserOption(o => o.setName('membre').setRequired(true).setDescription('Adv')),

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const adv = interaction.options.getUser('membre', true);
            const challenger = getUser(interaction.user.id);
            const opponent = getUser(adv.id);
            const bet = 30;

            if (challenger.points < bet || opponent.points < bet) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Impossible de lancer le défi')
                    .setDescription(`Les deux joueurs doivent avoir au moins **${bet} points** pour jouer.`)
                    .setColor('#E74C3C');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                log('Chifumi Command', `${interaction.user.tag} or ${adv.tag} had insufficient points to start the game.`);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('✊ Chifumi PvP')
                .setDescription(`${adv}, ${interaction.user} vous défie à un duel de Chifumi !

Mise : **${bet} points** chacun.

Cliquez sur un bouton pour jouer.`)
                .setColor('#3498DB');

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('chifumi_rock').setLabel('✊ Pierre').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('chifumi_paper').setLabel('🖐️ Papier').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('chifumi_scissors').setLabel('✌️ Ciseaux').setStyle(ButtonStyle.Primary)
            );

            const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

            const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

            type Choice = 'rock' | 'paper' | 'scissors';
            const choices = new Map<string, Choice>();

            collector.on('collect', async (btnInteraction) => {
                if (![interaction.user.id, adv.id].includes(btnInteraction.user.id)) {
                    await btnInteraction.reply({ content: 'Ce duel ne vous concerne pas.', ephemeral: true });
                    log('Chifumi Collector', `${btnInteraction.user.tag} attempted to interact with the game between ${interaction.user.tag} and ${adv.tag}.`);
                    return;
                }

                if (choices.has(btnInteraction.user.id)) {
                    await btnInteraction.reply({ content: 'Vous avez déjà fait votre choix.', ephemeral: true });
                    log('Chifumi Collector', `${btnInteraction.user.tag} tried to make multiple choices.`);
                    return;
                }

                const chosen = btnInteraction.customId.split('_')[1] as Choice;
                choices.set(btnInteraction.user.id, chosen);
                await btnInteraction.reply({ content: `Choix enregistré : **${chosen}**`, ephemeral: true });
                log('Chifumi Collector', `${btnInteraction.user.tag} chose ${chosen}.`);

                if (choices.size === 2) {
                    collector.stop();
                }
            });

            collector.on('end', async () => {
                if (choices.size < 2) {
                    await interaction.editReply({ content: 'Le duel a expiré faute de réponses.', components: [] });
                    log('Chifumi Collector', `Game between ${interaction.user.tag} and ${adv.tag} expired due to inactivity.`);
                    return;
                }

                const challengerChoice = choices.get(interaction.user.id) as Choice;
                const opponentChoice = choices.get(adv.id) as Choice;

                const outcomes: Record<Choice, Record<Choice, 'win' | 'lose' | 'draw'>> = {
                    rock: { rock: 'draw', paper: 'lose', scissors: 'win' },
                    paper: { rock: 'win', paper: 'draw', scissors: 'lose' },
                    scissors: { rock: 'lose', paper: 'win', scissors: 'draw' }
                };

                const result = outcomes[challengerChoice][opponentChoice];
                let resultEmbed;

                if (result === 'win') {
                    updatePoints(interaction.user.id, bet);
                    updatePoints(adv.id, -bet);
                    resultEmbed = new EmbedBuilder()
                        .setTitle('🎉 Victoire !')
                        .setDescription(`${interaction.user} a gagné contre ${adv} !

**${interaction.user.username}** gagne **${bet} points** !`)
                        .setColor('#2ECC71');
                    log('Chifumi Collector', `${interaction.user.tag} won against ${adv.tag} and gained ${bet} points.`);
                } else if (result === 'lose') {
                    updatePoints(interaction.user.id, -bet);
                    updatePoints(adv.id, bet);
                    resultEmbed = new EmbedBuilder()
                        .setTitle('😢 Défaite !')
                        .setDescription(`${adv} a gagné contre ${interaction.user} !

**${adv.username}** gagne **${bet} points** !`)
                        .setColor('#E74C3C');
                    log('Chifumi Collector', `${interaction.user.tag} lost to ${adv.tag} and lost ${bet} points.`);
                } else {
                    resultEmbed = new EmbedBuilder()
                        .setTitle('🤝 Match nul !')
                        .setDescription(`Le duel entre ${interaction.user} et ${adv} se termine par une égalité !

Aucun point n'est échangé.`)
                        .setColor('#F1C40F');
                    log('Chifumi Collector', `Game between ${interaction.user.tag} and ${adv.tag} ended in a draw.`);
                }

                saveDatabase();
                await interaction.editReply({ embeds: [resultEmbed], components: [] });
            });
        } catch (e) {
            console.error('chifumi error', e);
            log('Chifumi Command Error', `Error occurred: ${String(e)}`);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Erreur.', ephemeral: true });
            }
        }
    }
};

export default command;
