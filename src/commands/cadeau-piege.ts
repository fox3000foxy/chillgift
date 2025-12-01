import { CommandInteraction, SlashCommandBuilder } from 'discord.js';

const command = {
  data: new SlashCommandBuilder().setName('cadeau-piege').setDescription('Piège'),
  async execute(interaction: CommandInteraction) {
    try {
      const btnLabel = 'Poser (-50)';
      // We'll simply reply with a note — the original opens a confirmation button handled elsewhere
      await interaction.reply({ content: 'Utilise la commande pour poser un piège (fonctionnalité via bouton).', ephemeral: true });
    } catch (e) {
      console.error('cadeau-piege error', e);
      if (!interaction.replied) await interaction.reply({ content: 'Erreur.', ephemeral: true });
    }
  }
};

export default command;
