const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Путь к файлу с квестами
const questsPath = path.join(__dirname, '../System/quests.json');

// Загрузка данных о квестах
function loadQuestsData() {
    if (fs.existsSync(questsPath)) {
        const data = fs.readFileSync(questsPath, 'utf8');
        return JSON.parse(data);
    }
    return {
        templates: [
            {
                id: 'first_message',
                name: 'Первое сообщение',
                description: 'Отправь свое первое сообщение на сервере',
                type: 'message',
                target: 1,
                reward: { points: 10, coins: 50 },
                cooldown: 0
            },
            {
                id: 'ten_messages',
                name: 'Активный участник',
                description: 'Отправь 10 сообщений на сервере',
                type: 'message',
                target: 10,
                reward: { points: 25, coins: 100 },
                cooldown: 0
            },
            {
                id: 'first_command',
                name: 'Исследователь',
                description: 'Выполни свою первую команду',
                type: 'command',
                target: 1,
                reward: { points: 15, coins: 75 },
                cooldown: 0
            },
            {
                id: 'five_commands',
                name: 'Частый пользователь',
                description: 'Выполни 5 команд',
                type: 'command',
                target: 5,
                reward: { points: 40, coins: 200 },
                cooldown: 0
            },
            {
                id: 'daily_streak',
                name: 'Ежедневный герой',
                description: 'Получи ежедневную награду 3 дня подряд',
                type: 'daily',
                target: 3,
                reward: { points: 50, coins: 300 },
                cooldown: 0
            },
            {
                id: 'first_purchase',
                name: 'Покупатель',
                description: 'Соверши свою первую покупку в магазине',
                type: 'purchase',
                target: 1,
                reward: { points: 30, coins: 150 },
                cooldown: 0
            },
            {
                id: 'give_rep',
                name: 'Щедрый',
                description: 'Выдай репутацию другому участнику',
                type: 'rep',
                target: 1,
                reward: { points: 20, coins: 100 },
                cooldown: 0
            },
            {
                id: 'join_event',
                name: 'Событийный участник',
                description: 'Прими участие в 3 событиях',
                type: 'event',
                target: 3,
                reward: { points: 45, coins: 250 },
                cooldown: 0
            }
        ],
        userQuests: {},
        completedQuests: {}
    };
}

// Сохранение данных о квестах
function saveQuestsData(data) {
    fs.writeFileSync(questsPath, JSON.stringify(data, null, 2));
}

// Получение шаблонов квестов
function getQuestTemplates() {
    const data = loadQuestsData();
    return data.templates;
}

// Получение активных квестов пользователя
function getUserQuests(userId) {
    const data = loadQuestsData();
    return data.userQuests[userId] || [];
}

// Получение завершенных квестов пользователя
function getCompletedUserQuests(userId) {
    const data = loadQuestsData();
    return data.completedQuests[userId] || [];
}

// Добавление квеста пользователю
function addUserQuest(userId, questId) {
    const data = loadQuestsData();
    const questTemplate = getQuestTemplate(questId);
    
    if (!questTemplate) {
        return null;
    }
    
    if (!data.userQuests[userId]) {
        data.userQuests[userId] = [];
    }
    
    // Проверяем, не выполняет ли пользователь уже этот квест
    if (data.userQuests[userId].some(q => q.id === questId)) {
        return null;
    }
    
    // Проверяем, не завершил ли пользователь этот квест недавно (если квест не может повторяться)
    if (data.completedQuests[userId] && 
        data.completedQuests[userId].some(q => q.id === questId && 
        !q.repeatable && 
        Date.now() - new Date(q.completedAt).getTime() < (q.cooldown || 24 * 60 * 60 * 1000))) {
        return null; // Квест на кулдауне
    }
    
    const newQuest = {
        ...questTemplate,
        progress: 0,
        startedAt: new Date().toISOString(),
        completed: false
    };
    
    data.userQuests[userId].push(newQuest);
    saveQuestsData(data);
    
    return newQuest;
}

// Получение шаблона квеста по ID
function getQuestTemplate(questId) {
    const templates = getQuestTemplates();
    return templates.find(q => q.id === questId);
}

