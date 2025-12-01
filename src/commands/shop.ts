import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUser, saveDatabase, updatePoints } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Boutique'),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const embed = new EmbedBuilder()
        .setTitle('🛒 Boutique')
        .setDescription('Bienvenue dans la boutique ! Voici les articles disponibles :')
        .setColor('#FFD700')
        .addFields(
          { name: 'Bouclier', value: '150 points', inline: true },
          { name: 'Amulette', value: '300 points', inline: true },
          { name: 'Dague', value: '200 points', inline: true }
        )
        .setFooter({ text: 'Utilisez les boutons ci-dessous pour acheter un article.' });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('shop_buy_shield')
          .setLabel('Acheter Bouclier')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('shop_buy_amulet')
          .setLabel('Acheter Amulette')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('shop_buy_dagger')
          .setLabel('Acheter Dague')
          .setStyle(ButtonStyle.Primary)
      );

      const message = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true, fetchReply: true });

      const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

      collector.on('collect', async (btnInteraction) => {
        if (btnInteraction.user.id !== interaction.user.id) {
          return btnInteraction.reply({ content: 'Vous ne pouvez pas utiliser ce bouton.', ephemeral: true });
        }

        const user = getUser(interaction.user.id);
        const costs: Record<string, number> = { shield: 150, amulet: 300, dagger: 200 };
        const item = btnInteraction.customId.split('_')[2];

        if (user.points < costs[item]) {
          return btnInteraction.reply({ content: 'Pas assez de points.', ephemeral: true });
        }

        updatePoints(interaction.user.id, -costs[item]);
        user.inventory[item] = (user.inventory[item] || 0) + 1;
        saveDatabase();

        await btnInteraction.update({ content: `✅ Vous avez acheté ${item}.`, components: [] });
        collector.stop();
      });

      collector.on('end', async () => {
        if (message.editable) {
          await message.edit({ components: [] });
        }
      });
    } catch (e) {
      console.error('Erreur dans la commande shop :', e);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
      }
    }
  }
};

export default command;
