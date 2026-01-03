const fs = require('fs');
const path = require('path');

// Путь к файлу с данными о реакциях-ролях
const reactionRolesPath = path.join(__dirname, 'reactionRoles.json');

// Загрузка данных о реакциях-ролях
function loadReactionRoles() {
    if (fs.existsSync(reactionRolesPath)) {
        const data = fs.readFileSync(reactionRolesPath, 'utf8');
        return JSON.parse(data);
    }
    return {};
}

// Сохранение данных о реакциях-ролях
function saveReactionRoles(data) {
    fs.writeFileSync(reactionRolesPath, JSON.stringify(data, null, 2));
}

// Добавление реакции-роли
function addReactionRole(guildId, messageId, emoji, roleId) {
    const reactionRoles = loadReactionRoles();
    
    if (!reactionRoles[guildId]) {
        reactionRoles[guildId] = {};
    }
    
    if (!reactionRoles[guildId][messageId]) {
        reactionRoles[guildId][messageId] = {};
    }
    
    reactionRoles[guildId][messageId][emoji] = roleId;
    saveReactionRoles(reactionRoles);
}

// Получение роли по эмодзи и сообщению
function getRoleByReaction(guildId, messageId, emoji) {
    const reactionRoles = loadReactionRoles();
    
    if (reactionRoles[guildId] && 
        reactionRoles[guildId][messageId] && 
        reactionRoles[guildId][messageId][emoji]) {
        return reactionRoles[guildId][messageId][emoji];
    }
    
    return null;
}

// Удаление реакции-роли
function removeReactionRole(guildId, messageId, emoji) {
    const reactionRoles = loadReactionRoles();
    
    if (reactionRoles[guildId] && 
        reactionRoles[guildId][messageId] && 
        reactionRoles[guildId][messageId][emoji]) {
        
        delete reactionRoles[guildId][messageId][emoji];
        
        // Если для сообщения больше нет реакций, удаляем и само сообщение
        if (Object.keys(reactionRoles[guildId][messageId]).length === 0) {
            delete reactionRoles[guildId][messageId];
        }
        
        // Если для гильдии больше нет сообщений с реакциями, удаляем и гильдию
        if (Object.keys(reactionRoles[guildId]).length === 0) {
            delete reactionRoles[guildId];
        }
        
        saveReactionRoles(reactionRoles);
        return true;
    }
    
    return false;
}

module.exports = {
    addReactionRole,
    getRoleByReaction,
    removeReactionRole
};