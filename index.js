const { Client, Events, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dotenv = require('dotenv');
dotenv.config(); // Загружаем переменные окружения из .env файла

const fs = require('fs');
const path = require('path');
const { updateUserProfile, getUserProfile, getTopUsers, canClaimDaily, claimDaily } = require('./System/userProfiles');
const shopItems = require('./shopItems');
const NotificationSystem = require('./System/notificationSystem');
const { getUpcomingEvents, cleanupPastEvents } = require('./System/eventSystem');

// Инициализация Lavalink
const { initializeLavalink } = require('./System/Audio/lavalinkSystem');
const lavalinkConfig = require('./Config/lavalink-config');

// Создание клиента Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Для обработки префиксных команд
        // GatewayIntentBits.GuildVoiceStates // Для обработки голосовых состояний
    ],
});

// Инициализируем Lavalink
initializeLavalink(client, lavalinkConfig);

// Создание экземпляра системы уведомлений
const notificationSystem = new NotificationSystem(client);

// Коллекция для хранения команд
client.commands = new Collection();

// Загрузка команд
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];

// Список команд, которые содержат подкоманды и могут вызвать ошибки
const commandsWithSubcommands = [
    'automod.js', 'customcommand.js', 'economy.js', 'event.js', 'events.js',
    'games.js', 'guild.js', 'level.js', 'logging.js', 'quests.js',
    'reactionrole.js', 'serverstats.js', 'ticket.js'
];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commandModule = require(filePath);
    
    // Пропускаем команды, которые содержат подкоманды
    if (commandsWithSubcommands.includes(file)) {
        console.log(`Пропускаем команду с подкомандами: ${file}`);
        continue;
    }
    
    // Проверяем, является ли экспорт обычной командой (имеет data и execute)
    if (commandModule && typeof commandModule === 'object' && commandModule.data && commandModule.execute) {
        // Это обычная команда
        client.commands.set(commandModule.data.name, commandModule);
        commands.push(commandModule.data.toJSON());
        console.log(`Загружена команда: ${commandModule.data.name}`);
    } 
    // Если это не обычная команда, пропускаем
    else {
        console.log(`Предупреждение: Файл команды ${file} не экспортирует действительную команду, пропускаем...`);
    }
    
    // Удаляем кэш модуля, чтобы избежать проблем при последующих чтениях
    delete require.cache[require.resolve(filePath)];
}

// Обработка события готовности бота
client.once(Events.ClientReady, c => {
    console.log(`Готов! Бот ${c.user.tag} запущен.`);
    
    // Регистрация slash-команд
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    (async () => {
        try {
            console.log(`Началась перезагрузка ${commands.length} (/) команд.`);
            
            // Обновление slash-команд на сервере
            await rest.put(
                Routes.applicationGuildCommands(c.user.id, process.env.GUILD_ID), // Для одного сервера
                { body: commands },
            );
            
            console.log(`Успешно перезагружено ${commands.length} (/) команд.`);
        } catch (error) {
            console.error(error);
        }
    })();
});

