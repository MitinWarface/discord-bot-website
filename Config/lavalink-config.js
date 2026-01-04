const dotenv = require('dotenv');
dotenv.config();

// Конфигурация Lavalink для удаленного сервера
const lavalinkConfig = {
    nodes: [
        {
            id: 'Main',
            host: process.env.LAVALINK_HOST || 'lava-v4.ajieblogs.eu.org',
            port: parseInt(process.env.LAVALINK_PORT) || 80,
            authorization: process.env.LAVALINK_PASSWORD || 'https://dsc.gg/ajidevserver',
            secure: process.env.LAVALINK_SECURE === 'true' || false, // Без SSL для порта 80
            // Опции для ускоренного подключения к удаленному серверу
            retryDelay: 100, // Минимальная задержка между попытками переподключения (в мс)
            maxRetries: 5     // Количество попыток подключения
        },
        // Добавляем резервный узел
        {
            id: 'Backup',
            host: process.env.LAVALINK_HOST_BACKUP || 'lava-v4.ajieblogs.eu.org',
            port: parseInt(process.env.LAVALINK_PORT_BACKUP) || 443,
            authorization: process.env.LAVALINK_PASSWORD_BACKUP || 'https://dsc.gg/ajidevserver',
            secure: process.env.LAVALINK_SECURE_BACKUP === 'true' || true, // SSL для порта 443
            // Опции для ускоренного подключения к удаленному серверу
            retryDelay: 100, // Минимальная задержка между попытками переподключения (в мс)
            maxRetries: 5     // Количество попыток подключения
        }
    ],
    options: {
        // Опции восстановления сессии
        resume: {
            key: process.env.LAVALINK_RESUME_KEY || 'aurora-music-v4', // Ключ для восстановления сессии
            timeout: 15000 // Уменьшен таймаут восстановления сессии (в мс)
        },
        // Опции переподключения
        reconnect: {
            delay: 1000, // Уменьшена задержка перед переподключением (в мс)
            limit: 5    // Количество попыток переподключения
        },
        // Пользовательский User-Agent для идентификации бота
        userAgent: 'AuroraBot/v1.0 (Discord Bot)',
        // Поведение при отключении
        moveOnDisconnect: false, // Не перемещать плееры при отключении от ноды
        // Опции восстановления (отключены для совместимости с Lavalink v4)
        resumable: false, // Отключаем восстановление сессии (если не поддерживается)
        resumableTimeout: 15, // Уменьшен таймаут восстановления сессии (в секундах)
        reconnectTries: 5, // Количество попыток переподключения
        restTimeout: 5000, // Уменьшен таймаут REST запросов (в мс)
        // Дополнительные опции
        useVersion3: false, // Явно указываем, что не используем версию 3
        // Опции для работы с удаленными серверами
        dynamicLoadBalancing: true, // Включаем для лучшего управления узлами
        voiceConnectionTimeout: 100, // Уменьшен таймаут подключения к голосовому каналу
        // Настройки для лучшего определения bestNode
        connectTimeout: 5000, // Уменьшен таймаут подключения
        requestTimeout: 5000, // Уменьшен таймаут запросов
        selectionStrategy: 'balanced', // Стратегия выбора узла
        shardCount: 1, // Количество шардов
        userId: process.env.CLIENT_ID || '', // ID бота
    }
};

module.exports = lavalinkConfig;