// Обновление прогресса квеста
function updateQuestProgress(userId, questId, amount = 1) {
    const data = loadQuestsData();
    
    if (!data.userQuests[userId]) {
        return null;
    }
    
    const questIndex = data.userQuests[userId].findIndex(q => q.id === questId);
    
    if (questIndex === -1) {
        return null;
    }
    
    const quest = data.userQuests[userId][questIndex];
    quest.progress = Math.min(quest.progress + amount, quest.target);
    
    let completed = false;
    if (quest.progress >= quest.target && !quest.completed) {
        // Квест завершен
        quest.completed = true;
        
        // Перемещаем в завершенные
        if (!data.completedQuests[userId]) {
            data.completedQuests[userId] = [];
        }
        
        const completedQuest = {
            ...quest,
            completedAt: new Date().toISOString()
        };
        
        data.completedQuests[userId].push(completedQuest);
        
        // Удаляем из активных
        data.userQuests[userId].splice(questIndex, 1);
        
        // Начисляем награду
        const { updateUserProfile } = require('../System/userProfiles');
        const { getUserProfile } = require('../System/userProfiles');
        const user = getUserProfile(userId);
        
        const newPoints = (user.points || 0) + (quest.reward.points || 0);
        const newCoins = (user.coins || 0) + (quest.reward.coins || 0);
        
        updateUserProfile(userId, {
            points: newPoints,
            coins: newCoins
        });
        
        completed = true;
    }
    
    saveQuestsData(data);
    
    return {
        progress: quest.progress,
        target: quest.target,
        completed: completed,
        reward: completed ? quest.reward : null
    };
}

// Обновление прогресса квестов по типу
function updateQuestProgressByType(userId, questType, amount = 1) {
    const data = loadQuestsData();
    const userQuests = data.userQuests[userId] || [];
    
    const matchingQuests = userQuests.filter(q => q.type === questType && !q.completed);
    
    for (const quest of matchingQuests) {
        updateQuestProgress(userId, quest.id, amount);
    }
}

// Получение случайного квеста
function getRandomQuest(userId, excludeTypes = []) {
    const data = loadQuestsData();
    const userQuests = getUserQuests(userId);
    const completedQuests = getCompletedUserQuests(userId);
    
    // Исключаем уже активные и недавно завершенные квесты
    const excludeIds = [...userQuests, ...completedQuests].map(q => q.id);
    const availableQuests = getQuestTemplates().filter(q => 
        !excludeIds.includes(q.id) && 
        !excludeTypes.includes(q.type)
    );
    
    if (availableQuests.length === 0) {
        return null;
    }
    
    return availableQuests[Math.floor(Math.random() * availableQuests.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quests')
        .setDescription('Просмотреть и управлять квестами')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Показать активные квесты'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('available')
                .setDescription('Показать доступные квесты'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('completed')
                .setDescription('Показать завершенные квесты'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('take')
                .setDescription('Взять новый квест')
                .addStringOption(option =>
                    option.setName('quest_id')
                        .setDescription('ID квеста для взятия')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('get_random')
                .setDescription('Получить случайный квест')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'list':
                await handleList(interaction);
                break;
            case 'available':
                await handleAvailable(interaction);
                break;
            case 'completed':
                await handleCompleted(interaction);
                break;
            case 'take':
                await handleTake(interaction);
                break;
            case 'get_random':
                await handleGetRandom(interaction);
                break;
        }
    }
};

async function handleList(interaction) {
    const userQuests = getUserQuests(interaction.user.id);
    
    if (userQuests.length === 0) {
        const noQuestsEmbed = new EmbedBuilder()
            .setTitle('🎯 Активные квесты')
            .setDescription('У вас нет активных квестов. Используйте `/quests available`, чтобы посмотреть доступные квесты.')
            .setColor('#8b00ff')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [noQuestsEmbed], ephemeral: true });
    }
    
    const questsEmbed = new EmbedBuilder()
        .setTitle('🎯 Активные квесты')
        .setDescription(`У вас **${userQuests.length}** активных квестов:`)
        .setColor('#8b00ff')
        .setTimestamp();
    
    for (const quest of userQuests) {
        const progressPercentage = Math.round((quest.progress / quest.target) * 100);
        const progressBar = '█'.repeat(Math.floor(progressPercentage / 10)) + '░'.repeat(10 - Math.floor(progressPercentage / 10));
        
        questsEmbed.addFields({
            name: `${quest.name} [${quest.progress}/${quest.target}]`,
            value: `${quest.description}\n${progressBar} ${progressPercentage}%\nНаграда: ${quest.reward.points || 0} очков, ${quest.reward.coins || 0} монет`,
            inline: false
        });
    }
    
    await interaction.reply({ embeds: [questsEmbed] });
}

async function handleAvailable(interaction) {
    const data = loadQuestsData();
    const userQuests = getUserQuests(interaction.user.id);
    const completedQuests = getCompletedUserQuests(interaction.user.id);
    
    // Исключаем уже взятые и завершенные квесты
    const excludeIds = [...userQuests, ...completedQuests].map(q => q.id);
    const availableQuests = data.templates.filter(q => !excludeIds.includes(q.id));
    
    if (availableQuests.length === 0) {
        const noAvailableEmbed = new EmbedBuilder()
            .setTitle('📋 Доступные квесты')
            .setDescription('Нет доступных квестов. Выполните какие-нибудь квесты, чтобы получить новые.')
            .setColor('#8b00ff')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [noAvailableEmbed], ephemeral: true });
    }
    
    const availableEmbed = new EmbedBuilder()
        .setTitle('📋 Доступные квесты')
        .setDescription(`Всего доступно **${availableQuests.length}** квестов:`)
        .setColor('#8b00ff')
        .setTimestamp();
    
    // Показываем первые 10 доступных квестов
    const questsToShow = availableQuests.slice(0, 10);
    
    for (const quest of questsToShow) {
        availableEmbed.addFields({
            name: `${quest.name} (ID: ${quest.id})`,
            value: `${quest.description}\nТип: ${quest.type}\nЦель: ${quest.target}\nНаграда: ${quest.reward.points || 0} очков, ${quest.reward.coins || 0} монет`,
            inline: false
        });
    }
    
    if (availableQuests.length > 10) {
        availableEmbed.setFooter({ text: `Показаны первые 10 из ${availableQuests.length} квестов`, iconURL: interaction.client.user.displayAvatarURL() });
    }
    
    // Создаем кнопки для взятия квестов
    const rows = [];
    let currentRow = new ActionRowBuilder();
    let buttonCount = 0;
    
    for (const quest of questsToShow) {
        if (buttonCount >= 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
            buttonCount = 0;
        }
        
        currentRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`take_quest_${quest.id}`)
                .setLabel(quest.name.substring(0, 80))
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅')
        );
        
        buttonCount++;
    }
    
    if (buttonCount > 0) {
        rows.push(currentRow);
    }
    
    await interaction.reply({ embeds: [availableEmbed], components: rows });
}

