import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getUser, saveDatabase } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder()
    .setName('navire')
    .setDescription('Menu Navire / récupérer expédition'),

  async execute(interaction: CommandInteraction) {
    try {
      const uid = interaction.user.id;
      const u = getUser(uid);
      if (u.maritime?.active) {
        if (Date.now() > u.maritime.endTime) {
          u.maritime.active = false;
          saveDatabase();
          return interaction.reply({ content: 'Rentré ! Récupère les récompenses (non implémenté).', ephemeral: true });
        } else {
          return interaction.reply({ content: `En mer. Retour dans ${Math.ceil((u.maritime.endTime - Date.now())/60000)} min.`, ephemeral: true });
        }
      }
      return interaction.reply({ content: 'Aucun navire actif.', ephemeral: true });
    } catch (e) {
      console.error('navire error', e);
      if (!interaction.replied) await interaction.reply({ content: 'Erreur.', ephemeral: true });
    }
  }
};

export default command;
