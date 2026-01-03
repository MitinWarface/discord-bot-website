const fs = require('fs');
const path = require('path');

// Путь к файлу с данными событий
const eventDataPath = path.join(__dirname, 'eventData.json');

// Загрузка данных событий
function loadEventData() {
    if (fs.existsSync(eventDataPath)) {
        const data = fs.readFileSync(eventDataPath, 'utf8');
        return JSON.parse(data);
    }
    return {};
}

// Сохранение данных событий
function saveEventData(data) {
    fs.writeFileSync(eventDataPath, JSON.stringify(data, null, 2));
}

// Создание нового события
function createEvent(eventId, eventName, description, dateTime, creatorId, maxParticipants = null, rewardPoints = 0) {
    const eventData = loadEventData();
    
    // Проверяем, не существует ли уже событие с таким ID
    if (eventData[eventId]) {
        return { success: false, message: 'Событие с таким ID уже существует!' };
    }
    
    // Создаем новое событие
    const newEvent = {
        id: eventId,
        name: eventName,
        description: description,
        dateTime: new Date(dateTime).toISOString(),
        creator: creatorId,
        maxParticipants: maxParticipants,
        participants: [],
        created: new Date().toISOString(),
        status: 'active', // active, completed, cancelled
        rewardPoints: 0 // Количество очков в награду за участие
    };
    
    eventData[eventId] = newEvent;
    saveEventData(eventData);
    
    return { success: true, event: newEvent };
}

// Регистрация пользователя на событие
function registerForEvent(eventId, userId) {
    const eventData = loadEventData();
    
    if (!eventData[eventId]) {
        return { success: false, message: 'Событие не найдено!' };
    }
    
    const event = eventData[eventId];
    
    // Проверяем, не завершено ли уже событие
    if (event.status !== 'active') {
        return { success: false, message: 'Событие уже завершено или отменено!' };
    }
    
    // Проверяем, не зарегистрирован ли уже пользователь
    if (event.participants.includes(userId)) {
        return { success: false, message: 'Вы уже зарегистрированы на это событие!' };
    }
    
    // Проверяем, не достигнуто ли максимальное количество участников
    if (event.maxParticipants && event.participants.length >= event.maxParticipants) {
        return { success: false, message: 'Достигнуто максимальное количество участников!' };
    }
    
    // Регистрируем пользователя
    event.participants.push(userId);
    saveEventData(eventData);
    
    return { success: true, message: `Вы успешно зарегистрированы на событие "${event.name}"!` };
}

// Отмена регистрации пользователя с события
function unregisterFromEvent(eventId, userId) {
    const eventData = loadEventData();
    
    if (!eventData[eventId]) {
        return { success: false, message: 'Событие не найдено!' };
    }
    
    const event = eventData[eventId];
    
    // Проверяем, зарегистрирован ли пользователь
    const participantIndex = event.participants.indexOf(userId);
    if (participantIndex === -1) {
        return { success: false, message: 'Вы не зарегистрированы на это событие!' };
    }
    
    // Отменяем регистрацию
    event.participants.splice(participantIndex, 1);
    saveEventData(eventData);
    
    return { success: true, message: `Вы успешно отменили регистрацию с события "${event.name}"!` };
}

// Получение информации о событии
function getEventInfo(eventId) {
    const eventData = loadEventData();
    return eventData[eventId] || null;
}

// Получение списка всех активных событий
function getActiveEvents() {
    const eventData = loadEventData();
    const now = new Date();
    
    return Object.values(eventData).filter(event => {
        return event.status === 'active' && new Date(event.dateTime) > now;
    });
}

// Получение списка событий пользователя
function getUserEvents(userId) {
    const eventData = loadEventData();
    const userEvents = [];
    
    for (const eventId in eventData) {
        const event = eventData[eventId];
        if (event.participants.includes(userId)) {
            userEvents.push(event);
        }
    }
    
    return userEvents;
}

// Отмена события
function cancelEvent(eventId, userId) {
    const eventData = loadEventData();
    
    if (!eventData[eventId]) {
        return { success: false, message: 'Событие не найдено!' };
    }
    
    // Проверяем, является ли пользователь создателем события
    if (eventData[eventId].creator !== userId) {
        return { success: false, message: 'Только создатель события может его отменить!' };
    }
    
    // Отменяем событие
    eventData[eventId].status = 'cancelled';
    saveEventData(eventData);
    
    return { success: true, message: `Событие "${eventData[eventId].name}" было отменено!` };
}

// Завершение события
function completeEvent(eventId, userId) {
    const eventData = loadEventData();
    
    if (!eventData[eventId]) {
        return { success: false, message: 'Событие не найдено!' };
    }
    
    // Проверяем, является ли пользователь создателем события
    if (eventData[eventId].creator !== userId) {
        return { success: false, message: 'Только создатель события может его завершить!' };
    }
    
    // Завершаем событие
    eventData[eventId].status = 'completed';
    saveEventData(eventData);
    
    return { success: true, message: `Событие "${eventData[eventId].name}" было завершено!` };
}

// Удаление прошедших событий
function cleanupPastEvents() {
    const eventData = loadEventData();
    const now = new Date();
    let removedCount = 0;
    
    for (const eventId in eventData) {
        const event = eventData[eventId];
        const eventDateTime = new Date(event.dateTime);
        
        // Если событие прошло более 24 часов назад и не завершено, удаляем его
        if (eventDateTime < now && event.status !== 'completed' && event.status !== 'cancelled') {
            const hoursDiff = (now - eventDateTime) / (1000 * 60 * 60);
            if (hoursDiff > 24) {
                delete eventData[eventId];
                removedCount++;
            }
        }
    }
    
    if (removedCount > 0) {
        saveEventData(eventData);
    }
    
    return { success: true, removedCount: removedCount };
}

// Проверка ближайших событий для уведомлений
function getUpcomingEvents(minutes = 30) {
    const eventData = loadEventData();
    const now = new Date();
    const futureTime = new Date(now.getTime() + minutes * 60000); // minutes * 60 секунд * 1000 мс
    
    return Object.values(eventData).filter(event => {
        const eventDateTime = new Date(event.dateTime);
        return event.status === 'active' && 
               eventDateTime > now && 
               eventDateTime <= futureTime;
    });
}

module.exports = {
    createEvent,
    registerForEvent,
    unregisterFromEvent,
    getEventInfo,
    getActiveEvents,
    getUserEvents,
    cancelEvent,
    completeEvent,
    cleanupPastEvents,
    getUpcomingEvents
};