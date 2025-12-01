import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, Interaction, SlashCommandBuilder } from 'discord.js';
import { db, getUser, saveDatabase, updatePoints } from '../legacy/db';

const command = {
  data: new SlashCommandBuilder()
    .setName('donjon')
    .setDescription('RPG Terrestre (10 pts)'),

  async execute(interaction: CommandInteraction | Interaction) {
    try {
      // Support being called from both slash command and button interactions
      const isButton = (interaction as any).isButton && (interaction as any).isButton();
      const uid = isButton ? (interaction as any).user.id : (interaction as CommandInteraction).user.id;
      const user = getUser(uid);
      const cost = db.config.costDonjon ?? 10;

      if (!isButton) {
        // Slash command: present the entrance button
        const btn = new ButtonBuilder().setCustomId('donjon_start').setLabel(`Entrer (-${cost})`).setStyle(ButtonStyle.Success);
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(btn as any);
        await (interaction as CommandInteraction).reply({ embeds: [new EmbedBuilder().setTitle('🏰 DONJON').setDescription(`Coût: ${cost} pts`).setColor('#9B59B6')], components: [row] });
        return;
      }

      // Button interaction handling
      const btn = interaction as any;
      const parts = btn.customId.split('_');
      const sub = parts[1];

      if (sub === 'start') {
        if (user.points < cost) return await btn.update({ content: 'Pas assez de points.', components: [] });
        if (user.daily.donjon >= (db.config.limitDonjon ?? 10)) return await btn.update({ content: 'Limite atteinte.', components: [] });
        updatePoints(uid, -cost);
        user.daily.donjon = (user.daily.donjon || 0) + 1;
        // Initialize a small session stored in DB for simplicity
        user.donjonSession = { stage: 0, rooms: 3, loot: 0 };
        saveDatabase();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('donjon_next').setLabel('Suivant').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('donjon_leave').setLabel('Quitter').setStyle(ButtonStyle.Secondary)
        );
        const embed = new EmbedBuilder().setTitle('🏰 Donjon').setDescription('Tu entres dans le donjon. Bonne chance !').setColor('#9B59B6');
        await btn.update({ embeds: [embed], components: [row] });
        return;
      }

      if (sub === 'leave') {
        if (user.donjonSession) {
          const loot = user.donjonSession.loot || 0;
          if (loot > 0) updatePoints(uid, loot);
          delete user.donjonSession;
          saveDatabase();
          return await btn.update({ content: `Tu sors du donjon. Tu récupères ${loot} pts.`, components: [] });
        }
        return await btn.update({ content: 'Tu n\'es pas dans un donjon.', components: [] });
      }

      if (sub === 'next') {
        if (!user.donjonSession) return await btn.update({ content: 'Session expirée ou inexistante.', components: [] });
        const sess = user.donjonSession;
        // Simple random encounter
        const r = Math.random();
        let txt = '';
        if (r < 0.4) {
          // enemy — lose some points then continue
          const dmg = 5 + Math.floor(Math.random()*10);
          updatePoints(uid, -dmg);
          txt = `👾 Combat! Tu perds ${dmg} pts.`;
        } else if (r < 0.8) {
          const gain = 10 + Math.floor(Math.random()*20);
          sess.loot = (sess.loot || 0) + gain;
          txt = `🎁 Tu trouves ${gain} pts.`;
        } else {
          txt = `🔍 Rien ici, avance.`;
        }
        sess.stage++;
        const finished = sess.stage >= (sess.rooms || 3);
        if (finished) {
          const total = sess.loot || 0;
          if (total > 0) updatePoints(uid, total);
          delete user.donjonSession;
          saveDatabase();
          return await btn.update({ content: `${txt}\n✅ Donjon terminé. Tu gagnes ${total} pts.`, components: [] });
        } else {
          saveDatabase();
          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('donjon_next').setLabel('Suivant').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('donjon_leave').setLabel('Quitter').setStyle(ButtonStyle.Secondary)
          );
          return await btn.update({ content: txt, components: [row] });
        }
      }

      // fallback
      await btn.reply({ content: 'Action donjon inconnue.', ephemeral: true });
    } catch (e) {
      console.error('donjon command error', e);
      try { if ((interaction as any).replied === false) await (interaction as any).reply({ content: 'Erreur interne.', ephemeral: true }); } catch(_){}
    }
  }
};

export default command;
