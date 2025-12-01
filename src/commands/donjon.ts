import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { db, getUser, saveDatabase, updatePoints } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder()
    .setName('donjon')
    .setDescription('RPG Terrestre (10 pts)'),

  async execute(interaction: CommandInteraction) {
    try {
      const uid = interaction.user.id;
      const user = getUser(uid);
      const cost = db.config.costDonjon ?? 10;
      if (user.points < cost) return interaction.reply({ content: "Pas assez de points.", ephemeral: true });
      if (user.daily.donjon >= (db.config.limitDonjon ?? 10)) return interaction.reply({ content: "Limite atteinte.", ephemeral: true });
      updatePoints(uid, -cost);
      user.daily.donjon++;
      saveDatabase();
      await interaction.reply({ content: `✅ Entrée au donjon ! (-${cost} pts)` });
    } catch (e) {
      console.error('donjon command error', e);
      if (!interaction.replied) await interaction.reply({ content: 'Erreur interne.', ephemeral: true });
    }
  }
};

export default command;
