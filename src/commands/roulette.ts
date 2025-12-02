import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { log } from '../index';
import { getUser, updatePoints } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Roulette V2')
    .addStringOption(o => o.setName('option').setRequired(true).setDescription('Mise').addChoices(
      { name: 'Rouge', value: 'color:red' },
      { name: 'Noir', value: 'color:black' },
      { name: 'Pair', value: 'parity:even' },
      { name: 'Impair', value: 'parity:odd' },
      { name: 'Passe (19-36)', value: 'range:high' },
      { name: 'Manque (1-18)', value: 'range:low' },
      { name: 'Chiffre (num:5)', value: 'manual' }
    ))
    .addIntegerOption(o => o.setName('mise').setRequired(true).setDescription('Montant')),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const opt = interaction.options.getString('option', true);
      const m = interaction.options.getInteger('mise', true);
      const uid = interaction.user.id;
      const u = getUser(uid);
      if (u.points < m) {
        log('Roulette Command', `${interaction.user.tag} tried to bet ${m} points but had insufficient funds.`);
        return interaction.reply({ content: 'Pas de fonds.', ephemeral: true });
      }
      updatePoints(uid, -m);
      log('Roulette Command', `${interaction.user.tag} placed a bet of ${m} points on ${opt}.`);

      const res = Math.floor(Math.random() * 37);
      const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(res);
      let win = 0;
      if (opt.startsWith('num:')) {
        const num = parseInt(opt.split(':')[1]);
        if (num === res) win = m * 36;
      } else if (opt.startsWith('color:')) {
        const val = opt.split(':')[1];
        if ((val === 'red' && isRed) || (val === 'black' && !isRed && res !== 0)) win = m * 2;
      } else if (opt.startsWith('parity:')) {
        const val = opt.split(':')[1];
        if ((val === 'even' && res % 2 === 0 && res !== 0) || (val === 'odd' && res % 2 !== 0)) win = m * 2;
      } else if (opt.startsWith('range:')) {
        const val = opt.split(':')[1];
        if ((val === 'high' && res >= 19 && res <= 36) || (val === 'low' && res >= 1 && res <= 18)) win = m * 2;
      }
      if (win > 0) {
        updatePoints(uid, win);
        log('Roulette Command', `${interaction.user.tag} won ${win} points with a bet of ${m} points on ${opt}.`);
      } else {
        log('Roulette Command', `${interaction.user.tag} lost their bet of ${m} points on ${opt}.`);
      }

      const embed = new EmbedBuilder()
        .setColor(win > 0 ? 'Green' : 'Red')
        .setTitle('🎰 Résultat de la Roulette')
        .setDescription(
          `**Résultat** : ${res} ${isRed ? '🔴' : '⚫'}\n` +
          `**Mise** : ${m} points\n` +
          `**Gain** : ${win > 0 ? `+${win} points` : 'Aucun gain'}`
        );

      await interaction.reply({ embeds: [embed] });
    } catch (e) {
      console.error('roulette error', e);
      log('Roulette Command Error', `Error occurred: ${String(e)}`);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Erreur.', ephemeral: true });
      }
    }
  }
};

export default command;
