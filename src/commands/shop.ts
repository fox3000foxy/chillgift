import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';

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

      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } catch (e) {
      console.error('Erreur dans la commande shop :', e);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
      }
    }
  }
};

export default command;
