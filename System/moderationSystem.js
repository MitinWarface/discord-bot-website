const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Путь к файлу с настройками модерации
const moderationConfigPath = path.join(__dirname, 'moderationConfig.json');

// Загрузка конфигурации модерации
function loadModerationConfig() {
    if (fs.existsSync(moderationConfigPath)) {
        const data = fs.readFileSync(moderationConfigPath, 'utf8');
        return JSON.parse(data);
    }
    return {
        guilds: {}
    };
}

// Сохранение конфигурации модерации
function saveModerationConfig(config) {
    fs.writeFileSync(moderationConfigPath, JSON.stringify(config, null, 2));
}

// Получение конфигурации модерации для гильдии
function getGuildModerationConfig(guildId) {
    const config = loadModerationConfig();
    if (!config.guilds[guildId]) {
        config.guilds[guildId] = {
            automod: {
                enabled: true,
                filter: {
                    profanity: true,
                    links: false,
                    spam: true,
                    caps: false,
                    invites: true
                },
                actions: {
                    warn: 3,
                    mute: 5,
                    kick: 8,
                    ban: 10
                }
            },
            logChannel: null
        };
        saveModerationConfig(config);
    }
    return config.guilds[guildId];
}

// Сохранение конфигурации модерации для гильдии
function setGuildModerationConfig(guildId, newConfig) {
    const config = loadModerationConfig();
    config.guilds[guildId] = { ...config.guilds[guildId], ...newConfig };
    saveModerationConfig(config);
}

// Проверка сообщения на наличие запрещенного контента
function checkMessageContent(message, config) {
    const results = {
        profanity: false,
        links: false,
        spam: false,
        caps: false,
        invites: false,
        severity: 0
    };

    const content = message.content.toLowerCase();
    const words = content.split(/\s+/);

    // Проверка на мат/непристойности
    if (config.automod.filter.profanity) {
        const profanityWords = [
            'блять', 'сука', 'хуй', 'пизда', 'ебать', 'ёб', 'ёпт', 'нахуй', 'наебать', 'выебать',
            'ебануть', 'еблан', 'ебло', 'ебнуть', 'заебать', 'изъебнуть', 'отъебись', 'охуеть',
            'охуел', 'охуева', 'переебать', 'подъебнуть', 'приебать', 'проебать', 'разъебать',
            'съебаться', 'уебать', 'уебок', 'уёбище', 'уёбок', 'хуево', 'хуёво', 'хуевый',
            'хуёвый', 'хуек', 'хуйня', 'хуяк', 'шлюха', 'трахать', 'ебануть', 'ебнуть',
            'ёб', 'ёпт', 'нахуй', 'наебать', 'выебать', 'изъебнуть', 'отъебись', 'охуеть',
            'охуел', 'охуева', 'переебать', 'подъебнуть', 'приебать', 'проебать', 'разъебать',
            'съебаться', 'уебать', 'уебок', 'уёбище', 'уёбок', 'хуево', 'хуёво', 'хуевый',
            'хуёвый', 'хуек', 'хуйня', 'хуяк', 'fuck', 'shit', 'bitch', 'ass', 'dick', 'pussy',
            'cunt', 'cock', 'bastard', 'slut', 'whore', 'damn', 'hell', 'crap', 'damn', 'goddamn'
        ];

        for (const word of words) {
            if (profanityWords.some(prof => word.includes(prof))) {
                results.profanity = true;
                results.severity += 2;
                break;
            }
        }
    }

    // Проверка на ссылки
    if (config.automod.filter.links) {
        const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
        if (linkRegex.test(content)) {
            results.links = true;
            results.severity += 1;
        }
    }

    // Проверка на приглашения Discord
    if (config.automod.filter.invites) {
        const inviteRegex = /(discord\.gg\/\w+|discordapp\.com\/invite\/\w+|discord\.com\/invite\/\w+)/g;
        if (inviteRegex.test(content)) {
            results.invites = true;
            results.severity += 2;
        }
    }

    // Проверка на спам (слишком много сообщений подряд)
    if (config.automod.filter.spam) {
        // Это будет проверяться в основном обработчике сообщений
        results.spam = false; // Пока не проверяем здесь
    }

    // Проверка на капс (слишком много заглавных букв)
    if (config.automod.filter.caps) {
        const capsRatio = content.replace(/[^A-ZА-Я]/g, '').length / content.replace(/[^A-Za-zА-Яа-я]/g, '').length;
        if (capsRatio > 0.7 && content.length > 10) { // Если более 70% заглавных букв
            results.caps = true;
            results.severity += 1;
        }
    }

    return results;
}

// Система отслеживания спама
const spamTracker = new Map();

// Проверка на спам
function checkSpam(memberId, message) {
    const now = Date.now();
    const userSpamData = spamTracker.get(memberId) || { messages: [], lastReset: now };
    
    // Сброс каждые 5 секунд
    if (now - userSpamData.lastReset > 5000) {
        userSpamData.messages = [];
        userSpamData.lastReset = now;
    }
    
    userSpamData.messages.push({
        content: message.content,
        timestamp: now
    });
    
    // Удаляем сообщения старше 5 секунд
    userSpamData.messages = userSpamData.messages.filter(msg => now - msg.timestamp < 5000);
    
    spamTracker.set(memberId, userSpamData);
    
    // Если больше 5 сообщений за 5 секунд, считаем это спамом
    return userSpamData.messages.length > 5;
}

