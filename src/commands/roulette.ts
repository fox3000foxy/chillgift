import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getUser, updatePoints } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Roulette V2')
    .addStringOption(o=>o.setName('option').setRequired(true).setDescription('Mise').addChoices(
      { name: 'Rouge', value: 'color:red' },
      { name: 'Noir', value: 'color:black' },
      { name: 'Pair', value: 'parity:even' },
      { name: 'Impair', value: 'parity:odd' },
      { name: 'Chiffre (num:5)', value: 'manual' }
    ))
    .addIntegerOption(o=>o.setName('mise').setRequired(true).setDescription('Montant')),

  async execute(interaction: CommandInteraction) {
    try {
      const opt = interaction.options.getString('option', true);
      const m = interaction.options.getInteger('mise', true);
      const uid = interaction.user.id;
      const u = getUser(uid);
      if (u.points < m) return interaction.reply({ content: 'Pas de fonds.', ephemeral: true });
      updatePoints(uid, -m);
      const res = Math.floor(Math.random()*37);
      const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(res);
      let win = 0;
      if (opt.startsWith('num:')) {
        const num = parseInt(opt.split(':')[1]); if (num === res) win = m*36;
      } else if (opt.startsWith('color:')) {
        const val = opt.split(':')[1]; if ((val==='red'&&isRed)||(val==='black'&&!isRed&&res!==0)) win = m*2;
      } else if (opt.startsWith('parity:')) {
        const val = opt.split(':')[1]; if ((val==='even'&&res%2===0&&res!==0)||(val==='odd'&&res%2!==0)) win = m*2;
      }
      if (win>0) updatePoints(uid, win);
      await interaction.reply({ content: `RÉSULTAT: ${res} ${isRed ? '🔴' : '⚫'} — ${win>0 ? `GAGNÉ +${win}` : 'PERDU'}` });
    } catch (e) {
      console.error('roulette error', e);
      if (!interaction.replied) await interaction.reply({ content: 'Erreur.', ephemeral: true });
    }
  }
};

export default command;
