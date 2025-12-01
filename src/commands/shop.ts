import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, SlashCommandBuilder } from 'discord.js';

const command = {
  data: new SlashCommandBuilder().setName('shop').setDescription('Boutique'),
  async execute(interaction: CommandInteraction) {
    try {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('shop_buy_shield').setLabel('Bouclier (150)').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('shop_buy_amulet').setLabel('Amulette (300)').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('shop_buy_dagger').setLabel('Dague (200)').setStyle(ButtonStyle.Primary)
      );
      await interaction.reply({ content: 'Shop', components: [row], ephemeral: false });
    } catch (e) {
      console.error('shop error', e);
      if (!interaction.replied) await interaction.reply({ content: 'Erreur.', ephemeral: true });
    }
  }
};

export default command;
