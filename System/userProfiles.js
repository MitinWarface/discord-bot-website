const fs = require('fs');
const path = require('path');

// Путь к файлу с данными пользователей
const userDataPath = path.join(__dirname, 'userData.json');

// Загрузка данных пользователей
function loadUserData() {
    if (fs.existsSync(userDataPath)) {
        const data = fs.readFileSync(userDataPath, 'utf8');
        return JSON.parse(data);
    }
    return {};
}

// Сохранение данных пользователей
function saveUserData(data) {
    fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));
}

// Получение профиля пользователя
function getUserProfile(userId) {
    const userData = loadUserData();
    if (!userData[userId]) {
        userData[userId] = {
            id: userId,
            username: 'Unknown User',
            points: 0,
            level: 1,
            joinDate: new Date().toISOString(),
            lastInteraction: new Date().toISOString()
        };
        saveUserData(userData);
    }
    return userData[userId];
}

// Обновление профиля пользователя
function updateUserProfile(userId, updates) {
    const userData = loadUserData();
    if (!userData[userId]) {
        userData[userId] = {
            id: userId,
            username: 'Unknown User',
            points: 0,
            level: 1,
            joinDate: new Date().toISOString(),
            lastInteraction: new Date().toISOString(),
            lastDaily: null,
            inventory: [],
            quests: [],
            completedQuests: [],
            guildId: null,
            warnings: 0,
            reputation: 0,
            lastRepGiven: null,
            settings: {
                language: 'ru',
                notifications: {
                    quests: true,
                    level: true,
                    rep: true,
                    events: true  // Добавляем уведомления о событиях
                },
                privacy: {
                    profileVisible: true,
                    statsVisible: true
                }
            }
        };
    }
    
    // Обновляем только указанные поля
    for (const [key, value] of Object.entries(updates)) {
        userData[userId][key] = value;
    }
    
    userData[userId].lastInteraction = new Date().toISOString();
    
    saveUserData(userData);
    return userData[userId];
}

// Получение топ пользователей по очкам
function getTopUsers(limit = 10) {
    const userData = loadUserData();
    const users = Object.values(userData);
    
    // Сортировка по очкам в порядке убывания
    users.sort((a, b) => b.points - a.points);
    
    return users.slice(0, limit);
}

// Проверка, можно ли получить ежедневную награду
function canClaimDaily(userId) {
    const userProfile = getUserProfile(userId);
    if (!userProfile.lastDaily) {
        return true; // Первый раз
    }
    
    const lastDaily = new Date(userProfile.lastDaily);
    const now = new Date();
    
    // Проверяем, прошло ли более 24 часов
    return now.getTime() - lastDaily.getTime() > 24 * 60 * 60 * 1000; // 24 часа в миллисекундах
}

// Получение ежедневной награды
function claimDaily(userId) {
    const userProfile = getUserProfile(userId);
    
    if (!canClaimDaily(userId)) {
        return { success: false, message: 'Вы уже получили ежедневную награду сегодня!' };
    }
    
    // Определяем награду (например, от 5 до 15 очков)
    const reward = Math.floor(Math.random() * 11) + 5; // от 5 до 15
    
    // Обновляем профиль пользователя
    const newPoints = userProfile.points + reward;
    const newLevel = Math.floor(newPoints / 10) + 1;
    
    updateUserProfile(userId, {
        points: newPoints,
        level: newLevel,
        lastDaily: new Date().toISOString()
    });
    
    return {
        success: true,
        reward: reward,
        newPoints: newPoints,
        newLevel: newLevel
    };
}

// Получение активных квестов пользователя
function getUserQuests(userId) {
    const userProfile = getUserProfile(userId);
    return userProfile.quests || [];
}

// Получение завершенных квестов пользователя
function getCompletedUserQuests(userId) {
    const userProfile = getUserProfile(userId);
    return userProfile.completedQuests || [];
}

// Добавление квеста пользователю
function addUserQuest(userId, questId) {
    const userProfile = getUserProfile(userId);
    const userQuests = userProfile.quests || [];
    
    // Проверяем, не выполняет ли пользователь уже этот квест
    if (!userQuests.some(q => q.id === questId)) {
        // Находим квест в общем списке
        const quest = require('./questList').find(q => q.id === questId);
        
        if (quest) {
            // Добавляем квест с начальным прогрессом
            const newQuest = {
                ...quest,
                progress: 0,
                startedAt: new Date().toISOString()
            };
            
            userQuests.push(newQuest);
            updateUserProfile(userId, { quests: userQuests });
            return newQuest;
        }
    }
    
    return null;
}

// Обновление прогресса квеста
function updateQuestProgress(userId, questId, increment = 1) {
    const userProfile = getUserProfile(userId);
    const userQuests = userProfile.quests || [];
    
    const questIndex = userQuests.findIndex(q => q.id === questId);
    
    if (questIndex !== -1) {
        const quest = userQuests[questIndex];
        const newProgress = Math.min(quest.progress + increment, quest.target);
        
        userQuests[questIndex] = {
            ...quest,
            progress: newProgress
        };
        
        // Проверяем, завершен ли квест
        if (newProgress >= quest.target) {
            // Перемещаем квест в завершенные
            const completedQuests = userProfile.completedQuests || [];
            completedQuests.push({...quest, progress: newProgress}); // Сохраняем квест с текущим прогрессом
            
            // Удаляем из активных
            userQuests.splice(questIndex, 1);
            
            // Начисляем награду
            const reward = quest.reward.points || 0;
            const newPoints = userProfile.points + reward;
            const newLevel = Math.floor(newPoints / 10) + 1;
            
            // Обновляем профиль пользователя
            updateUserProfile(userId, {
                points: newPoints,
                level: newLevel,
                quests: userQuests,
                completedQuests: completedQuests
            });
            
            return {
                completed: true,
                reward: reward,
                newPoints: newPoints,
                newLevel: newLevel,
                quest: completedQuests[completedQuests.length - 1] // Возвращаем завершенный квест
            };
        } else {
            // Обновляем только прогресс
            updateUserProfile(userId, { quests: userQuests });
        }
        
        return {
            completed: false,
            progress: newProgress,
            target: quest.target
        };
    }
    
    return { completed: false, error: 'Quest not found' };
}

