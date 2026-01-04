const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { getUserProfile } = require('../System/userProfiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aurora')
        .setDescription('Показывает интерактивное меню бота Aurora'),
         
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
                { name: '🎵 Музыка', value: 'Воспроизводите музыку из YouTube', inline: false },
                { name: '🎁 Ежедневная награда', value: 'Получайте награды раз в день', inline: false },
                { name: '🎊 События', value: 'Участвуйте в событиях и получайте специальные награды', inline: false },
                { name: '⚙️ Настройки', value: 'Персонализация опыта использования', inline: false }
            )
            .setColor('#8b00ff')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: `Aurora Bot | ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        // Создаем кнопки для главного меню
        const buttonsRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('aurora_info')
                    .setLabel('Информация')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('ℹ️'),
                new ButtonBuilder()
                    .setCustomId('aurora_profile')
                    .setLabel('Профиль')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👤'),
                new ButtonBuilder()
                    .setCustomId('aurora_leaderboard')
                    .setLabel('Лидеры')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('aurora_daily')
                    .setLabel('Ежедневно')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎁'),
                new ButtonBuilder()
                    .setCustomId('aurora_close')
                    .setLabel('Закрыть')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        // Создаем вторую строку кнопок
        const buttonsRow2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('aurora_shop')
                    .setLabel('Магазин')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🛒'),
                new ButtonBuilder()
                    .setCustomId('aurora_inventory')
                    .setLabel('Инвентарь')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎒'),
                new ButtonBuilder()
                    .setCustomId('aurora_quests')
                    .setLabel('Квесты')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎯'),
                new ButtonBuilder()
                    .setCustomId('aurora_guild')
                    .setLabel('Гильдия')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏰'),
                new ButtonBuilder()
                    .setCustomId('aurora_rep')
                    .setLabel('Репутация')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⭐')
            );

        // Создаем третью строку кнопок
        const buttonsRow3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('aurora_events')
                    .setLabel('События')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎊'),
                new ButtonBuilder()
                    .setCustomId('aurora_settings')
                    .setLabel('Настройки')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚙️'),
                new ButtonBuilder()
                    .setCustomId('aurora_help')
                    .setLabel('Помощь')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❓')
            );

        // Отправляем сообщение с информацией и кнопками
        await interaction.reply({
            embeds: [embed],
            components: [buttonsRow, buttonsRow2, buttonsRow3],
            ephemeral: false
        });
    },
};