// Применение действия модерации
async function applyModerationAction(message, action, reason, severity) {
    try {
        const member = message.member;
        const moderator = message.client.user; // Бот как модератор
        
        switch (action) {
            case 'warn':
                // Используем существующую систему предупреждений
                const { addWarning, getUserProfile } = require('./userProfiles');
                const result = addWarning(member.id, reason);
                
                // Отправляем личное сообщение пользователю
                try {
                    const warnEmbed = new EmbedBuilder()
                        .setTitle('⚠️ Предупреждение')
                        .setDescription(`Вы получили предупреждение на сервере **${message.guild.name}**`)
                        .addFields(
                            { name: 'Причина', value: reason, inline: true },
                            { name: 'Всего предупреждений', value: `${result.warnings}`, inline: true }
                        )
                        .setColor('#FFA500')
                        .setTimestamp();
                    
                    await member.send({ embeds: [warnEmbed] });
                } catch (error) {
                    // Не удалось отправить личное сообщение
                    console.log(`Не удалось отправить личное сообщение пользователю ${member.id}`);
                }
                
                // Отправляем сообщение в чат
                const warnChatEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Пользователь предупрежден')
                    .setDescription(`<@${member.id}> получил(а) предупреждение`)
                    .addFields(
                        { name: 'Причина', value: reason, inline: true },
                        { name: 'Модератор', value: `<@${moderator.id}>`, inline: true }
                    )
                    .setColor('#FFA500')
                    .setTimestamp();
                
                await message.reply({ embeds: [warnChatEmbed] });
                break;
                
            case 'mute':
                // Временная реализация мута (в будущем нужно реализовать полноценную систему мута)
                const muteEmbed = new EmbedBuilder()
                    .setTitle('🔇 Временный мут')
                    .setDescription(`<@${member.id}> был(а) замучен(а) на 10 минут`)
                    .addFields(
                        { name: 'Причина', value: reason, inline: true },
                        { name: 'Модератор', value: `<@${moderator.id}>`, inline: true }
                    )
                    .setColor('#808080')
                    .setTimestamp();
                
                await message.reply({ embeds: [muteEmbed] });
                
                // Пытаемся выдать роль мута (если она существует)
                try {
                    const muteRole = message.guild.roles.cache.find(role => role.name.toLowerCase().includes('mute') || role.name.toLowerCase().includes('мут'));
                    if (muteRole) {
                        await member.roles.add(muteRole);
                        
                        // Убираем роль через 10 минут
                        setTimeout(async () => {
                            try {
                                await member.roles.remove(muteRole);
                                // Отправляем сообщение о размуте
                                try {
                                    const unmuteEmbed = new EmbedBuilder()
                                        .setTitle('🔊 Размут')
                                        .setDescription(`Вы были размучены на сервере **${message.guild.name}**`)
                                        .setColor('#00FF00')
                                        .setTimestamp();
                                    
                                    await member.send({ embeds: [unmuteEmbed] });
                                } catch (error) {
                                    console.log(`Не удалось отправить сообщение о размуте пользователю ${member.id}`);
                                }
                            } catch (error) {
                                console.error('Ошибка при снятии роли мута:', error);
                            }
                        }, 10 * 60 * 100); // 10 минут
                    }
                } catch (error) {
                    console.error('Ошибка при выдаче роли мута:', error);
                }
                break;
                
            case 'kick':
                try {
                    await member.kick(`Автомодерация: ${reason}`);
                    
                    const kickEmbed = new EmbedBuilder()
                        .setTitle('👢 Исключение')
                        .setDescription(`<@${member.id}> был(а) исключен(а) сервера`)
                        .addFields(
                            { name: 'Причина', value: reason, inline: true },
                            { name: 'Модератор', value: `<@${moderator.id}>`, inline: true }
                        )
                        .setColor('#FF0000')
                        .setTimestamp();
                    
                    await message.reply({ embeds: [kickEmbed] });
                } catch (error) {
                    console.error('Ошибка при исключении пользователя:', error);
                }
                break;
                
            case 'ban':
                try {
                    await member.ban({ reason: `Автомодерация: ${reason}` });
                    
                    const banEmbed = new EmbedBuilder()
                        .setTitle('🔨 Блокировка')
                        .setDescription(`<@${member.id}> был(а) заблокирован(а) на сервере`)
                        .addFields(
                            { name: 'Причина', value: reason, inline: true },
                            { name: 'Модератор', value: `<@${moderator.id}>`, inline: true }
                        )
                        .setColor('#80000')
                        .setTimestamp();
                    
                    await message.reply({ embeds: [banEmbed] });
                } catch (error) {
                    console.error('Ошибка при блокировке пользователя:', error);
                }
                break;
        }
        
        // Отправляем лог в канал модерации (если он настроен)
        const guildConfig = getGuildModerationConfig(message.guild.id);
        if (guildConfig.logChannel) {
            const logChannel = message.guild.channels.cache.get(guildConfig.logChannel);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🚨 Лог модерации')
                    .setDescription(`Было применено действие модерации к <@${member.id}>`)
                    .addFields(
                        { name: 'Действие', value: action, inline: true },
                        { name: 'Причина', value: reason, inline: true },
                        { name: 'Канал', value: `<#${message.channel.id}>`, inline: true },
                        { name: 'Сообщение', value: `\`\`\`${message.content.substring(0, 900)}\`\``, inline: false }
                    )
                    .setColor(getActionColor(action))
                    .setTimestamp();
                
                await logChannel.send({ embeds: [logEmbed] });
            }
        }
    } catch (error) {
        console.error('Ошибка при применении действия модерации:', error);
    }
}

// Вспомогательная функция для получения цвета в зависимости от действия
function getActionColor(action) {
    switch (action) {
        case 'warn': return '#FFA500';
        case 'mute': return '#8080';
        case 'kick': return '#FF000';
        case 'ban': return '#800000';
        default: return '#00000';
    }
}

module.exports = {
    getGuildModerationConfig,
    setGuildModerationConfig,
    checkMessageContent,
    checkSpam,
    applyModerationAction,
    getActionColor
};