async function handleCompleted(interaction) {
    const completedQuests = getCompletedUserQuests(interaction.user.id);
    
    if (completedQuests.length === 0) {
        const noCompletedEmbed = new EmbedBuilder()
            .setTitle('✅ Завершенные квесты')
            .setDescription('Вы еще не завершили ни одного квеста.')
            .setColor('#8b00ff')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [noCompletedEmbed], ephemeral: true });
    }
    
    // Сортируем по дате завершения (новые первыми)
    const sortedCompleted = completedQuests.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    
    const completedEmbed = new EmbedBuilder()
        .setTitle('✅ Завершенные квесты')
        .setDescription(`Вы завершили **${completedQuests.length}** квестов:`)
        .setColor('#8b00ff')
        .setTimestamp();
    
    // Показываем последние 10 завершенных квестов
    const questsToShow = sortedCompleted.slice(0, 10);
    
    for (const quest of questsToShow) {
        completedEmbed.addFields({
            name: `${quest.name} - ${quest.reward.points || 0} очков, ${quest.reward.coins || 0} монет`,
            value: `${quest.description}\nЗавершен: <t:${Math.floor(new Date(quest.completedAt).getTime()/1000)}:R>`,
            inline: false
        });
    }
    
    if (sortedCompleted.length > 10) {
        completedEmbed.setFooter({ text: `Показаны последние 10 из ${sortedCompleted.length} завершенных квестов`, iconURL: interaction.client.user.displayAvatarURL() });
    }
    
    await interaction.reply({ embeds: [completedEmbed] });
}

