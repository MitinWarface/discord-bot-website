const fs = require('fs');
const path = require('path');
const { EmbedBuilder, AuditLogEvent } = require('discord.js');

// Путь к файлу с настройками логирования
const loggingConfigPath = path.join(__dirname, 'loggingConfig.json');

// Загрузка конфигурации логирования
function loadLoggingConfig() {
    if (fs.existsSync(loggingConfigPath)) {
        const data = fs.readFileSync(loggingConfigPath, 'utf8');
        return JSON.parse(data);
    }
    return {
        guilds: {}
    };
}

// Сохранение конфигурации логирования
function saveLoggingConfig(config) {
    fs.writeFileSync(loggingConfigPath, JSON.stringify(config, null, 2));
}

// Получение конфигурации логирования для гильдии
function getGuildLoggingConfig(guildId) {
    const config = loadLoggingConfig();
    if (!config.guilds[guildId]) {
        config.guilds[guildId] = {
            logChannel: null,
            events: {
                messageDelete: true,
                messageUpdate: true,
                memberJoin: true,
                memberLeave: true,
                memberBan: true,
                memberUnban: true,
                memberRoleAdd: true,
                memberRoleRemove: true,
                memberNicknameUpdate: true,
                voiceStateUpdate: true
            }
        };
        saveLoggingConfig(config);
    }
    return config.guilds[guildId];
}

// Сохранение конфигурации логирования для гильдии
function setGuildLoggingConfig(guildId, newConfig) {
    const config = loadLoggingConfig();
    config.guilds[guildId] = { ...config.guilds[guildId], ...newConfig };
    saveLoggingConfig(config);
}

// Отправка лога в канал
async function sendLog(guild, eventType, data) {
    const config = getGuildLoggingConfig(guild.id);
    
    if (!config.logChannel || !config.events[eventType]) {
        return; // Логирование для этого события отключено
    }
    
    const logChannel = guild.channels.cache.get(config.logChannel);
    if (!logChannel) {
        return; // Канал логов не найден
    }
    
    try {
        const logEmbed = createLogEmbed(eventType, data);
        await logChannel.send({ embeds: [logEmbed] });
    } catch (error) {
        console.error('Ошибка при отправке лога:', error);
    }
}

