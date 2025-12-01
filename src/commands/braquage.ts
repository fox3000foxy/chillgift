import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getUser, saveDatabase, updatePoints } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder()
    .setName('braquage')
    .setDescription('Vol')
    .addUserOption(o => o.setName('target').setRequired(true).setDescription('Cible')),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const target = interaction.options.getUser('target', true);
      const robber = getUser(interaction.user.id);
      const victim = getUser(target.id);

      if (!victim || victim.points <= 0) {
        await interaction.reply({ content: `${target.username} n'a pas assez de points à voler.`, ephemeral: true });
        return;
      }

      const successChance = 0.5; // 50% chance of success
      if (Math.random() > successChance) {
        const penalty = Math.min(20, robber.points); // Robber loses up to 20 points on failure
        updatePoints(interaction.user.id, -penalty);
        updatePoints(target.id, penalty); // Victim gains the penalty points
        saveDatabase();
        await interaction.reply({ content: `❌ Le braquage a échoué ! Vous avez perdu ${penalty} points en essayant de voler ${target.username}.`});
        return;
      }

      const amount = Math.min(50, victim.points); // Limit the robbery to 50 points or less
      updatePoints(target.id, -amount);
      updatePoints(interaction.user.id, amount);
      saveDatabase();

      await interaction.reply({ content: `💰 Vous avez réussi à voler ${amount} points à ${target.username} !` });
    } catch (e) {
      console.error('Erreur lors du braquage :', e);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
      }
    }
  }
};

export default command;