// Обработка slash-команд и нажатий на кнопки
client.on(Events.InteractionCreate, async interaction => {
    // Обработка slash-команд
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`Команда ${interaction.commandName} не найдена!`);
            return;
        }

        try {
            await command.execute(interaction);
            
            // Начисление очков за использование команды
            const userProfile = getUserProfile(interaction.user.id);
            const pointsToAdd = Math.floor(Math.random() * 3) + 1; // 1-3 очка за команду
            const newPoints = userProfile.points + pointsToAdd;
            const newLevel = Math.floor(newPoints / 10) + 1; // Уровень увеличивается каждые 10 очков
            
            // Проверяем, повысился ли уровень
            const levelUp = newLevel > userProfile.level;
            
            // Обновляем прогресс квестов на использование команд
            const firstCommandQuestResult = require('./System/userProfiles').updateQuestProgress(interaction.user.id, 'first_command');
            const fiveCommandsQuestResult = require('./System/userProfiles').updateQuestProgress(interaction.user.id, 'five_commands');
            
            // Также обновляем прогресс квеста на использование команд
            try {
                require('./System/userProfiles').updateQuestProgressByType(interaction.user.id, 'command', 1);
            } catch (error) {
                console.error('Ошибка при обновлении прогресса квеста на команды:', error);
            }
            
            // Если пользователь состоит в гильдии, добавляем опыт гильдии
            const userGuild = require('./System/guildSystem').getUserGuild(interaction.user.id);
            if (userGuild) {
                require('./System/guildSystem').addGuildExpFromMember(userGuild.id, 1); // 1 очко опыта за команду
            }
            
            updateUserProfile(interaction.user.id, {
                points: newPoints,
                level: newLevel,
                username: interaction.user.username
            });
            
            // Отправляем уведомление о повышении уровня, если уровень повысился
            if (levelUp) {
                notificationSystem.sendLevelUpNotification(interaction.user.id, newLevel)
                    .catch(error => {
                        console.error('Ошибка при отправке уведомления о повышении уровня:', error);
                    });
            }
            
            // Если квест был завершен, показываем сообщение
            if (firstCommandQuestResult && firstCommandQuestResult.completed) {
                const questCompletedEmbed = new EmbedBuilder()
                    .setTitle('🏆 Квест выполнен!')
                    .setColor('#8b00ff')
                    .setDescription(`Поздравляем! Вы выполнили квест: **${'Исследователь'}**`)
                    .addFields(
                        { name: 'Награда', value: `${firstCommandQuestResult.reward || 0} очков`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Квест завершен`, iconURL: interaction.user.displayAvatarURL() });
                
                // Отправляем сообщение пользователю
                await interaction.followUp({ embeds: [questCompletedEmbed], ephemeral: true });
                
                // Отправляем уведомление пользователю
                try {
                    await notificationSystem.sendQuestNotification(interaction.user.id, {
                        name: 'Частый пользователь',
                        description: 'Выполнил пять команд',
                        reward: { points: fiveCommandsQuestResult.reward || 0 },
                        type: 'command'
                    });
                } catch (error) {
                    console.error('Ошибка при отправке уведомления о квесте:', error);
                }
                
                // Отправляем уведомление пользователю
                try {
                    await notificationSystem.sendQuestNotification(interaction.user.id, {
                        name: 'Исследователь',
                        description: 'Выполнил свою первую команду',
                        reward: { points: firstCommandQuestResult.reward || 0 },
                        type: 'command'
                    });
                } catch (error) {
                    console.error('Ошибка при отправке уведомления о квесте:', error);
                }
            } else if (fiveCommandsQuestResult && fiveCommandsQuestResult.completed) {
                const questCompletedEmbed = new EmbedBuilder()
                    .setTitle('🏆 Квест выполнен!')
                    .setColor('#8b00ff')
                    .setDescription(`Поздравляем! Вы выполнили квест: **${'Частый пользователь'}**`)
                    .addFields(
                        { name: 'Награда', value: `${fiveCommandsQuestResult.reward || 0} очков`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Квест завершен`, iconURL: interaction.user.displayAvatarURL() });
                
                // Отправляем сообщение пользователю
                await interaction.followUp({ embeds: [questCompletedEmbed], ephemeral: true });
            }
        } catch (error) {
            console.error(error);
            
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: 'Ошибка при выполнении команды!',
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: 'Ошибка при выполнении команды!',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('Ошибка при отправке сообщения об ошибке:', replyError);
            }
        }
    }
    // Обработка нажатий на кнопки
    else if (interaction.isButton()) {
        try {
            // Обработка покупок в магазине
            if (interaction.customId.startsWith('buy_')) {
                await handleShopPurchase(interaction);
                
                // Начисление очков за нажатие кнопки
                const purchaseUserProfile = getUserProfile(interaction.user.id);
                const pointsToAdd = 1; // 1 очко за нажатие кнопки
                const newPoints = purchaseUserProfile.points + pointsToAdd;
                const newLevel = Math.floor(newPoints / 10) + 1; // Уровень увеличивается каждые 10 очков
                
                updateUserProfile(interaction.user.id, {
                    points: newPoints,
                    level: newLevel,
                    username: interaction.user.username
                });
                
                return; // Возвращаемся после обработки покупки
            }
            
            
            // Обработка различных кнопок
            switch (interaction.customId) {
                case 'aurora_info':
                    const infoEmbed = new EmbedBuilder()
                        .setTitle('ℹ️ Информация о боте Aurora')
                        .setColor('#8b00ff')
                        .setDescription('Добро пожаловать в многофункционального бота Aurora!\nЭтот бот предоставляет широкий спектр возможностей для взаимодействия с сообществом.')
                        .addFields(
                            { name: '📊 Система уровней', value: 'Пользователи получают очки и повышают уровень', inline: false },
                            { name: '🎯 Квесты', value: 'Выполняйте задания и получайте награды', inline: false },
                            { name: '👥 Гильдии', value: 'Создавайте или присоединяйтесь к гильдиям', inline: false },
                            { name: '💎 Магазин', value: 'Покупайте крутые предметы за очки', inline: false },
                            { name: '🎒 Инвентарь', value: 'Собирайте и просматривайте свои приобретения', inline: false },
                            { name: '⭐ Репутация', value: 'Выдайте репутацию другим участникам сервера', inline: false },
                            { name: '🔧 Модерация', value: 'Команды для модерации сервера (warn, kick, ban)', inline: false },
                            // { name: '🎵 Музыка', value: 'Воспроизводите музыку из YouTube', inline: false },
                            { name: '🎁 Ежедневная награда', value: 'Получайте награды раз в день', inline: false },
                            { name: '🎊 События', value: 'Участвуйте в событиях и получайте награды', inline: false },
                            { name: '⚙️ Настройки', value: 'Персонализация опыта использования', inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: `Информация для ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });
    
                    // Создаем кнопки для главного меню
                    const auroraButtonsRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('aurora_profile')
                                .setLabel('Профиль')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('👤'),
                            new ButtonBuilder()
                                .setCustomId('aurora_leaderboard')
                                .setLabel('Лидеры')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('🏆'),
                            new ButtonBuilder()
                                .setCustomId('aurora_daily')
                                .setLabel('Ежедневно')
                                .setStyle(ButtonStyle.Success)
                                .setEmoji('🎁'),
                            new ButtonBuilder()
                                .setCustomId('aurora_events')
                                .setLabel('События')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('🎊'),
                            new ButtonBuilder()
                                .setCustomId('aurora_close')
                                .setLabel('Закрыть')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('❌')
                        );
    
                    await interaction.reply({
                        embeds: [infoEmbed],
                        components: [auroraButtonsRow],
                        ephemeral: true
                    });
                    break;
                    
                case 'aurora_settings':
                    const settingsEmbed = new EmbedBuilder()
                        .setTitle('⚙️ Настройки бота')
                        .setColor('#8b00ff')
                        .setDescription('Вот список доступных настроек бота:')
                        .addFields(
                            { name: 'Язык', value: 'Русский 🇷🇺 (по умолчанию)', inline: false },
                            { name: 'Уведомления', value: 'Вкл/Выкл уведомлений о квестах', inline: false },
                            { name: 'Приватность', value: 'Настройки видимости профиля', inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: `Настройки`, iconURL: interaction.user.displayAvatarURL() });
 
                    // Создаем кнопки для управления настройками
                    const settingsButtonsRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('settings_language')
                                .setLabel('Язык')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('🌐'),
                            new ButtonBuilder()
                                .setCustomId('settings_notifications')
                                .setLabel('Уведомления')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('🔔'),
                            new ButtonBuilder()
                                .setCustomId('settings_privacy')
                                .setLabel('Приватность')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('🔒')
                        );
 
                    await interaction.reply({
                        embeds: [settingsEmbed],
                        components: [settingsButtonsRow],
                        ephemeral: true
                    });
                    break;
                    
                case 'aurora_help':
                    const helpEmbed = new EmbedBuilder()
                        .setTitle('❓ Помощь по боту')
                        .setColor('#8b00ff')
                        .setDescription('Вот список всех доступных команд бота:')
                        .addFields(
                            { name: '`/aurora`', value: 'Главное интерактивное меню с кнопками', inline: false },
                            { name: '`/profile`', value: 'Просмотр вашего профиля', inline: false },
                            { name: '`/leaderboard`', value: 'Таблица лидеров по очкам', inline: false },
                            { name: '`/daily`', value: 'Ежедневная награда', inline: false },
                            { name: '`/shop`', value: 'Виртуальный магазин', inline: false },
                            { name: '`/inventory`', value: 'Ваш инвентарь', inline: false },
                            { name: '`/quests`', value: 'Система квестов', inline: false },
                            { name: '`/guild`', value: 'Система гильдий', inline: false },
                            { name: '`/rep`', value: 'Выдать репутацию пользователю', inline: false },
                            { name: '`/warn`', value: 'Выдать предупреждение пользователю (<@&1399365865908211814>, <@&1399359075657056428>)', inline: false },
                            { name: '`/kick`', value: 'Выгнать пользователя с сервера (<@&139936586590821814>, <@&1399359075657056428>)', inline: false },
                            { name: '`/ban`', value: 'Заблокировать пользователя на сервере (<@&1399365865908211814>, <@&1399359075657056428>)', inline: false },
                            { name: '**💡 Дополнительно**', value: 'Вы также можете использовать префикс `*aurora` вместо `/aurora`', inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: `Помощь`, iconURL: interaction.user.displayAvatarURL() });
 
                    await interaction.reply({
                        embeds: [helpEmbed],
                        ephemeral: false
                    });
                    break;
                    
                case 'aurora_close':
                    await interaction.update({
                        content: 'Меню Aurora закрыто.',
                        embeds: [],
                        components: []
                    });
                    break;
                    
                case 'aurora_profile':
                    // Показываем профиль пользователя в виде embed
                    const userProfile = getUserProfile(interaction.user.id);
                    
                    const profileEmbed = new EmbedBuilder()
                        .setTitle(`Профиль: ${interaction.user.username}`)
                        .setColor('#8b00ff')
                        .setThumbnail(interaction.user.displayAvatarURL())
                        .addFields(
                            { name: 'Уровень', value: userProfile.level.toString(), inline: true },
                            { name: 'Очки', value: userProfile.points.toString(), inline: true },
                            { name: 'Дата регистрации', value: new Date(userProfile.joinDate).toLocaleDateString('ru-RU'), inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: `ID: ${interaction.user.id}`, iconURL: interaction.user.displayAvatarURL() });
 
                    await interaction.reply({
                        embeds: [profileEmbed],
                        ephemeral: true
                    });
                    break;
                    
                case 'aurora_leaderboard':
                    // Показываем топ пользователей в виде embed
                    const topUsers = getTopUsers(5);
                    
                    if (topUsers.length === 0) {
                        await interaction.reply({
                            content: 'Нет данных для отображения.',
                            ephemeral: true
                        });
                        return;
                    }
                    
                    const leaderboardEmbed = new EmbedBuilder()
                        .setTitle('🏆 Топ пользователей')
                        .setColor('#8b00ff')
                        .setTimestamp()
                        .setFooter({ text: `Запрос от ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });
 
                    // Добавляем поля для каждого пользователя в топе
                    for (let i = 0; i < topUsers.length; i++) {
                        const user = topUsers[i];
                        const position = i + 1;
                        const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
                        
                        leaderboardEmbed.addFields({
                            name: `${medal} ${user.username}`,
                            value: `Уровень: ${user.level} | Очки: ${user.points}`,
                            inline: false
                        });
                    }
                    
                    await interaction.reply({
                        embeds: [leaderboardEmbed],
                        ephemeral: true
                    });
                    break;
                    
                case 'aurora_daily':
                    // Обработка нажатия на кнопку ежедневной награды
                    if (canClaimDaily(interaction.user.id)) {
                        const result = claimDaily(interaction.user.id);
                        
                        if (result.success) {
                            // Обновляем прогресс квеста на ежедневную награду
                            const dailyQuestResult = require('./System/userProfiles').updateQuestProgress(interaction.user.id, 'daily_streak');
                            
                            // Также обновляем прогресс квеста на использование daily по типу
                            try {
                                require('./System/userProfiles').updateQuestProgressByType(interaction.user.id, 'daily', 1);
                            } catch (error) {
                                console.error('Ошибка при обновлении прогресса квеста на ежедневную награду:', error);
                            }
                            
                            // Проверяем, повысился ли уровень
                            const userProfile = getUserProfile(interaction.user.id);
                            const levelUp = result.newLevel > userProfile.level;
                            
                            const dailyEmbed = new EmbedBuilder()
                                .setTitle('🎁 Ежедневная награда')
                                .setColor('#8b00ff')
                                .setDescription(`Поздравляем! Вы получили ${result.reward} очков!`)
                                .addFields(
                                    { name: 'Всего очков', value: result.newPoints.toString(), inline: true },
                                    { name: 'Уровень', value: result.newLevel.toString(), inline: true }
                                )
                                .setTimestamp()
                                .setFooter({ text: `Награда получена`, iconURL: interaction.user.displayAvatarURL() });
    
                            await interaction.reply({ embeds: [dailyEmbed], ephemeral: false });
                            
                            // Отправляем уведомление о повышении уровня, если уровень повысился
                            if (levelUp) {
                                notificationSystem.sendLevelUpNotification(interaction.user.id, result.newLevel)
                                    .catch(error => {
                                        console.error('Ошибка при отправке уведомления о повышении уровня:', error);
                                    });
                            }
                            
                            // Если квест был завершен, показываем сообщение
                            if (dailyQuestResult.completed) {
                                const questCompletedEmbed = new EmbedBuilder()
                                    .setTitle('🏆 Квест выполнен!')
                                    .setColor('#f1c40f')
                                    .setDescription(`Поздравляем! Вы выполнили квест: **${'Ежедневный герой'}**`)
                                    .addFields(
                                        { name: 'Награда', value: `${dailyQuestResult.reward || 0} очков`, inline: true }
                                    )
                                    .setTimestamp()
                                    .setFooter({ text: `Квест завершен`, iconURL: interaction.user.displayAvatarURL() });
                                
                                // Отправляем сообщение пользователю
                                await interaction.followUp({ embeds: [questCompletedEmbed], ephemeral: true });
                                
                                // Отправляем уведомление пользователю
                                try {
                                    await notificationSystem.sendQuestNotification(interaction.user.id, {
                                        name: 'Ежедневный герой',
                                        description: 'Получил ежедневную награду несколько дней подряд',
                                        reward: { points: dailyQuestResult.reward || 0 },
                                        type: 'daily'
                                    });
                                } catch (error) {
                                    console.error('Ошибка при отправке уведомления о квесте:', error);
                                }
                            }
                            
                            // Если пользователь состоит в гильдии, добавляем опыт гильдии
                            const userGuild = require('./System/guildSystem').getUserGuild(interaction.user.id);
                            if (userGuild) {
                                require('./System/guildSystem').addGuildExperience(userGuild.id, 2); // 2 очка опыта за ежедневную награду
                            }
                        }
                    } else {
                        const userProfile = getUserProfile(interaction.user.id);
                        const lastDaily = new Date(userProfile.lastDaily);
                        const nextDaily = new Date(lastDaily);
                        nextDaily.setDate(nextDaily.getDate() + 1); // Следующая награда завтра
                        
                        const timeUntilNext = nextDaily - Date.now();
                        const hours = Math.floor(timeUntilNext / (1000 * 60));
                        const minutes = Math.floor((timeUntilNext % (100 * 60)) / (1000 * 60));
                        
                        const dailyEmbed = new EmbedBuilder()
                            .setTitle('⏳ Ежедневная награда')
                            .setColor('#8b00ff')
                            .setDescription(`Вы уже получили ежедневную награду!\nСледующая награда будет доступна через ${hours}ч ${minutes}м`)
                            .setTimestamp()
                            .setFooter({ text: `Попробуйте позже`, iconURL: interaction.user.displayAvatarURL() });
 
                        await interaction.reply({ embeds: [dailyEmbed], ephemeral: true });
                    }
                    break;
                    
                case 'aurora_shop':
                    // Открываем магазин
                    const shopUserProfile = getUserProfile(interaction.user.id);
                    const userPoints = shopUserProfile.points;
                    
                    // Создаем Embed с товарами магазина
                    const shopEmbed = new EmbedBuilder()
                        .setTitle('🛒 Виртуальный магазин')
                        .setColor('#8b00ff')
                        .setDescription(`Ваши очки: **${userPoints}**\n\nВыберите товар для покупки:`)
                        .setTimestamp()
                        .setFooter({ text: `Aurora Shop`, iconURL: interaction.client.user.displayAvatarURL() });
 
                    // Добавляем информацию о товарах
                    for (const item of shopItems) {
                        const affordable = userPoints >= item.price ? '✅' : '❌';
                        shopEmbed.addFields({
                            name: `${affordable} ${item.name} - ${item.price} очков`,
                            value: `${item.description}`,
                            inline: false
                        });
                    }
 
                    // Создаем кнопки для покупки товаров
                    const rows = [];
                    let currentRow = new ActionRowBuilder();
                    let buttonCount = 0;
 
                    for (const item of shopItems) {
                        if (buttonCount >= 5) { // Максимум 5 кнопок в строке
                            rows.push(currentRow);
                            currentRow = new ActionRowBuilder();
                            buttonCount = 0;
                        }
 
                        const button = new ButtonBuilder()
                            .setCustomId(`buy_${item.id}`)
                            .setLabel(item.name)
                            .setStyle(userPoints >= item.price ? ButtonStyle.Success : ButtonStyle.Secondary)
                            .setDisabled(userPoints < item.price);
 
                        currentRow.addComponents(button);
                        buttonCount++;
                    }
 
                    if (buttonCount > 0) {
                        rows.push(currentRow);
                    }
 
                    await interaction.reply({
                        embeds: [shopEmbed],
                        components: rows,
                        ephemeral: false
                    });
                    break;
                    
                case 'aurora_inventory':
                    // Показываем инвентарь
                    const inventoryUserProfile = getUserProfile(interaction.user.id);
                    const inventory = inventoryUserProfile.inventory || [];
                    
                    if (inventory.length === 0) {
                        const invEmbed = new EmbedBuilder()
                            .setTitle('🎒 Ваш инвентарь')
                            .setColor('#95a5a6')
                            .setDescription('Ваш инвентарь пуст. Посетите магазин, чтобы купить что-нибудь!')
                            .setTimestamp()
                            .setFooter({ text: `Инвентарь`, iconURL: interaction.user.displayAvatarURL() });
 
                        await interaction.reply({ embeds: [invEmbed], ephemeral: true });
                        return;
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
                    
                    const invEmbed = new EmbedBuilder()
                        .setTitle('🎒 Ваш инвентарь')
                        .setColor('#8b00ff')
                        .setDescription(`У вас в инвентаре **${inventory.length}** предметов`)
                        .setTimestamp()
                        .setFooter({ text: `Инвентарь`, iconURL: interaction.user.displayAvatarURL() });
 
                    // Добавляем информацию о каждом уникальном предмете
                    for (const itemId in itemsCount) {
                        const item = itemsCount[itemId];
                        invEmbed.addFields({
                            name: `${item.name} ${item.count > 1 ? `×${item.count}` : ''}`,
                            value: `${item.description}`,
                            inline: false
                        });
                    }
 
                    await interaction.reply({ embeds: [invEmbed], ephemeral: false });
                    break;
                    
                case 'aurora_quests':
                    // Открываем полноценное меню квестов
                    const { getUserProfile: getQuestUserProfile, getUserQuests, getCompletedUserQuests, assignRandomQuest } = require('./System/userProfiles');
                    const questList = require('./questList');
                    
                    const questUserProfile = getQuestUserProfile(interaction.user.id);
                    const userQuests = getUserQuests(interaction.user.id);
                    const completedQuests = getCompletedUserQuests(interaction.user.id);
                    
                    // Создаем Embed с квестами
                    const embed = new EmbedBuilder()
                        .setTitle('🎯 Квесты')
                        .setColor('#8b00ff')
                        .setDescription(`Ваши очки: **${questUserProfile.points}**\n\nВаши активные квесты:`)
                        .setTimestamp()
                        .setFooter({ text: `Квесты`, iconURL: interaction.client.user.displayAvatarURL() });
 
                    // Если у пользователя нет активных квестов, предлагаем взять новый
                    if (userQuests.length === 0) {
                        embed.addFields({
                            name: 'Нет активных квестов',
                            value: 'Вы можете взять новый квест, нажав на кнопку ниже.',
                            inline: false
                        });
                    } else {
                        // Отображаем активные квесты
                        for (const quest of userQuests) {
                            const progressPercentage = Math.round((quest.progress / quest.target) * 100);
                            const progressBar = '█'.repeat(Math.floor(progressPercentage / 10)) + '░'.repeat(10 - Math.floor(progressPercentage / 10));
                            
                            embed.addFields({
                                name: `${quest.name} [${quest.progress}/${quest.target}]`,
                                value: `${quest.description}\n${progressBar} ${progressPercentage}%\nНаграда: ${quest.reward.points} очков`,
                                inline: false
                            });
                        }
                    }
 
                    // Отображаем недавно завершенные квесты (последние 3)
                    if (completedQuests.length > 0) {
                        const recentCompleted = completedQuests.slice(-3); // последние 3 квеста
                        if (recentCompleted.length > 0) {
                            let completedText = '';
                            for (const quest of recentCompleted) {
                                completedText += `✅ ${quest.name} (награда: ${quest.reward.points} очков)\n`;
                            }
                            
                            embed.addFields({
                                name: 'Недавно выполненные квесты',
                                value: completedText,
                                inline: false
                            });
                        }
                    }
 
                    // Создаем кнопки
                    const row = new ActionRowBuilder();
                    
                    // Кнопка для получения нового квеста
                    const availableQuests = questList.filter(quest =>
                        !userQuests.some(q => q.id === quest.id) &&
                        !completedQuests.some(q => q.id === quest.id)
                    );
                    
                    if (availableQuests.length > 0) {
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId('get_new_quest')
                                .setLabel('Получить новый квест')
                                .setStyle(ButtonStyle.Success)
                        );
                    } else {
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId('no_quests_available')
                                .setLabel('Нет доступных квестов')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true)
                        );
                    }
 
                    await interaction.reply({
                        embeds: [embed],
                        components: [row],
                        ephemeral: false
                    });
                    break;
                
                case 'get_new_quest':
                    // Обработка получения нового квеста
                    const assignedQuest = require('./System/userProfiles').assignRandomQuest(interaction.user.id);
                    
                    if (assignedQuest) {
                        const questEmbed = new EmbedBuilder()
                            .setTitle('🎉 Новый квест получен!')
                            .setColor('#8b00ff')
                            .setDescription(`Вы получили новый квест: **${assignedQuest.name}**\n\n${assignedQuest.description}`)
                            .addFields(
                                { name: 'Цель', value: `${assignedQuest.target} ${assignedQuest.type === 'message' ? 'сообщений' : assignedQuest.type === 'command' ? 'команд' : assignedQuest.type === 'daily' ? 'дней подряд' : assignedQuest.type === 'purchase' ? 'покупок' : assignedQuest.type === 'level' ? 'уровень' : ''}`, inline: true },
                                { name: 'Награда', value: `${assignedQuest.reward.points} очков`, inline: true }
                            )
                            .setTimestamp()
                            .setFooter({ text: `Квест начат`, iconURL: interaction.user.displayAvatarURL() });
 
                        await interaction.reply({ embeds: [questEmbed], ephemeral: false });
                    } else {
                        const noQuestsEmbed = new EmbedBuilder()
                            .setTitle('❌ Нет доступных квестов')
                            .setColor('#8b0ff')
                            .setDescription('К сожалению, в данный момент нет доступных квестов для вас.')
                            .setTimestamp()
                            .setFooter({ text: `Попробуйте позже`, iconURL: interaction.user.displayAvatarURL() });
 
                        await interaction.reply({ embeds: [noQuestsEmbed], ephemeral: true });
                    }
                    break;
                    
                case 'no_quests_available':
                    await interaction.reply({
                        content: 'В данный момент нет доступных квестов. Попробуйте позже!',
                        ephemeral: true
                    });
                    break;
                
                case 'aurora_guild':
                    // Открываем полноценное меню гильдии
                    const { getUserProfile: getGuildUserProfile } = require('./System/userProfiles');
                    const { getUserGuild, getGuildInfo } = require('./System/guildSystem');
                    
                    const guildUserProfile = getGuildUserProfile(interaction.user.id);
                    const userGuild = getUserGuild(interaction.user.id);
                    
                    if (userGuild) {
                        // Пользователь состоит в гильдии - показываем информацию о гильдии
                        const memberMentions = userGuild.members.map(memberId => `<@${memberId}>`).join(', ');
                        
                        const guildEmbed = new EmbedBuilder()
                            .setTitle(`🏰 Гильдия: ${userGuild.name}`)
                            .setColor('#8b00ff')
                            .setDescription(userGuild.description)
                            .addFields(
                                { name: 'Лидер', value: `<@${userGuild.leader}>`, inline: true },
                                { name: 'Участники', value: userGuild.members.length.toString(), inline: true },
                                { name: 'Уровень', value: userGuild.level.toString(), inline: true },
                                { name: 'Создана', value: new Date(userGuild.created).toLocaleDateString('ru-RU'), inline: true },
                                { name: 'Участники', value: memberMentions, inline: false }
                            )
                            .setTimestamp()
                            .setFooter({ text: `Информация о гильдии`, iconURL: interaction.user.displayAvatarURL() });
 
                        // Создаем кнопки для действий с гильдией
                        const guildRow = new ActionRowBuilder();
                        guildRow.addComponents(
                            new ButtonBuilder()
                                .setCustomId('guild_leave')
                                .setLabel('Покинуть гильдию')
                                .setStyle(ButtonStyle.Danger)
                        );
 
                        if (userGuild.leader === interaction.user.id) {
                            // Если пользователь лидер гильдии, добавляем дополнительные кнопки
                            const guildManagementRow = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('guild_transfer')
                                        .setLabel('Передать лидерство')
                                        .setStyle(ButtonStyle.Secondary)
                                        .setEmoji('👑'),
                                    new ButtonBuilder()
                                        .setCustomId('guild_kick_member')
                                        .setLabel('Исключить участника')
                                        .setStyle(ButtonStyle.Danger)
                                        .setEmoji('🚪'),
                                    new ButtonBuilder()
                                        .setCustomId('guild_disband')
                                        .setLabel('Распустить гильдию')
                                        .setStyle(ButtonStyle.Danger)
                                        .setEmoji('💥')
                                );
                            
                            await interaction.reply({
                                embeds: [guildEmbed],
                                components: [guildRow, guildManagementRow],
                                ephemeral: false
                            });
                        } else {
                            await interaction.reply({
                                embeds: [guildEmbed],
                                components: [guildRow],
                                ephemeral: false
                            });
                        }
                    } else {
                        // Пользователь не состоит в гильдии - предлагаем варианты
                        const guildEmbed = new EmbedBuilder()
                            .setTitle('🏰 Система гильдий')
                            .setColor('#8b0ff')
                            .setDescription('Вы не состоите ни в одной гильдии\n\nВыберите действие:')
                            .addFields(
                                { name: 'Создать гильдию', value: 'Используйте `/guild create <название>` для создания своей гильдии', inline: false },
                                { name: 'Присоединиться к гильдии', value: 'Используйте `/guild join <название>` для присоединения к существующей гильдии', inline: false }
                            )
                            .setTimestamp()
                            .setFooter({ text: `Гильдия`, iconURL: interaction.user.displayAvatarURL() });
 
                        // Создаем кнопки для действий
                        const guildButtonsRow = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('guild_create')
                                    .setLabel('Создать гильдию')
                                    .setStyle(ButtonStyle.Success),
                                new ButtonBuilder()
                                    .setCustomId('guild_join')
                                    .setLabel('Присоединиться')
                                    .setStyle(ButtonStyle.Primary)
                            );
 
                        await interaction.reply({
                            embeds: [guildEmbed],
                            components: [guildButtonsRow],
                            ephemeral: true
                        });
                    }
                    break;
                
                case 'aurora_rep':
                    // Открываем меню репутации
                    const { getUserProfile: getRepUserProfile, getReputation, canGiveReputation } = require('./System/userProfiles');
                    
                    const repUserProfile = getRepUserProfile(interaction.user.id);
                    const userRep = getReputation(interaction.user.id);
                    
                    // Проверяем, можно ли выдать репутацию
                    if (!canGiveReputation(interaction.user.id)) {
                        const repData = require('./System/repSystem').loadRepData();
                        const lastGiven = new Date(repData[interaction.user.id]?.lastGiven || repUserProfile.lastRepGiven);
                        const nextRep = new Date(lastGiven);
                        nextRep.setDate(nextRep.getDate() + 1); // Следующая репутация завтра
                        
                        const timeUntilNext = nextRep - Date.now();
                        const hours = Math.floor(timeUntilNext / (1000 * 60));
                        const minutes = Math.floor((timeUntilNext % (100 * 60)) / (1000 * 60));
                        
                        const repEmbed = new EmbedBuilder()
                            .setTitle('⏰ Репутация')
                            .setColor('#8b00ff')
                            .setDescription(`Вы уже выдавали репутацию за последние 24 часа!\nСледующая возможность через ${hours}ч ${minutes}м`)
                            .setTimestamp()
                            .setFooter({ text: `Попробуйте позже`, iconURL: interaction.user.displayAvatarURL() });
      
                        await interaction.reply({
                            embeds: [repEmbed],
                            ephemeral: true
                        });
                    } else {
                        // Обновляем прогресс квестов на использование репутации
                        try {
                            require('./System/userProfiles').updateQuestProgressByType(interaction.user.id, 'rep', 1);
                        } catch (error) {
                            console.error('Ошибка при обновлении прогресса квеста на репутацию:', error);
                        }
                        
                        const repEmbed = new EmbedBuilder()
                            .setTitle('⭐ Система репутации')
                            .setColor('#8b00ff')
                            .setDescription('Вы можете выдать репутацию другому участнику сервера\nИспользуйте команду `/rep <пользователь>`, чтобы выдать репутацию.')
                            .addFields(
                                { name: 'Ваша репутация', value: userRep.toString(), inline: true },
                                { name: 'Можно выдать', value: 'Да (1 раз в 24 часа)', inline: true }
                            )
                            .setTimestamp()
                            .setFooter({ text: `Репутация`, iconURL: interaction.user.displayAvatarURL() });
      
                        await interaction.reply({
                            embeds: [repEmbed],
                            ephemeral: true
                        });
                    }
                    break;
                  
                case 'aurora_events':
                    // Открываем меню событий
                    const { getActiveEvents, getUserEvents } = require('./System/eventSystem');
                    const activeEvents = getActiveEvents();
                    const userEvents = getUserEvents(interaction.user.id);
                    
                    // Создаем Embed с событиями
                    const eventsEmbed = new EmbedBuilder()
                        .setTitle('🎊 События')
                        .setColor('#8b00ff')
                        .setDescription(`Вы участвуете в **${userEvents.length}** событиях\n\nАктивные события:`)
                        .setTimestamp()
                        .setFooter({ text: `События`, iconURL: interaction.client.user.displayAvatarURL() });
                    
                    // Отображаем активные события
                    if (activeEvents.length === 0) {
                        eventsEmbed.addFields({
                            name: 'Нет активных событий',
                            value: 'На данный момент нет активных событий.',
                            inline: false
                        });
                    } else {
                        // Показываем первые 5 активных событий
                        const eventsToShow = activeEvents.slice(0, 5);
                        for (const event of eventsToShow) {
                            const isRegistered = userEvents.some(e => e.id === event.id);
                            const status = isRegistered ? '✅ Зарегистрирован' : '❌ Не зарегистрирован';
                            
                            eventsEmbed.addFields({
                                name: `${event.name} (${event.id})`,
                                value: `${event.description}\nДата: <t:${Math.floor(new Date(event.dateTime).getTime()/1000)}:F>\nУчастники: ${event.participants.length}${event.maxParticipants ? `/${event.maxParticipants}` : ''}\nСтатус: ${status}`,
                                inline: false
                            });
                        }
                        
                        if (activeEvents.length > 5) {
                            eventsEmbed.addFields({
                                name: 'Дополнительно',
                                value: `Еще ${activeEvents.length - 5} событий доступны через команду /event list`,
                                inline: false
                            });
                        }
                    }
                    
                    // Создаем кнопки для действий с событиями
                    const eventsRow = new ActionRowBuilder();
                    eventsRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId('events_list')
                            .setLabel('Все события')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('📋'),
                        new ButtonBuilder()
                            .setCustomId('events_register')
                            .setLabel('Зарегистрироваться')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('✅'),
                        new ButtonBuilder()
                            .setCustomId('events_unregister')
                            .setLabel('Отменить регистрацию')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('❌')
                    );
                    
                    await interaction.reply({
                        embeds: [eventsEmbed],
                        components: [eventsRow],
                        ephemeral: false
                    });
                    break;
                  
                case 'events_list':
                    // Показываем список всех событий
                    const { getActiveEvents: getAllActiveEvents } = require('./System/eventSystem');
                    const allActiveEvents = getAllActiveEvents();
                    
                    if (allActiveEvents.length === 0) {
                        const noEventsEmbed = new EmbedBuilder()
                            .setTitle('📋 Список событий')
                            .setDescription('На данный момент нет активных событий.')
                            .setColor('#8b00ff')
                            .setTimestamp();
                        
                        await interaction.update({ embeds: [noEventsEmbed], components: [] });
                        return;
                    }
                    
                    // Сортируем события по дате
                    allActiveEvents.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
                    
                    const eventsListEmbed = new EmbedBuilder()
                        .setTitle('📋 Активные события')
                        .setColor('#8b00ff')
                        .setTimestamp();
                    
                    // Добавляем информацию о каждом событии (ограничиваем количество для embed)
                    const eventsToShow = allActiveEvents.slice(0, 10); // Показываем только первые 10 событий
                    
                    for (const event of eventsToShow) {
                        const timeLeft = Math.floor((new Date(event.dateTime) - new Date()) / (1000 * 60)); // Разница в часах
                        let timeLeftStr = '';
                        
                        if (timeLeft > 0) {
                            timeLeftStr = ` через ${timeLeft}ч`;
                        } else if (timeLeft === 0) {
                            timeLeftStr = ' скоро';
                        } else {
                            timeLeftStr = ' уже прошло';
                        }
                        
                        eventsListEmbed.addFields({
                            name: `${event.name} (${event.id})`,
                            value: `${event.description}\nДата: <t:${Math.floor(new Date(event.dateTime).getTime()/1000)}:F>\nУчастники: ${event.participants.length}${event.maxParticipants ? `/${event.maxParticipants}` : ''}${timeLeftStr}`,
                            inline: false
                        });
                    }
                    
                    if (allActiveEvents.length > 10) {
                        eventsListEmbed.setFooter({ text: `Показаны первые 10 событий из ${allActiveEvents.length}`, iconURL: interaction.client.user.displayAvatarURL() });
                    } else {
                        eventsListEmbed.setFooter({ text: `Всего событий: ${allActiveEvents.length}`, iconURL: interaction.client.user.displayAvatarURL() });
                    }
                    
                    await interaction.update({ embeds: [eventsListEmbed], components: [] });
                    break;
                  
                case 'events_register':
                    // Открываем меню регистрации на событие
                    const registerEmbed = new EmbedBuilder()
                        .setTitle('✅ Регистрация на событие')
                        .setDescription('Для регистрации на событие используйте команду:\n`/event register event_id`')
                        .addFields(
                            { name: 'Пример', value: '`/event register event_12345678`', inline: false }
                        )
                        .setColor('#57f287')
                        .setTimestamp()
                        .setFooter({ text: `Регистрация`, iconURL: interaction.user.displayAvatarURL() });
                    
                    await interaction.update({ embeds: [registerEmbed], components: [] });
                    break;
                  
                case 'events_unregister':
                    // Открываем меню отмены регистрации на событие
                    const unregisterEmbed = new EmbedBuilder()
                        .setTitle('❌ Отмена регистрации')
                        .setDescription('Для отмены регистрации на событие используйте команду:\n`/event unregister event_id`')
                        .addFields(
                            { name: 'Пример', value: '`/event unregister event_12345678`', inline: false }
                        )
                        .setColor('#ed4245')
                        .setTimestamp()
                        .setFooter({ text: `Отмена регистрации`, iconURL: interaction.user.displayAvatarURL() });
                    
                    await interaction.update({ embeds: [unregisterEmbed], components: [] });
                    break;
                  
                case 'settings_language':
                    // Обработка настройки языка
                    const langUserProfile = getUserProfile(interaction.user.id);
                    const userSettings = langUserProfile.settings || {};
                    const userLanguageSettings = userSettings.language || 'ru'; // По умолчанию русский
                    const langEmbed = new EmbedBuilder()
                        .setTitle('🌐 Настройка языка')
                        .setColor('#8b0ff')
                        .setDescription('Выберите язык для бота:')
                        .addFields(
                            { name: '🇷🇺 Русский', value: userLanguageSettings === 'ru' ? '✅ Текущий язык' : 'Выбрать', inline: true },
                            { name: '🇺🇸 English', value: userLanguageSettings === 'en' ? '✅ Current language' : 'Выбрать', inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: `Язык`, iconURL: interaction.user.displayAvatarURL() });
 
                    // Создаем кнопки для выбора языка
                    const langRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('select_ru_lang')
                                .setLabel('Русский')
                                .setStyle(ButtonStyle.Success)
                                .setEmoji('🇷🇺'),
                            new ButtonBuilder()
                                .setCustomId('select_en_lang')
                                .setLabel('English')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('🇺🇸')
                        );
 
                    await interaction.reply({
                        embeds: [langEmbed],
                        components: [langRow],
                        ephemeral: true
                    });
                    break;
                
                case 'settings_notifications':
                    // Обработка настройки уведомлений
                    const notifyUserProfile = getUserProfile(interaction.user.id);
                    const notifyEmbed = new EmbedBuilder()
                        .setTitle('🔔 Настройка уведомлений')
                        .setColor('#8b00ff')
                        .setDescription('Настройте уведомления бота:')
                        .addFields(
                            { name: 'Квесты', value: notifyUserProfile.settings?.notifications?.quests ? '✅ Вкл' : '❌ Выкл', inline: false },
                            { name: 'Уровень', value: notifyUserProfile.settings?.notifications?.level ? '✅ Вкл' : '❌ Выкл', inline: false },
                            { name: 'Репутация', value: notifyUserProfile.settings?.notifications?.rep ? '✅ Вкл' : '❌ Выкл', inline: false },
                            { name: 'События', value: notifyUserProfile.settings?.notifications?.events ? '✅ Вкл' : '❌ Выкл', inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: `Уведомления`, iconURL: interaction.user.displayAvatarURL() });
 
                    // Создаем кнопки для включения/выключения уведомлений
                    const notifyRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('toggle_quest_notify')
                                .setLabel('Квесты')
                                .setStyle(notifyUserProfile.settings?.notifications?.quests ? ButtonStyle.Danger : ButtonStyle.Success)
                                .setEmoji('✅'),
                            new ButtonBuilder()
                                .setCustomId('toggle_level_notify')
                                .setLabel('Уровень')
                                .setStyle(notifyUserProfile.settings?.notifications?.level ? ButtonStyle.Danger : ButtonStyle.Success)
                                .setEmoji('🆙'),
                            new ButtonBuilder()
                                .setCustomId('toggle_rep_notify')
                                .setLabel('Репутация')
                                .setStyle(notifyUserProfile.settings?.notifications?.rep ? ButtonStyle.Danger : ButtonStyle.Success)
                                .setEmoji('⭐'),
                            new ButtonBuilder()
                                .setCustomId('toggle_event_notify')
                                .setLabel('События')
                                .setStyle(notifyUserProfile.settings?.notifications?.events ? ButtonStyle.Danger : ButtonStyle.Success)
                                .setEmoji('🎊')
                        );
 
                    await interaction.update({
                        embeds: [notifyEmbed],
                        components: [notifyRow]
                    });
                    break;
                
                case 'settings_privacy':
                    // Обработка настройки приватности
                    const privacyUserProfile = getUserProfile(interaction.user.id);
                    const privacyEmbed = new EmbedBuilder()
                        .setTitle('🔒 Настройка приватности')
                        .setColor('#8b00ff')
                        .setDescription('Настройте приватность вашего профиля:')
                        .addFields(
                            { name: 'Видимость профиля', value: privacyUserProfile.settings?.privacy?.profileVisible ? '✅ Открыт' : '🔒 Закрыт', inline: false },
                            { name: 'Статистика', value: privacyUserProfile.settings?.privacy?.statsVisible ? '✅ Видима' : '🔒 Скрыта', inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: `Приватность`, iconURL: interaction.user.displayAvatarURL() });
 
                    // Создаем кнопки для настройки приватности
                    const privacyButtonsRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('toggle_profile_visibility')
                                .setLabel('Видимость профиля')
                                .setStyle(privacyUserProfile.settings?.privacy?.profileVisible ? ButtonStyle.Danger : ButtonStyle.Success)
                                .setEmoji('👁️'),
                            new ButtonBuilder()
                                .setCustomId('toggle_stats_visibility')
                                .setLabel('Статистика')
                                .setStyle(privacyUserProfile.settings?.privacy?.statsVisible ? ButtonStyle.Danger : ButtonStyle.Success)
                                .setEmoji('📊')
                        );
 
                    await interaction.update({
                        embeds: [privacyEmbed],
                        components: [privacyButtonsRow]
                    });
                    break;
                
                case 'toggle_quest_notify':
                    // Переключение уведомлений о квестах
                    const questNotifyUserProfile = getUserProfile(interaction.user.id);
                    const currentNotifySettings = questNotifyUserProfile.settings?.notifications || {};
                    const newQuestNotifyValue = !currentNotifySettings.quests;
                    updateUserProfile(interaction.user.id, {
                        settings: {
                            notifications: {
                                ...currentNotifySettings,
                                quests: newQuestNotifyValue
                            }
                        }
                    });
                    
                    await interaction.update({
                        content: `Уведомления о квестах теперь ${newQuestNotifyValue ? 'включены' : 'выключены'}!`,
                        components: [],
                        embeds: []
                    });
                    break;
                
                case 'toggle_level_notify':
                    // Переключение уведомлений о уровне
                    const levelNotifyUserProfile = getUserProfile(interaction.user.id);
                    const currentLevelSettings = levelNotifyUserProfile.settings.notifications;
                    const newLevelNotifyValue = !currentLevelSettings.level;
                    updateUserProfile(interaction.user.id, {
                        settings: {
                            notifications: {
                                ...currentLevelSettings,
                                level: newLevelNotifyValue
                            }
                        }
                    });
                    
                    await interaction.update({
                        content: `Уведомления о повышении уровня теперь ${newLevelNotifyValue ? 'включены' : 'выключены'}!`,
                        components: [],
                        embeds: []
                    });
                    break;
                
                case 'toggle_rep_notify':
                    // Переключение уведомлений о репутации
                    const repNotifyUserProfile = getUserProfile(interaction.user.id);
                    const currentRepSettings = repNotifyUserProfile.settings.notifications;
                    const newRepNotifyValue = !currentRepSettings.rep;
                    updateUserProfile(interaction.user.id, {
                        settings: {
                            notifications: {
                                ...currentRepSettings,
                                rep: newRepNotifyValue
                            }
                        }
                    });
                    
                    await interaction.update({
                        content: `Уведомления о репутации теперь ${newRepNotifyValue ? 'включены' : 'выключены'}!`,
                        components: [],
                        embeds: []
                    });
                    break;
                
                case 'toggle_event_notify':
                    // Переключение уведомлений о событиях
                    const eventNotifyUserProfile = getUserProfile(interaction.user.id);
                    const currentEventSettings = eventNotifyUserProfile.settings.notifications;
                    const newEventNotifyValue = !currentEventSettings.events;
                    updateUserProfile(interaction.user.id, {
                        settings: {
                            notifications: {
                                ...currentEventSettings,
                                events: newEventNotifyValue
                            }
                        }
                    });
                    
                    await interaction.update({
                        content: `Уведомления о событиях теперь ${newEventNotifyValue ? 'включены' : 'выключены'}!`,
                        components: [],
                        embeds: []
                    });
                    break;
                
                case 'toggle_profile_visibility':
                    // Переключение видимости профиля
                    const profileVisibilityUserProfile = getUserProfile(interaction.user.id);
                    const currentPrivacySettings = profileVisibilityUserProfile.settings.privacy;
                    const newProfileVisibilityValue = !currentPrivacySettings.profileVisible;
                    updateUserProfile(interaction.user.id, {
                        settings: {
                            privacy: {
                                ...currentPrivacySettings,
                                profileVisible: newProfileVisibilityValue
                            }
                        }
                    });
                    
                    await interaction.update({
                        content: `Видимость профиля теперь ${newProfileVisibilityValue ? 'открыта' : 'закрыта'}!`,
                        components: [],
                        embeds: []
                    });
                    break;
                
                case 'toggle_stats_visibility':
                    // Переключение видимости статистики
                    const statsVisibilityUserProfile = getUserProfile(interaction.user.id);
                    const currentStatsSettings = statsVisibilityUserProfile.settings.privacy;
                    const newStatsVisibilityValue = !currentStatsSettings.statsVisible;
                    updateUserProfile(interaction.user.id, {
                        settings: {
                            privacy: {
                                ...currentStatsSettings,
                                statsVisible: newStatsVisibilityValue
                            }
                        }
                    });
                    
                    await interaction.update({
                        content: `Видимость статистики в таблице лидеров теперь ${newStatsVisibilityValue ? 'включена' : 'выключена'}!`,
                        components: [],
                        embeds: []
                    });
                    break;
                
                case 'select_ru_lang':
                    // Выбор русского языка
                    const currentSettingsRU = getUserProfile(interaction.user.id).settings;
                    updateUserProfile(interaction.user.id, {
                        settings: {
                            ...currentSettingsRU,
                            language: 'ru'
                        }
                    });
                    
                    await interaction.update({
                        content: 'Язык изменен на русский!',
                        components: [],
                        embeds: []
                    });
                    break;
                
                case 'select_en_lang':
                    // Выбор английского языка
                    const currentSettingsEN = getUserProfile(interaction.user.id).settings;
                    updateUserProfile(interaction.user.id, {
                        settings: {
                            ...currentSettingsEN,
                            language: 'en'
                        }
                    });
                    
                    await interaction.update({
                        content: 'Language changed to English!',
                        components: [],
                        embeds: []
                    });
                    break;
                
                case 'guild_transfer':
                    // Передача лидерства в гильдии
                    await interaction.reply({
                        content: 'Для передачи лидерства используйте команду `/guild transfer <новый_лидер>`',
                        ephemeral: true
                    });
                    break;
                
                case 'guild_kick_member':
                    // Исключение участника из гильдии
                    await interaction.reply({
                        content: 'Для исключения участника используйте команду `/guild kick <участник>`',
                        ephemeral: true
                    });
                    break;
                
                case 'guild_disband':
                    // Распускание гильдии
                    await interaction.reply({
                        content: 'Для распускания гильдии используйте команду `/guild disband` (не реализована в текущей версии)',
                        ephemeral: true
                    });
                    break;
                
                default:
                    // Обработка остальных кнопок, не являющихся покупками
                    await interaction.reply({
                        content: 'Неизвестная кнопка.',
                        ephemeral: true
                    });
                    break;
            }
            
            // Начисление очков за нажатие кнопки (только если это не покупка, т.к. для покупок это уже сделано)
            if (!interaction.customId.startsWith('buy_')) {
                const buttonClickUserProfile = getUserProfile(interaction.user.id);
                const pointsToAdd = 1; // 1 очко за нажатие кнопки
                const newPoints = buttonClickUserProfile.points + pointsToAdd;
                const newLevel = Math.floor(newPoints / 10) + 1; // Уровень увеличивается каждые 10 очков
                
                // Проверяем, повысился ли уровень
                const buttonLevelUp = newLevel > buttonClickUserProfile.level;
                
                updateUserProfile(interaction.user.id, {
                    points: newPoints,
                    level: newLevel,
                    username: interaction.user.username
                });
                
                // Отправляем уведомление о повышении уровня, если уровень повысился
                if (buttonLevelUp) {
                    notificationSystem.sendLevelUpNotification(interaction.user.id, newLevel)
                        .catch(error => {
                            console.error('Ошибка при отправке уведомления о повышении уровня:', error);
                        });
                }
            }
        } catch (error) {
            console.error('Ошибка при обработке нажатия кнопки:', error);
            
            try {
                // Проверяем, не является ли эта ошибка обработкой покупки
                // Если взаимодействие уже отвечено в handleShopPurchase, не отправляем второй ответ
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'Ошибка при обработке кнопки!',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('Ошибка при отправке сообщения об ошибке:', replyError);
            }
        }
    }
});

