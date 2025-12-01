import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ComponentType, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { db, getUser, saveDatabase, updatePoints } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder()
    .setName('donjon')
    .setDescription('RPG Terrestre (10 pts)'),

  async execute(interaction: CommandInteraction) {
    try {
      const user = getUser(interaction.user.id);
      const cost = db.config.costDonjon ?? 10;

      if (user.points < cost) {
        await interaction.reply({ content: 'Pas assez de points pour entrer dans le donjon.', ephemeral: true });
        return;
      }

      if (user.daily.donjon >= (db.config.limitDonjon ?? 10)) {
        await interaction.reply({ content: 'Limite quotidienne atteinte pour le donjon.', ephemeral: true });
        return;
      }

      updatePoints(interaction.user.id, -cost);
      user.daily.donjon = (user.daily.donjon || 0) + 1;
      const randomRooms = Math.floor(Math.random() * 5) + 3; // Random number of rooms between 3 and 7
      user.donjonSession = { stage: 0, rooms: randomRooms, loot: 0 };
      saveDatabase();

      const embed = new EmbedBuilder()
        .setTitle('🏰 Donjon')
        .setDescription(`Tu entres dans le donjon. Bonne chance !\nNombre de salles: ${randomRooms}`)
        .setColor('#9B59B6')
        .setThumbnail('https://example.com/dungeon_thumbnail.png') // Replace with an actual image URL
        .setFooter({ text: 'Prépare-toi pour l’aventure !' });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('donjon_next').setLabel('Suivant').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('donjon_leave').setLabel('Quitter').setStyle(ButtonStyle.Secondary)
      );

      const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

      const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

      collector.on('collect', async (btnInteraction) => {
        if (btnInteraction.user.id !== interaction.user.id) {
          await btnInteraction.reply({ content: 'Ce bouton ne vous appartient pas.', ephemeral: true });
          return;
        }

        const sess = user.donjonSession;
        if (!sess) {
          await btnInteraction.update({ content: 'Session expirée ou inexistante.', components: [] });
          collector.stop();
          return;
        }

        const action = btnInteraction.customId.split('_')[1];

        if (action === 'leave') {
          const loot = sess.loot || 0;
          if (loot > 0) updatePoints(interaction.user.id, loot);
          delete user.donjonSession;
          saveDatabase();
          const leaveEmbed = new EmbedBuilder()
            .setTitle('🏰 Donjon - Fin')
            .setDescription(`Tu sors du donjon. Tu récupères ${loot} pts.`)
            .setColor('#E74C3C')
            .setFooter({ text: 'À la prochaine aventure !' });
          await btnInteraction.update({ embeds: [leaveEmbed], components: [] });
          collector.stop();
          return;
        }

        if (action === 'next') {
          const r = Math.random();
          let txt = '';
          let color = '#3498DB';
          if (r < 0.4) {
            const dmg = 5 + Math.floor(Math.random() * 10);
            updatePoints(interaction.user.id, -dmg);
            txt = `👾 Combat! Tu perds ${dmg} pts.`;
            color = '#E74C3C';
          } else if (r < 0.8) {
            const gain = 10 + Math.floor(Math.random() * 20);
            sess.loot = (sess.loot || 0) + gain;
            txt = `🎁 Tu trouves ${gain} pts.`;
            color = '#2ECC71';
          } else {
            txt = `🔍 Rien ici, avance.`;
          }

          sess.stage++;
          const finished = sess.stage >= sess.rooms;
          if (finished) {
            const total = sess.loot || 0;
            if (total > 0) updatePoints(interaction.user.id, total);
            delete user.donjonSession;
            saveDatabase();
            const finishEmbed = new EmbedBuilder()
              .setTitle('🏰 Donjon - Terminé')
              .setDescription(`${txt}\n✅ Donjon terminé. Tu gagnes ${total} pts.`)
              .setColor('#F1C40F')
              .setFooter({ text: 'Bravo pour avoir terminé le donjon !' });
            await btnInteraction.update({ embeds: [finishEmbed], components: [] });
            collector.stop();
            return;
          } else {
            saveDatabase();
            const nextEmbed = new EmbedBuilder()
              .setTitle('🏰 Donjon')
              .setDescription(txt)
              .setColor("Blurple")
              .setFooter({ text: `Salle ${sess.stage + 1} sur ${sess.rooms}` });
            await btnInteraction.update({ embeds: [nextEmbed], components: [row] });
          }
        }
      });

      collector.on('end', async () => {
        if (message.editable) {
          await message.edit({ components: [] });
        }
      });
    } catch (e) {
      console.error('donjon command error', e);
      if (!interaction.replied) {
        await interaction.reply({ content: 'Erreur interne.', ephemeral: true });
      }
    }
  }
};

export default command;
