const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
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
function addXP(userId, xpToAdd, guildId) {
    const levelsData = loadLevelsData();
    
    if (!levelsData[guildId]) {
        levelsData[guildId] = {};
    }
    
    if (!levelsData[guildId][userId]) {
        levelsData[guildId][userId] = {
            xp: 0,
            level: 1,
            lastMessage: Date.now()
        };
    }
    
    levelsData[guildId][userId].xp += xpToAdd;
    levelsData[guildId][userId].lastMessage = Date.now();
    
    // Обновляем уровень, если нужно
    const newLevel = getLevelFromXP(levelsData[guildId][userId].xp);
    if (newLevel > levelsData[guildId][userId].level) {
        levelsData[guildId][userId].level = newLevel;
    }
    
    saveLevelsData(levelsData);
    
    return {
        newXp: levelsData[guildId][userId].xp,
        newLevel: levelsData[guildId][userId].level,
        levelUp: newLevel > levelsData[guildId][userId].level
    };
}

// Получение данных пользователя
function getUserLevelData(userId, guildId) {
    const levelsData = loadLevelsData();
    if (!levelsData[guildId] || !levelsData[guildId][userId]) {
        return {
            xp: 0,
            level: 1,
            lastMessage: 0
        };
    }
    return levelsData[guildId][userId];
}

// Получение топ пользователей по уровню
function getTopLevelUsers(guildId, limit = 10) {
    const levelsData = loadLevelsData();
    if (!levelsData[guildId]) {
        return [];
    }
    
    // Преобразуем объект в массив и сортируем по уровню (и XP как дополнительный критерий)
    const sortedUsers = Object.entries(levelsData[guildId])
        .map(([userId, data]) => ({
            userId,
            xp: data.xp,
            level: data.level
        }))
        .sort((a, b) => {
            if (b.level !== a.level) {
                return b.level - a.level;
            }
            return b.xp - a.xp;
        })
        .slice(0, limit);
    
    return sortedUsers;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Проверить уровень и XP пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, уровень которого хотите проверить')
                .setRequired(false))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('Показать таблицу лидеров по уровням'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('card')
                .setDescription('Показать красивую карточку уровня пользователя')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'leaderboard':
                await handleLeaderboard(interaction);
                break;
            case 'card':
                await handleCard(interaction);
                break;
            default:
                await handleProfile(interaction);
                break;
        }
    }
};

async function handleProfile(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;
    const userData = getUserLevelData(targetUser.id, guildId);
    
    // Вычисляем прогресс до следующего уровня
    const currentLevelXp = getXpForLevel(userData.level);
    const nextLevelXp = getXpForNextLevel(userData.level);
    const xpNeededForNextLevel = nextLevelXp - currentLevelXp;
    const xpEarnedInCurrentLevel = userData.xp - currentLevelXp;
    const progressPercentage = Math.round((xpEarnedInCurrentLevel / xpNeededForNextLevel) * 100);
    
    // Создаем прогресс-бар
    const progressBarLength = 20;
    const filledBlocks = Math.floor((progressPercentage / 100) * progressBarLength);
    const emptyBlocks = progressBarLength - filledBlocks;
    const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
    
    // Создаем embed с информацией о уровне
    const levelEmbed = new EmbedBuilder()
        .setTitle(`📊 Уровень ${targetUser.username}`)
        .setDescription(`<@${targetUser.id}> - Уровень **${userData.level}**`)
        .addFields(
            { name: 'XP', value: `${userData.xp} / ${nextLevelXp} (до следующего уровня: ${xpNeededForNextLevel - xpEarnedInCurrentLevel})`, inline: false },
            { name: 'Прогресс', value: `${progressBar} ${progressPercentage}%`, inline: false }
        )
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setColor('#8b00ff')
        .setTimestamp();
    
    await interaction.reply({ embeds: [levelEmbed] });
}

async function handleLeaderboard(interaction) {
    const guildId = interaction.guild.id;
    const topUsers = getTopLevelUsers(guildId, 10);
    
    if (topUsers.length === 0) {
        const emptyEmbed = new EmbedBuilder()
            .setTitle('🏆 Таблица лидеров по уровням')
            .setDescription('Пока никто не получил уровни на этом сервере.')
            .setColor('#8b00ff')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [emptyEmbed] });
    }
    
    // Создаем embed с таблицей лидеров
    const leaderboardEmbed = new EmbedBuilder()
        .setTitle('🏆 Таблица лидеров по уровням')
        .setColor('#8b00ff')
        .setTimestamp();
    
    // Добавляем информацию о каждом пользователе в топе
    for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
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

async function handleCard(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;
    const userData = getUserLevelData(targetUser.id, guildId);
    
    // Вычисляем прогресс до следующего уровня
    const currentLevelXp = getXpForLevel(userData.level);
    const nextLevelXp = getXpForNextLevel(userData.level);
    const xpNeededForNextLevel = nextLevelXp - currentLevelXp;
    const xpEarnedInCurrentLevel = userData.xp - currentLevelXp;
    const progressPercentage = Math.round((xpEarnedInCurrentLevel / xpNeededForNextLevel) * 100);
    
    // Создаем прогресс-бар
    const progressBarLength = 25;
    const filledBlocks = Math.floor((progressPercentage / 100) * progressBarLength);
    const emptyBlocks = progressBarLength - filledBlocks;
    const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
    
    // Создаем embed с красивой карточкой уровня
    const cardEmbed = new EmbedBuilder()
        .setTitle(`🎮 Карточка уровня ${targetUser.username}`)
        .setDescription(`**Уровень:** ${userData.level}\n**XP:** ${userData.xp} / ${nextLevelXp}\n**До следующего уровня:** ${xpNeededForNextLevel - xpEarnedInCurrentLevel} XP`)
        .addFields(
            { name: 'Прогресс', value: `${progressBar} ${progressPercentage}%`, inline: false }
        )
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setColor('#8b00ff')
        .setTimestamp()
        .setFooter({ 
            text: `Статистика сервера ${interaction.guild.name}`, 
            iconURL: interaction.guild.iconURL() 
        });
    
    await interaction.reply({ embeds: [cardEmbed] });
}

// Функция для начисления XP за сообщение
function awardXPForMessage(message) {
    // Проверяем, является ли пользователь ботом
    if (message.author.bot) return;
    
    const guildId = message.guild.id;
    const userData = getUserLevelData(message.author.id, guildId);
    const now = Date.now();
    
    // Ограничение на частоту получения XP (например, раз в 60 секунд)
    const timeSinceLastMessage = now - (userData.lastMessage || 0);
    const xpCooldown = 60 * 1000; // 60 секунд
    
    if (timeSinceLastMessage < xpCooldown) {
        return; // Пользователь получает XP слишком часто
    }
    
    // Начисляем XP за сообщение (например, от 5 до 15 XP)
    const xpToAdd = Math.floor(Math.random() * 11) + 5; // От 5 до 15 XP
    
    const result = addXP(message.author.id, xpToAdd, guildId);
    
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
        require('./System/userProfiles').updateQuestProgressByType(message.author.id, 'xp', xpToAdd);
    } catch (error) {
        console.error('Ошибка при обновлении прогресса квеста на XP:', error);
    }
}

// Экспортируем функцию для использования в других файлах
module.exports.awardXPForMessage = awardXPForMessage;