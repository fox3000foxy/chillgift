import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUser, updatePoints } from '../legacy/db';

function drawCard() {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits = ['♠', '♥', '♦', '♣'];
  return ranks[Math.floor(Math.random() * ranks.length)] + suits[Math.floor(Math.random() * suits.length)];
}

function calculateHandValue(hand: string[]) {
  let value = 0;
  let aces = 0;
  for (const card of hand) {
    const rank = card.slice(0, -1);
    if (['J', 'Q', 'K'].includes(rank)) {
      value += 10;
    } else if (rank === 'A') {
      value += 11;
      aces++;
    } else {
      value += parseInt(rank, 10);
    }
  }
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

const command = {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Jouez au Blackjack contre une IA.')
    .addIntegerOption(o => o.setName('mise').setRequired(true).setDescription('Montant de la mise')),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const bet = interaction.options.getInteger('mise', true);
      const user = getUser(interaction.user.id);

      if (user.points < bet) {
        await interaction.reply({ content: 'Pas assez de points pour miser.', ephemeral: true });
        return;
      }

      updatePoints(interaction.user.id, -bet);

      const playerHand = [drawCard(), drawCard()];
      const dealerHand = [drawCard(), drawCard()];

      const embed = new EmbedBuilder()
        .setTitle('🃏 Blackjack')
        .setDescription('Jouez contre le croupier !')
        .setColor('#1ABC9C')
        .addFields(
          { name: 'Votre main', value: playerHand.join(' '), inline: true },
          { name: 'Main du croupier', value: `${dealerHand[0]} 🂠`, inline: true }
        )
        .setFooter({ text: 'Choisissez une action ci-dessous.' });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('blackjack_hit')
          .setLabel('Tirer une carte')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('blackjack_stand')
          .setLabel('Rester')
          .setStyle(ButtonStyle.Secondary)
      );

      const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

      const collector = message.createMessageComponentCollector({ time: 60000 });

      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          await i.reply({ content: 'Ce jeu ne vous appartient pas.', ephemeral: true });
          return;
        }

        try {
          await i.deferUpdate(); // Prolonge la durée de vie de l'interaction

          if (i.customId === 'blackjack_hit') {
            const newCard = drawCard();
            playerHand.push(newCard);
            const playerValue = calculateHandValue(playerHand);

            if (playerValue > 21) {
              collector.stop();
              await interaction.editReply({
                embeds: [
                  embed
                    .setFields(
                      { name: 'Votre main', value: playerHand.join(' '), inline: true },
                      { name: 'Main du croupier', value: `${dealerHand[0]} 🂠`, inline: true }
                    )
                    .setDescription('Vous avez dépassé 21 ! Vous perdez la partie.')
                ],
                components: []
              });
              return;
            }

            await interaction.editReply({
              embeds: [
                embed.setFields(
                  { name: 'Votre main', value: playerHand.join(' '), inline: true },
                  { name: 'Main du croupier', value: `${dealerHand[0]} 🂠`, inline: true }
                )
              ]
            });
          } else if (i.customId === 'blackjack_stand') {
            collector.stop();

            let dealerValue = calculateHandValue(dealerHand);
            while (dealerValue < 17) {
              dealerHand.push(drawCard());
              dealerValue = calculateHandValue(dealerHand);
            }

            const playerValue = calculateHandValue(playerHand);
            let result = '';

            if (dealerValue > 21 || playerValue > dealerValue) {
              result = '🎉 Vous gagnez !';
              updatePoints(interaction.user.id, bet * 2);
            } else if (playerValue === dealerValue) {
              result = '🤝 Égalité !';
              updatePoints(interaction.user.id, bet);
            } else {
              result = '😢 Vous perdez.';
            }

            await interaction.editReply({
              embeds: [
                embed
                  .setFields(
                    { name: 'Votre main', value: playerHand.join(' '), inline: true },
                    { name: 'Main du croupier', value: dealerHand.join(' '), inline: true }
                  )
                  .setDescription(result)
              ],
              components: []
            });
          }
        } catch (error) {
          console.error('Erreur lors de la mise à jour de l’interaction :', error);
        }
      });

      collector.on('end', async collected => {
        if (collected.size === 0) {
          await interaction.editReply({ content: '⏰ Temps écoulé !', components: [] });
        }
      });
    } catch (e) {
      console.error('Erreur dans la commande blackjack :', e);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
      }
    }
  }
};

export default command;
