const fs = require('fs');
const path = require('path');

// Путь к файлу с данными гильдий
const guildDataPath = path.join(__dirname, 'guildData.json');

// Загрузка данных гильдий
function loadGuildData() {
    if (fs.existsSync(guildDataPath)) {
        const data = fs.readFileSync(guildDataPath, 'utf8');
        return JSON.parse(data);
    }
    return {};
}

// Сохранение данных гильдий
function saveGuildData(data) {
    fs.writeFileSync(guildDataPath, JSON.stringify(data, null, 2));
}

// Создание новой гильдии
function createGuild(leaderId, guildName) {
    const guildData = loadGuildData();
    
    // Проверяем, не состоит ли уже пользователь в гильдии
    for (const id in guildData) {
        if (guildData[id].members.includes(leaderId)) {
            return { success: false, message: 'Вы уже состоите в гильдии!' };
        }
    }
    
    // Проверяем, не существует ли уже гильдия с таким названием
    for (const id in guildData) {
        if (guildData[id].name.toLowerCase() === guildName.toLowerCase()) {
            return { success: false, message: 'Гильдия с таким названием уже существует!' };
        }
    }
    
    // Генерируем уникальный ID для гильдии
    const guildId = generateGuildId();
    
    // Создаем новую гильдию
    const newGuild = {
        id: guildId,
        name: guildName,
        ownerId: leaderId,
        members: [leaderId],
        level: 1,
        xp: 0,
        createdAt: new Date().toISOString(),
        description: 'Новая гильдия',
        emblem: null // URL к эмблеме гильдии
    };
    
    guildData[guildId] = newGuild;
    saveGuildData(guildData);
    
    // Обновляем профиль пользователя
    const { updateUserProfile } = require('./userProfiles');
    updateUserProfile(leaderId, { guildId: guildId });
    
    return { success: true, guild: newGuild };
}

// Присоединение к гильдии
function joinGuild(userId, guildName) {
    const guildData = loadGuildData();
    
    // Находим гильдию по названию
    let targetGuildId = null;
    for (const id in guildData) {
        if (guildData[id].name.toLowerCase() === guildName.toLowerCase()) {
            targetGuildId = id;
            break;
        }
    }
    
    if (!targetGuildId) {
        return { success: false, message: 'Гильдия не найдена!' };
    }
    
    const guild = guildData[targetGuildId];
    
    // Проверяем, не состоит ли уже пользователь в гильдии
    if (guild.members.includes(userId)) {
        return { success: false, message: 'Вы уже состоите в этой гильдии!' };
    }
    
    // Проверяем, не состоит ли пользователь в другой гильдии
    for (const id in guildData) {
        if (guildData[id].members.includes(userId)) {
            return { success: false, message: 'Вы уже состоите в другой гильдии!' };
        }
    }
    
    // Добавляем пользователя в гильдию
    guildData[targetGuildId].members.push(userId);
    saveGuildData(guildData);
    
    // Обновляем профиль пользователя
    const { updateUserProfile } = require('./userProfiles');
    updateUserProfile(userId, { guildId: targetGuildId });
    
    return { success: true, message: `Вы успешно присоединились к гильдии ${guildData[targetGuildId].name}!` };
}

// Покидание гильдии
function leaveGuild(userId) {
    const guildData = loadGuildData();
    
    // Находим гильдию, в которой состоит пользователь
    let guildId = null;
    for (const id in guildData) {
        if (guildData[id].members.includes(userId)) {
            guildId = id;
            break;
        }
    }
    
    if (!guildId) {
        return { success: false, message: 'Вы не состоите ни в одной гильдии!' };
    }
    
    const guild = guildData[guildId];
    
    // Проверяем, не является ли пользователь лидером гильдии
    if (guild.leader === userId) {
        return { success: false, message: 'Лидер не может покинуть гильдию. Передайте лидерство другому участнику или распустите гильдию.' };
    }
    
    // Удаляем пользователя из гильдии
    guildData[guildId].members = guildData[guildId].members.filter(id => id !== userId);
    saveGuildData(guildData);
    
    // Обновляем профиль пользователя
    const { updateUserProfile } = require('./userProfiles');
    updateUserProfile(userId, { guildId: null });
    
    return { success: true, message: `Вы покинули гильдию ${guild.name}!` };
}

// Получение информации о гильдии
function getGuild(guildId) {
    const guildData = loadGuildData();
    return guildData[guildId] || null;
}

// Получение гильдии пользователя
function getUserGuild(userId) {
    const guildData = loadGuildData();
    
    for (const id in guildData) {
        if (guildData[id].members.includes(userId)) {
            return guildData[id];
        }
    }
    
    return null;
}