// Создание embed для лога
function createLogEmbed(eventType, data) {
    const embed = new EmbedBuilder()
        .setTimestamp()
        .setFooter({ text: 'Логирование событий', iconURL: data.guild?.iconURL() || null });
    
    switch (eventType) {
        case 'messageDelete':
            embed
                .setTitle('🗑️ Удаленное сообщение')
                .setColor('#ff0000')
                .addFields(
                    { name: 'Автор', value: data.author ? `<@${data.author.id}> (${data.author.tag})` : 'Неизвестно', inline: true },
                    { name: 'Канал', value: data.channel ? `<#${data.channel.id}>` : 'Неизвестно', inline: true },
                    { name: 'Содержимое', value: data.content ? `\`\`\`${data.content.substring(0, 1000)}\`\`\`` : 'Содержимое недоступно', inline: false }
                );
            if (data.attachmentURL) {
                embed.addFields({ name: 'Вложение', value: `[Скачать вложение](${data.attachmentURL})`, inline: false });
            }
            break;
            
        case 'messageUpdate':
            embed
                .setTitle('✏️ Измененное сообщение')
                .setColor('#FFA500')
                .addFields(
                    { name: 'Автор', value: data.author ? `<@${data.author.id}> (${data.author.tag})` : 'Неизвестно', inline: true },
                    { name: 'Канал', value: data.channel ? `<#${data.channel.id}>` : 'Неизвестно', inline: true },
                    { name: 'Старое содержимое', value: data.oldContent ? `\`\`\`${data.oldContent.substring(0, 1000)}\`\`\`` : 'Содержимое недоступно', inline: false },
                    { name: 'Новое содержимое', value: data.newContent ? `\`\`\`${data.newContent.substring(0, 1000)}\`\`\`` : 'Содержимое недоступно', inline: false }
                );
            break;
            
        case 'memberJoin':
            embed
                .setTitle('📥 Присоединение участника')
                .setColor('#00FF00')
                .addFields(
                    { name: 'Участник', value: `<@${data.member.id}> (${data.member.user.tag})`, inline: true },
                    { name: 'ID', value: data.member.id, inline: true },
                    { name: 'Дата регистрации', value: `<t:${Math.floor(data.member.user.createdTimestamp / 1000)}:R>`, inline: true }
                )
                .setThumbnail(data.member.user.displayAvatarURL({ dynamic: true }));
            break;
            
        case 'memberLeave':
            embed
                .setTitle('📤 Выход участника')
                .setColor('#FF0000')
                .addFields(
                    { name: 'Участник', value: `<@${data.member.id}> (${data.member.user.tag})`, inline: true },
                    { name: 'ID', value: data.member.id, inline: true },
                    { name: 'Присоединился', value: data.joinedAt ? `<t:${Math.floor(data.joinedAt / 1000)}:R>` : 'Неизвестно', inline: true }
                )
                .setThumbnail(data.member.user.displayAvatarURL({ dynamic: true }));
            break;
            
        case 'memberBan':
            embed
                .setTitle('🔨 Блокировка участника')
                .setColor('#800000')
                .addFields(
                    { name: 'Администратор', value: data.moderator ? `<@${data.moderator.id}>` : 'Неизвестно', inline: true },
                    { name: 'Участник', value: `<@${data.user.id}> (${data.user.tag})`, inline: true },
                    { name: 'ID', value: data.user.id, inline: true },
                    { name: 'Причина', value: data.reason || 'Причина не указана', inline: false }
                )
                .setThumbnail(data.user.displayAvatarURL({ dynamic: true }));
            break;
            
        case 'memberUnban':
            embed
                .setTitle('🔓 Разблокировка участника')
                .setColor('#0000FF')
                .addFields(
                    { name: 'Администратор', value: data.moderator ? `<@${data.moderator.id}>` : 'Неизвестно', inline: true },
                    { name: 'Участник', value: `<@${data.user.id}> (${data.user.tag})`, inline: true },
                    { name: 'ID', value: data.user.id, inline: true }
                )
                .setThumbnail(data.user.displayAvatarURL({ dynamic: true }));
            break;
            
        case 'memberRoleAdd':
            embed
                .setTitle('➕ Выдача роли')
                .setColor('#9932CC')
                .addFields(
                    { name: 'Администратор', value: data.moderator ? `<@${data.moderator.id}>` : 'Неизвестно', inline: true },
                    { name: 'Участник', value: `<@${data.member.id}> (${data.member.user.tag})`, inline: true },
                    { name: 'Роль', value: `<@&${data.role.id}>`, inline: true },
                    { name: 'Причина', value: data.reason || 'Причина не указана', inline: false }
                )
                .setThumbnail(data.member.user.displayAvatarURL({ dynamic: true }));
            break;
            
        case 'memberRoleRemove':
            embed
                .setTitle('➖ Снятие роли')
                .setColor('#FF69B4')
                .addFields(
                    { name: 'Администратор', value: data.moderator ? `<@${data.moderator.id}>` : 'Неизвестно', inline: true },
                    { name: 'Участник', value: `<@${data.member.id}> (${data.member.user.tag})`, inline: true },
                    { name: 'Роль', value: `<@&${data.role.id}>`, inline: true },
                    { name: 'Причина', value: data.reason || 'Причина не указана', inline: false }
                )
                .setThumbnail(data.member.user.displayAvatarURL({ dynamic: true }));
            break;
            
        case 'memberNicknameUpdate':
            embed
                .setTitle('📛 Изменение никнейма')
                .setColor('#FFD700')
                .addFields(
                    { name: 'Участник', value: `<@${data.member.id}> (${data.member.user.tag})`, inline: true },
                    { name: 'Старый никнейм', value: data.oldNickname || 'Не был установлен', inline: true },
                    { name: 'Новый никнейм', value: data.newNickname || 'Сброшен', inline: true }
                )
                .setThumbnail(data.member.user.displayAvatarURL({ dynamic: true }));
            break;
            
        case 'voiceStateUpdate':
            embed
                .setTitle(data.joined ? '🔊 Присоединение к голосовому каналу' : data.left ? '🔇 Покидание голосового канала' : '🎙️ Изменение в голосовом канале')
                .setColor(data.joined ? '#00FF00' : data.left ? '#FF0000' : '#808080')
                .addFields(
                    { name: 'Участник', value: `<@${data.member.id}> (${data.member.user.tag})`, inline: true },
                    { name: 'Канал', value: data.channel ? `<#${data.channel.id}> (${data.channel.name})` : 'Неизвестно', inline: true }
                )
                .setThumbnail(data.member.user.displayAvatarURL({ dynamic: true }));
            break;
            
        default:
            embed
                .setTitle('ℹ️ Событие')
                .setColor('#808080')
                .setDescription(`Неизвестный тип события: ${eventType}`);
    }
    
    return embed;
}

module.exports = {
    getGuildLoggingConfig,
    setGuildLoggingConfig,
    sendLog
};