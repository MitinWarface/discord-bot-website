// Определение квестов
const questList = [
    {
        id: 'first_message',
        name: 'Первое сообщение',
        description: 'Отправьте свое первое сообщение на сервере',
        reward: { points: 10 },
        type: 'message',
        target: 1
    },
    {
        id: 'ten_messages',
        name: 'Активный участник',
        description: 'Отправьте 10 сообщений на сервере',
        reward: { points: 50 },
        type: 'message',
        target: 10
    },
    {
        id: 'first_command',
        name: 'Исследователь',
        description: 'Используйте любую команду бота',
        reward: { points: 20 },
        type: 'command',
        target: 1
    },
    {
        id: 'five_commands',
        name: 'Частый пользователь',
        description: 'Используйте 5 команд бота',
        reward: { points: 100 },
        type: 'command',
        target: 5
    },
    {
        id: 'shop_visitor',
        name: 'Покупатель',
        description: 'Совершите первую покупку в магазине',
        reward: { points: 75 },
        type: 'purchase',
        target: 1
    },
    {
        id: 'daily_streak',
        name: 'Ежедневный герой',
        description: 'Получите ежедневную награду 3 дня подряд',
        reward: { points: 150 },
        type: 'daily',
        target: 3
    },
    {
        id: 'level_up',
        name: 'Рост вверх',
        description: 'Достигните 5-го уровня',
        reward: { points: 200 },
        type: 'level',
        target: 5
    },
    {
        id: 'event_participation',
        name: 'Активный участник',
        description: 'Примите участие в 3 событиях',
        reward: { points: 100 },
        type: 'event',
        target: 3
    },
    {
        id: 'daily_message',
        name: 'Ежедневный участник',
        description: 'Отправьте 5 сообщений за день',
        reward: { points: 25 },
        type: 'daily',
        target: 5
    },
    {
        id: 'daily_command',
        name: 'Ежедневный пользователь',
        description: 'Используйте 3 команды за день',
        reward: { points: 30 },
        type: 'daily',
        target: 3
    },
    {
        id: 'daily_level',
        name: 'Ежедневный прогресс',
        description: 'Получите 50 очков за день',
        reward: { points: 75 },
        type: 'daily',
        target: 50
    }
];

module.exports = questList;