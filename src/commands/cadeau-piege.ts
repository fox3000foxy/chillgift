import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ComponentType, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
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

      const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

      const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

      collector.on('collect', async (btnInteraction) => {
        const ownerId = btnInteraction.customId.split('_')[2];

        if (btnInteraction.user.id === ownerId) {
          return btnInteraction.reply({ content: "C'est votre propre piège.", ephemeral: true });
        }

        await btnInteraction.update({ components: [] });

        if (Math.random() < 0.5) {
          updatePoints(btnInteraction.user.id, 100);
          await btnInteraction.followUp({ content: '✨ Vous avez gagné 100 points !', ephemeral: true });
        } else {
          updatePoints(btnInteraction.user.id, -100);
          updatePoints(ownerId, 50);
          await btnInteraction.followUp({ content: '💣 Vous avez perdu 100 points !', ephemeral: true });
        }

        saveDatabase();
        collector.stop();
      });

      collector.on('end', async () => {
        if (message.editable) {
          await message.edit({ components: [] });
        }
      });
    } catch (e) {
      console.error('Erreur dans la commande cadeau-piege :', e);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
      }
    }
  }
};

export default command;
