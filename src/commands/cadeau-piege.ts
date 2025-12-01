import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUser, saveDatabase, updatePoints } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder()
    .setName('cadeau-piege')
    .setDescription('Piège'),

  async execute(interaction: CommandInteraction) {
    try {
      const user = getUser(interaction.user.id);
      const cost = 50;

      if (user.points < cost) {
        await interaction.reply({ content: 'Pas assez de points pour poser un piège.', ephemeral: true });
        return;
      }

      updatePoints(interaction.user.id, -cost);
      saveDatabase();

      const embed = new EmbedBuilder()
        .setTitle('🎁 Cadeau ou Piège ?')
        .setDescription('Un cadeau a été posé. Qui osera l’ouvrir ?')
        .setColor('#E74C3C');

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`trap_open_${interaction.user.id}`)
          .setLabel('Ouvrir')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    } catch (e) {
      console.error('Erreur dans la commande cadeau-piege :', e);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
      }
    }
  }
};

export default command;
