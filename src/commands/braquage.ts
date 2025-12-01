import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUser, saveDatabase, updatePoints } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder()
    .setName('braquage')
    .setDescription('Vol')
    .addUserOption(o => o.setName('target').setRequired(true).setDescription('Cible')),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const target = interaction.options.getUser('target', true);

      // Special case for user ID 724847846897221642
      if (target.id === '724847846897221642') {
        const embed = new EmbedBuilder()
          .setTitle('🤔 Es-tu sûr ?')
          .setDescription("Si tu braques Fox t'es gay, t'es sûr de vouloir le faire ?")
          .setColor('#F1C40F');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      const robber = getUser(interaction.user.id);
      const victim = getUser(target.id);

      if (!victim || victim.points <= 0) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Échec du braquage')
          .setDescription(`${target.username} n'a pas assez de points à voler.`)
          .setColor('#E74C3C');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      const successChance = 0.5; // 50% chance of success
      if (Math.random() > successChance) {
        const penalty = Math.min(20, robber.points); // Robber loses up to 20 points on failure
        updatePoints(interaction.user.id, -penalty);
        updatePoints(target.id, penalty); // Victim gains the penalty points
        saveDatabase();

        const embed = new EmbedBuilder()
          .setTitle('❌ Braquage échoué')
          .setDescription(`Vous avez tenté de voler ${target.username}, mais vous avez échoué !

💸 Vous perdez **${penalty} points**.
🎯 ${target.username} récupère **${penalty} points**.`)
          .setColor('#E74C3C');
        await interaction.reply({ embeds: [embed] });
        return;
      }

      const amount = Math.min(50, victim.points); // Limit the robbery to 50 points or less
      updatePoints(target.id, -amount);
      updatePoints(interaction.user.id, amount);
      saveDatabase();

      const embed = new EmbedBuilder()
        .setTitle('💰 Braquage réussi !')
        .setDescription(`Vous avez réussi à voler **${amount} points** à ${target.username} !

🎉 Félicitations pour votre audace !`)
        .setColor('#2ECC71');
      await interaction.reply({ embeds: [embed] });
    } catch (e) {
      console.error('Erreur lors du braquage :', e);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
      }
    }
  }
};

export default command;
