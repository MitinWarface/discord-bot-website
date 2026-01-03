const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Путь к файлу с данными о валюте
const economyPath = path.join(__dirname, '../System/economy.json');

// Загрузка данных о валюте
function loadEconomyData() {
    if (fs.existsSync(economyPath)) {
        const data = fs.readFileSync(economyPath, 'utf8');
        return JSON.parse(data);
    }
    return {};
}

// Сохранение данных о валюте
function saveEconomyData(data) {
    fs.writeFileSync(economyPath, JSON.stringify(data, null, 2));
}

// Получение профиля пользователя
function getUserProfile(userId) {
    const economyData = loadEconomyData();
    if (!economyData[userId]) {
        economyData[userId] = {
            coins: 0,
            bank: 0,
            lastDaily: null,
            lastWork: null,
            inventory: [],
            transactions: [],
            dailyStreak: 0
        };
        saveEconomyData(economyData);
    }
    return economyData[userId];
}

// Обновление профиля пользователя
function updateUserProfile(userId, updates) {
    const economyData = loadEconomyData();
    if (!economyData[userId]) {
        economyData[userId] = {
            coins: 0,
            bank: 0,
            lastDaily: null,
            lastWork: null,
            inventory: [],
            transactions: [],
            dailyStreak: 0
        };
    }
    
    for (const [key, value] of Object.entries(updates)) {
        economyData[userId][key] = value;
    }
    
    saveEconomyData(economyData);
    return economyData[userId];
}

// Проверка, можно ли получить ежедневную награду
function canClaimDaily(userId) {
    const user = getUserProfile(userId);
    if (!user.lastDaily) {
        return true;
    }
    
    const lastDaily = new Date(user.lastDaily);
    const now = new Date();
    const timeDiff = now - lastDaily;
    const daysDiff = timeDiff / (1000 * 60 * 24);
    
    return daysDiff >= 1;
}

// Выдача ежедневной награды
function claimDaily(userId) {
    const user = getUserProfile(userId);
    if (!canClaimDaily(userId)) {
        return { success: false, message: 'Вы уже получили ежедневную награду сегодня!' };
    }
    
    // Определяем базовую награду
    const baseReward = 100;
    // Добавляем бонус за ежедневную серию
    const streakBonus = user.dailyStreak * 10; // 10 бонусных монет за каждый день подряд
    const totalReward = baseReward + streakBonus;
    
    const newUser = updateUserProfile(userId, {
        coins: user.coins + totalReward,
        lastDaily: new Date().toISOString(),
        dailyStreak: user.dailyStreak + 1
    });
    
    // Добавляем транзакцию
    addTransaction(userId, 'daily', totalReward, `Ежедневная награда (серия: ${newUser.dailyStreak} дней)`);
    
    return {
        success: true,
        reward: totalReward,
        streak: newUser.dailyStreak,
        newBalance: newUser.coins
    };
}

// Проверка, можно ли получить награду за работу
function canWork(userId) {
    const user = getUserProfile(userId);
    if (!user.lastWork) {
        return true;
    }
    
    const lastWork = new Date(user.lastWork);
    const now = new Date();
    const timeDiff = now - lastWork;
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    return hoursDiff >= 12; // Работа раз в 12 часов
}

// Выполнение работы
function doWork(userId) {
    const user = getUserProfile(userId);
    if (!canWork(userId)) {
        const lastWork = new Date(user.lastWork);
        const nextWork = new Date(lastWork);
        nextWork.setHours(nextWork.getHours() + 12);
        
        return {
            success: false,
            message: `Вы можете работать снова <t:${Math.floor(nextWork.getTime()/1000)}:R>`
        };
    }
    
    // Разные профессии с разным доходом
    const jobs = [
        { name: 'Программист', min: 50, max: 150 },
        { name: 'Дизайнер', min: 40, max: 120 },
        { name: 'Модератор', min: 30, max: 100 },
        { name: 'Писатель', min: 25, max: 90 },
        { name: 'Музыкант', min: 35, max: 110 },
        { name: 'Художник', min: 30, max: 100 },
        { name: 'Строитель', min: 45, max: 130 },
        { name: 'Ученый', min: 60, max: 180 },
        { name: 'Кулинар', min: 20, max: 80 },
        { name: 'Фермер', min: 35, max: 95 }
    ];
    
    const randomJob = jobs[Math.floor(Math.random() * jobs.length)];
    const earnings = Math.floor(Math.random() * (randomJob.max - randomJob.min + 1)) + randomJob.min;
    
    const newUser = updateUserProfile(userId, {
        coins: user.coins + earnings,
        lastWork: new Date().toISOString()
    });
    
    // Добавляем транзакцию
    addTransaction(userId, 'work', earnings, `Работа: ${randomJob.name}`);
    
    return {
        success: true,
        job: randomJob.name,
        earnings: earnings,
        newBalance: newUser.coins
    };
}

