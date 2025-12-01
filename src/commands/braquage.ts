import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

const command = {
  data: new SlashCommandBuilder().setName('braquage').setDescription('Vol').addUserOption(o=>o.setName('target').setRequired(true).setDescription('Cible')),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const t = interaction.options.getUser('target', true);
      const btn = new ButtonBuilder().setCustomId(`rob_confirm_${t.id}`).setLabel('Braquer').setStyle(ButtonStyle.Danger);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(btn);
      await interaction.reply({ content: `Braquer ${t} ?`, components: [row] });
    } catch (e) {
      console.error('braquage error', e);
      if (!interaction.replied) await interaction.reply({ content: 'Erreur.', ephemeral: true });
    }
  }
};

export default command;
