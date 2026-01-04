const fs = require('fs');
const path = require('path');

// Путь к файлу с настройками серверов
const settingsPath = path.join(__dirname, 'guildSettings.json');

/**
 * Загрузка настроек серверов
 * @returns {Object} Объект с настройками серверов
 */
function loadGuildSettings() {
    if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, 'utf8');
        return JSON.parse(data);
    }
    return {};
}

/**
 * Сохранение настроек серверов
 * @param {Object} settings - Настройки серверов для сохранения
 */
function saveGuildSettings(settings) {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

/**
 * Получение настроек конкретного сервера
 * @param {string} guildId - ID сервера
 * @returns {Object} Настройки сервера
 */
function getGuildSettings(guildId) {
    const settings = loadGuildSettings();
    const defaultSettings = {
        prefix: '!',
        automod: {
            enabled: false,
            filter: {
                profanity: false,
                links: false,
                spam: false,
                caps: false,
                invites: false
            },
            actions: {
                warn: 3,
                mute: 5,
                kick: 8,
                ban: 10
            }
        },
        leveling: {
            enabled: true,
            xpPerMessageMin: 5,
            xpPerMessageMax: 15,
            xpCooldownMs: 60000
        },
        economy: {
            enabled: true,
            dailyAmount: 100,
            workEnabled: true
        },
        work: {
            enabled: true,
            minReward: 50,
            maxReward: 150,
            cooldownHours: 12
        },
        logging: {
            enabled: false,
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
        },
        tickets: {
            enabled: true,
            categoryId: null,
            supportRoleId: null
        },
        events: {
            enabled: true,
            announcementChannel: null
        },
        music: {
            enabled: true,
            maxQueueSize: 50,
            maxTrackDuration: 600, // 10 минут
            audioQuality: 2,
            maxRetryAttempts: 3,
            streamTimeout: 30000
        },
        reactions: {
            enabled: true,
            reactionRoles: {}
        },
        autoroles: {
            enabled: false,
            roleId: null
        }
    };

    return { ...defaultSettings, ...settings[guildId] };
}

/**
 * Установка настроек конкретного сервера
 * @param {string} guildId - ID сервера
 * @param {Object} newSettings - Новые настройки сервера
 */
function setGuildSettings(guildId, newSettings) {
    const settings = loadGuildSettings();
    settings[guildId] = { ...getGuildSettings(guildId), ...newSettings };
    saveGuildSettings(settings);
}

module.exports = {
    getGuildSettings,
    setGuildSettings
};