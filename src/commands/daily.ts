import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { log } from '../index';
import { getUser, saveDatabase, updatePoints } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder().setName('daily').setDescription('Daily'),
  async execute(interaction: CommandInteraction) {
    try {
      const u = getUser(interaction.user.id);
      if (u.daily.claimed) {
        await interaction.reply({ content: 'Déjà pris.', ephemeral: true });
        log('Daily Command', `${interaction.user.tag} tried to claim daily points but had already claimed.`);
        return;
      }
      updatePoints(interaction.user.id, 50);
      u.daily.claimed = true;
      saveDatabase();
      await interaction.reply({ content: '+50' });
      log('Daily Command', `${interaction.user.tag} claimed daily points (+50).`);
    } catch (e) {
      console.error('daily error', e);
      log('Daily Command Error', `Error occurred: ${String(e)}`);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Erreur.', ephemeral: true });
      }
    }
  }
};

export default command;
