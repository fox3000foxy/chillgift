import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { setTimeout } from 'node:timers/promises';
import { log } from '../index';
import { getUser, saveDatabase, updatePoints } from '../legacy/db';

const SUITS = ['♠️', '♥️', '♦️', '♣️'];

function shuffleDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (let rank = 1; rank <= 13; rank++) {
            deck.push({ suit, rank });
        }
    }
    return deck.sort(() => Math.random() - 0.5);
}

function renderVerticalGame(horses: { suit: string; position: number }[], hiddenCards: { suit: string; rank: number }[], revealedCards: Set<number> = new Set()): string {
    const trackLength = hiddenCards.length + 1;
    const track = Array.from({ length: trackLength }, () => [' ', ' ', ' ', ' ', ' ']);

    // Place horses on the track
    for (const horse of horses) {
        const row = Math.min(trackLength - 1, Math.max(0, trackLength - horse.position - 1));
        const column = SUITS.indexOf(horse.suit);
        if (column !== -1) {
            track[row][column] = `🏇${horse.suit}`;
        }
    }

    // Add card indicators in the last column
    for (let i = 0; i < hiddenCards.length; i++) {
        const row = trackLength - i - 2; // Cards are placed above the starting line
        if (row >= 0) {
            if (revealedCards.has(i) && hiddenCards[i]) {
                track[row][4] = `${hiddenCards[i].suit}${hiddenCards[i].rank}`;
            } else {
                track[row][4] = '🃏';
            }
        }
    }

    // Ensure columns are aligned by padding cells to the same width
    const columnWidth = Math.max(...track.flat().map(cell => cell.length));
    return track
        .map(line => line.map(cell => cell.padEnd(columnWidth, ' ')).join('|'))
        .join('\n');
}

async function renderGame(interaction: ChatInputCommandInteraction, horses: { suit: string; position: number }[], hiddenCards: { suit: string; rank: number }[], revealedCards: Set<number>, drawnCard?: { suit: string; rank: number }, revealedCard?: { suit: string; rank: number }) {
    const trackDisplay = renderVerticalGame(horses, hiddenCards, revealedCards);

    let description = `\`\`\`${trackDisplay}\`\`\``;

    if (drawnCard) {
        description += `\nCarte tirée: ${drawnCard.suit} ${drawnCard.rank}`;
    }

    if (revealedCard) {
        description += `\nCarte retournée: ${revealedCard.suit} ${revealedCard.rank}`;
    }

    const embed = new EmbedBuilder()
        .setTitle('🏇 Hippodrome - Tableau de Jeu')
        .setDescription(description)
        .setColor('#3498DB');

    await interaction.editReply({ embeds: [embed] });
}

export default {
    data: new SlashCommandBuilder()
        .setName('hippodrome')
        .setDescription('Jouer au jeu de l’Hippodrome')
        .addIntegerOption(option =>
            option
                .setName('mise')
                .setDescription('Montant de la mise')
                .setRequired(true),
        )
        .addStringOption(option =>
            option
                .setName('couleur')
                .setDescription('Choisissez le symbole sur lequel vous misez (♠️, ♥️, ♦️, ♣️)')
                .setRequired(true)
                .addChoices(
                    { name: '♠️', value: '♠️' },
                    { name: '♥️', value: '♥️' },
                    { name: '♦️', value: '♦️' },
                    { name: '♣️', value: '♣️' },
                ),
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const userId = interaction.user.id;
        const mise = interaction.options.getInteger('mise') as number;
        const couleur = interaction.options.getString('couleur') as string;

        const user = getUser(userId);
        if (user.points < mise) {
            return interaction.reply({
                content: 'Vous n’avez pas assez de points pour jouer.',
                ephemeral: true,
            });
        }

        const deck = shuffleDeck();
        const horses = SUITS.map(suit => ({ suit, position: 0 }));
        const hiddenCards = deck.splice(0, 5);
        const drawPile = deck;
        const revealedCards = new Set<number>();

        let winner: string | null = null;

        await interaction.reply({ content: `La partie commence ! Vous avez misé sur ${couleur}.`, ephemeral: false });

        while (!winner) {
            const drawnCard = drawPile.pop();
            console.log(drawnCard);
            if (!drawnCard) break;

            const horse = horses.find(h => h.suit === drawnCard.suit);
            if (horse) {
                horse.position++;
                await renderGame(interaction, horses, hiddenCards, revealedCards, drawnCard);
                await setTimeout(200);

                if (horse.position > hiddenCards.length) {
                    winner = horse.suit;
                    break;
                }
            } else {
                await renderGame(interaction, horses, hiddenCards, revealedCards, drawnCard);
                await setTimeout(200);
                continue;
            }

            const hiddenCardIndex = horse.position - 1;
            if (hiddenCardIndex !== undefined && hiddenCardIndex < hiddenCards.length) {
                const revealedCard = hiddenCards[hiddenCardIndex];

                // Révéler la carte uniquement si tous les chevaux ont traversé cette position
                const allHorsesCrossed = horses.every(h => h.position > hiddenCardIndex);
                if (revealedCard && allHorsesCrossed && !revealedCards.has(hiddenCardIndex)) {
                    // Marquer la carte comme révélée
                    revealedCards.add(hiddenCardIndex);

                    const horseToRetreat = horses.find(h => h.suit === revealedCard.suit);
                    if (horseToRetreat && horseToRetreat.position > 0) {
                        horseToRetreat.position--;
                    }

                    // Mettre à jour l'affichage avec la carte retournée
                    await renderGame(interaction, horses, hiddenCards, revealedCards, drawnCard, revealedCard);
                    await setTimeout(200);
                } else {
                    // Mettre à jour l'affichage avec la carte tirée uniquement
                    await renderGame(interaction, horses, hiddenCards, revealedCards, drawnCard);
                    await setTimeout(200);
                }
            }
        }

        if (winner) {
            const winnings = winner === couleur ? mise * 3 : 0;
            updatePoints(userId, winnings);
            saveDatabase();

            if (winnings !== 0) {
                const embed = new EmbedBuilder()
                    .setTitle('🏇 Hippodrome - Résultat')
                    .setDescription(`Le cheval ${winner} a gagné ! Vous remportez **${winnings} points** !`)
                    .setColor('#2ECC71');

                log('Hippodrome Command', `${interaction.user.tag} played Hippodrome, bet on ${couleur}, and won ${winnings} points with horse ${winner}.`);
                return interaction.editReply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('🏇 Hippodrome - Résultat')
                    .setDescription(`Le cheval ${winner} a gagné... Vous perdez votre mise. 😢`)
                    .setColor('#E74C3C');

                log('Hippodrome Command', `${interaction.user.tag} played Hippodrome, bet on ${couleur}, and lost ${mise} points.`);
                return interaction.editReply({ embeds: [embed] });
            }
        }
    }
};