// Добавление транзакции
function addTransaction(userId, type, amount, description) {
    const user = getUserProfile(userId);
    const transaction = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        type: type,
        amount: amount,
        description: description,
        timestamp: new Date().toISOString()
    };
    
    const transactions = user.transactions || [];
    transactions.push(transaction);
    
    // Ограничиваем историю транзакций до 50 последних
    if (transactions.length > 50) {
        transactions.shift();
    }
    
    updateUserProfile(userId, { transactions: transactions });
}

// Перевод монет пользователю
function transferCoins(fromUserId, toUserId, amount) {
    if (fromUserId === toUserId) {
        return { success: false, message: 'Вы не можете перевести монеты самому себе!' };
    }
    
    const fromUser = getUserProfile(fromUserId);
    const toUser = getUserProfile(toUserId);
    
    if (fromUser.coins < amount) {
        return { success: false, message: 'У вас недостаточно монет для перевода!' };
    }
    
    if (amount <= 0) {
        return { success: false, message: 'Сумма перевода должна быть больше 0!' };
    }
    
    // Обновляем балансы
    updateUserProfile(fromUserId, { coins: fromUser.coins - amount });
    updateUserProfile(toUserId, { coins: toUser.coins + amount });
    
    // Добавляем транзакции
    addTransaction(fromUserId, 'transfer_out', -amount, `Перевод пользователю <@${toUserId}>`);
    addTransaction(toUserId, 'transfer_in', amount, `Перевод от пользователя <@${fromUserId}>`);
    
    return {
        success: true,
        fromNewBalance: fromUser.coins - amount,
        toNewBalance: toUser.coins + amount
    };
}

