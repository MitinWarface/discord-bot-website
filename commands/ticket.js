const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Путь к файлу с тикетами
const ticketsPath = path.join(__dirname, '../tickets.json');

// Загрузка тикетов
function loadTickets() {
    if (fs.existsSync(ticketsPath)) {
        const data = fs.readFileSync(ticketsPath, 'utf8');
        return JSON.parse(data);
    }
    return { tickets: [], closedTickets: [] };
}

// Сохранение тикетов
function saveTickets(tickets) {
    fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Управление системой тикетов')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Создать новый тикет')
                .addStringOption(option =>
                    option.setName('subject')
                        .setDescription('Тема тикета')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Закрыть тикет')
                .addStringOption(option =>
                    option.setName('ticket_id')
                        .setDescription('ID тикета для закрытия')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Показать список открытых тикетов'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Добавить участника в тикет')
                .addStringOption(option =>
                    option.setName('ticket_id')
                        .setDescription('ID тикета')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Пользователь для добавления')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Удалить участника из тикета')
                .addStringOption(option =>
                    option.setName('ticket_id')
                        .setDescription('ID тикета')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Пользователь для удаления')
                        .setRequired(true))),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const tickets = loadTickets();
        
        switch (subcommand) {
            case 'create':
                await handleCreateTicket(interaction, tickets);
                break;
            case 'close':
                await handleCloseTicket(interaction, tickets);
                break;
            case 'list':
                await handleListTickets(interaction, tickets);
                break;
            case 'add':
                await handleAddUser(interaction, tickets);
                break;
            case 'remove':
                await handleRemoveUser(interaction, tickets);
                break;
        }
    }
};

