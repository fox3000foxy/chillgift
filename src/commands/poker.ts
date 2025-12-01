import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUser, updatePoints } from '../legacy/db';
import { PokerBot, PokerEngine } from '../lib/PokerManager';

const botEmojis: { [key: string]: string } = {
    pairlover: '🃏',
    random: '🎲',
    cautious: '🤔',
    aggressive: '🔥',
    bluffer: '😈',
    balanced: '⚖️'
};

const command = {
    data: new SlashCommandBuilder()
        .setName('poker')
        .setDescription('Jouer une partie de poker')
        .addIntegerOption(o =>
            o.setName('mise')
                .setRequired(true)
                .setDescription('Mise initiale')
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const mise = interaction.options.getInteger('mise', true);
            const userId = interaction.user.id;
            const user = getUser(userId);

            if (user.points < mise) {
                return interaction.reply({ content: 'Vous n\'avez pas assez de points pour cette mise.', ephemeral: true });
            }

            // Déduire la mise initiale
            updatePoints(userId, -mise);

            // Créer une instance de PokerEngine
            let engine = new PokerEngine(interaction.user.username, mise, 20);

            // Ajouter des bots au jeu
            const bots = [
                new PokerBot("Blinky", 500, "pairlover", 0.1),
                new PokerBot("Pinky", 500, "random", 0.5),
                new PokerBot("Inky", 500, "cautious", 0.2),
                new PokerBot("Clyde", 500, "aggressive", 0.3),
                new PokerBot("Packy", 500, "bluffer", 1),
                new PokerBot("Kacky", 500, "balanced", 0.2)
            ];

            bots.forEach(bot => engine.addBot(bot));

            // Créer les boutons d'interaction
            const buttons = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('fold')
                        .setLabel('Se coucher')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('call')
                        .setLabel('Suivre')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('raise')
                        .setLabel('Relancer')
                        .setStyle(ButtonStyle.Success)
                );

            // Ajouter un état pour chaque bot
            bots.forEach(bot => bot.status = 'active'); // Par défaut, tous les bots sont actifs

            // Mettre à jour la fonction updateEmbed pour indiquer à qui c'est le tour
            const updateEmbed = (statusMessage: string = '', currentTurn: string = '') => {
                const playerHand = engine.holeCards.map(engine.parseCard).join(', ');

                const embed = new EmbedBuilder()
                    .setTitle('Table de Poker')
                    .setDescription(statusMessage ? `*${statusMessage}*` : '*La partie commence !*')
                    .setColor(0x00AE86)
                    .addFields(
                        { name: 'Pot', value: `${engine.pot}`, inline: true },
                        { name: 'Votre stack', value: `${engine.playerStack}`, inline: true },
                        { 
                            name: currentTurn === interaction.user.username ? '__Votre main__' : 'Votre main', 
                            value: playerHand, 
                            inline: false 
                        },
                        { name: 'Cartes communautaires', value: engine.community.length ? engine.community.map(engine.parseCard).join(', ') : 'Aucune', inline: false }
                    );

                // Ajouter les informations des bots avec leur état et indiquer le bot actif
                bots.forEach(bot => {
                    const statusEmoji = bot.status === 'active' ? '🟢' : bot.status === 'folded' ? '🔴' : '⚪';
                    const botName = currentTurn === bot.name ? `__**${bot.name}**__` : bot.name;
                    embed.addFields({
                        name: `${statusEmoji} ${botEmojis[bot.personality]} ${botName}`,
                        value: `Cartes: 🂠🂠 | Stack: ${bot.stack}`,
                        inline: true
                    });
                });

                // Ajouter l'état du joueur
                const playerstatusEmoji = engine.playerStatus === 'active' ? '🟢' : engine.playerStatus === 'folded' ? '🔴' : '⚪';
                embed.addFields({
                    name: `${playerstatusEmoji} ${interaction.user.username} (Vous)`,
                    value: `Cartes: ${playerHand} | Stack: ${engine.playerStack}`,
                    inline: true
                });

                return embed;
            };

            // Envoyer le message initial
            const message = await interaction.reply({
                embeds: [updateEmbed()],
                components: [buttons],
                fetchReply: true
            });

            // Gérer les interactions des boutons
            const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button });

            collector.on('collect', async i => {
                if (i.user.id !== userId) {
                    return i.reply({ content: 'Ce n\'est pas votre tour.', ephemeral: true });
                }

                await i.deferUpdate();

                const action = i.customId;
                if (action === 'fold') {
                    engine.playerStatus = 'folded'; // Mettre à jour l'état du joueur
                }

                await engine.play(action);

                // Mettre à jour l'embed après l'action
                await message.edit({
                    embeds: [updateEmbed()],
                    components: [buttons]
                });
            });

            // Écouter les événements du jeu
            engine.on('playerTurn', async () => {
                buttons.components.forEach(button => button.setDisabled(false));
                await message.edit({
                    embeds: [updateEmbed(`${interaction.user.username}, c'est votre tour !`, interaction.user.username)],
                    components: [buttons]
                });
            });

            engine.on('action', async (msg, botName, botAction) => {
                const bot = bots.find(b => b.name === botName);
                if (bot) {
                    if (botAction === 'fold') {
                        bot.status = 'folded';
                    } else if (botAction === 'eliminated') {
                        bot.status = 'eliminated';
                    }
                }

                buttons.components.forEach(button => button.setDisabled(true));
                await message.edit({
                    embeds: [updateEmbed(msg, botName)],
                    components: [buttons]
                });
            });

            // Ajouter un gestionnaire pour les boutons "Relancer" et "Récupérer les gains"
            engine.on('showdown', async (msg) => {
                const actionButtons = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('restart')
                            .setLabel('Relancer')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('cashout')
                            .setLabel('Récupérer les gains')
                            .setStyle(ButtonStyle.Primary)
                    );

                const showdownEmbed = new EmbedBuilder()
                    .setTitle('Showdown')
                    .setDescription(`*${msg}*`)
                    .setColor(0xFFD700)
                    .addFields(
                        { name: 'Pot', value: `${engine.pot}`, inline: true },
                        { name: 'Cartes communautaires', value: engine.community.length ? engine.community.map(engine.parseCard).join(', ') : 'Aucune', inline: false }
                    );

                // Ajouter les informations des bots avec leurs cartes révélées
                bots.forEach(bot => {
                    const revealedCards = bot.holeCards.map(engine.parseCard).join(', ');
                    showdownEmbed.addFields({
                        name: `${botEmojis[bot.personality]} ${bot.name}`,
                        value: `Cartes: ${revealedCards} | Stack: ${bot.stack}`,
                        inline: true
                    });
                });

                // Ajouter les cartes du joueur
                const playerHand = engine.holeCards.map(engine.parseCard).join(', ');
                showdownEmbed.addFields({
                    name: `${interaction.user.username} (Vous)`,
                    value: `Cartes: ${playerHand} | Stack: ${engine.playerStack}`,
                    inline: true
                });

                await message.edit({
                    embeds: [showdownEmbed],
                    components: [actionButtons]
                });

                const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button });

                collector.on('collect', async i => {
                    if (i.customId === 'restart') {
                        await i.deferUpdate();
                        engine.emit('nextHand'); // Déclencher l'événement "nextHand"
                    } else if (i.customId === 'cashout') {
                        await i.deferUpdate();
                        updatePoints(userId, engine.playerStack - mise); // Mettre à jour les points du joueur
                        await message.edit({
                            content: `Vous avez récupéré vos gains. Votre stack final est de ${engine.playerStack} points.`,
                            components: [],
                            embeds: []
                        });
                    }
                });
            });

            await engine.playSession();
            // Mise à jour des points après la partie
            updatePoints(userId, engine.playerStack - mise);
        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande poker:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Une erreur est survenue pendant la partie.', ephemeral: true });
            }
        }
    }
};

export default command;