// Получение топ пользователей по монетам
function getTopUsers(limit = 10) {
    const economyData = loadEconomyData();
    const users = Object.entries(economyData)
        .map(([userId, data]) => ({
            userId: userId,
            coins: data.coins,
            bank: data.bank,
            total: data.coins + data.bank
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);
    
    return users;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('economy')
        .setDescription('Команды экономической системы')
        .addSubcommand(subcommand =>
            subcommand
                .setName('balance')
                .setDescription('Проверить баланс')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Пользователь, баланс которого хотите проверить')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('daily')
                .setDescription('Получить ежедневную награду'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('work')
                .setDescription('Выполнить работу и получить награду'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('transfer')
                .setDescription('Перевести монеты пользователю')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Пользователь, которому хотите перевести монеты')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Количество монет для перевода')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('Показать таблицу лидеров по монетам'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('shop')
                .setDescription('Открыть магазин'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('inventory')
                .setDescription('Показать ваш инвентарь')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'balance':
                await handleBalance(interaction);
                break;
            case 'daily':
                await handleDaily(interaction);
                break;
            case 'work':
                await handleWork(interaction);
                break;
            case 'transfer':
                await handleTransfer(interaction);
                break;
            case 'leaderboard':
                await handleLeaderboard(interaction);
                break;
            case 'shop':
                await handleShop(interaction);
                break;
            case 'inventory':
                await handleInventory(interaction);
                break;
        }
    }
};

async function handleBalance(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const user = getUserProfile(targetUser.id);
    
    const balanceEmbed = new EmbedBuilder()
        .setTitle(`💰 Баланс ${targetUser.username}`)
        .setDescription(`<@${targetUser.id}>`)
        .addFields(
            { name: 'Монеты', value: `${user.coins.toLocaleString()}`, inline: true },
            { name: 'В банке', value: `${user.bank.toLocaleString()}`, inline: true },
            { name: 'Всего', value: `${(user.coins + user.bank).toLocaleString()}`, inline: true },
            { name: 'Ежедневная серия', value: `${user.dailyStreak} дней`, inline: true }
        )
        .setColor('#8b00ff')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp();
    
    await interaction.reply({ embeds: [balanceEmbed] });
}

async function handleDaily(interaction) {
    const result = claimDaily(interaction.user.id);
    
    if (result.success) {
        const dailyEmbed = new EmbedBuilder()
            .setTitle('🎁 Ежедневная награда')
            .setDescription(`Вы получили **${result.reward}** монет!`)
            .addFields(
                { name: 'Новый баланс', value: `${result.newBalance.toLocaleString()} монет`, inline: true },
                { name: 'Ежедневная серия', value: `${result.streak} дней подряд`, inline: true }
            )
            .setColor('#57f287')
            .setTimestamp();
        
        await interaction.reply({ embeds: [dailyEmbed] });
    } else {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription(result.message)
            .setColor('#ed4245')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleWork(interaction) {
    const result = doWork(interaction.user.id);
    
    if (result.success) {
        const workEmbed = new EmbedBuilder()
            .setTitle('💼 Работа выполнена')
            .setDescription(`Вы поработали как **${result.job}** и заработали **${result.earnings}** монет!`)
            .addFields(
                { name: 'Новый баланс', value: `${result.newBalance.toLocaleString()} монет`, inline: true }
            )
            .setColor('#57f287')
            .setTimestamp();
        
        await interaction.reply({ embeds: [workEmbed] });
    } else {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription(result.message)
            .setColor('#ed4245')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleTransfer(interaction) {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    
    // Проверяем, что пользователь не пытается перевести самому себе
    if (targetUser.id === interaction.user.id) {
        const selfTransferEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription('Вы не можете перевести монеты самому себе!')
            .setColor('#ed4245')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [selfTransferEmbed], ephemeral: true });
    }
    
    const result = transferCoins(interaction.user.id, targetUser.id, amount);
    
    if (result.success) {
        const transferEmbed = new EmbedBuilder()
            .setTitle('💸 Перевод совершен')
            .setDescription(`Вы перевели **${amount.toLocaleString()}** монет пользователю <@${targetUser.id}>`)
            .addFields(
                { name: 'Ваш баланс', value: `${result.fromNewBalance.toLocaleString()} монет`, inline: true },
                { name: 'Баланс получателя', value: `${result.toNewBalance.toLocaleString()} монет`, inline: true }
            )
            .setColor('#57f287')
            .setTimestamp();
        
        await interaction.reply({ embeds: [transferEmbed] });
    } else {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription(result.message)
            .setColor('#ed4245')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleLeaderboard(interaction) {
    const topUsers = getTopUsers(10);
    
    if (topUsers.length === 0) {
        const emptyEmbed = new EmbedBuilder()
            .setTitle('🏆 Таблица лидеров')
            .setDescription('Пока никто не заработал монет.')
            .setColor('#8b00ff')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [emptyEmbed] });
    }
    
    let leaderboardText = '';
    for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
        const member = await interaction.guild.members.fetch(user.userId).catch(() => null);
        const userName = member ? member.user.username : 'Неизвестный пользователь';
        const position = i + 1;
        const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
        
        leaderboardText += `${medal} **${userName}** - ${(user.total).toLocaleString()} монет\n`;
    }
    
    const leaderboardEmbed = new EmbedBuilder()
        .setTitle('🏆 Таблица лидеров по монетам')
        .setDescription(leaderboardText)
        .setColor('#8b00ff')
        .setTimestamp();
    
    await interaction.reply({ embeds: [leaderboardEmbed] });
}

async function handleShop(interaction) {
    // Заглушка для магазина
    const shopEmbed = new EmbedBuilder()
        .setTitle('🏪 Магазин')
        .setDescription('Добро пожаловать в магазин! Здесь вы можете приобрести различные предметы за монеты.\n\nНастройка магазина в процессе...')
        .setColor('#8b00ff')
        .setTimestamp();
    
    await interaction.reply({ embeds: [shopEmbed] });
}

async function handleInventory(interaction) {
    const user = getUserProfile(interaction.user.id);
    const inventory = user.inventory || [];
    
    if (inventory.length === 0) {
        const emptyEmbed = new EmbedBuilder()
            .setTitle('🎒 Ваш инвентарь')
            .setDescription('Ваш инвентарь пуст. Посетите магазин, чтобы купить что-нибудь!')
            .setColor('#95a5a6')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [emptyEmbed] });
    }
    
    // Группируем предметы по типам и считаем количество
    const itemsCount = {};
    inventory.forEach(item => {
        if (itemsCount[item.id]) {
            itemsCount[item.id].count++;
        } else {
            itemsCount[item.id] = {
                ...item,
                count: 1
            };
        }
    });
    
    let inventoryText = '';
    for (const itemId in itemsCount) {
        const item = itemsCount[itemId];
        inventoryText += `**${item.name}** ×${item.count}\n${item.description}\n\n`;
    }
    
    const invEmbed = new EmbedBuilder()
        .setTitle('🎒 Ваш инвентарь')
        .setDescription(`У вас в инвентаре **${inventory.length}** предметов:\n\n${inventoryText}`)
        .setColor('#8b00ff')
        .setTimestamp();
    
    await interaction.reply({ embeds: [invEmbed] });
}