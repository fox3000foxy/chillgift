import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, Message, TextChannel } from 'discord.js';
import { db, getUser, saveDatabase, updatePoints } from '../legacy/db';

export default function registerMessageCreate(client: Client) {
    client.on('messageCreate', async (message: Message) => {
        if (message.author.bot) return;
        // Ensure this message is from a guild (not a DM)
        if (!message.guild) return;

        // Simple spam protection (like original)
        const cooldowns = (client as any).__legacyCooldowns ||= new Map<string,number>();
        const last = cooldowns.get(message.author.id) || 0;
        if (Date.now() - last < 2000) return;
        cooldowns.set(message.author.id, Date.now());

        const p = db.config.probs;
        const rand = Math.random() * 100;
        let type: string | null = null;
        if (rand < p.star) type = 'star';
        else if (rand < p.star + p.phoenix) type = 'phoenix';
        else if (rand < p.star + p.phoenix + p.tree) type = 'tree';
        else if (rand < p.star + p.phoenix + p.tree + p.snowball) type = 'snowball';
        else if (rand < p.star + p.phoenix + p.tree + p.snowball + p.quiz) type = 'quiz';

        try {
            if (type === 'star') {
                const m = await message.reply('🌠 **ÉTOILE !** Vite !');
                await m.react('🌠');
                const collector = m.createReactionCollector({ filter: (r,u) => r.emoji.name === '🌠' && !u.bot, time: 15000, max: 1 });
                collector.on('collect', async (r, u) => {
                    // simple handling: reward
                    const user = getUser(u.id);
                    if (user.inventory?.dagger > 0) {
                        // ask for dagger choice
                        await (message.channel as TextChannel).send(`<@${u.id}> Dague ?`);
                    } else {
                        if (Math.random() > 0.4) {
                            updatePoints(u.id, 50);
                            (message.channel as TextChannel).send(`🎉 <@${u.id}> +50`);
                        } else {
                            // bad reaction
                            if (user.inventory?.amulet > 0) { user.inventory.amulet--; saveDatabase(); (message.channel as TextChannel).send(`<@${u.id}> 🛡️ Amulette`); }
                            else if (user.inventory?.shield > 0) { user.inventory.shield--; saveDatabase(); (message.channel as TextChannel).send(`<@${u.id}> 🛡️ Bouclier`); }
                            else { updatePoints(u.id, -50); (message.channel as TextChannel).send(`<@${u.id}> 🔥 Piège -50`); }
                        }
                    }
                });
            } else if (type === 'phoenix') {
                await message.react('🔥');
                const collector = message.createReactionCollector({ filter: (r,u) => r.emoji.name === '🔥' && !u.bot, time: 15000, max: 1 });
                collector.on('collect', (r,u)=>{
                    updatePoints(u.id, -10);
                    (message.channel as TextChannel).send(`🔥 <@${u.id}> -10`);
                });
            } else if (type === 'tree') {
                await message.react('🎄');
                const collector = message.createReactionCollector({ filter: (r,u) => r.emoji.name === '🎄' && !u.bot, time: 15000, max: 1 });
                collector.on('collect', (r,u)=>{
                    updatePoints(u.id, 5);
                    (message.channel as TextChannel).send(`🎄 <@${u.id}> +5`);
                });
            } else if (type === 'snowball') {
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId('ev_snowball').setLabel('JETER').setStyle(ButtonStyle.Primary)
                );
                await (message.channel as TextChannel).send({ embeds: [new EmbedBuilder().setTitle('❄️ BATAILLE').setColor('#3498DB')], components: [row] });
            } else if (type === 'quiz') {
                const a = Math.floor(Math.random()*50), b = Math.floor(Math.random()*50);
                await (message.channel as TextChannel).send(`🧠 **QUIZ:** ${a} + ${b} ?`);
                // message.channel is safe here because message.guild is present
                const collector = (message.channel as TextChannel).createMessageCollector({ filter: m => !m.author.bot && m.content.trim() === (a+b).toString(), time: 10000, max: 1 });
                collector.on('collect', m => { updatePoints(m.author.id, 15); (message.channel as TextChannel).send(`✅ <@${m.author.id}> +15 pts`); });
            }
        } catch (e) {
            console.error('messageCreate event error:', e);
        }
    });
}
