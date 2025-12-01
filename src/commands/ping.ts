import { CommandInteraction, SlashCommandBuilder } from "discord.js";

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
        } catch (error) {
            console.error("Ping command error:", error);
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: "Error: failed to run ping." });
            } else {
                await interaction.reply({ content: "Error: failed to run ping.", ephemeral: true });
            }
        }
    },
};

export default command;
