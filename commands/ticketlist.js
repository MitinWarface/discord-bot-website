const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketlist')
        .setDescription('Просмотреть все тикеты')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Чтение тикетов из файла
        let tickets = [];
        try {
            const ticketsPath = path.join(__dirname, '../tickets.json');
            if (fs.existsSync(ticketsPath)) {
                const data = fs.readFileSync(ticketsPath, 'utf8');
                tickets = JSON.parse(data).tickets || [];
            }
        } catch (err) {
            console.error('Ошибка чтения файла тикетов:', err);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при чтении тикетов.')
                .setColor('#ff0000')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Формирование списка тикетов
        if (tickets.length === 0) {
            const noTicketsEmbed = new EmbedBuilder()
                .setTitle('📋 Список тикетов')
                .setDescription('Нет созданных тикетов.')
                .setColor('#8b00ff')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [noTicketsEmbed], ephemeral: true });
        }

        // Сортируем тикеты по статусу (открытые первыми)
        const sortedTickets = tickets.sort((a, b) => {
            if (a.status === 'open' && b.status !== 'open') return -1;
            if (a.status !== 'open' && b.status === 'open') return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const openTickets = sortedTickets.filter(ticket => ticket.status === 'open');
        const closedTickets = sortedTickets.filter(ticket => ticket.status === 'closed');

        const ticketListEmbed = new EmbedBuilder()
            .setTitle('📋 Список тикетов')
            .setColor('#8b00ff')
            .setTimestamp();

        // Добавляем информацию о тикетах
        if (openTickets.length > 0) {
            let openTicketList = '';
            for (let i = 0; i < Math.min(openTickets.length, 10); i++) { // Показываем первые 10 открытых тикетов
                const ticket = openTickets[i];
                const author = await interaction.guild.members.fetch(ticket.author).catch(() => null);
                openTicketList += `**ID:** ${ticket.id}\n`;
                openTicketList += `**Автор:** ${author ? `<@${ticket.author}>` : 'Неизвестный'}\n`;
                openTicketList += `**Содержание:** ${ticket.content.substring(0, 50)}${ticket.content.length > 50 ? '...' : ''}\n`;
                openTicketList += `**Дата создания:** <t:${Math.floor(new Date(ticket.createdAt).getTime()/1000)}:F>\n`;
                openTicketList += '---\n';
            }
            
            ticketListEmbed.addFields({
                name: `🔓 Открытые тикеты (${openTickets.length})`,
                value: openTicketList,
                inline: false
            });
        }

        if (closedTickets.length > 0) {
            // Показываем последние 5 закрытых тикетов
            const recentClosed = closedTickets.slice(0, 5);
            let closedTicketList = '';
            for (const ticket of recentClosed) {
                const author = await interaction.guild.members.fetch(ticket.author).catch(() => null);
                closedTicketList += `**ID:** ${ticket.id}\n`;
                closedTicketList += `**Автор:** ${author ? `<@${ticket.author}>` : 'Неизвестный'}\n`;
                closedTicketList += `**Дата закрытия:** <t:${Math.floor(new Date(ticket.closedAt || ticket.createdAt).getTime()/1000)}:F>\n`;
                closedTicketList += '---\n';
            }
            
            ticketListEmbed.addFields({
                name: `🔒 Закрытые тикеты (${closedTickets.length})`,
                value: closedTicketList,
                inline: false
            });
        }

        // Если есть много тикетов, добавляем общую информацию
        if (tickets.length > 15) {
            ticketListEmbed.setFooter({ 
                text: `Всего тикетов: ${tickets.length}`, 
                iconURL: interaction.client.user.displayAvatarURL() 
            });
        }

        await interaction.reply({ embeds: [ticketListEmbed], ephemeral: true });
    }
};