async function handleCreateTicket(interaction) {
    const subject = interaction.options.getString('subject');
    const userId = interaction.user.id;
    const guild = interaction.guild;
    
    try {
        // Создаем приватный канал для тикета
        const ticketChannel = await guild.channels.create({
            name: `ticket-${interaction.user.username}-${Date.now()}`,
            type: 2, // Приватный текстовый канал
            parent: interaction.channel.parent, // Создаем в той же категории, что и текущий канал
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: ['ViewChannel']
                },
                {
                    id: userId,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                },
                {
                    id: interaction.member.roles.cache.filter(r => r.permissions.has(PermissionFlagsBits.ManageChannels)).first()?.id || guild.roles.everyone,
                    allow: ['ViewChannel', 'SendMessages', 'ManageChannels', 'ReadMessageHistory']
                }
            ],
            topic: `Тикет от ${interaction.user.tag} | Тема: ${subject}`
        });
        
        // Создаем embed с информацией о тикете
        const ticketEmbed = new EmbedBuilder()
            .setTitle('📩 Новый тикет')
            .setDescription(`Тикет создан пользователем <@${userId}>\n\n**Тема:** ${subject}`)
            .addFields(
                { name: 'Пользователь', value: `<@${userId}>`, inline: true },
                { name: 'Дата создания', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true },
                { name: 'Тема', value: subject, inline: false }
            )
            .setColor('#8b00ff')
            .setTimestamp();
        
        // Создаем кнопки для управления тикетом
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Закрыть тикет')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒'),
                new ButtonBuilder()
                    .setCustomId('add_user_ticket')
                    .setLabel('Добавить участника')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👤'),
                new ButtonBuilder()
                    .setCustomId('remove_user_ticket')
                    .setLabel('Удалить участника')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );
        
        // Отправляем сообщение в тикет с кнопками
        const ticketMessage = await ticketChannel.send({
            content: `<@${userId}>`,
            embeds: [ticketEmbed],
            components: [row]
        });
        
        // Отправляем подтверждение пользователю
        const confirmEmbed = new EmbedBuilder()
            .setTitle('✅ Тикет создан')
            .setDescription(`Ваш тикет создан в канале <#${ticketChannel.id}>`)
            .addFields(
                { name: 'Тема', value: subject, inline: true },
                { name: 'Канал', value: `<#${ticketChannel.id}>`, inline: true }
            )
            .setColor('#00ff00')
            .setTimestamp();
        
        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
        
        // Сохраняем информацию о тикете
        const newTicket = {
            id: ticketChannel.id,
            userId: userId,
            subject: subject,
            channelId: ticketChannel.id,
            createdAt: new Date().toISOString(),
            status: 'open',
            messages: []
        };
        
        tickets.tickets.push(newTicket);
        saveTickets(tickets);
        
    } catch (error) {
        console.error('Ошибка при создании тикета:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription('Произошла ошибка при создании тикета. Пожалуйста, попробуйте снова.')
            .setColor('#ff0000')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleCloseTicket(interaction, tickets) {
    const ticketId = interaction.options.getString('ticket_id');
    
    // Находим тикет
    const ticketIndex = tickets.tickets.findIndex(t => t.channelId === ticketId);
    
    if (ticketIndex === -1) {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription(`Тикет с ID **${ticketId}** не найден!`)
            .setColor('#ff0000')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
    
    const ticket = tickets.tickets[ticketIndex];
    
    try {
        // Получаем канал тикета
        const ticketChannel = interaction.guild.channels.cache.get(ticket.channelId);
        
        if (ticketChannel) {
            // Архивируем сообщения из тикета
            const messages = await ticketChannel.messages.fetch({ limit: 100 });
            const messageLog = messages.reverse().map(msg => ({
                user: msg.author.tag,
                content: msg.content,
                timestamp: msg.createdAt.toISOString()
            }));
            
            // Добавляем информацию о закрытии тикета
            const closeEmbed = new EmbedBuilder()
                .setTitle('🔒 Тикет закрыт')
                .setDescription(`Тикет **${ticket.subject}** закрыт пользователем <@${interaction.user.id}>`)
                .addFields(
                    { name: 'Пользователь', value: `<@${ticket.userId}>`, inline: true },
                    { name: 'Дата закрытия', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true }
                )
                .setColor('#808080')
                .setTimestamp();
            
            await ticketChannel.send({ embeds: [closeEmbed] });
            
            // Переименовываем канал в архивный
            await ticketChannel.setName(`closed-${ticketChannel.name}`);
            await ticketChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                ViewChannel: false
            });
            
            // Перемещаем тикет в закрытые
            const closedTicket = {
                ...ticket,
                closedAt: new Date().toISOString(),
                closedBy: interaction.user.id,
                messages: messageLog
            };
            
            tickets.closedTickets.push(closedTicket);
            tickets.tickets.splice(ticketIndex, 1);
            saveTickets(tickets);
            
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Тикет закрыт')
                .setDescription(`Тикет **${ticket.subject}** (ID: ${ticketId}) успешно закрыт!`)
                .setColor('#00ff00')
                .setTimestamp();
            
            await interaction.reply({ embeds: [successEmbed] });
        } else {
            // Если канал не найден, просто удаляем тикет из списка
            tickets.tickets.splice(ticketIndex, 1);
            saveTickets(tickets);
            
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Тикет удален')
                .setDescription(`Тикет **${ticket.subject}** (ID: ${ticketId}) был удален из списка (канал не найден)`)
                .setColor('#00ff00')
                .setTimestamp();
            
            await interaction.reply({ embeds: [successEmbed] });
        }
    } catch (error) {
        console.error('Ошибка при закрытии тикета:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription('Произошла ошибка при закрытии тикета.')
            .setColor('#ff0000')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleListTickets(interaction, tickets) {
    const openTickets = tickets.tickets;
    
    if (openTickets.length === 0) {
        const emptyEmbed = new EmbedBuilder()
            .setTitle('📋 Открытые тикеты')
            .setDescription('Нет открытых тикетов.')
            .setColor('#8b00ff')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [emptyEmbed], ephemeral: true });
    }
    
    const ticketsEmbed = new EmbedBuilder()
        .setTitle('📋 Открытые тикеты')
        .setDescription(`Всего открытых тикетов: **${openTickets.length}**`)
        .setColor('#8b00ff')
        .setTimestamp();
    
    // Добавляем информацию о первых 25 тикетах (ограничение embed)
    const ticketsToShow = openTickets.slice(0, 25);
    
    for (const ticket of ticketsToShow) {
        try {
            const user = await interaction.guild.members.fetch(ticket.userId).catch(() => null);
            const channel = interaction.guild.channels.cache.get(ticket.channelId);
            
            ticketsEmbed.addFields({
                name: `#${ticket.id.substring(0, 6)}`,
                value: `**Пользователь:** ${user ? `<@${ticket.userId}>` : 'Неизвестно'}\n**Тема:** ${ticket.subject}\n**Канал:** ${channel ? `<#${ticket.channelId}>` : 'Канал удален'}\n**Дата создания:** <t:${Math.floor(new Date(ticket.createdAt).getTime()/1000)}:R>`,
                inline: false
            });
        } catch (error) {
            // Если не удается получить информацию о пользователе или канале
            ticketsEmbed.addFields({
                name: `#${ticket.id.substring(0, 6)}`,
                value: `**Пользователь:** <@${ticket.userId}>\n**Тема:** ${ticket.subject}\n**Канал:** ${ticket.channelId}\n**Дата создания:** <t:${Math.floor(new Date(ticket.createdAt).getTime()/1000)}:R>`,
                inline: false
            });
        }
    }
    
    if (openTickets.length > 25) {
        ticketsEmbed.setFooter({ text: `Показаны первые 25 тикетов из ${openTickets.length}`, iconURL: interaction.client.user.displayAvatarURL() });
    } else {
        ticketsEmbed.setFooter({ text: `Всего тикетов: ${openTickets.length}`, iconURL: interaction.client.user.displayAvatarURL() });
    }
    
    await interaction.reply({ embeds: [ticketsEmbed], ephemeral: true });
}

async function handleAddUser(interaction, tickets) {
    const ticketId = interaction.options.getString('ticket_id');
    const userToAdd = interaction.options.getUser('user');
    
    // Проверяем, является ли пользователь администратором или создателем тикета
    const ticket = tickets.tickets.find(t => t.channelId === ticketId);
    
    if (!ticket) {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription(`Тикет с ID **${ticketId}** не найден!`)
            .setColor('#ff0000')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
    
    if (interaction.user.id !== ticket.userId && !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        const permError = new EmbedBuilder()
            .setTitle('❌ Нет прав')
            .setDescription('У вас нет прав для добавления участников в этот тикет!')
            .setColor('#ff0000')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [permError], ephemeral: true });
    }
    
    try {
        // Получаем канал тикета
        const ticketChannel = interaction.guild.channels.cache.get(ticket.channelId);
        
        if (!ticketChannel) {
            const channelError = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Канал тикета не найден!')
                .setColor('#ff0000')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [channelError], ephemeral: true });
        }
        
        // Добавляем пользователя в канал
        await ticketChannel.permissionOverwrites.edit(userToAdd, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });
        
        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Участник добавлен')
            .setDescription(`Пользователь <@${userToAdd.id}> добавлен в тикет <#${ticketChannel.id}>`)
            .setColor('#00ff00')
            .setTimestamp();
        
        await interaction.reply({ embeds: [successEmbed] });
        
        // Отправляем уведомление пользователю, которого добавили
        try {
            const notifyEmbed = new EmbedBuilder()
                .setTitle('📩 Вас добавили в тикет')
                .setDescription(`Вы были добавлены в тикет **${ticket.subject}** на сервере **${interaction.guild.name}**`)
                .addFields(
                    { name: 'Создатель тикета', value: `<@${ticket.userId}>`, inline: true },
                    { name: 'Канал', value: `<#${ticketChannel.id}>`, inline: true }
                )
                .setColor('#8b00ff')
                .setTimestamp();
            
            await userToAdd.send({ embeds: [notifyEmbed] });
        } catch (error) {
            // Не удалось отправить личное сообщение
            console.log(`Не удалось отправить уведомление пользователю ${userToAdd.id}`);
        }
    } catch (error) {
        console.error('Ошибка при добавлении пользователя в тикет:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription('Произошла ошибка при добавлении пользователя в тикет.')
            .setColor('#ff0000')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleRemoveUser(interaction, tickets) {
    const ticketId = interaction.options.getString('ticket_id');
    const userToRemove = interaction.options.getUser('user');
    
    // Проверяем, является ли пользователь администратором или создателем тикета
    const ticket = tickets.tickets.find(t => t.channelId === ticketId);
    
    if (!ticket) {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription(`Тикет с ID **${ticketId}** не найден!`)
            .setColor('#ff0000')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
    
    if (interaction.user.id !== ticket.userId && !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        const permError = new EmbedBuilder()
            .setTitle('❌ Нет прав')
            .setDescription('У вас нет прав для удаления участников из этого тикета!')
            .setColor('#ff0000')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [permError], ephemeral: true });
    }
    
    // Нельзя удалить создателя тикета
    if (userToRemove.id === ticket.userId) {
        const ownerError = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription('Нельзя удалить создателя тикета!')
            .setColor('#ff0000')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [ownerError], ephemeral: true });
    }
    
    try {
        // Получаем канал тикета
        const ticketChannel = interaction.guild.channels.cache.get(ticket.channelId);
        
        if (!ticketChannel) {
            const channelError = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Канал тикета не найден!')
                .setColor('#ff0000')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [channelError], ephemeral: true });
        }
        
        // Удаляем права пользователя в канале
        await ticketChannel.permissionOverwrites.delete(userToRemove);
        
        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Участник удален')
            .setDescription(`Пользователь <@${userToRemove.id}> удален из тикета <#${ticketChannel.id}>`)
            .setColor('#00ff00')
            .setTimestamp();
        
        await interaction.reply({ embeds: [successEmbed] });
        
        // Отправляем уведомление пользователю, которого удалили
        try {
            const notifyEmbed = new EmbedBuilder()
                .setTitle('📩 Вас удалили из тикета')
                .setDescription(`Вы были удалены из тикета **${ticket.subject}** на сервере **${interaction.guild.name}**`)
                .addFields(
                    { name: 'Канал', value: `<#${ticketChannel.id}>`, inline: true }
                )
                .setColor('#8b00ff')
                .setTimestamp();
            
            await userToRemove.send({ embeds: [notifyEmbed] });
        } catch (error) {
            // Не удалось отправить личное сообщение
            console.log(`Не удалось отправить уведомление пользователю ${userToRemove.id}`);
        }
    } catch (error) {
        console.error('Ошибка при удалении пользователя из тикета:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription('Произошла ошибка при удалении пользователя из тикета.')
            .setColor('#ff0000')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}