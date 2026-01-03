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
        templates: [], // Шаблоны квестов
        userQuests: {}, // Активные квесты пользователей
        completedQuests: {} // Завершенные квесты пользователей
    };
}

// Сохранение данных о квестах
function saveQuestsData(data) {
    fs.writeFileSync(questsPath, JSON.stringify(data, null, 2));
}

// Получение шаблонов квестов
function getQuestTemplates() {
    const questsData = loadQuestsData();
    return questsData.templates;
}

// Получение активных квестов пользователя
function getUserQuests(userId) {
    const questsData = loadQuestsData();
    return questsData.userQuests[userId] || [];
}

// Получение завершенных квестов пользователя
function getCompletedUserQuests(userId) {
    const questsData = loadQuestsData();
    return questsData.completedQuests[userId] || [];
}

// Добавление квеста пользователю
function addUserQuest(userId, questTemplate) {
    const questsData = loadQuestsData();
    
    if (!questsData.userQuests[userId]) {
        questsData.userQuests[userId] = [];
    }
    
    // Проверяем, не выполняет ли пользователь уже этот квест
    const existingQuest = questsData.userQuests[userId].find(q => q.id === questTemplate.id);
    if (existingQuest) {
        return { success: false, message: 'Вы уже выполняете этот квест!' };
    }
    
    // Создаем экземпляр квеста для пользователя
    const userQuest = {
        id: questTemplate.id,
        name: questTemplate.name,
        description: questTemplate.description,
        type: questTemplate.type,
        target: questTemplate.target,
        reward: questTemplate.reward,
        progress: 0,
        startedAt: new Date().toISOString(),
        expiresAt: questTemplate.duration ? new Date(Date.now() + questTemplate.duration * 24 * 60 * 1000).toISOString() : null
    };
    
    questsData.userQuests[userId].push(userQuest);
    saveQuestsData(questsData);
    
    return { success: true, quest: userQuest };
}

// Обновление прогресса квеста
function updateQuestProgress(userId, questId, amount = 1) {
    const questsData = loadQuestsData();
    const userQuests = questsData.userQuests[userId] || [];
    
    const questIndex = userQuests.findIndex(q => q.id === questId);
    if (questIndex === -1) {
        return { success: false, message: 'Квест не найден!' };
    }
    
    const quest = userQuests[questIndex];
    
    // Обновляем прогресс
    quest.progress = Math.min(quest.progress + amount, quest.target);
    
    let completed = false;
    if (quest.progress >= quest.target) {
        // Квест завершен
        completed = true;
        
        // Перемещаем в завершенные
        if (!questsData.completedQuests[userId]) {
            questsData.completedQuests[userId] = [];
        }
        
        // Добавляем квест в завершенные
        const completedQuest = { ...quest, completedAt: new Date().toISOString() };
        questsData.completedQuests[userId].push(completedQuest);
        
        // Удаляем из активных
        userQuests.splice(questIndex, 1);
        
        // Начисляем награду
        const { updateUserProfile } = require('../System/userProfiles');
        const user = getUserProfile(userId);
        updateUserProfile(userId, {
            points: user.points + (quest.reward.points || 0),
            level: user.level + (quest.reward.levels || 0)
        });
    }
    
    saveQuestsData(questsData);
    
    return {
        success: true,
        progress: quest.progress,
        target: quest.target,
        completed: completed,
        reward: completed ? quest.reward : null
    };
}

// Получение случайного квеста
function getRandomQuest(excludeTypes = []) {
    const templates = getQuestTemplates();
    const availableQuests = templates.filter(q => !excludeTypes.includes(q.type));
    
    if (availableQuests.length === 0) {
        return null;
    }
    
    return availableQuests[Math.floor(Math.random() * availableQuests.length)];
}

