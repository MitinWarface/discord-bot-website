const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const eventSystem = require('../System/eventSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('events')
        .setDescription('Система событий и розыгрышей')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Создать новое событие')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Тип события')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Ежедневный бонус', value: 'daily_bonus' },
                            { name: 'Недельный конкурс', value: 'weekly_contest' },
                            { name: 'Специальный розыгрыш', value: 'special_lottery' },
                            { name: 'Юбилей сервера', value: 'server_anniversary' }
                        ))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Название события')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Описание события')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Продолжительность события в часах')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Показать список активных событий'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Принять участие в событии')
                .addStringOption(option =>
                    option.setName('event_id')
                        .setDescription('ID события')
                        .setRequired(true)))
.addSubcommandGroup(subcommandGroup =>
    subcommandGroup
        .setName('lottery')
        .setDescription('Управление розыгрышем')
        .addSubcommand(subcommand2 =>
            subcommand2
                .setName('start')
                .setDescription('Начать новый розыгрыш')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Название розыгрыша')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Описание розыгрыша')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('ticket_price')
                        .setDescription('Цена билета')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('prize_pool')
                        .setDescription('Призовой фонд')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Продолжительность в часах')
                        .setRequired(true)))
        .addSubcommand(subcommand2 =>
            subcommand2
                .setName('buy')
                .setDescription('Купить билет в розыгрыше')
                .addStringOption(option =>
                    option.setName('lottery_id')
                        .setDescription('ID розыгрыша')
                        .setRequired(true)))),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const subcommandGroup = interaction.options.getSubcommandGroup();

        if (subcommandGroup === 'lottery') {
            switch (subcommand) {
                case 'start':
                    // Проверяем права администратора
                    if (!interaction.member.permissions.has('Administrator')) {
                        await interaction.reply({
                            content: 'У вас нет прав для создания розыгрышей!',
                            ephemeral: true
                        });
                        return;
                    }
                    
                    const lotteryTitle = interaction.options.getString('title');
                    const lotteryDescription = interaction.options.getString('description');
                    const ticketPrice = interaction.options.getInteger('ticket_price');
                    const prizePool = interaction.options.getInteger('prize_pool');
                    const durationHoursLottery = interaction.options.getInteger('duration');
                    
                    const endTimeLottery = Date.now() + (durationHoursLottery * 60 * 60 * 1000);
                    
                    const lotteryData = {
                        title: lotteryTitle,
                        description: lotteryDescription,
                        ticketPrice: ticketPrice,
                        prizePool: prizePool,
                        endTime: endTimeLottery,
                        maxTickets: Math.floor(prizePool / ticketPrice) * 2 // Максимальное количество билетов
                    };
                    
                    const newLotteryId = `lottery_${Date.now()}`;
                    eventSystem.createLottery(newLotteryId, lotteryData);
                    
                    // Создаем embed для анонса розыгрыша
                    const lotteryEmbed = new EmbedBuilder()
                        .setTitle(`🎉 Розыгрыш: ${lotteryTitle}`)
                        .setColor('#e67e22')
                        .setDescription(lotteryDescription)
                        .addFields(
                            { name: 'Цена билета', value: `${ticketPrice} очков`, inline: true },
                            { name: 'Призовой фонд', value: `${prizePool} очков`, inline: true },
                            { name: 'Время окончания', value: `<t:${Math.floor(endTimeLottery / 1000)}:R>`, inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: `Розыгрыш начался`, iconURL: interaction.client.user.displayAvatarURL() });
                    
                    // Создаем кнопку для покупки билета
                    const buyTicketRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`lottery_buy_ticket_${newLotteryId}`)
                                .setLabel('Купить билет')
                                .setStyle(ButtonStyle.Success)
                                .setEmoji('🎟️')
                        );
                    
                    await interaction.reply({
                        content: '@everyone Внимание! Начался новый розыгрыш! 🎉',
                        embeds: [lotteryEmbed],
                        components: [buyTicketRow]
                    });
                    
                    // Устанавливаем таймер для завершения розыгрыша
                    setTimeout(async () => {
                        await eventSystem.finishLottery(newLotteryId, interaction.channel);
                    }, durationHoursLottery * 60 * 60 * 1000);
                    break;
                case 'buy':
                    const lotteryId = interaction.options.getString('lottery_id');
                    
                    const buyResult = eventSystem.buyTicket(interaction.user.id, lotteryId);
                    
                    await interaction.reply({
                        content: buyResult.message,
                        ephemeral: true
                    });
                    break;
                default:
                    await interaction.reply({
                        content: 'Неизвестная подкоманда розыгрыша!',
                        ephemeral: true
                    });
                    break;
            }
        } else {
            switch (subcommand) {
                case 'create':
                    // Проверяем права администратора
                    if (!interaction.member.permissions.has('Administrator')) {
                        await interaction.reply({
                            content: 'У вас нет прав для создания событий!',
                            ephemeral: true
                        });
                        return;
                    }
                    
                    const eventType = interaction.options.getString('type');
                    const eventTitle = interaction.options.getString('title');
                    const eventDescription = interaction.options.getString('description');
                    const durationHours = interaction.options.getInteger('duration');
                    
                    const endTime = Date.now() + (durationHours * 60 * 60 * 1000); // Конец события через указанное количество часов
                    
                    const eventData = {
                        title: eventTitle,
                        description: eventDescription,
                        endTime: endTime,
                        rewards: [
                            { type: 'points', value: 50, name: 'Основной приз' },
                            { type: 'points', value: 30, name: 'Второе место' },
                            { type: 'points', value: 20, name: 'Третье место' }
                        ], // Пример наград
                        creator: interaction.user.id
                    };
                    
                    const eventId = `event_${Date.now()}`;
                    const event = eventSystem.createEvent(eventId, eventType, eventData);
                    
                    const result = await eventSystem.startEvent(interaction, event);
                    
                    if (result.success) {
                        await interaction.reply({
                            content: `Событие **${event.title}** успешно создано и запущено!`
                        });
                    } else {
                        await interaction.reply({
                            content: result.message,
                            ephemeral: true
                        });
                    }
                    break;
                    
                case 'list':
                    const activeEvents = eventSystem.getActiveEvents();
                    
                    if (activeEvents.length === 0) {
                        const noEventsEmbed = new EmbedBuilder()
                            .setTitle('📋 Активные события')
                            .setColor('#95a5a6')
                            .setDescription('В настоящее время нет активных событий.')
                            .setTimestamp()
                            .setFooter({ text: `События`, iconURL: interaction.user.displayAvatarURL() });
                        
                        await interaction.reply({
                            embeds: [noEventsEmbed]
                        });
                        return;
                    }
                    
                    const eventsEmbed = new EmbedBuilder()
                        .setTitle('📋 Активные события')
                        .setColor('#3498db')
                        .setDescription('Вот список текущих активных событий:')
                        .setTimestamp()
                        .setFooter({ text: `Всего событий: ${activeEvents.length}`, iconURL: interaction.user.displayAvatarURL() });
                    
                    for (const event of activeEvents) {
                        const timeLeftMs = event.endTime - Date.now();
                        const timeLeftHours = Math.floor(timeLeftMs / (1000 * 60));
                        const remainingMinutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
                        eventsEmbed.addFields({
                            name: event.title,
                            value: `${event.description}\nВремя до окончания: ${timeLeftHours}ч ${remainingMinutes}м\nУчастников: ${event.participants.length}`,
                            inline: false
                        });
                    }
                    
                    await interaction.reply({
                        embeds: [eventsEmbed]
                    });
                    break;
                    
                case 'join':
                    const eventIdJoin = interaction.options.getString('event_id');
                    
                    const joinResult = eventSystem.joinEvent(interaction.user.id, eventIdJoin);
                    
                    await interaction.reply({
                        content: joinResult.message,
                        ephemeral: true
                    });
                    break;
                    
                default:
                    await interaction.reply({
                        content: 'Неизвестная подкоманда!',
                        ephemeral: true
                    });
                    break;
            }
        }
    }
};