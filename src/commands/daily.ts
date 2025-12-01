import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getUser, saveDatabase, updatePoints } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder().setName('daily').setDescription('Daily'),
  async execute(interaction: CommandInteraction) {
    try {
      const u = getUser(interaction.user.id);
      if (u.daily.claimed) return interaction.reply({ content: 'Déjà pris.', ephemeral: true });
      updatePoints(interaction.user.id, 50);
      u.daily.claimed = true;
      saveDatabase();
      await interaction.reply({ content: '+50' });
    } catch (e) {
      console.error('daily error', e);
      if (!interaction.replied) await interaction.reply({ content: 'Erreur.', ephemeral: true });
    }
  }
};

export default command;
