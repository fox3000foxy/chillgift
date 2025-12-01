import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { db, updatePoints } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder().setName('admin').setDescription('Staff')
    .addSubcommand(s => s.setName('add').setDescription('Add points to a user').addUserOption(o => o.setName('user').setRequired(true).setDescription('User')).addIntegerOption(o => o.setName('points').setRequired(true).setDescription('Points')))
    .addSubcommand(s => s.setName('remove').setDescription('Remove points from a user').addUserOption(o => o.setName('user').setRequired(true).setDescription('User')).addIntegerOption(o => o.setName('points').setRequired(true).setDescription('Points')))
    .addSubcommand(s => s.setName('drop').setDescription('Create a points drop').addIntegerOption(o => o.setName('montant').setRequired(true).setDescription('Amount')))
    .addSubcommand(s => s.setName('post-advent').setDescription('Post advent calendar')),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const adminRoles = db.config.superAdminRoles || [];
      const memberRoles = (() => {
        const roles = interaction.member?.roles;
        if (!roles) return [];
        if (Array.isArray(roles)) return roles;
        return roles.cache.map(role => role.id);
      })();

      const isAdmin = adminRoles.some((role: string) => memberRoles.includes(role));
      if (!isAdmin) {
        await interaction.reply({ content: '❌ Vous n’avez pas les permissions nécessaires pour utiliser cette commande.', ephemeral: true });
        return;
      }

      const sub = interaction.options.getSubcommand();
      if (sub === 'add') {
        const user = interaction.options.getUser('user', true);
        const pts = interaction.options.getInteger('points', true);
        updatePoints(user.id, pts);
        return interaction.reply({ content: `✅ Ajouté ${pts} points à ${user}.`, ephemeral: true });
      }
      if (sub === 'remove') {
        const user = interaction.options.getUser('user', true);
        const pts = interaction.options.getInteger('points', true);
        updatePoints(user.id, -pts);
        return interaction.reply({ content: `✅ Retiré ${pts} points à ${user}.`, ephemeral: true });
      }
      if (sub === 'drop') {
        const montant = interaction.options.getInteger('montant', true);
        await (interaction.channel as TextChannel)?.send({ content: `💰 DROP ${montant}` });
        return interaction.reply({ content: '✅ Drop posté.', ephemeral: true });
      }
      if (sub === 'post-advent') {
        return interaction.reply({ content: '🎄 Feature post-advent (à implémenter).', ephemeral: true });
      }
    } catch (e) {
      console.error('admin command error', e);
      if (!interaction.replied) {
        await interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
      }
    }
  }
};

export default command;
