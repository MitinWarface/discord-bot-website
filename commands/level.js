const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Путь к файлу с данными о уровнях
const levelsPath = path.join(__dirname, '../System/levels.json');

// Загрузка данных о уровнях
function loadLevelsData() {
    if (fs.existsSync(levelsPath)) {
        const data = fs.readFileSync(levelsPath, 'utf8');
        return JSON.parse(data);
    }
    return {};
}

// Сохранение данных о уровнях
function saveLevelsData(data) {
    fs.writeFileSync(levelsPath, JSON.stringify(data, null, 2));
}

// Получение уровня по XP
function getLevelFromXP(xp) {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

// Получение XP, необходимого для следующего уровня
function getXpForNextLevel(level) {
    return ((level || 0) + 1) ** 2 * 100;
}

// Получение XP, необходимого для уровня
function getXpForLevel(level) {
    return (level || 0) ** 2 * 100;
}

// Добавление XP пользователю
function addXP(userId, xpToAdd) {
    const levelsData = loadLevelsData();
    
    if (!levelsData[userId]) {
        levelsData[userId] = {
            xp: 0,
            level: 1,
            lastMessage: Date.now()
        };
    }
    
    levelsData[userId].xp += xpToAdd;
    levelsData[userId].lastMessage = Date.now();
    
    // Обновляем уровень, если нужно
    const newLevel = getLevelFromXP(levelsData[userId].xp);
    if (newLevel > levelsData[userId].level) {
        levelsData[userId].level = newLevel;
    }
    
    saveLevelsData(levelsData);
    
    return {
        newXp: levelsData[userId].xp,
        newLevel: levelsData[userId].level,
        levelUp: newLevel > levelsData[userId].previousLevel || 0
    };
}

// Получение данных пользователя
function getUserLevelData(userId) {
    const levelsData = loadLevelsData();
    return levelsData[userId] || {
        xp: 0,
        level: 1,
        lastMessage: 0
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Проверить уровень и XP пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, уровень которого хотите проверить')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const userData = getUserLevelData(targetUser.id);
        
        // Вычисляем прогресс до следующего уровня
        const currentLevelXp = getXpForLevel(userData.level);
        const nextLevelXp = getXpForNextLevel(userData.level);
        const xpNeededForNextLevel = nextLevelXp - currentLevelXp;
        const xpEarnedInCurrentLevel = userData.xp - currentLevelXp;
        const progressPercentage = Math.round((xpEarnedInCurrentLevel / xpNeededForNextLevel) * 100);
        
        // Создаем прогресс-бар
        const progressBarLength = 15;
        const filledBlocks = Math.floor((progressPercentage / 100) * progressBarLength);
        const emptyBlocks = progressBarLength - filledBlocks;
        const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
        
        // Создаем embed с информацией о уровне
        const levelEmbed = new EmbedBuilder()
            .setTitle(`📊 Уровень ${targetUser.username}`)
            .setDescription(`<@${targetUser.id}> - Уровень **${userData.level}**`)
            .addFields(
                { name: 'XP', value: `${userData.xp} XP`, inline: true },
                { name: 'Прогресс', value: `${progressBar} ${progressPercentage}%`, inline: false },
                { name: 'До следующего уровня', value: `${xpNeededForNextLevel - xpEarnedInCurrentLevel} XP`, inline: true }
            )
            .setColor('#8b00ff')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp();
        
        await interaction.reply({ embeds: [levelEmbed] });
    }
};

// Команда для получения таблицы лидеров по уровням
module.exports.leaderboard = {
    data: new SlashCommandBuilder()
        .setName('level-leaderboard')
        .setDescription('Показать таблицу лидеров по уровням'),

    async execute(interaction) {
        const levelsData = loadLevelsData();
        
        // Преобразуем объект в массив и сортируем по уровню (и XP как дополнительный критерий)
        const sortedUsers = Object.entries(levelsData)
            .map(([userId, data]) => ({
                userId,
                level: data.level,
                xp: data.xp
            }))
            .sort((a, b) => {
                if (b.level !== a.level) {
                    return b.level - a.level;
                }
                return b.xp - a.xp;
            })
            .slice(0, 10); // Берем топ 10
        
        if (sortedUsers.length === 0) {
            const emptyEmbed = new EmbedBuilder()
                .setTitle('📊 Таблица лидеров по уровням')
                .setDescription('Пока никто не получил уровни.')
                .setColor('#8b00ff')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [emptyEmbed] });
        }
        
        // Создаем embed с таблицей лидеров
        const leaderboardEmbed = new EmbedBuilder()
            .setTitle('📊 Таблица лидеров по уровням')
            .setColor('#8b00ff')
            .setTimestamp();
        
        // Добавляем информацию о каждом пользователе в топе
        for (let i = 0; i < sortedUsers.length; i++) {
            const user = sortedUsers[i];
            const member = await interaction.guild.members.fetch(user.userId).catch(() => null);
            const userName = member ? member.user.username : 'Неизвестный пользователь';
            const position = i + 1;
            const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
            
            leaderboardEmbed.addFields({
                name: `${medal} ${userName}`,
                value: `Уровень: ${user.level} | XP: ${user.xp}`,
                inline: false
            });
        }
        
        await interaction.reply({ embeds: [leaderboardEmbed] });
    }
};

// Функция для начисления XP за сообщение
function awardXPForMessage(message) {
    // Проверяем, является ли пользователь ботом
    if (message.author.bot) return;
    
    const userData = getUserLevelData(message.author.id);
    const now = Date.now();
    
    // Ограничение на частоту получения XP (например, раз в 60 секунд)
    const timeSinceLastMessage = now - (userData.lastMessage || 0);
    const xpCooldown = 60 * 1000; // 60 секунд
    
    if (timeSinceLastMessage < xpCooldown) {
        return; // Пользователь получает XP слишком часто
    }
    
    // Начисляем XP за сообщение (например, от 5 до 15 XP)
    const xpToAdd = Math.floor(Math.random() * 11) + 5; // От 5 до 15 XP
    
    const result = addXP(message.author.id, xpToAdd);
    
    // Если пользователь достиг нового уровня, отправляем уведомление
    if (result.levelUp) {
        const levelUpEmbed = new EmbedBuilder()
            .setTitle('🎉 Повышение уровня!')
            .setDescription(`<@${message.author.id}> достиг **${result.newLevel}** уровня!`)
            .addFields(
                { name: 'Новый уровень', value: result.newLevel.toString(), inline: true },
                { name: 'Всего XP', value: result.newXp.toString(), inline: true }
            )
            .setColor('#8b00ff')
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp();
        
        // Отправляем уведомление в канал
        message.reply({ embeds: [levelUpEmbed] }).catch(() => {});
    }
    
    // Обновляем прогресс квестов на получение опыта
    try {
        require('../System/userProfiles').updateQuestProgressByType(message.author.id, 'xp', xpToAdd);
    } catch (error) {
        console.error('Ошибка при обновлении прогресса квеста на XP:', error);
    }
}

// Экспортируем функцию для использования в других файлах
module.exports.awardXPForMessage = awardXPForMessage;