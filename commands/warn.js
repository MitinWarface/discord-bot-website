const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Путь к файлу с предупреждениями
const warningsPath = path.join(__dirname, '../System/warnings.json');

// Загрузка предупреждений
function loadWarnings() {
    if (fs.existsSync(warningsPath)) {
        const data = fs.readFileSync(warningsPath, 'utf8');
        return JSON.parse(data);
    }
    return {};
}

// Сохранение предупреждений
function saveWarnings(warnings) {
    fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Выдать предупреждение пользователю')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, которому вы хотите выдать предупреждение')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина предупреждения')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Причина не указана';
        const moderator = interaction.user;

        // Проверяем, что модератор не пытается выдать предупреждение себе
        if (user.id === moderator.id) {
            const selfWarnEmbed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Вы не можете выдать предупреждение себе!')
                .setColor('#ff0000')
                .setTimestamp();

            return await interaction.reply({ embeds: [selfWarnEmbed], ephemeral: true });
        }

        // Проверяем, что модератор не пытается выдать предупреждение боту
        if (user.bot) {
            const botWarnEmbed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Вы не можете выдать предупреждение боту!')
                .setColor('#ff0000')
                .setTimestamp();

            return await interaction.reply({ embeds: [botWarnEmbed], ephemeral: true });
        }

        try {
            // Загружаем текущие предупреждения
            const warnings = loadWarnings();
            const guildId = interaction.guild.id;
            const userId = user.id;

            // Инициализируем запись для гильдии и пользователя, если её нет
            if (!warnings[guildId]) {
                warnings[guildId] = {};
            }
            if (!warnings[guildId][userId]) {
                warnings[guildId][userId] = [];
            }

            // Создаем новое предупреждение
            const newWarning = {
                id: warnings[guildId][userId].length + 1,
                moderatorId: moderator.id,
                reason: reason,
                timestamp: new Date().toISOString(),
                active: true
            };

            // Добавляем предупреждение
            warnings[guildId][userId].push(newWarning);
            saveWarnings(warnings);

            // Считаем общее количество активных предупреждений
            const activeWarnings = warnings[guildId][userId].filter(w => w.active).length;

            // Определяем действие на основе количества предупреждений
            let actionTaken = '';
            if (activeWarnings >= 3) {
                actionTaken = '\n\n⚠️ Пользователь достиг 3 предупреждений. Рекомендуется рассмотреть мут или бан.';
            } else if (activeWarnings >= 2) {
                actionTaken = '\n\n⚠️ Пользователь достиг 2 предупреждений. Рассмотрите мут.';
            }

            // Создаем embed для уведомления
            const warnEmbed = new EmbedBuilder()
                .setTitle('⚠️ Предупреждение')
                .setDescription(`<@${moderator.id}> выдал предупреждение пользователю <@${user.id}>`)
                .addFields(
                    { name: 'Причина', value: reason, inline: true },
                    { name: 'Модератор', value: `<@${moderator.id}>`, inline: true },
                    { name: 'Всего активных предупреждений', value: activeWarnings.toString(), inline: true },
                    { name: 'ID предупреждения', value: newWarning.id.toString(), inline: true }
                )
                .setColor('#FFA500')
                .setTimestamp();

            if (actionTaken) {
                warnEmbed.addFields({ name: 'Рекомендация', value: actionTaken, inline: false });
            }

            // Отправляем уведомление в канал
            await interaction.reply({ embeds: [warnEmbed] });

            // Отправляем личное сообщение пользователю о предупреждении
            try {
                const userWarnEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Вы получили предупреждение')
                    .setDescription(`Вы получили предупреждение на сервере **${interaction.guild.name}**`)
                    .addFields(
                        { name: 'Модератор', value: `${moderator.tag}`, inline: true },
                        { name: 'Причина', value: reason, inline: true },
                        { name: 'Дата', value: `<t:${Math.floor(new Date().getTime()/1000)}:F>`, inline: false }
                    )
                    .setColor('#FFA500')
                    .setTimestamp();

                await user.send({ embeds: [userWarnEmbed] });
            } catch (error) {
                // Не удалось отправить личное сообщение
                console.log(`Не удалось отправить предупреждение пользователю ${user.tag}`);
            }

            // Проверяем, нужно ли применить автоматические действия
            if (activeWarnings === 1) {
                // При первом предупреждении - предупреждение
                console.log(`Пользователь ${user.tag} получил 1 предупреждение`);
            } else if (activeWarnings === 2) {
                // При втором предупреждении - мут на 1 час
                try {
                    const member = await interaction.guild.members.fetch(user.id);
                    await member.timeout(60 * 1000, `Достигнуто 2 предупреждения: ${reason}`);
                    
                    const muteNotification = new EmbedBuilder()
                        .setTitle('🔇 Временный мут')
                        .setDescription(`<@${user.id}> был замучен на 1 час за достижение 2 предупреждений`)
                        .addFields(
                            { name: 'Причина', value: reason, inline: true },
                            { name: 'Модератор', value: `<@${moderator.id}>`, inline: true }
                        )
                        .setColor('#808080')
                        .setTimestamp();
                    
                    await interaction.followUp({ embeds: [muteNotification] });
                } catch (muteError) {
                    console.error('Ошибка при выдаче мута:', muteError);
                }
            } else if (activeWarnings >= 3) {
                // При 3 и более предупреждениях - бан
                try {
                    await interaction.guild.members.ban(user, { reason: `Достигнуто 3+ предупреждений: ${reason}` });
                    
                    const banNotification = new EmbedBuilder()
                        .setTitle('🔨 Блокировка')
                        .setDescription(`<@${user.id}> был заблокирован за достижение 3+ предупреждений`)
                        .addFields(
                            { name: 'Причина', value: reason, inline: true },
                            { name: 'Модератор', value: `<@${moderator.id}>`, inline: true }
                        )
                        .setColor('#800000')
                        .setTimestamp();
                    
                    await interaction.followUp({ embeds: [banNotification] });
                } catch (banError) {
                    console.error('Ошибка при блокировке пользователя:', banError);
                }
            }
        } catch (error) {
            console.error('Ошибка при выдаче предупреждения:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при попытке выдать предупреждение.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};