// Назначение случайного квеста пользователю
function assignRandomQuest(userId) {
    const questList = require('./questList');
    const userQuests = getUserQuests(userId);
    const completedQuests = getCompletedUserQuests(userId);
    
    // Фильтруем квесты, которые пользователь еще не выполнял и не выполняет
    const availableQuests = questList.filter(quest =>
        !userQuests.some(q => q.id === quest.id) &&
        !completedQuests.some(q => q.id === quest.id)
    );
    
    if (availableQuests.length > 0) {
        // Выбираем случайный квест
        const randomQuest = availableQuests[Math.floor(Math.random() * availableQuests.length)];
        return addUserQuest(userId, randomQuest.id);
    }
    
    return null;
}


// Добавление квеста пользователю
function addUserQuest(userId, questId) {
    const userProfile = getUserProfile(userId);
    const userQuests = userProfile.quests || [];
    
    // Проверяем, не выполняет ли пользователь уже этот квест
    if (!userQuests.some(q => q.id === questId)) {
        // Находим квест в общем списке
        const quest = require('./questList').find(q => q.id === questId);
        
        if (quest) {
            // Добавляем квест с начальным прогрессом
            const newQuest = {
                ...quest,
                progress: 0,
                startedAt: new Date().toISOString()
            };
            
            userQuests.push(newQuest);
            updateUserProfile(userId, { quests: userQuests });
            return newQuest;
        }
    }
    
    return null;
}

// Добавление предупреждения пользователю
function addWarning(userId, reason = 'Нарушение правил') {
    const userProfile = getUserProfile(userId);
    const newWarnings = userProfile.warnings + 1;
    
    updateUserProfile(userId, {
        warnings: newWarnings
    });
    
    // Проверяем, нужно ли заблокировать пользователя
    if (newWarnings >= 3) {
        return {
            action: 'ban',
            warnings: newWarnings,
            reason: reason
        };
    } else if (newWarnings === 2) {
        return {
            action: 'mute',
            warnings: newWarnings,
            reason: reason
        };
    }
    
    return {
        action: 'warn',
        warnings: newWarnings,
        reason: reason
    };
}

// Снятие предупреждения
function removeWarning(userId) {
    const userProfile = getUserProfile(userId);
    const newWarnings = Math.max(0, userProfile.warnings - 1);
    
    updateUserProfile(userId, {
        warnings: newWarnings
    });
    
    return {
        success: true,
        warnings: newWarnings
    };
}


// Обновление прогресса квестов по типу
function updateQuestProgressByType(userId, questType, increment = 1) {
    const userProfile = getUserProfile(userId);
    const userQuests = userProfile.quests || [];
    
    // Находим квесты этого типа, которые пользователь еще не выполнил
    const matchingQuests = userQuests.filter(q => q.type === questType);
    
    let completedAny = false;
    let completedQuest = null;
    let reward = 0;
    let newPoints = userProfile.points;
    let newLevel = userProfile.level;
    
    for (const quest of matchingQuests) {
        const questIndex = userQuests.findIndex(q => q.id === quest.id);
        if (questIndex !== -1) {
            const oldProgress = quest.progress || 0;
            const newProgress = Math.min(oldProgress + increment, quest.target);
            
            userQuests[questIndex] = {
                ...quest,
                progress: newProgress
            };
            
            // Проверяем, завершен ли квест
            if (newProgress >= quest.target && !completedAny) {
                // Перемещаем квест в завершенные
                const completedQuests = userProfile.completedQuests || [];
                completedQuests.push({...userQuests[questIndex]});
                
                // Удаляем из активных
                userQuests.splice(questIndex, 1);
                
                // Начисляем награду
                reward = quest.reward.points || 0;
                newPoints = userProfile.points + reward;
                newLevel = Math.floor(newPoints / 10) + 1;
                
                // Обновляем профиль пользователя
                updateUserProfile(userId, {
                    points: newPoints,
                    level: newLevel,
                    quests: userQuests,
                    completedQuests: completedQuests
                });
                
                completedAny = true;
                completedQuest = userQuests[questIndex];
            }
        }
    }
    
    // Если ни один квест не был завершен, просто обновляем прогресс
    if (!completedAny) {
        updateUserProfile(userId, { quests: userQuests });
    }
    
    return {
        completed: completedAny,
        reward: reward,
        newPoints: newPoints,
        newLevel: newLevel,
        quest: completedQuest
    };
}

module.exports = {
    getUserProfile,
    updateUserProfile,
    getTopUsers,
    canClaimDaily,
    claimDaily,
    getUserQuests,
    getCompletedUserQuests,
    addUserQuest,
    updateQuestProgress,
    assignRandomQuest,
    addWarning,
    removeWarning,
    updateQuestProgressByType
};