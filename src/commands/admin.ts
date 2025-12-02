import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { db, getUser, saveDatabase, updatePoints } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder().setName('admin').setDescription('Staff')
    .addSubcommand(s => s.setName('add').setDescription('Add points to a user').addUserOption(o => o.setName('user').setRequired(true).setDescription('User')).addIntegerOption(o => o.setName('points').setRequired(true).setDescription('Points')))
    .addSubcommand(s => s.setName('remove').setDescription('Remove points from a user').addUserOption(o => o.setName('user').setRequired(true).setDescription('User')).addIntegerOption(o => o.setName('points').setRequired(true).setDescription('Points')))
    .addSubcommand(s => s.setName('drop').setDescription('Create a points drop').addIntegerOption(o => o.setName('montant').setRequired(true).setDescription('Amount')))
    .addSubcommand(s => s.setName('post-advent').setDescription('Post advent calendar').addChannelOption(o => o.setName('channel').setRequired(true).setDescription('Channel where the calendar will be posted')))
    .addSubcommand(s => s.setName('view_conf').setDescription('Voir toute la config (JSON)'))
    .addSubcommand(s => s.setName('set_prob').setDescription('Changer probabilités events').addStringOption(o => o.setName('type').setRequired(true).addChoices(
        { name: 'Star', value: 'star' },
        { name: 'Phoenix', value: 'phoenix' },
        { name: 'Tree', value: 'tree' },
        { name: 'Snowball', value: 'snowball' },
        { name: 'Quiz', value: 'quiz' }
    ).setDescription('Type')).addIntegerOption(o => o.setName('valeur').setRequired(true).setDescription('Nouvel %')))
    .addSubcommand(s => s.setName('set_config').setDescription('Changer valeurs globales').addStringOption(o => o.setName('key').setRequired(true).setDescription('Clé').addChoices(
        { name: 'Daily Reward', value: 'dailyReward' },
        { name: 'Cost Expedition', value: 'costExpedition' },
        { name: 'Cost Shield', value: 'costShield' },
        { name: 'Cost Amulet', value: 'costAmulet' },
        { name: 'Cost Dagger', value: 'costDagger' },
        { name: 'Cost Trap', value: 'costTrap' }
    )).addIntegerOption(o => o.setName('valeur').setRequired(true).setDescription('Nouvelle Valeur')))
    .addSubcommand(s => s.setName('reset_daily').setDescription('Reset daily user').addUserOption(o => o.setName('user').setRequired(true).setDescription('Joueur Cible'))),

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
        const channel = interaction.options.getChannel('channel', true);
        const today = new Date().toISOString().split('T')[0];

        const embed = {
          title: `🎅 CALENDRIER DE L'AVENT - JOUR ${today.split('-')[2]}`,
          description: 'Ouvrez votre case pour découvrir votre surprise !',
          color: 0xC0392B,
          footer: { text: 'Bonnes fêtes !' },
        };

        const button = {
          type: 1,
          components: [
            {
              type: 2,
              label: 'Ouvrir la case',
              style: 1,
              custom_id: `advent_open_${today}`,
            },
          ],
        };

        await (channel as TextChannel).send({ embeds: [embed], components: [button] });
        return interaction.reply({ content: '✅ Calendrier posté.', ephemeral: true });
      }
      if (sub === 'view_conf') {
        const config = JSON.stringify(db.config, null, 2);
        return interaction.reply({ content: `\`\`\`json\n${config}\n\`\`\``, ephemeral: true });
      }

      if (sub === 'set_prob') {
        const type = interaction.options.getString('type', true);
        const value = interaction.options.getInteger('valeur', true);

        if (!db.config.probs[type]) {
          return interaction.reply({ content: '❌ Type invalide.', ephemeral: true });
        }

        db.config.probs[type] = value;
        saveDatabase();
        return interaction.reply({ content: `✅ Probabilité de **${type}** mise à jour à **${value}%**.`, ephemeral: true });
      }

      if (sub === 'set_config') {
        const key = interaction.options.getString('key', true);
        const value = interaction.options.getInteger('valeur', true);

        if (!db.config[key]) {
          return interaction.reply({ content: '❌ Clé invalide.', ephemeral: true });
        }

        db.config[key] = value;
        saveDatabase();
        return interaction.reply({ content: `✅ Clé **${key}** mise à jour à **${value}**.`, ephemeral: true });
      }

      if (sub === 'reset_daily') {
        const user = interaction.options.getUser('user', true);
        const userData = getUser(user.id);

        userData.daily.date = null;
        saveDatabase();
        return interaction.reply({ content: `✅ Daily reset pour **${user.username}**.`, ephemeral: true });
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
