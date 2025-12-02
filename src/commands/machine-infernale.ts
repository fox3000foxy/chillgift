import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { log } from '../index';
import { getUser, updatePoints } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder()
    .setName('machine-infernale')
    .setDescription('Jouer à la machine infernale')
    .addIntegerOption(o => o.setName('mise').setRequired(true).setDescription('Montant de la mise')),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const mise = interaction.options.getInteger('mise', true);
      const uid = interaction.user.id;
      const user = getUser(uid);

      if (user.points < mise) {
        log('Machine-Infernale Command', `${interaction.user.tag} tried to play with a bet of ${mise} but had insufficient points.`);
        return interaction.reply({ content: 'Pas assez de points pour jouer.', ephemeral: true });
      }

      updatePoints(uid, -mise);
      log('Machine-Infernale Command', `${interaction.user.tag} placed a bet of ${mise} points.`);

      const n1 = Math.floor(Math.random() * 10);
      const n2 = Math.floor(Math.random() * 10);
      const n3 = Math.floor(Math.random() * 10);
      let score = Math.floor(((n1 + n2) - n3));
      if (score < 0) score = 0;

      // Adjust score based on the bet amount
      score = Math.floor(score * (mise / 10)); // Scale score relative to the bet

      if (score > 0) {
        updatePoints(uid, score);
        log('Machine-Infernale Command', `${interaction.user.tag} won ${score} points with a bet of ${mise}.`);
      } else {
        log('Machine-Infernale Command', `${interaction.user.tag} lost their bet of ${mise} points.`);
      }

      const emojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
      const embed = new EmbedBuilder()
        .setTitle(score > mise ? '🎉 GAGNÉ !' : '😐 RÉSULTAT')
        .setDescription(
          `## [ ${emojis[n1]} | ${emojis[n2]} | ${emojis[n3]} ]\n` +
          `Formule : ((${n1} + ${n2}) - ${n3}) x (mise/10) = **${score}**\n` +
          `**Mise :** ${mise} pts\n` +
          `**Gain :** ${score > 0 ? `+${score} pts` : 'Aucun'}`
        )
        .setColor(score > mise ? '#2ECC71' : score > 0 ? '#F1C40F' : '#E74C3C');

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur dans la commande machine-infernale:', error);
      log('Machine-Infernale Command Error', `Error occurred: ${String(error)}`);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
      }
    }
  }
};

export default command;