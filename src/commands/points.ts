import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getUser } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder().setName('points').setDescription('Profil'),
  async execute(interaction: CommandInteraction) {
    
    try {
      const u = getUser(interaction.user.id);
      await interaction.reply({ content: `💰 ${u.points}`, ephemeral: true });
    } catch (e) {
      console.error('points error', e);
      if (!interaction.replied) await interaction.reply({ content: 'Erreur.', ephemeral: true });
    }
  }
};

export default command;
