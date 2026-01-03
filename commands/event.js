const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');
const { createEvent, getActiveEvents, getEventInfo, completeEvent, cancelEvent, registerForEvent, unregisterFromEvent } = require('../System/eventSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('event')
        .setDescription('Управление событиями и мероприятиями')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Создать новое событие')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Название события')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Описание события')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('datetime')
                        .setDescription('Дата и время события (в формате YYYY-MM-DD HH:MM)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('max_participants')
                        .setDescription('Максимальное количество участников (0 - без ограничений)')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('reward_points')
                        .setDescription('Количество очков в награду за участие')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('complete')
                .setDescription('Завершить событие и выдать награды')
                .addStringOption(option =>
                    option.setName('event_id')
                        .setDescription('ID события')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cancel')
                .setDescription('Отменить событие')
                .addStringOption(option =>
                    option.setName('event_id')
                        .setDescription('ID события')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Показать список активных событий'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('register')
                .setDescription('Зарегистрироваться на событие')
                .addStringOption(option =>
                    option.setName('event_id')
                        .setDescription('ID события')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unregister')
                .setDescription('Отменить регистрацию на событие')
                .addStringOption(option =>
                    option.setName('event_id')
                        .setDescription('ID события')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Показать информацию о событии')
                .addStringOption(option =>
                    option.setName('event_id')
                        .setDescription('ID события')
                        .setRequired(true))),
        
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        try {
            if (subcommand === 'create') {
                // Проверяем права пользователя на создание события
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageEvents) && 
                    !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return await interaction.reply({
                        content: 'У вас нет прав на создание событий!',
                        ephemeral: true
                    });
                }
                
                const name = interaction.options.getString('name');
                const description = interaction.options.getString('description');
                const datetimeStr = interaction.options.getString('datetime');
                const maxParticipants = interaction.options.getInteger('max_participants');
                
                // Парсим дату и время
                let eventDateTime;
                try {
                    eventDateTime = new Date(datetimeStr);
                    if (isNaN(eventDateTime.getTime())) {
                        throw new Error('Неверный формат даты и времени');
                    }
                    
                    // Проверяем, что дата не в прошлом
                    if (eventDateTime < new Date()) {
                        return await interaction.reply({
                            content: 'Дата и время события не могут быть в прошлом!',
                            ephemeral: true
                        });
                    }
                } catch (error) {
                    return await interaction.reply({
                        content: 'Неверный формат даты и времени! Используйте формат: YYYY-MM-DD HH:MM',
                        ephemeral: true
                    });
                }
                
                // Генерируем уникальный ID для события
                const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
                
                // Получаем количество очков в награду
                const rewardPoints = interaction.options.getInteger('reward_points') || 0;
                
                // Создаем событие
                const result = createEvent(
                    eventId,
                    name,
                    description,
                    eventDateTime,
                    interaction.user.id,
                    maxParticipants > 0 ? maxParticipants : null,
                    rewardPoints
                );
                
                if (result.success) {
                    const eventEmbed = new EmbedBuilder()
                        .setTitle('🎉 Событие создано!')
                        .setDescription(`**${result.event.name}**\n\n${result.event.description}`)
                        .addFields(
                            { name: 'Дата и время', value: `<t:${Math.floor(new Date(result.event.dateTime).getTime()/1000)}:F>`, inline: true },
                            { name: 'ID события', value: result.event.id, inline: true },
                            { name: 'Создатель', value: `<@${interaction.user.id}>`, inline: true },
                            { name: 'Участники', value: `${result.event.participants.length}${result.event.maxParticipants ? `/${result.event.maxParticipants}` : ''}`, inline: true },
                            { name: 'Награда за участие', value: `${result.event.rewardPoints || 0} очков`, inline: true }
                        )
                        .setColor('#ff6b6b')
                        .setTimestamp()
                        .setFooter({ text: `Событие создано`, iconURL: interaction.user.displayAvatarURL() });
                    
                    await interaction.reply({ embeds: [eventEmbed] });
                } else {
                    await interaction.reply({
                        content: result.message,
                        ephemeral: true
                    });
                }
             }
             else if (subcommand === 'complete') {
                 const eventId = interaction.options.getString('event_id');
                 
                 // Проверяем права пользователя (только создатель события или модератор может завершить событие)
                 const event = getEventInfo(eventId);
                 
                 if (!event) {
                     return await interaction.reply({
                         content: 'Событие с указанным ID не найдено!',
                         ephemeral: true
                     });
                 }
                 
                 if (event.creator !== interaction.user.id &&
                     !interaction.member.permissions.has(PermissionFlagsBits.ManageEvents) &&
                     !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                     return await interaction.reply({
                         content: 'Только создатель события или модератор может завершить событие!',
                         ephemeral: true
                     });
                 }
                 
                 // Завершаем событие и выдаем награды
                 const rewardPoints = event.rewardPoints || 0;
                 
                 // Обновляем прогресс квеста на участие в событиях для всех участников
                 const { updateQuestProgressByType } = require('../System/userProfiles');
                 
                 // Для каждого участника начисляем награду и обновляем квест
                 for (const participantId of event.participants) {
                     const { updateUserProfile, getUserProfile } = require('../System/userProfiles');
                     const participantProfile = getUserProfile(participantId);
                     
                     // Начисляем награду
                     const newPoints = participantProfile.points + rewardPoints;
                     const newLevel = Math.floor(newPoints / 10) + 1;
                     
                     // Проверяем, повысился ли уровень
                     const levelUp = newLevel > participantProfile.level;
                     
                     updateUserProfile(participantId, {
                         points: newPoints,
                         level: newLevel
                     });
                     
                     // Обновляем прогресс квеста на участие в событиях
                     try {
                         updateQuestProgressByType(participantId, 'event', 1);
                     } catch (error) {
                         console.error('Ошибка при обновлении прогресса квеста на события:', error);
                     }
                     
                     // Если пользователь состоит в гильдии, добавляем опыт гильдии
                     try {
                         const userGuild = require('../System/guildSystem').getUserGuild(participantId);
                         if (userGuild) {
                             require('../System/guildSystem').addGuildExperience(userGuild.id, 2); // 2 очка опыта за участие в событии
                         }
                     } catch (error) {
                         console.error('Ошибка при добавлении опыта гильдии:', error);
                     }
                     
                     // Отправляем уведомление участнику о повышении уровня, если уровень повысился
                     if (levelUp) {
                         const notificationSystem = new (require('../System/notificationSystem'))(interaction.client);
                         notificationSystem.sendLevelUpNotification(participantId, newLevel)
                             .catch(error => {
                                 console.error('Ошибка при отправке уведомления о повышении уровня:', error);
                             });
                     }
                 }
                 
                 const result = completeEvent(eventId, interaction.user.id);
                 
                 if (result.success) {
                     const completeEmbed = new EmbedBuilder()
                         .setTitle('✅ Событие завершено')
                         .setDescription(`Событие **${event.name}** было завершено!\n\nУчастникам начислено по ${rewardPoints} очков.`)
                         .addFields(
                             { name: 'ID события', value: event.id, inline: true },
                             { name: 'Участники', value: event.participants.length.toString(), inline: true },
                             { name: 'Награда за участие', value: rewardPoints.toString(), inline: true }
                         )
                         .setColor('#57f287')
                         .setTimestamp()
                         .setFooter({ text: `Событие завершено`, iconURL: interaction.user.displayAvatarURL() });
                     
                     await interaction.reply({ embeds: [completeEmbed] });
                 } else {
                     await interaction.reply({
                         content: result.message,
                         ephemeral: true
                     });
                 }
             }
             else if (subcommand === 'cancel') {
                 const eventId = interaction.options.getString('event_id');
                 
                 // Проверяем права пользователя (только создатель события или модератор может отменить событие)
                 const event = getEventInfo(eventId);
                 
                 if (!event) {
                     return await interaction.reply({
                         content: 'Событие с указанным ID не найдено!',
                         ephemeral: true
                     });
                 }
                 
                 if (event.creator !== interaction.user.id &&
                     !interaction.member.permissions.has(PermissionFlagsBits.ManageEvents) &&
                     !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                     return await interaction.reply({
                         content: 'Только создатель события или модератор может отменить событие!',
                         ephemeral: true
                     });
                 }
                 
                 const result = cancelEvent(eventId, interaction.user.id);
                 
                 if (result.success) {
                     const cancelEmbed = new EmbedBuilder()
                         .setTitle('❌ Событие отменено')
                         .setDescription(`Событие **${event.name}** было отменено!`)
                         .addFields(
                             { name: 'ID события', value: event.id, inline: true }
                         )
                         .setColor('#ed4245')
                         .setTimestamp()
                         .setFooter({ text: `Событие отменено`, iconURL: interaction.user.displayAvatarURL() });
                     
                     await interaction.reply({ embeds: [cancelEmbed] });
                 } else {
                     await interaction.reply({
                         content: result.message,
                         ephemeral: true
                     });
                 }
             }
             else if (subcommand === 'list') {
                const activeEvents = getActiveEvents();
                
                if (activeEvents.length === 0) {
                    const noEventsEmbed = new EmbedBuilder()
                        .setTitle('📋 Список событий')
                        .setDescription('На данный момент нет активных событий.')
                        .setColor('#8b00ff')
                        .setTimestamp();
                    
                    return await interaction.reply({ embeds: [noEventsEmbed], ephemeral: true });
                }
                
                // Сортируем события по дате
                activeEvents.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
                
                const eventsEmbed = new EmbedBuilder()
                    .setTitle('📋 Активные события')
                    .setColor('#8b00ff')
                    .setTimestamp();
                
                // Добавляем информацию о каждом событии (ограничиваем количество для embed)
                const eventsToShow = activeEvents.slice(0, 10); // Показываем только первые 10 событий
                
                for (const event of eventsToShow) {
                    const timeLeft = Math.floor((new Date(event.dateTime) - new Date()) / (1000 * 60 * 60)); // Разница в часах
                    let timeLeftStr = '';
                    
                    if (timeLeft > 0) {
                        timeLeftStr = ` через ${timeLeft}ч`;
                    } else if (timeLeft === 0) {
                        timeLeftStr = ' скоро';
                    } else {
                        timeLeftStr = ' уже прошло';
                    }
                    
                    eventsEmbed.addFields({
                        name: `${event.name} (${event.id})`,
                        value: `${event.description}\nДата: <t:${Math.floor(new Date(event.dateTime).getTime()/1000)}:F>\nУчастники: ${event.participants.length}${event.maxParticipants ? `/${event.maxParticipants}` : ''}${timeLeftStr}`,
                        inline: false
                    });
                }
                
                if (activeEvents.length > 10) {
                    eventsEmbed.setFooter({ text: `Показаны первые 10 событий из ${activeEvents.length}`, iconURL: interaction.client.user.displayAvatarURL() });
                } else {
                    eventsEmbed.setFooter({ text: `Всего событий: ${activeEvents.length}`, iconURL: interaction.client.user.displayAvatarURL() });
                }
                
                await interaction.reply({ embeds: [eventsEmbed] });
            }
            else if (subcommand === 'register') {
                const eventId = interaction.options.getString('event_id');
                
                const result = registerForEvent(eventId, interaction.user.id);
                
                if (result.success) {
                    const event = require('../System/eventSystem').getEventInfo(eventId);
                    const registerEmbed = new EmbedBuilder()
                        .setTitle('✅ Регистрация прошла успешно!')
                        .setDescription(`Вы зарегистрированы на событие: **${event.name}**`)
                        .addFields(
                            { name: 'Дата и время', value: `<t:${Math.floor(new Date(event.dateTime).getTime()/1000)}:F>`, inline: true },
                            { name: 'ID события', value: event.id, inline: true },
                            { name: 'Участники', value: `${event.participants.length}${event.maxParticipants ? `/${event.maxParticipants}` : ''}`, inline: true }
                        )
                        .setColor('#57f287')
                        .setTimestamp()
                        .setFooter({ text: `Регистрация`, iconURL: interaction.user.displayAvatarURL() });
                    
                    await interaction.reply({ embeds: [registerEmbed], ephemeral: true });
                } else {
                    await interaction.reply({
                        content: result.message,
                        ephemeral: true
                    });
                }
            }
            else if (subcommand === 'unregister') {
                const eventId = interaction.options.getString('event_id');
                
                const result = unregisterFromEvent(eventId, interaction.user.id);
                
                if (result.success) {
                    const event = require('../System/eventSystem').getEventInfo(eventId);
                    const unregisterEmbed = new EmbedBuilder()
                        .setTitle('❌ Регистрация отменена')
                        .setDescription(`Вы отменили регистрацию на событие: **${event.name}**`)
                        .addFields(
                            { name: 'ID события', value: event.id, inline: true }
                        )
                        .setColor('#ed4245')
                        .setTimestamp()
                        .setFooter({ text: `Отмена регистрации`, iconURL: interaction.user.displayAvatarURL() });
                    
                    await interaction.reply({ embeds: [unregisterEmbed], ephemeral: true });
                } else {
                    await interaction.reply({
                        content: result.message,
                        ephemeral: true
                    });
                }
            }
            else if (subcommand === 'info') {
                const eventId = interaction.options.getString('event_id');
                const event = require('../System/eventSystem').getEventInfo(eventId);
                
                if (!event) {
                    return await interaction.reply({
                        content: 'Событие с указанным ID не найдено!',
                        ephemeral: true
                    });
                }
                
                const participantsList = event.participants.map(id => `<@${id}>`).join(', ');
                const timeLeft = Math.floor((new Date(event.dateTime) - new Date()) / (1000 * 60 * 60)); // Разница в часах
                let timeLeftStr = '';
                
                if (timeLeft > 0) {
                    timeLeftStr = ` через ${timeLeft}ч`;
                } else if (timeLeft === 0) {
                    timeLeftStr = ' скоро';
                } else {
                    timeLeftStr = ' уже прошло';
                }
                
                const infoEmbed = new EmbedBuilder()
                    .setTitle(`📋 Информация о событии: ${event.name}`)
                    .setDescription(event.description)
                    .addFields(
                        { name: 'Дата и время', value: `<t:${Math.floor(new Date(event.dateTime).getTime()/1000)}:F>`, inline: true },
                        { name: 'ID события', value: event.id, inline: true },
                        { name: 'Создатель', value: `<@${event.creator}>`, inline: true },
                        { name: 'Статус', value: event.status === 'active' ? 'Активно' : event.status === 'completed' ? 'Завершено' : 'Отменено', inline: true },
                        { name: 'Участники', value: `${event.participants.length}${event.maxParticipants ? `/${event.maxParticipants}` : ''}`, inline: true },
                        { name: 'Время до события', value: timeLeftStr, inline: true },
                        { name: 'Награда за участие', value: `${event.rewardPoints || 0} очков`, inline: true }
                    )
                    .setColor('#8b00ff')
                    .setTimestamp()
                    .setFooter({ text: `Информация о событии`, iconURL: interaction.user.displayAvatarURL() });
                
                if (participantsList) {
                    infoEmbed.addFields({
                        name: 'Участники', value: participantsList, inline: false
                    });
                }
                
                await interaction.reply({ embeds: [infoEmbed] });
            }
        } catch (error) {
            console.error('Ошибка при выполнении команды event:', error);
            await interaction.reply({
                content: 'Произошла ошибка при выполнении команды!',
                ephemeral: true
            });
        }
    },
};