const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');
const { getUserProfile } = require('../System/userProfiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aurora')
        .setDescription('Показывает информацию о боте Aurora'),
        
    async execute(interaction) {
        // Получаем профиль пользователя
        const userProfile = getUserProfile(interaction.user.id);
        
        // Создаем embed сообщение
        const embed = new EmbedBuilder()
            .setTitle('🌟 Aurora Bot - Главное меню')
            .setDescription(`Добро пожаловать в многофункционального бота Aurora!\n\nВаш уровень: ${userProfile.level} | Очки: ${userProfile.points}`)
            .addFields(
                { name: '📊 Система уровней', value: 'Пользователи получают очки и повышают уровень', inline: false },
                { name: '🎯 Квесты', value: 'Выполняйте задания и получайте награды', inline: false },
                { name: '👥 Гильдии', value: 'Создавайте или присоединяйтесь к гильдиям', inline: false },
                { name: '💎 Магазин', value: 'Покупайте крутые предметы за очки', inline: false },
                { name: '🎒 Инвентарь', value: 'Собирайте и просматривайте свои приобретения', inline: false },
                { name: '⭐ Репутация', value: 'Выдайте репутацию другим участникам сервера', inline: false },
                { name: '🔧 Модерация', value: 'Команды для модерации сервера (warn, kick, ban)', inline: false },
                // { name: '🎵 Музыка', value: 'Воспроизводите музыку из YouTube', inline: false },
                { name: '🎁 Ежедневная награда', value: 'Получайте награды раз в день', inline: false },
                { name: '🎊 События', value: 'Участвуйте в событиях и получайте специальные награды', inline: false },
                { name: '⚙️ Настройки', value: 'Персонализация опыта использования', inline: false }
            )
            .setColor('#8b00ff')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: `Aurora Bot | ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        // Отправляем сообщение с информацией
        await interaction.reply({
            embeds: [embed]
        });
    },
};