async function handleTake(interaction) {
    const questId = interaction.options.getString('quest_id');
    const quest = getQuestTemplate(questId);
    
    if (!quest) {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription('Квест с таким ID не найден!')
            .setColor('#ff0000')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
    
    // Проверяем, не выполняет ли пользователь уже этот квест
    const userQuests = getUserQuests(interaction.user.id);
    if (userQuests.some(q => q.id === questId)) {
        const alreadyTakingEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription('Вы уже выполняете этот квест!')
            .setColor('#ff0000')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [alreadyTakingEmbed], ephemeral: true });
    }
    
    // Проверяем, не завершил ли пользователь этот квест недавно (если не повторяется)
    const completedQuests = getCompletedUserQuests(interaction.user.id);
    if (completedQuests.some(q => q.id === questId && !q.repeatable)) {
        const alreadyCompletedEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription('Вы уже завершили этот квест, и он не может повторяться!')
            .setColor('#ff0000')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [alreadyCompletedEmbed], ephemeral: true });
    }
    
    const newQuest = addUserQuest(interaction.user.id, questId);
    
    if (newQuest) {
        const takeEmbed = new EmbedBuilder()
            .setTitle('✅ Квест взят')
            .setDescription(`Вы взяли квест: **${newQuest.name}**`)
            .addFields(
                { name: 'Описание', value: newQuest.description, inline: false },
                { name: 'Цель', value: `Выполнить ${newQuest.target} раз(а)`, inline: true },
                { name: 'Награда', value: `${newQuest.reward.points || 0} очков, ${newQuest.reward.coins || 0} монет`, inline: true }
            )
            .setColor('#57f287')
            .setTimestamp();
        
        await interaction.reply({ embeds: [takeEmbed] });
    } else {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription('Не удалось взять квест. Возможно, вы уже выполняете его.')
            .setColor('#ff0000')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleGetRandom(interaction) {
    const randomQuest = getRandomQuest(interaction.user.id);
    
    if (!randomQuest) {
        const noRandomEmbed = new EmbedBuilder()
            .setTitle('🎲 Случайный квест')
            .setDescription('Нет доступных случайных квестов. Все квесты уже взяты или завершены.')
            .setColor('#ff0000')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [noRandomEmbed], ephemeral: true });
    }
    
    const newQuest = addUserQuest(interaction.user.id, randomQuest.id);
    
    if (newQuest) {
        const randomEmbed = new EmbedBuilder()
            .setTitle('🎲 Случайный квест')
            .setDescription(`Вам назначен случайный квест: **${newQuest.name}**`)
            .addFields(
                { name: 'Описание', value: newQuest.description, inline: false },
                { name: 'Цель', value: `Выполнить ${newQuest.target} раз(а)`, inline: true },
                { name: 'Награда', value: `${newQuest.reward.points || 0} очков, ${newQuest.reward.coins || 0} монет`, inline: true }
            )
            .setColor('#57f287')
            .setTimestamp();
        
        await interaction.reply({ embeds: [randomEmbed] });
    } else {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription('Не удалось получить случайный квест.')
            .setColor('#ff0000')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

// Обработка нажатий на кнопки должна быть в основном файле index.js

// Функция для обработки взятия квеста через кнопку, которая будет вызываться из index.js
function handleQuestButton(interaction) {
    const questId = interaction.customId.replace('take_quest_', '');
    
    // Проверяем, не выполняет ли пользователь уже этот квест
    const userQuests = getUserQuests(interaction.user.id);
    if (userQuests.some(q => q.id === questId)) {
        const alreadyTakingEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription('Вы уже выполняете этот квест!')
            .setColor('#ff00')
            .setTimestamp();
        
        return interaction.reply({ embeds: [alreadyTakingEmbed], ephemeral: true });
    }
    
    // Проверяем, не завершил ли пользователь этот квест недавно (если не повторяется)
    const completedQuests = getCompletedUserQuests(interaction.user.id);
    if (completedQuests.some(q => q.id === questId && !q.repeatable)) {
        const alreadyCompletedEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription('Вы уже завершили этот квест, и он не может повторяться!')
            .setColor('#ff0000')
            .setTimestamp();
        
        return interaction.reply({ embeds: [alreadyCompletedEmbed], ephemeral: true });
    }
    
    const newQuest = addUserQuest(interaction.user.id, questId);
    
    if (newQuest) {
        const takeEmbed = new EmbedBuilder()
            .setTitle('✅ Квест взят')
            .setDescription(`Вы взяли квест: **${newQuest.name}**`)
            .addFields(
                { name: 'Описание', value: newQuest.description, inline: false },
                { name: 'Цель', value: `Выполнить ${newQuest.target} раз(а)`, inline: true },
                { name: 'Награда', value: `${newQuest.reward.points || 0} очков, ${newQuest.reward.coins || 0} монет`, inline: true }
            )
            .setColor('#57f287')
            .setTimestamp();
        
        return interaction.update({ embeds: [takeEmbed], components: [] });
    } else {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription('Не удалось взять квест. Возможно, вы уже выполняете его.')
            .setColor('#ff0000')
            .setTimestamp();
        
        return interaction.update({ embeds: [errorEmbed], components: [] });
    }
}

// Экспортируем функцию для использования в основном файле
module.exports.handleQuestButton = handleQuestButton;