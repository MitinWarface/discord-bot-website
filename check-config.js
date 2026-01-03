const fs = require('fs');
const path = require('path');

console.log('Проверка конфигурации Discord бота...');

// Проверка наличия файла .env
if (!fs.existsSync(path.join(__dirname, '.env'))) {
    console.error('❌ Файл .env не найден! Создайте файл .env и добавьте туда токен бота.');
    console.log('ℹ️  Пример содержимого файла .env:');
    console.log('   DISCORD_TOKEN=ваш_токен_бота_здесь');
    console.log('   GUILD_ID=id_сервера_здесь');
    process.exit(1);
}

// Загрузка переменных окружения
require('dotenv').config();

// Проверка наличия токена
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ Переменная DISCORD_TOKEN не указана в файле .env!');
    console.log('ℹ️  Добавьте токен бота в файл .env как DISCORD_TOKEN=ваш_токен');
    process.exit(1);
}

// Проверка формата токена (токен Discord обычно начинается с "Bot " или содержит точки)
if (typeof process.env.DISCORD_TOKEN !== 'string' ||
    process.env.DISCORD_TOKEN.length < 50 ||
    process.env.DISCORD_TOKEN === 'ВАШ_ТОКЕН_БОТА' ||
    process.env.DISCORD_TOKEN === 'ваш_токен_бота_здесь') {
    console.error('❌ Токен в файле .env не является действительным токеном Discord бота.');
    console.log('ℹ️  Замените "ВАШ_ТОКЕН_БОТА" на действительный токен Discord бота в файле .env');
    process.exit(1);
} else {
    console.log('✅ Токен бота указан в .env');
}

// Проверка наличия ID сервера
if (!process.env.GUILD_ID) {
    console.warn('⚠️  Переменная GUILD_ID не указана в файле .env. Slash-команды могут не работать корректно.');
} else {
    console.log('✅ ID сервера указан в .env');
}

// Проверка наличия package.json
if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
    console.error('❌ Файл package.json не найден!');
    process.exit(1);
} else {
    console.log('✅ package.json найден');
}

// Проверка наличия основных файлов
const requiredFiles = ['index.js', 'commands'];
if (!fs.existsSync(path.join(__dirname, 'commands'))) {
    console.error('❌ Папка commands не найдена!');
    process.exit(1);
} else {
    console.log('✅ Папка commands найдена');
}

console.log('✅ Все проверки пройдены! Можно запускать бота с помощью команды: npm start');