// Генерация уникального ID для гильдии
function generateGuildId() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Получение списка участников гильдии
function getGuildMembers(guildId) {
    const guildData = loadGuildData();
    const guild = guildData[guildId];
    
    if (!guild) {
        return null;
    }
    
    return guild.members;
}

// Получение списка гильдий, отсортированных по уровню
function getTopGuilds(limit = 10) {
    const guildData = loadGuildData();
    const guilds = Object.values(guildData);
    
    // Сортировка по уровню в порядке убывания
    guilds.sort((a, b) => b.level - a.level);
    
    return guilds.slice(0, limit);
}

// Повышение уровня гильдии
function levelUpGuild(guildId) {
    const guildData = loadGuildData();
    const guild = guildData[guildId];
    
    if (!guild) {
        return { success: false, message: 'Гильдия не найдена!' };
    }
    
    // Рассчитываем опыт, необходимый для следующего уровня
    const expForNextLevel = guild.level * 100; // 100 очков опыта за каждый уровень
    
    if (guild.experience >= expForNextLevel) {
        // Повышаем уровень
        guild.level++;
        guild.experience -= expForNextLevel; // Уменьшаем опыт на количество, необходимое для уровня
        
        saveGuildData(guildData);
        
        return {
            success: true,
            newLevel: guild.level,
            message: `Гильдия "${guild.name}" достигла ${guild.level}-го уровня!`
        };
    }
    
    return { success: false, message: 'Недостаточно опыта для повышения уровня!' };
}

// Добавление опыта гильдии
function addGuildExperience(guildId, expAmount) {
    const guildData = loadGuildData();
    const guild = guildData[guildId];
    
    if (!guild) {
        return { success: false, message: 'Гильдия не найдена!' };
    }
    
    // Добавляем опыт
    guild.experience += expAmount;
    
    // Проверяем, повысился ли уровень
    const levelUpResult = levelUpGuild(guildId);
    
    saveGuildData(guildData);
    
    return {
        success: true,
        experience: guild.experience,
        levelUp: levelUpResult.success,
        newLevel: levelUpResult.newLevel,
        message: levelUpResult.message
    };
}

// Добавление опыта гильдии от участников
function addGuildExpFromMember(memberId, expAmount) {
    const guild = getUserGuild(memberId);
    
    if (!guild) {
        return { success: false, message: 'Пользователь не состоит в гильдии!' };
    }
    
    // Добавляем опыт гильдии
    return addGuildExperience(guild.id, expAmount);
}

module.exports = {
    createGuild,
    joinGuild,
    leaveGuild,
    getGuild,
    getUserGuild,
    getGuildByName,
    transferGuildLeadership,
    removeMemberFromGuild,
    dissolveGuild,
    loadGuildData,
    getGuildMembers,
    getTopGuilds,
    addGuildExperience,
    addGuildExpFromMember
};

// Получение гильдии по названию
function getGuildByName(guildName) {
    const guildData = loadGuildData();
    
    for (const id in guildData) {
        if (guildData[id].name.toLowerCase() === guildName.toLowerCase()) {
            return guildData[id];
        }
    }
    
    return null;
}

// Передача лидерства в гильдии
function transferGuildLeadership(guildId, newLeaderId) {
    const guildData = loadGuildData();
    
    if (!guildData[guildId]) {
        return { success: false, message: 'Гильдия не найдена!' };
    }
    
    // Проверяем, является ли пользователь лидером гильдии
    if (guildData[guildId].leader !== newLeaderId) {
        // Добавляем нового лидера в список участников, если его там нет
        if (!guildData[guildId].members.includes(newLeaderId)) {
            guildData[guildId].members.push(newLeaderId);
        }
        
        // Обновляем лидера
        const oldLeaderId = guildData[guildId].leader;
        guildData[guildId].leader = newLeaderId;
        
        saveGuildData(guildData);
        
        return {
            success: true,
            message: `Лидерство в гильдии "${guildData[guildId].name}" передано от <@${oldLeaderId}> к <@${newLeaderId}>!`,
            guild: guildData[guildId],
            oldLeader: oldLeaderId,
            newLeader: newLeaderId
        };
    }
    
    return { success: false, message: 'Пользователь уже является лидером гильдии!' };
}

// Исключение участника из гильдии (только лидером)
function removeMemberFromGuild(guildId, memberId, removerId) {
    const guildData = loadGuildData();
    
    if (!guildData[guildId]) {
        return { success: false, message: 'Гильдия не найдена!' };
    }
    
    // Проверяем, является ли пользователь лидером
    if (guildData[guildId].leader !== removerId) {
        return { success: false, message: 'Только лидер гильдии может исключать участников!' };
    }
    
    // Проверяем, не является ли участник лидером
    if (memberId === removerId) {
        return { success: false, message: 'Лидер не может исключить самого себя!' };
    }
    
    if (guildData[guildId].members.includes(memberId)) {
        guildData[guildId].members = guildData[guildId].members.filter(id => id !== memberId);
        saveGuildData(guildData);
        
        // Обновляем профиль исключенного участника
        const { updateUserProfile } = require('./userProfiles');
        updateUserProfile(memberId, { guildId: null });
        
        return {
            success: true,
            message: `<@${memberId}> исключен из гильдии "${guildData[guildId].name}"!`,
            guild: guildData[guildId]
        };
    }
    
    return { success: false, message: 'Участник не найден в гильдии!' };
}