// Функция обработки покупок в магазине
async function handleShopPurchase(interaction) {
    try {
        // Извлекаем ID товара из customId
        const itemId = interaction.customId.replace('buy_', '');
        
        // Находим товар в списке
        const item = shopItems.find(i => i.id === itemId);
        
        if (!item) {
            await interaction.reply({
                content: 'Товар не найден!',
                ephemeral: true
            });
            return;
        }
        
        // Получаем профиль пользователя
        const userProfile = getUserProfile(interaction.user.id);
        
        // Проверяем, достаточно ли очков у пользователя
        if (userProfile.points < item.price) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Недостаточно средств')
                .setColor('#8b00ff')
                .setDescription(`У вас недостаточно очков для покупки ${item.name}\n\nНеобходимо: ${item.price} очков\nУ вас: ${userProfile.points} очков`)
                .setTimestamp()
                .setFooter({ text: `Недостаточно средств`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
            return;
        }
        
        // Вычитаем цену товара из очков пользователя
        const newPoints = userProfile.points - item.price;
        const newLevel = Math.floor(newPoints / 10) + 1;
        
        // Добавляем товар в инвентарь пользователя
        const currentInventory = userProfile.inventory || [];
        const updatedInventory = [...currentInventory, item];
        
        // Обновляем прогресс квеста на покупки
        const purchaseQuestResult = require('./System/userProfiles').updateQuestProgress(interaction.user.id, 'shop_visitor');
        
        // Также обновляем прогресс квеста на покупки по типу
        try {
            require('./System/userProfiles').updateQuestProgressByType(interaction.user.id, 'purchase', 1);
        } catch (error) {
            console.error('Ошибка при обновлении прогресса квеста на покупки:', error);
        }
        
        // Проверяем, повысился ли уровень
        const purchaseUserProfile = getUserProfile(interaction.user.id);
        const levelUp = newLevel > purchaseUserProfile.level;
        
        // Обновляем профиль пользователя
        updateUserProfile(interaction.user.id, {
            points: newPoints,
            level: newLevel,
            inventory: updatedInventory
        });
        
        // Отправляем уведомление о повышении уровня, если уровень повысился
        if (levelUp) {
            notificationSystem.sendLevelUpNotification(interaction.user.id, newLevel)
                .catch(error => {
                    console.error('Ошибка при отправке уведомления о повышении уровня:', error);
                });
        }
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Покупка успешна')
            .setColor('#8b00ff')
            .setDescription(`Вы успешно купили **${item.name}** за ${item.price} очков!`)
            .addFields(
                { name: 'Предмет', value: item.name, inline: true },
                { name: 'Цена', value: `${item.price} очков`, inline: true },
                { name: 'Осталось очков', value: newPoints.toString(), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Спасибо за покупку`, iconURL: interaction.user.displayAvatarURL() });

        const replyMessage = await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
        
        // Если квест был завершен, показываем сообщение
        if (purchaseQuestResult.completed) {
            const questCompletedEmbed = new EmbedBuilder()
                .setTitle('🏆 Квест выполнен!')
                .setColor('#8b00ff')
                .setDescription(`Поздравляем! Вы выполнили квест: **${'Покупатель'}**`)
                .addFields(
                    { name: 'Награда', value: `${purchaseQuestResult.reward || 0} очков`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Квест завершен`, iconURL: interaction.user.displayAvatarURL() });
                
                // Отправляем сообщение пользователю
                await interaction.followUp({ embeds: [questCompletedEmbed], ephemeral: true });
                
                // Отправляем уведомление пользователю
                try {
                    await notificationSystem.sendQuestNotification(interaction.user.id, {
                        name: 'Покупатель',
                        description: 'Сделал свою первую покупку',
                        reward: { points: purchaseQuestResult.reward || 0 },
                        type: 'purchase'
                    });
                } catch (error) {
                    console.error('Ошибка при отправке уведомления о квесте:', error);
                }
            
        }
        
        // Если пользователь состоит в гильдии, добавляем опыт гильдии
        const userGuild = require('./System/guildSystem').getUserGuild(interaction.user.id);
        if (userGuild) {
            require('./System/guildSystem').addGuildExperience(userGuild.id, 1); // 1 очко опыта за покупку
        }
    } catch (error) {
        console.error('Ошибка при обработке покупки:', error);
        
        try {
            // Проверяем, не был ли уже отправлен ответ
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'Произошла ошибка при обработке покупки.',
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error('Ошибка при отправке сообщения об ошибке:', replyError);
        }
    }
}

