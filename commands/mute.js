const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChatInputCommandInteraction } = require('discord.js');
const ms = require('ms'); // Для преобразования времени (установите: npm install ms)

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Выдать временный мут пользователю')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, которому хотите выдать мут')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Длительность мута (например, 10m, 1h, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина мута')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        // Проверяем права администратора
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return await interaction.reply({ 
                content: 'У вас нет прав для использования этой команды!', 
                ephemeral: true 
            });
        }

        const targetUser = interaction.options.getUser('user');
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'Нарушение правил';
        const moderator = interaction.user;

        try {
            // Преобразуем длительность в миллисекунды
            const durationMs = ms(duration);
            
            if (!durationMs) {
                return await interaction.reply({
                    content: 'Неверный формат длительности! Примеры: `10m`, `1h`, `1d`',
                    ephemeral: true
                });
            }

            // Проверяем, что длительность не слишком длинная (Discord ограничивает до 28 дней)
            if (durationMs > 28 * 24 * 60 * 1000) {
                return await interaction.reply({
                    content: 'Мут не может длиться более 28 дней!',
                    ephemeral: true
                });
            }

            // Получаем участника сервера
            const member = await interaction.guild.members.fetch(targetUser.id);
            
            // Проверяем, можно ли замутить участника
            if (member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({
                    content: 'Нельзя замутить администратора!',
                    ephemeral: true
                });
            }

            // Проверяем, имеет ли модератор более высокую роль, чем целевой пользователь
            if (interaction.member.roles.highest.position <= member.roles.highest.position) {
                return await interaction.reply({
                    content: 'Вы не можете замутить пользователя с такой же или более высокой ролью!',
                    ephemeral: true
                });
            }

            // Выдаем мут участнику
            await member.timeout(durationMs, reason);

            const embed = new EmbedBuilder()
                .setTitle('🔇 Временный мут')
                .setDescription(`<@${moderator.id}> выдал временный мут пользователю <@${targetUser.id}>`)
                .addFields(
                    { name: 'Причина', value: reason, inline: true },
                    { name: 'Длительность', value: duration, inline: true },
                    { name: 'До размута', value: `<t:${Math.floor((Date.now() + durationMs) / 1000)}:R>`, inline: true }
                )
                .setColor('#808080')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Отправляем личное сообщение пользователю о муте
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🔇 Вы получили временный мут')
                    .setDescription(`Вам был выдан временный мут на сервере **${interaction.guild.name}**`)
                    .addFields(
                        { name: 'Модератор', value: `<@${moderator.id}>`, inline: true },
                        { name: 'Причина', value: reason, inline: true },
                        { name: 'Длительность', value: duration, inline: true },
                        { name: 'До размута', value: `<t:${Math.floor((Date.now() + durationMs) / 1000)}:R>`, inline: false }
                    )
                    .setColor('#808080')
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                // Не удалось отправить личное сообщение
                console.log(`Не удалось отправить личное сообщение пользователю ${targetUser.tag}`);
            }
        } catch (error) {
            console.error('Ошибка при муте пользователя:', error);
            await interaction.reply({ 
                content: 'Произошла ошибка при попытке замутить пользователя.', 
                ephemeral: true 
            });
        }
    }
};