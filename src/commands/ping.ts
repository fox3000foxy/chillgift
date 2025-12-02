import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { log } from '../index';

const command = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong and latency."),

    async execute(interaction: CommandInteraction) {
        try {
            const ws = Math.round(interaction.client.ws.ping);
            const rest = Date.now() - interaction.createdTimestamp;
            await interaction.reply({
                content: `Pong! WS: ${ws}ms | REST: ${rest}ms`,
                ephemeral: true,
            });
            log('Ping Command', `${interaction.user.tag} executed the ping command. WS: ${ws}ms, REST: ${rest}ms.`);
        } catch (error) {
            console.error("Ping command error:", error);
            log('Ping Command Error', `Error occurred: ${String(error)}`);
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: "Error: failed to run ping." });
            } else {
                await interaction.reply({ content: "Error: failed to run ping.", ephemeral: true });
            }
        }
    },
};

export default command;