// Обработка сообщений (для префиксных команд и квестов)
client.on(Events.MessageCreate, async message => {
    // Игнорируем сообщения от ботов
    if (message.author.bot) return;
    
    console.log(`Получено сообщение: ${message.content} от ${message.author.username}`);
    
    // Проверяем, начинается ли сообщение с префикса *
        if (message.content.startsWith('*')) {
            const args = message.content.slice(1).trim().split(/ +/);
            const command = args.shift()?.toLowerCase();
            
            if (command === 'aurora') {
                // Вызываем команду aurora
                const auroraCommand = require('./commands/aurora.js');
                
                // Создаем фальшивое взаимодействие для вызова команды
                const fakeInteraction = {
                    user: message.author,
                    member: message.member,
                    channel: message.channel,
                    guild: message.guild,
                    commandName: 'aurora',
                    options: {
                        get: () => {},
                        getString: () => {},
                        getInteger: () => {},
                        getBoolean: () => {},
                        getUser: () => {},
                        getChannel: () => {},
                        getRole: () => {},
                        getNumber: () => {},
                        getAttachment: () => {}
                    },
                    reply: async (options) => {
                        if (options.embeds) {
                            return await message.reply({ embeds: options.embeds, components: options.components });
                        } else {
                            return await message.reply(options.content);
                        }
                    },
                    deferReply: async () => {},
                    editReply: async (options) => {},
                    followUp: async (options) => {},
                    deleteReply: async () => {},
                    fetchReply: async () => {}
                };
                
                // Вызываем выполнение команды
                auroraCommand.execute(fakeInteraction).catch(console.error);
            }
        } else {
            // Проверяем, начинается ли сообщение с префикса сервера
            const guildSettingsModule = require('./System/guildSettings');
            const guildSettings = guildSettingsModule.getGuildSettings(message.guild.id);
            const prefix = guildSettings.prefix || '!';
            
            if (message.content.startsWith(prefix)) {
                const args = message.content.slice(prefix.length).trim().split(/ +/);
                const command = args.shift()?.toLowerCase();
                
                // Обработка команды, если она есть
                if (command === 'settings') {
                    // Команда для просмотра настроек сервера
                    const settingsEmbed = new EmbedBuilder()
                        .setTitle(`⚙️ Настройки сервера ${message.guild.name}`)
                        .setDescription(`Текущий префикс: \`${prefix}\``)
                        .addFields(
                            { name: 'Автомодерация', value: guildSettings.automod.enabled ? '✅ Включена' : '❌ Выключена', inline: true },
                            { name: 'Система уровней', value: guildSettings.leveling.enabled ? '✅ Включена' : '❌ Выключена', inline: true },
                            { name: 'Экономическая система', value: guildSettings.economy.enabled ? '✅ Включена' : '❌ Выключена', inline: true }
                        )
                        .setColor('#8b00ff')
                        .setTimestamp();
                    
                    await message.reply({ embeds: [settingsEmbed] });
                }
            }
    
    }
    
        // Обновляем прогресс квестов на отправку сообщений
        try {
            const firstMessageQuestResult = require('./System/userProfiles').updateQuestProgress(message.author.id, 'first_message');
            const tenMessagesQuestResult = require('./System/userProfiles').updateQuestProgress(message.author.id, 'ten_messages');
            
            // Обновляем прогресс квеста на отправку сообщений по типу
            try {
                require('./System/userProfiles').updateQuestProgressByType(message.author.id, 'message', 1);
            } catch (error) {
                console.error('Ошибка при обновлении прогресса квеста на сообщения:', error);
            }
            
            // Если пользователь состоит в гильдии, добавляем опыт гильдии
            const userGuild = require('./System/guildSystem').getUserGuild(message.author.id);
            if (userGuild) {
                require('./System/guildSystem').addGuildExperience(userGuild.id, 0.5); // 0.5 очка опыта за сообщение
            }
            
            // Если квест был завершен, отправляем уведомление
            if (firstMessageQuestResult && firstMessageQuestResult.completed) {
                const questCompletedEmbed = new EmbedBuilder()
                    .setTitle('🏆 Квест выполнен!')
                    .setColor('#f1c40f')
                    .setDescription(`Поздравляем! Вы выполнили квест: **${'Первое сообщение'}**`)
                    .addFields(
                        { name: 'Награда', value: `${firstMessageQuestResult.reward || 0} очков`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Квест завершен`, iconURL: message.author.displayAvatarURL() });
                
                // Отправляем уведомление в тот же канал
                message.reply({ embeds: [questCompletedEmbed], ephemeral: true });
                
                // Отправляем уведомление пользователю
                notificationSystem.sendQuestNotification(message.author.id, {
                    name: 'Первое сообщение',
                    description: 'Отправил первое сообщение',
                    reward: { points: firstMessageQuestResult.reward || 0 },
                    type: 'message'
                }).catch(error => {
                    console.error('Ошибка при отправке уведомления о квесте:', error);
                });
            } else if (tenMessagesQuestResult && tenMessagesQuestResult.completed) {
                const questCompletedEmbed = new EmbedBuilder()
                    .setTitle('🏆 Квест выполнен!')
                    .setColor('#f1c40f')
                    .setDescription(`Поздравляем! Вы выполнили квест: **${'Активный участник'}**`)
                    .addFields(
                        { name: 'Награда', value: `${tenMessagesQuestResult.reward || 0} очков`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Квест завершен`, iconURL: message.author.displayAvatarURL() });
                
                // Отправляем уведомление в тот же канал
                message.reply({ embeds: [questCompletedEmbed], ephemeral: true });
                
                // Отправляем уведомление пользователю
                notificationSystem.sendQuestNotification(message.author.id, {
                    name: 'Активный участник',
                    description: 'Отправил десять сообщений',
                    reward: { points: tenMessagesQuestResult.reward || 0 },
                    type: 'message'
                }).catch(error => {
                    console.error('Ошибка при отправке уведомления о квесте:', error);
                });
            }
        } catch (error) {
            console.error('Ошибка при обновлении прогресса квеста:', error);
        }
        
        // Проверяем автоматическую модерацию
        try {
            const guildSettingsModule = require('./System/guildSettings');
            const guildSettings = guildSettingsModule.getGuildSettings(message.guild.id);
            
            // Если автомодерация включена
            if (guildSettings.automod.enabled) {
                // Проверяем содержимое сообщения
                const { checkMessageContent, checkSpam, applyModerationAction } = require('./System/moderationSystem');
                const checkResult = checkMessageContent(message, guildSettings);
                
                // Проверяем спам
                const isSpam = checkSpam(message.author.id, message);
                if (isSpam) {
                    checkResult.spam = true;
                    checkResult.severity += 2;
                }
                
                // Если обнаружены нарушения
                if (checkResult.severity > 0) {
                    // Определяем действие на основе количества предупреждений пользователя
                    const { getUserProfile } = require('./System/userProfiles');
                    const user = getUserProfile(message.author.id);
                    const warnings = user.warnings || 0;
                    
                    let action = null;
                    if (warnings >= guildSettings.automod.actions.ban) {
                        action = 'ban';
                    } else if (warnings >= guildSettings.automod.actions.kick) {
                        action = 'kick';
                    } else if (warnings >= guildSettings.automod.actions.mute) {
                        action = 'mute';
                    } else if (warnings >= guildSettings.automod.actions.warn) {
                        action = 'warn';
                    }
                    
                    if (action) {
                        // Удаляем сообщение
                        await message.delete().catch(() => {});
                        
                        // Применяем действие
                        let reason = 'Нарушение правил сервера';
                        if (checkResult.profanity) reason = 'Использование ненормативной лексики';
                        if (checkResult.links) reason = 'Отправка запрещенных ссылок';
                        if (checkResult.spam) reason = 'Спам';
                        if (checkResult.caps) reason = 'Использование капса';
                        if (checkResult.invites) reason = 'Отправка приглашений на другие серверы';
                        
                        await applyModerationAction(message, action, reason, checkResult.severity);
                    } else {
                        // Просто удаляем сообщение если не достигнут порог предупреждений
                        await message.delete().catch(() => {});
                        
                        // Отправляем пользователю предупреждение
                        try {
                            const warningEmbed = new EmbedBuilder()
                                .setTitle('⚠️ Предупреждение')
                                .setDescription(`Ваше сообщение на сервере **${message.guild.name}** было удалено за нарушение правил`)
                                .addFields(
                                    { name: 'Причина', value: checkResult.profanity ? 'Ненормативная лексика' :
                                        checkResult.links ? 'Запрещенная ссылка' :
                                        checkResult.spam ? 'Спам' :
                                        checkResult.caps ? 'Капс' :
                                        checkResult.invites ? 'Приглашение на другой сервер' : 'Нарушение правил', inline: true }
                                )
                                .setColor('#FFA50')
                                .setTimestamp();
                            
                            await message.author.send({ embeds: [warningEmbed] });
                        } catch (error) {
                            // Не удалось отправить личное сообщение
                            console.log(`Не удалось отправить предупреждение пользователю ${message.author.id}`);
                        }
                    }
                }
            }
        } catch (moderationError) {
            console.error('Ошибка при проверке автомодерации:', moderationError);
        }
});

