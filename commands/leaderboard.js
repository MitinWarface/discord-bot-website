const { 
    SlashCommandBuilder, 
    EmbedBuilder 
} = require('discord.js');
const { getTopUsers } = require('../System/userProfiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Показывает топ пользователей по очкам'),
        
    async execute(interaction) {
        const topUsers = getTopUsers(10);
        
        if (topUsers.length === 0) {
            await interaction.reply({
                content: 'Нет данных для отображения.',
                flags: ['Ephemeral']
            });
            return;
        }
        
        // Создаем embed для таблицы лидеров
        const embed = new EmbedBuilder()
            .setTitle('🏆 Таблица лидеров')
            .setColor('#e74c3c')
            .setTimestamp()
            .setFooter({ text: `Запрос от ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        // Добавляем поля для каждого пользователя в топе
        for (let i = 0; i < topUsers.length; i++) {
            const user = topUsers[i];
            const position = i + 1;
            const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
            
            embed.addFields({
                name: `${medal} ${user.username}`,
                value: `Уровень: ${user.level} | Очки: ${user.points}`,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed], flags: [] });
    },
};