// Система квестов
module.exports = {
    data: new SlashCommandBuilder()
        .setName('quest')
        .setDescription('Система квестов')
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
                .setName('take')
                .setDescription('Взять квест')
                .addStringOption(option =>
                    option.setName('quest_id')
                        .setDescription('ID квеста для взятия')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('complete')
                .setDescription('Показать завершенные квесты')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'list':
                await handleListQuests(interaction);
                break;
            case 'available':
                await handleAvailableQuests(interaction);
                break;
            case 'take':
                await handleTakeQuest(interaction);
                break;
            case 'complete':
                await handleCompletedQuests(interaction);
                break;
        }
    }
};

async function handleListQuests(interaction) {
    const userQuests = getUserQuests(interaction.user.id);
    
    if (userQuests.length === 0) {
        const noQuestsEmbed = new EmbedBuilder()
            .setTitle('📝 Активные квесты')
            .setDescription('У вас нет активных квестов. Используйте `/quest available`, чтобы посмотреть доступные квесты.')
            .setColor('#8b00ff')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [noQuestsEmbed], ephemeral: true });
    }
    
    const questsEmbed = new EmbedBuilder()
        .setTitle('📝 Активные квесты')
        .setColor('#8b00ff')
        .setTimestamp();
    
    for (const quest of userQuests) {
        const progressPercentage = Math.round((quest.progress / quest.target) * 100);
        const progressBar = '█'.repeat(Math.floor(progressPercentage / 10)).padEnd(10, '░');
        
        let expiresText = '';
        if (quest.expiresAt) {
            const expiryDate = new Date(quest.expiresAt);
            expiresText = `\nИстекает: <t:${Math.floor(expiryDate.getTime()/1000)}:R>`;
        }
        
        questsEmbed.addFields({
            name: `${quest.name} (ID: ${quest.id})`,
            value: `${quest.description}\nПрогресс: ${progressBar} ${progressPercentage}% (${quest.progress}/${quest.target})\nНаграда: ${quest.reward.points || 0} очков, ${quest.reward.levels || 0} уровней${expiresText}`,
            inline: false
        });
    }
    
    await interaction.reply({ embeds: [questsEmbed], ephemeral: true });
}

async function handleAvailableQuests(interaction) {
    const allTemplates = getQuestTemplates();
    const userQuests = getUserQuests(interaction.user.id);
    const completedQuests = getCompletedUserQuests(interaction.user.id);
    
    // Исключаем уже взятые и завершенные квесты
    const excludeIds = [...userQuests, ...completedQuests].map(q => q.id);
    const availableQuests = allTemplates.filter(q => !excludeIds.includes(q.id));
    
    if (availableQuests.length === 0) {
        const noAvailableEmbed = new EmbedBuilder()
            .setTitle('📋 Доступные квесты')
            .setDescription('Нет доступных квестов. Попробуйте позже!')
            .setColor('#8b00ff')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [noAvailableEmbed], ephemeral: true });
    }
    
    const availableEmbed = new EmbedBuilder()
        .setTitle('📋 Доступные квесты')
        .setDescription(`Всего доступно квестов: **${availableQuests.length}**`)
        .setColor('#8b00ff')
        .setTimestamp();
    
    // Показываем первые 10 доступных квестов
    const questsToShow = availableQuests.slice(0, 10);
    
    for (const quest of questsToShow) {
        availableEmbed.addFields({
            name: `${quest.name} (ID: ${quest.id})`,
            value: `${quest.description}\nТип: ${quest.type}\nЦель: ${quest.target}\nНаграда: ${quest.reward.points || 0} очков, ${quest.reward.levels || 0} уровней`,
            inline: false
        });
    }
    
    if (availableQuests.length > 10) {
        availableEmbed.setFooter({ text: `Показаны первые 10 из ${availableQuests.length} квестов`, iconURL: interaction.client.user.displayAvatarURL() });
    }
    
    // Создаем кнопки для взятия квестов (если доступно не более 5 квестов)
    if (availableQuests.length <= 5) {
        const rows = [];
        let currentRow = new ActionRowBuilder();
        let buttonCount = 0;
        
        for (const quest of availableQuests) {
            if (buttonCount >= 5) { // Максимум 5 кнопок в строке
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
                buttonCount = 0;
            }
            
            currentRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`take_quest_${quest.id}`)
                    .setLabel(`Взять: ${quest.name.substring(0, 20)}`)
                    .setStyle(ButtonStyle.Success)
            );
            
            buttonCount++;
        }
        
        if (buttonCount > 0) {
            rows.push(currentRow);
        }
        
        await interaction.reply({ embeds: [availableEmbed], components: rows, ephemeral: true });
    } else {
        await interaction.reply({ embeds: [availableEmbed], ephemeral: true });
    }
}

