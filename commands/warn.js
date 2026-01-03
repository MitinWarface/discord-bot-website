const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Путь к файлу с предупреждениями
const warningsPath = path.join(__dirname, '../System/warnings.json');

// Загрузка данных о предупреждениях
function loadWarnings() {
    if (fs.existsSync(warningsPath)) {
        const data = fs.readFileSync(warningsPath, 'utf8');
        return JSON.parse(data);
    }
    return {};
}

// Сохранение данных о предупреждениях
function saveWarnings(data) {
    fs.writeFileSync(warningsPath, JSON.stringify(data, null, 2));
}

// Добавление предупреждения пользователю
function addWarning(userId, moderatorId, reason, guildId) {
    const warnings = loadWarnings();
    
    if (!warnings[guildId]) {
        warnings[guildId] = {};
    }
    
    if (!warnings[guildId][userId]) {
        warnings[guildId][userId] = [];
    }
    
    const newWarning = {
        id: warnings[guildId][userId].length + 1,
        moderatorId: moderatorId,
        reason: reason,
        timestamp: new Date().toISOString(),
        active: true
    };
    
    warnings[guildId][userId].push(newWarning);
    saveWarnings(warnings);
    
    return newWarning;
}

// Удаление предупреждения у пользователя
function removeWarning(userId, warningId, moderatorId, guildId) {
    const warnings = loadWarnings();
    
    if (!warnings[guildId] || !warnings[guildId][userId]) {
        return { success: false, message: 'У пользователя нет предупреждений!' };
    }
    
    const warningIndex = warnings[guildId][userId].findIndex(w => w.id === warningId);
    
    if (warningIndex === -1) {
        return { success: false, message: 'Предупреждение не найдено!' };
    }
    
    warnings[guildId][userId][warningIndex].active = false;
    warnings[guildId][userId][warningIndex].removedBy = moderatorId;
    warnings[guildId][userId][warningIndex].removedAt = new Date().toISOString();
    
    saveWarnings(warnings);
    
    return { success: true, message: `Предупреждение ${warningId} удалено.` };
}

// Получение всех активных предупреждений пользователя
function getUserWarnings(userId, guildId) {
    const warnings = loadWarnings();
    if (!warnings[guildId] || !warnings[guildId][userId]) {
        return [];
    }
    
    return warnings[guildId][userId].filter(warning => warning.active);
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
        const reason = interaction.options.getString('reason') || 'Нарушение правил сервера';
        const moderator = interaction.user;
        const guildId = interaction.guild.id;

        // Проверяем права модератора
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Нет прав')
                .setDescription('У вас нет прав для выдачи предупреждений!')
                .setColor('#ff0000')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

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
            // Добавляем предупреждение пользователю
            const newWarning = addWarning(user.id, moderator.id, reason, guildId);
            
            // Получаем обновленное количество предупреждений
            const activeWarnings = getUserWarnings(user.id, guildId);
            const totalActiveWarnings = activeWarnings.length;
            
            // Определяем действие на основе количества предупреждений
            let actionTaken = '';
            let actionColor = '#FFA500';
            
            if (totalActiveWarnings >= 3) {
                actionTaken = '\n\n⚠️ Пользователь достиг 3 предупреждений. Рекомендуется рассмотреть мут или бан.';
                actionColor = '#FF0000';
            } else if (totalActiveWarnings >= 2) {
                actionTaken = '\n\n⚠️ Пользователь достиг 2 предупреждений. Рассмотрите мут.';
                actionColor = '#FF6347';
            }

            // Создаем embed для уведомления
            const warnEmbed = new EmbedBuilder()
                .setTitle('⚠️ Предупреждение')
                .setDescription(`<@${moderator.id}> выдал предупреждение пользователю <@${user.id}>`)
                .addFields(
                    { name: 'Причина', value: reason, inline: true },
                    { name: 'Модератор', value: `<@${moderator.id}>`, inline: true },
                    { name: 'Всего активных предупреждений', value: totalActiveWarnings.toString(), inline: true },
                    { name: 'ID предупреждения', value: newWarning.id.toString(), inline: true }
                )
                .setColor(actionColor)
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

module.exports.list = {
    data: new SlashCommandBuilder()
        .setName('warn-list')
        .setDescription('Показать список предупреждений пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, чьи предупреждения вы хотите посмотреть')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const guildId = interaction.guild.id;

        // Проверяем права модератора
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Нет прав')
                .setDescription('У вас нет прав для просмотра предупреждений!')
                .setColor('#ff0000')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            const userWarnings = getUserWarnings(user.id, guildId);
            
            if (userWarnings.length === 0) {
                const noWarningsEmbed = new EmbedBuilder()
                    .setTitle('📋 Предупреждения')
                    .setDescription(`У пользователя <@${user.id}> нет активных предупреждений.`)
                    .setColor('#8b00ff')
                    .setTimestamp();

                return await interaction.reply({ embeds: [noWarningsEmbed], ephemeral: true });
            }

            const warningsEmbed = new EmbedBuilder()
                .setTitle(`📋 Предупреждения ${user.username}`)
                .setDescription(`У пользователя <@${user.id}> **${userWarnings.length}** активных предупреждений:`)
                .setColor('#8b00ff')
                .setTimestamp();

            // Добавляем информацию о каждом предупреждении (ограничиваем до 10 для embed)
            const warningsToShow = userWarnings.slice(0, 10);
            
            for (const warning of warningsToShow) {
                const moderator = await interaction.guild.members.fetch(warning.moderatorId).catch(() => null);
                const modTag = moderator ? moderator.user.tag : 'Неизвестно';
                
                warningsEmbed.addFields({
                    name: `ID: ${warning.id}`,
                    value: `**Причина:** ${warning.reason}\n**Модератор:** ${modTag}\n**Дата:** <t:${Math.floor(new Date(warning.timestamp).getTime()/1000)}:F>`,
                    inline: false
                });
            }

            if (userWarnings.length > 10) {
                warningsEmbed.setFooter({ text: `Показаны первые 10 из ${userWarnings.length} предупреждений`, iconURL: interaction.client.user.displayAvatarURL() });
            } else {
                warningsEmbed.setFooter({ text: `Всего предупреждений: ${userWarnings.length}`, iconURL: interaction.client.user.displayAvatarURL() });
            }

            await interaction.reply({ embeds: [warningsEmbed], ephemeral: true });
        } catch (error) {
            console.error('Ошибка при получении списка предупреждений:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при попытке получить список предупреждений.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

module.exports.remove = {
    data: new SlashCommandBuilder()
        .setName('warn-remove')
        .setDescription('Удалить предупреждение у пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, у которого хотите удалить предупреждение')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('ID предупреждения для удаления')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const warningId = interaction.options.getInteger('id');
        const moderator = interaction.user;
        const guildId = interaction.guild.id;

        // Проверяем права модератора
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Нет прав')
                .setDescription('У вас нет прав для удаления предупреждений!')
                .setColor('#ff0000')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            const result = removeWarning(user.id, warningId, moderator.id, guildId);
            
            if (result.success) {
                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Предупреждение удалено')
                    .setDescription(`Предупреждение **${warningId}** у пользователя <@${user.id}> удалено модератором <@${moderator.id}>`)
                    .setColor('#00ff00')
                    .setTimestamp();

                await interaction.reply({ embeds: [successEmbed] });
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Ошибка')
                    .setDescription(result.message)
                    .setColor('#ff0000')
                    .setTimestamp();

                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (error) {
            console.error('Ошибка при удалении предупреждения:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при попытке удалить предупреждение.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};