// Обработка события присоединения участника к серверу
client.on(Events.GuildMemberAdd, async member => {
    // Проверяем, что участник не бот
    if (member.user.bot) return;
    
    // Находим канал для приветствия
    const welcomeChannel = member.guild.channels.cache.get('1399362209703792791');
    if (!welcomeChannel) {
        console.error('Канал приветствия не найден!');
        return;
    }
    
    // Подсчитываем количество участников без ботов (получаем всех участников гильдии)
    const nonBotMembers = await member.guild.members.fetch();
    const memberCount = nonBotMembers.filter(m => !m.user.bot).size;
    
    // Создаем Embed сообщение с приветствием
    const welcomeEmbed = new EmbedBuilder()
        .setTitle('🎉 Добро пожаловать!')
        .setDescription(`Добро пожаловать на сервер **${member.guild.name}**, <@${member.user.id}>!`)
        .addFields(
            { name: 'Сервер', value: member.guild.name, inline: true },
            { name: 'Участников', value: `${memberCount}`, inline: true }
            // { name: 'Приветствуем!', value: `Сейчас на сервере **${memberCount}** участников (без учета ботов)!` }
        )
        .setColor('#8b00ff') // Используем тот же фиолетовый цвет, что и остальные embed сообщения
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true })) // Аватар нового участника
        .setTimestamp()
        .setFooter({ text: `С уважением, ${member.guild.name}`, iconURL: member.guild.iconURL() || undefined });
    
    // Отправляем Embed сообщение в канал
    try {
        await welcomeChannel.send({ embeds: [welcomeEmbed] });
    } catch (error) {
        console.error('Ошибка при отправке сообщения о приветствии:', error);
    }
});

