const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const gameSystem = require('../System/gameSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('games')
        .setDescription('Игры и развлечения')
        .addSubcommand(subcommand =>
            subcommand
                .setName('guess')
                .setDescription('Игра "Угадай число"'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('rps')
                .setDescription('Игра "Камень, ножницы, бумага"'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Статистика ваших игр')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'guess':
                // Запускаем игру "Угадай число"
                await gameSystem.startGuessNumberGame(interaction);
                break;
                
            case 'rps':
                // Запускаем игру "Камень, ножницы, бумага"
                await gameSystem.startRockPaperScissors(interaction);
                break;
                
            case 'stats':
                // Показываем статистику игр пользователя
                const userStats = gameSystem.getUserGameStats(interaction.user.id);
                
                const statsEmbed = new EmbedBuilder()
                    .setTitle('🎮 Статистика игр')
                    .setColor('#8b00ff')
                    .setDescription(`Ваша статистика в мини-играх:`)
                    .addFields(
                        { name: 'Игр сыграно', value: userStats.gamesPlayed.toString(), inline: true },
                        { name: 'Игр выиграно', value: userStats.gamesWon.toString(), inline: true },
                        { name: 'Всего очков получено', value: userStats.totalPointsEarned.toString(), inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Статистика для ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });
                
                await interaction.reply({
                    embeds: [statsEmbed],
                    flags: []
                });
                break;
                
            default:
                await interaction.reply({
                    content: 'Неизвестная подкоманда!',
                    flags: ['Ephemeral']
                });
                break;
        }
    }
};