async function handleTakeQuest(interaction) {
    const questId = interaction.options.getString('quest_id');
    const allTemplates = getQuestTemplates();
    const questTemplate = allTemplates.find(q => q.id === questId);
    
    if (!questTemplate) {
        const notFoundEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription('Квест с таким ID не найден!')
            .setColor('#ff0000')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [notFoundEmbed], ephemeral: true });
    }
    
    // Проверяем, не выполняет ли пользователь уже этот квест
    const userQuests = getUserQuests(interaction.user.id);
    const existingQuest = userQuests.find(q => q.id === questId);
    
    if (existingQuest) {
        const alreadyHaveEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription('Вы уже выполняете этот квест!')
            .setColor('#ff0000')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [alreadyHaveEmbed], ephemeral: true });
    }
    
    // Добавляем квест пользователю
    const result = addUserQuest(interaction.user.id, questTemplate);
    
    if (result.success) {
        const takeEmbed = new EmbedBuilder()
            .setTitle('✅ Квест взят')
            .setDescription(`Вы взяли квест: **${result.quest.name}**`)
            .addFields(
                { name: 'Описание', value: result.quest.description, inline: false },
                { name: 'Цель', value: `Выполнить ${result.quest.target} раз(а)`, inline: true },
                { name: 'Награда', value: `${result.quest.reward.points || 0} очков, ${result.quest.reward.levels || 0} уровней`, inline: true }
            )
            .setColor('#57f287')
            .setTimestamp();
        
        await interaction.reply({ embeds: [takeEmbed] });
    } else {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription(result.message)
            .setColor('#ff0000')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleCompletedQuests(interaction) {
    const completedQuests = getCompletedUserQuests(interaction.user.id);
    
    if (completedQuests.length === 0) {
        const noCompletedEmbed = new EmbedBuilder()
            .setTitle('✅ Завершенные квесты')
            .setDescription('Вы еще не завершили ни одного квеста.')
            .setColor('#8b00ff')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [noCompletedEmbed], ephemeral: true });
    }
    
    // Сортируем по дате завершения (новые сверху)
    const sortedQuests = completedQuests.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    
    const completedEmbed = new EmbedBuilder()
        .setTitle('✅ Завершенные квесты')
        .setDescription(`Всего завершено квестов: **${completedQuests.length}**`)
        .setColor('#8b00ff')
        .setTimestamp();
    
    // Показываем последние 10 завершенных квестов
    const questsToShow = sortedQuests.slice(0, 10);
    
    for (const quest of questsToShow) {
        const completedDate = new Date(quest.completedAt);
        completedEmbed.addFields({
            name: `${quest.name} (ID: ${quest.id})`,
            value: `${quest.description}\nЗавершен: <t:${Math.floor(completedDate.getTime()/1000)}:R>\nПолучено: ${quest.reward.points || 0} очков, ${quest.reward.levels || 0} уровней`,
            inline: false
        });
    }
    
    if (sortedQuests.length > 10) {
        completedEmbed.setFooter({ text: `Показаны последние 10 из ${sortedQuests.length} завершенных квестов`, iconURL: interaction.client.user.displayAvatarURL() });
    }
    
    await interaction.reply({ embeds: [completedEmbed], ephemeral: true });
}