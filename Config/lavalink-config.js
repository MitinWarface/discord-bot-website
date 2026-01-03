const dotenv = require('dotenv');
dotenv.config();

// Конфигурация Lavalink для удаленного сервера
const lavalinkConfig = {
    nodes: [
        {
            id: 'Main',
            host: process.env.LAVALINK_HOST || 'lavalink-server--mitinwarface.replit.app',
            port: parseInt(process.env.LAVALINK_PORT) || 443,
            authorization: process.env.LAVALINK_PASSWORD || 'mentos91',
            secure: process.env.LAVALINK_SECURE === 'true', // Теперь по умолчанию зависит от окружения
            // Опции для лучшей стабильности подключения к удаленному серверу
            retryDelay: 5000, // Задержка между попытками переподключения (в мс)
            maxRetries: 5     // Максимальное количество попыток подключения
        }
    ],
    options: {
        // Настройки для стабильного SSL-подключения
        userAgent: 'AuroraBot/v1.0 (Discord Bot)',
        voiceConnectionTimeout: 3000,
        restTimeout: 1000,
        // Настройки SSL-соединения
        connectTimeout: 10000,
        requestTimeout: 1000,
        selectionStrategy: 'balanced',
        resumable: false, // Отключаем восстановление сессии
        dynamicLoadBalancing: true, // Включаем динамическую балансировку
    }
};

module.exports = lavalinkConfig;