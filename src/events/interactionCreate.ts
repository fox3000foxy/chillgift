import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Client, Interaction } from 'discord.js';
import { getUser, saveDatabase, updatePoints } from '../legacy/db';

export default function registerInteractionCreate(client: Client) {
    client.on('interactionCreate', async (interaction: Interaction) => {
        try {
            if (interaction.isButton()) {
                const btn = interaction as ButtonInteraction;
                // Ensure this interaction originates from a guild (buttons in DMs are unsupported for our flows)
                if (!btn.guild) return btn.reply({ content: 'Action disponible uniquement en serveur.', ephemeral: true });
                const [act, sub, data] = btn.customId.split('_');
                const user = getUser(btn.user.id);

                // If the customId starts with a registered command name, try to delegate
                // the interaction to that command's execute(). This allows command
                // modules to handle button flows when appropriate.
                try {
                    const cmd = (client as any).commands?.get && (client as any).commands.get(act);
                    if (cmd && typeof cmd.execute === 'function') {
                        try {
                            // Call execute with the ButtonInteraction. Commands should
                            // handle the interaction type or do a type-check themselves.
                            await cmd.execute(btn as any);
                            return;
                        } catch (err) {
                            console.error(`Command ${act} execute failed when called from button:`, err);
                            // fall through to specialized handlers below
                        }
                    }
                } catch (e) {
                    console.error('Error while delegating button to command execute:', e);
                }

                // Shop buy
                if (act === 'shop' && sub === 'buy') {
                    const item = data;
                    const costs: any = { shield: 150, amulet: 300, dagger: 200 };
                    if (user.points < costs[item]) return btn.update({ content: 'Pas de fonds.', components: [] });
                    updatePoints(btn.user.id, -costs[item]);
                    user.inventory[item] = (user.inventory[item] || 0) + 1;
                    saveDatabase();
                    return btn.update({ content: `✅ Acheté ${item}.`, components: [] });
                }

                // Snowball event
                if (act === 'ev' && sub === 'snowball') {
                    const claimed = (client as any).__claimedSnowballs ||= new Set<string>();
                    if (claimed.has(btn.message.id)) return btn.reply({ content: 'Trop tard.', ephemeral: true });
                    claimed.add(btn.message.id);
                    await btn.message.edit({ components: [] });
                    updatePoints(btn.user.id, 5);
                    if (user.inventory.dagger > 0) {
                        // ask use dagger
                        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('use_dagger').setLabel('UTILISER').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('no_dagger').setLabel('NON').setStyle(ButtonStyle.Secondary));
                        return btn.reply({ content: 'Dague ?', components: [row], ephemeral: true });
                    }
                    // resolve simple: damage a random member in channel
                    // btn.guild is guaranteed above, so btn.channel should be a guild channel here
                    // const members = btn.guild?.members?.fetch()
                    // .filter(m=>!m.user.bot && m.id !== btn.user.id);

                    //fetching members 
                    const guild = btn.guild;
                    const members = await guild.members.fetch();
                    
                    let txt = '❄️ **HIT**\n';
                    if (members && members.size > 0) {
                        const random = members.random() as any;
                        const victim = getUser(random.id);
                        if (victim.inventory.amulet>0) { victim.inventory.amulet--; txt += `🛡️ <@${random.id}>`; }
                        else if (victim.inventory.shield>0) { victim.inventory.shield--; txt += `🛡️ <@${random.id}>`; }
                        else { updatePoints(random.id, -3); txt += `🎯 <@${random.id}> -3`; }
                        saveDatabase();
                    }
                    return btn.reply({ content: txt, ephemeral: false });
                }

                // trap open
                if (act === 'trap' && sub === 'open') {
                    const owner = data;
                    if (btn.user.id === owner) return btn.reply({ content: "C'est le tien.", ephemeral: true });
                    await btn.message.edit({ components: [] });
                    if (Math.random() < 0.5) { updatePoints(btn.user.id, 100); return btn.reply({ content: '✨ +100' }); }
                    else { updatePoints(btn.user.id, -100); updatePoints(owner, 50); return btn.reply({ content: '💣 -100' }); }
                }

                // default fallback
                await btn.reply({ content: 'Action non implémentée encore.', ephemeral: true });
            }
        } catch (e) {
            console.error('interactionCreate handler error', e);
        }
    });
}
