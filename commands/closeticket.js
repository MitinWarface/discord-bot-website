const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('closeticket')
        .setDescription('Закрыть тикет по ID')
        .addIntegerOption(option =>
            option.setName('ticket_id')
                .setDescription('ID тикета для закрытия')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const ticketId = interaction.options.getInteger('ticket_id');
        
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

        // Поиск и обновление тикета
        const ticketIndex = tickets.findIndex(ticket => ticket.id === ticketId);
        if (ticketIndex === -1) {
            const notFoundEmbed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription(`Тикет с ID ${ticketId} не найден.`)
                .setColor('#ff0000')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [notFoundEmbed], ephemeral: true });
        }

        tickets[ticketIndex].status = 'closed';
        tickets[ticketIndex].closedAt = new Date().toISOString();
        tickets[ticketIndex].closedBy = interaction.user.id;

        // Сохранение обновленных тикетов
        try {
            const ticketsPath = path.join(__dirname, '../tickets.json');
            fs.writeFileSync(ticketsPath, JSON.stringify({ tickets: tickets }, null, 2));
            
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Тикет закрыт')
                .setDescription(`Тикет с ID ${ticketId} успешно закрыт.`)
                .addFields(
                    { name: 'Закрыл', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'ID тикета', value: ticketId.toString(), inline: true }
                )
                .setColor('#57f287')
                .setTimestamp();
            
            await interaction.reply({ embeds: [successEmbed] });
        } catch (err) {
            console.error('Ошибка записи файла тикетов:', err);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при сохранении тикета.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};