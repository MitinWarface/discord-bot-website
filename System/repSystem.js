const fs = require('fs');
const path = require('path');

// Путь к файлу с данными репутации
const repDataPath = path.join(__dirname, 'repData.json');

// Загрузка данных репутации
function loadRepData() {
    if (fs.existsSync(repDataPath)) {
        const data = fs.readFileSync(repDataPath, 'utf8');
        return JSON.parse(data);
    }
    return {};
}

// Сохранение данных репутации
function saveRepData(data) {
    fs.writeFileSync(repDataPath, JSON.stringify(data, null, 2));
}

// Выдача репутации пользователю
function giveReputation(targetUserId, giverUserId) {
    // Проверяем, можно ли выдать репутацию
    if (!canGiveReputation(giverUserId)) {
        return { success: false, message: 'Вы уже выдавали репутацию за последние 24 часа!' };
    }

    const repData = loadRepData();
    
    // Инициализируем запись, если её нет
    if (!repData[targetUserId]) {
        repData[targetUserId] = {
            reputation: 0,
            receivedFrom: {}
        };
    }
    
    // Обновляем время последней выдачи репутации от этого пользователя
    if (!repData[giverUserId]) {
        repData[giverUserId] = {
            reputation: 0,
            receivedFrom: {}
        };
    }
    
    repData[giverUserId].lastGiven = new Date().toISOString();
    
    // Увеличиваем репутацию целевого пользователя
    repData[targetUserId].reputation += 1;
    
    // Отмечаем, что репутацию выдал именно этот пользователь
    repData[targetUserId].receivedFrom[giverUserId] = new Date().toISOString();
    
    saveRepData(repData);
    
    return {
        success: true,
        message: `Вы успешно увеличили репутацию пользователю!`,
        reputation: repData[targetUserId].reputation
    };
}

// Проверка, можно ли выдать репутацию
function canGiveReputation(userId) {
    const repData = loadRepData();
    if (!repData[userId] || !repData[userId].lastGiven) {
        return true; // Первый раз
    }
    
    const lastGiven = new Date(repData[userId].lastGiven);
    const now = new Date();
    
    // Проверяем, прошло ли более 24 часов
    return now.getTime() - lastGiven.getTime() > 24 * 60 * 60 * 1000; // 24 часа в миллисекундах
}

// Получение количества репутации пользователя
function getReputation(userId) {
    const repData = loadRepData();
    return repData[userId]?.reputation || 0;
}

// Получение списка тех, кто дал репутацию пользователю
function getReputationFrom(userId) {
    const repData = loadRepData();
    return repData[userId]?.receivedFrom || {};
}

module.exports = {
    giveReputation,
    canGiveReputation,
    getReputation,
    getReputationFrom
};