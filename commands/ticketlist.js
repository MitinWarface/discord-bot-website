const fs = require('fs');

module.exports = {
  name: 'ticketlist',
  description: 'Просмотреть все тикеты',
  execute(message, args) {
    // Проверка прав администратора
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      return message.reply('У вас нет прав для просмотра тикетов.');
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

    // Формирование списка тикетов
    if (tickets.length === 0) {
      return message.reply('Нет созданных тикетов.');
    }

    let ticketList = 'Список тикетов:\n';
    tickets.forEach(ticket => {
      ticketList += `\nID: ${ticket.id}\n`;
      ticketList += `Автор: ${ticket.author}\n`;
      ticketList += `Содержание: ${ticket.content}\n`;
      ticketList += `Статус: ${ticket.status}\n`;
      ticketList += `Дата создания: ${new Date(ticket.createdAt).toLocaleString('ru-RU')}\n`;
      ticketList += '---\n';
    });

    message.reply(ticketList);
  }
};