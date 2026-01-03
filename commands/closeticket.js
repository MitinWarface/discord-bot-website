const fs = require('fs');

module.exports = {
  name: 'closeticket',
 description: 'Закрыть тикет по ID',
  execute(message, args) {
    // Проверка прав администратора
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('У вас нет прав для закрытия тикетов.');
    }

    const ticketId = parseInt(args[0]);
    if (isNaN(ticketId)) {
      return message.reply('Пожалуйста, укажите корректный ID тикета.');
    }

    // Чтение тикетов из файла
    let tickets = [];
    try {
      const data = fs.readFileSync('tickets.json', 'utf8');
      tickets = JSON.parse(data).tickets;
    } catch (err) {
      console.error('Ошибка чтения файла тикетов:', err);
      return message.reply('Произошла ошибка при чтении тикетов.');
    }

    // Поиск и обновление тикета
    const ticketIndex = tickets.findIndex(ticket => ticket.id === ticketId);
    if (ticketIndex === -1) {
      return message.reply(`Тикет с ID ${ticketId} не найден.`);
    }

    tickets[ticketIndex].status = 'closed';
    tickets[ticketIndex].closedAt = new Date().toISOString();
    tickets[ticketIndex].closedBy = message.author.username;

    // Сохранение обновленных тикетов
    try {
      fs.writeFileSync('tickets.json', JSON.stringify({ tickets: tickets }, null, 2));
      message.reply(`Тикет с ID ${ticketId} успешно закрыт.`);
    } catch (err) {
      console.error('Ошибка записи файла тикетов:', err);
      message.reply('Произошла ошибка при сохранении тикета.');
    }
  }
};