// Проверка наличия токена
if (!process.env.DISCORD_TOKEN) {
    console.error('Ошибка: Не указан DISCORD_TOKEN в файле .env');
    process.exit(1);
}

// Проверка наличия ID сервера
if (!process.env.GUILD_ID) {
    console.warn('Предупреждение: Не указан GUILD_ID в файле .env. Slash-команды могут не работать корректно.');
}

// Логин бота
client.login(process.env.DISCORD_TOKEN);

// Проверка предстоящих событий каждые 15 минут
setInterval(async () => {
    try {
        // Очистка прошедших событий
        const cleanupResult = cleanupPastEvents();
        console.log(`Очистка прошедших событий: удалено ${cleanupResult.removedCount} событий`);
        
        // Получение предстоящих событий (в ближайшие 30 минут)
        const upcomingEvents = getUpcomingEvents(30);
        
        if (upcomingEvents.length > 0) {
            console.log(`Найдено ${upcomingEvents.length} предстоящих событий`);
            
            for (const event of upcomingEvents) {
                // Отправляем уведомления участникам события через систему уведомлений
                for (const participantId of event.participants) {
                    try {
                        await notificationSystem.sendEventNotification(participantId, event.name, `Скоро начнется событие: **${event.name}**\n\n${event.description}\nДата и время: <t:${Math.floor(new Date(event.dateTime).getTime()/1000)}:F>`);
                    } catch (error) {
                        console.error(`Ошибка при отправке уведомления участнику ${participantId}:`, error);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Ошибка при проверке предстоящих событий:', error);
    }
}, 15 * 60 * 100); // 15 минут в миллисекундах