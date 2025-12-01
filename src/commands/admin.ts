import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { updatePoints } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder().setName('admin').setDescription('Staff')
    .addSubcommand(s=>s.setName('add').setDescription('Add').addUserOption(o=>o.setName('user').setRequired(true).setDescription('U')).addIntegerOption(o=>o.setName('points').setRequired(true).setDescription('P')))
    .addSubcommand(s=>s.setName('remove').setDescription('Rem').addUserOption(o=>o.setName('user').setRequired(true).setDescription('U')).addIntegerOption(o=>o.setName('points').setRequired(true).setDescription('P')))
    .addSubcommand(s=>s.setName('drop').setDescription('Drop').addIntegerOption(o=>o.setName('montant').setRequired(true).setDescription('M')))
    .addSubcommand(s=>s.setName('post-advent').setDescription('Post advent')),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const sub = interaction.options.getSubcommand();
      if (sub === 'add') {
        const user = interaction.options.getUser('user', true);
        const pts = interaction.options.getInteger('points', true);
        updatePoints(user.id, pts);
        return interaction.reply({ content: `Ajouté ${pts} pts à ${user}.` });
      }
      if (sub === 'remove') {
        const user = interaction.options.getUser('user', true);
        const pts = interaction.options.getInteger('points', true);
        updatePoints(user.id, -pts);
        return interaction.reply({ content: `Retiré ${pts} pts à ${user}.` });
      }
      if (sub === 'drop') {
        const montant = interaction.options.getInteger('montant', true);
        // Create a drop message; the button handler is not implemented in commands
        await (interaction.channel as TextChannel)?.send({ content: `💰 DROP ${montant}` });
        return interaction.reply({ content: 'Drop posté.' });
      }
      if (sub === 'post-advent') {
        await interaction.reply({ content: 'Feature post-advent (à implémenter).'});
      }
    } catch (e) {
      console.error('admin error', e);
      if (!interaction.replied) await interaction.reply({ content: 'Erreur.', ephemeral: true });
    }
  }
};

export default command;
