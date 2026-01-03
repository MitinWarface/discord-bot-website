const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChatInputCommandInteraction } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Очистить сообщения в канале')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Количество сообщений для удаления (1-100)')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Удалить сообщения только от конкретного пользователя')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('before')
                .setDescription('Удалить сообщения перед этим сообщением (ID сообщения)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('after')
                .setDescription('Удалить сообщения после этого сообщения (ID сообщения)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        // Проверяем права администратора
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({ 
                content: 'У вас нет прав для использования этой команды!', 
                ephemeral: true 
            });
        }

        // Проверяем, что бот может удалять сообщения
        if (!interaction.channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({
                content: 'У меня нет прав для удаления сообщений в этом канале!',
                ephemeral: true
            });
        }

        const amount = interaction.options.getInteger('amount');
        const user = interaction.options.getUser('user');
        const before = interaction.options.getString('before');
        const after = interaction.options.getString('after');

        // Проверяем, что указан хотя бы один параметр
        if (!amount && !user && !before && !after) {
            return await interaction.reply({
                content: 'Пожалуйста, укажите хотя бы один параметр для очистки (количество, пользователь, до/после сообщения)',
                ephemeral: true
            });
        }

        try {
            // Определяем параметры фильтрации
            const filterOptions = {};
            
            if (amount) {
                if (amount < 1 || amount > 100) {
                    return await interaction.reply({
                        content: 'Количество сообщений должно быть от 1 до 100!',
                        ephemeral: true
                    });
                }
                filterOptions.limit = amount;
            } else {
                filterOptions.limit = 99; // Discord требует лимит меньше 100 при использовании других фильтров
            }

            if (before) {
                filterOptions.before = before;
            }

            if (after) {
                filterOptions.after = after;
            }

            // Получаем сообщения
            let messages = await interaction.channel.messages.fetch(filterOptions);

            // Фильтруем по пользователю, если указан
            if (user) {
                messages = messages.filter(msg => msg.author.id === user.id);
            }

            // Удаляем бота из сообщений (Discord не позволяет удалять сообщения старше 14 дней)
            const fourteenDaysAgo = new Date();
            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
            
            const messagesToDelete = messages.filter(msg => {
                // Не удаляем сообщения старше 14 дней
                return msg.createdAt > fourteenDaysAgo && 
                       // Не удаляем pinned сообщения
                       !msg.pinned &&
                       // Удаляем только сообщения пользователей (не системные)
                       !msg.system;
            });

            if (messagesToDelete.size === 0) {
                return await interaction.reply({
                    content: 'Не найдено сообщений для удаления по указанным критериям.',
                    ephemeral: true
                });
            }

            // Удаляем сообщения
            await interaction.channel.bulkDelete(messagesToDelete, true);

            // Отправляем подтверждение
            const embed = new EmbedBuilder()
                .setTitle('🧹 Очистка сообщений')
                .setDescription(`Успешно удалено **${messagesToDelete.size}** сообщений`)
                .addFields(
                    { name: 'Канал', value: `<#${interaction.channel.id}>`, inline: true }
                )
                .setColor('#8b00ff')
                .setTimestamp();

            if (user) {
                embed.addFields({ name: 'Пользователь', value: `<@${user.id}>`, inline: true });
            }

            if (amount) {
                embed.addFields({ name: 'Количество', value: amount.toString(), inline: true });
            }

            const reply = await interaction.reply({ embeds: [embed], ephemeral: true });

            // Удаляем сообщение с подтверждением через 5 секунд
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 5000);

        } catch (error) {
            console.error('Ошибка при очистке сообщений:', error);
            
            if (error.code === 50013) { // Отсутствие прав
                await interaction.reply({ 
                    content: 'У меня нет прав для удаления сообщений в этом канале.', 
                    ephemeral: true 
                });
            } else if (error.code === 10008) { // Сообщение не найдена
                await interaction.reply({ 
                    content: 'Не удалось найти одно из сообщений для удаления.', 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: 'Произошла ошибка при попытке очистить сообщения.', 
                    ephemeral: true 
                });
            }
        }
    }
};