import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ComponentType, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { log } from '../index';
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
        log('Cadeau-Piège Command', `${interaction.user.tag} tried to set a trap but had insufficient points.`);
        return;
      }

      updatePoints(interaction.user.id, -cost);
      saveDatabase();
      log('Cadeau-Piège Command', `${interaction.user.tag} set a trap for 50 points.`);

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
          await btnInteraction.reply({ content: "C'est votre propre piège.", ephemeral: true });
          log('Cadeau-Piège Collector', `${btnInteraction.user.tag} tried to open their own trap.`);
          return;
        }

        await btnInteraction.update({ components: [] });

        if (Math.random() < 0.5) {
          updatePoints(btnInteraction.user.id, 100);
          await btnInteraction.followUp({ content: '✨ Vous avez gagné 100 points !', ephemeral: true });
          log('Cadeau-Piège Collector', `${btnInteraction.user.tag} opened a trap and gained 100 points.`);
        } else {
          updatePoints(btnInteraction.user.id, -100);
          updatePoints(ownerId, 50);
          await btnInteraction.followUp({ content: '💣 Vous avez perdu 100 points !', ephemeral: true });
          log('Cadeau-Piège Collector', `${btnInteraction.user.tag} opened a trap, lost 100 points, and ${interaction.user.tag} gained 50 points.`);
        }

        saveDatabase();
        collector.stop();
      });

      collector.on('end', async () => {
        if (message.editable) {
          await message.edit({ components: [] });
          log('Cadeau-Piège Collector', `Trap set by ${interaction.user.tag} expired.`);
        }
      });
    } catch (e) {
      console.error('Erreur dans la commande cadeau-piege :', e);
      log('Cadeau-Piège Command Error', `Error occurred: ${String(e)}`);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
      }
    }
  }
};

export default command;