// Распускание гильдии (только лидером)
function dissolveGuild(guildId, leaderId) {
    const guildData = loadGuildData();
    
    if (!guildData[guildId]) {
        return { success: false, message: 'Гильдия не найдена!' };
    }
    
    // Проверяем, является ли пользователь лидером
    if (guildData[guildId].leader !== leaderId) {
        return { success: false, message: 'Только лидер гильдии может распустить гильдию!' };
    }
    
    const guildName = guildData[guildId].name;
    
    // Удаляем гильдию
    delete guildData[guildId];
    saveGuildData(guildData);
    
    // Обновляем профили всех участников гильдии
    const { updateUserProfile } = require('./userProfiles');
    for (const memberId of guildData[guildId].members) {
        updateUserProfile(memberId, { guildId: null });
    }
    
    return { success: true, message: `Гильдия "${guildName}" была распущена!` };
}

// Добавляем недостающие функции

// Передача лидерства в гильдии
function transferGuildLeadership(guildId, newLeaderId, leaderId) {
    const guildData = loadGuildData();
    
    if (!guildData[guildId]) {
        return { success: false, message: 'Гильдия не найдена!' };
    }
    
    // Проверяем, является ли пользователь лидером гильдии
    if (guildData[guildId].leader !== leaderId) {
        return { success: false, message: 'Только лидер гильдии может передать лидерство!' };
    }
    
    // Добавляем нового лидера в список участников, если его там нет
    if (!guildData[guildId].members.includes(newLeaderId)) {
        guildData[guildId].members.push(newLeaderId);
    }
    
    // Обновляем лидера
    const oldLeaderId = guildData[guildId].leader;
    guildData[guildId].leader = newLeaderId;
    
    saveGuildData(guildData);
    
    return {
        success: true,
        message: `Лидерство в гильдии "${guildData[guildId].name}" передано от <@${oldLeaderId}> к <@${newLeaderId}>!`,
        guild: guildData[guildId],
        oldLeader: oldLeaderId,
        newLeader: newLeaderId
    };
}

// Исключение участника из гильдии (только лидером)
function removeMemberFromGuild(guildId, memberId, removerId) {
    const guildData = loadGuildData();
    
    if (!guildData[guildId]) {
        return { success: false, message: 'Гильдия не найдена!' };
    }
    
    // Проверяем, является ли пользователь лидером
    if (guildData[guildId].leader !== removerId) {
        return { success: false, message: 'Только лидер гильдии может исключать участников!' };
    }
    
    // Проверяем, не является ли участник лидером
    if (memberId === removerId) {
        return { success: false, message: 'Лидер не может исключить самого себя!' };
    }
    
    if (guildData[guildId].members.includes(memberId)) {
        guildData[guildId].members = guildData[guildId].members.filter(id => id !== memberId);
        saveGuildData(guildData);
        
        // Обновляем профиль исключенного участника
        const { updateUserProfile } = require('./userProfiles');
        updateUserProfile(memberId, { guildId: null });
        
        return {
            success: true,
            message: `<@${memberId}> исключен из гильдии "${guildData[guildId].name}"!`,
            guild: guildData[guildId]
        };
    }
    
    return { success: false, message: 'Участник не найден в гильдии!' };
}

// Распускание гильдии (только лидером)
function dissolveGuild(guildId, leaderId) {
    const guildData = loadGuildData();
    
    if (!guildData[guildId]) {
        return { success: false, message: 'Гильдия не найдена!' };
    }
    
    // Проверяем, является ли пользователь лидером
    if (guildData[guildId].leader !== leaderId) {
        return { success: false, message: 'Только лидер гильдии может распустить гильдию!' };
    }
    
    const guildName = guildData[guildId].name;
    
    // Сохраняем участников для обновления их профилей
    const members = [...guildData[guildId].members];
    
    // Удаляем гильдию
    delete guildData[guildId];
    saveGuildData(guildData);
    
    // Обновляем профили всех участников гильдии
    const { updateUserProfile } = require('./userProfiles');
    for (const memberId of members) {
        updateUserProfile(memberId, { guildId: null });
    }
    
    return { success: true, message: `Гильдия "${guildName}" была распущена!` };
}
