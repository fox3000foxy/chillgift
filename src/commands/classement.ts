import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { db } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder().setName('classement').setDescription('Top'),
  async execute(interaction: CommandInteraction) {
    try {
      const s = Object.entries(db.users).sort(([,a],[,b])=>b.points-a.points).slice(0,10);
      await interaction.reply({ content: s.map((u,k)=>`${k+1}. <@${u[0]}>: ${u[1].points}`).join('\n') || 'Vide' });
    } catch (e) {
      console.error('classement error', e);
      if (!interaction.replied) await interaction.reply({ content: 'Erreur.', ephemeral: true });
    }
  }
};

export default command;
