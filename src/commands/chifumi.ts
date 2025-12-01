import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

const command = {
    data: new SlashCommandBuilder().setName('chifumi').setDescription('PvP chifumi').addUserOption(o => o.setName('membre').setRequired(true).setDescription('Adv')),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply({ content: 'Commande désactivée temporairement.', ephemeral: true }); return;

        try {
            const adv = interaction.options.getUser('membre', true);
            // create a simple challenge message — full implementation requires state handling
            await interaction.reply({ content: `${adv}, tu es défié par ${interaction.user}. (Accepter via message non-implémenté)`, ephemeral: false });
        } catch (e) {
            console.error('chifumi error', e);
            if (!interaction.replied) await interaction.reply({ content: 'Erreur.', ephemeral: true });
        }
    }
};

export default command;
