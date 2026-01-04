#!/usr/bin/env node

/**
 * Скрипт для подготовки проекта к деплою на Vercel
 * Этот скрипт проверяет необходимые файлы и настройки для Vercel
 */

const fs = require('fs');
const path = require('path');

console.log('Подготовка проекта к деплою на Vercel...');

// Проверяем наличие необходимых файлов
const requiredFiles = [
  'vercel.json',
  'package.json',
  'index.js',
  'dashboard/server.js',
  'api/index.js'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Файл ${file} не найден!`);
    allFilesExist = false;
 } else {
    console.log(`✅ Файл ${file} найден`);
  }
}

if (!allFilesExist) {
  console.error('❌ Не все необходимые файлы для Vercel найдены. Завершение.');
  process.exit(1);
}

// Проверяем package.json на наличие необходимых скриптов
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['start', 'vercel-build'];

let allScriptsExist = true;
for (const script of requiredScripts) {
  if (!packageJson.scripts[script]) {
    console.error(`❌ Скрипт ${script} не найден в package.json!`);
    allScriptsExist = false;
  } else {
    console.log(`✅ Скрипт ${script} найден`);
  }
}

if (!allScriptsExist) {
  console.error('❌ Не все необходимые скрипты для Vercel найдены. Завершение.');
  process.exit(1);
}

// Проверяем зависимости
const requiredDependencies = [
  'express',
  'discord.js',
  'dotenv',
  'passport-discord',
  'express-session'
];

let allDepsExist = true;
const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

for (const dep of requiredDependencies) {
  if (!allDependencies[dep]) {
    console.error(`❌ Зависимость ${dep} не найдена в package.json!`);
    allDepsExist = false;
  } else {
    console.log(`✅ Зависимость ${dep} найдена`);
  }
}

if (!allDepsExist) {
  console.error('❌ Не все необходимые зависимости для Vercel найдены. Завершение.');
  process.exit(1);
}

// Создаем .env.example если его нет
const envExamplePath = '.env.example';
if (!fs.existsSync(envExamplePath)) {
  const envContent = `# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
GUILD_ID=your_guild_id_here
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here

# Dashboard Configuration
BASE_URL=https://your-vercel-project-url.vercel.app
SESSION_SECRET=your_session_secret_here

# Lavalink Configuration (if using)
LAVALINK_HOST=your_lavalink_host
LAVALINK_PORT=2333
LAVALINK_PASSWORD=your_lavalink_password

# Port Configuration
PORT=3000
`;
  fs.writeFileSync(envExamplePath, envContent);
  console.log(`✅ Файл ${envExamplePath} создан`);
} else {
 console.log(`✅ Файл ${envExamplePath} уже существует`);
}

console.log('✅ Подготовка к деплою на Vercel завершена успешно!');
console.log('\nДля деплоя на Vercel:');
console.log('1. Установите Vercel CLI: npm install -g vercel');
console.log('2. Залогиньтесь: vercel login');
console.log('3. Задеплойте проект: vercel --prod');
console.log('\nНе забудьте добавить переменные окружения в настройках проекта на Vercel!');