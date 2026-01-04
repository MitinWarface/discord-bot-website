#!/usr/bin/env node

/**
 * Скрипт для проверки конфигурации Vercel перед развертыванием
 */

const fs = require('fs');
const path = require('path');

console.log('Проверка конфигурации Vercel...');

// Проверяем наличие необходимых файлов
const requiredFiles = [
  'vercel.json',
  'package.json',
  'api/server.js'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Отсутствует необходимый файл: ${file}`);
    process.exit(1);
  } else {
    console.log(`✅ Найден файл: ${file}`);
  }
}

// Проверяем содержимое vercel.json
try {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  
 if (!vercelConfig.version || vercelConfig.version !== 2) {
    console.warn('⚠️  Рекомендуется использовать версию 2 конфигурации Vercel');
  }
  
  if (!vercelConfig.builds || vercelConfig.builds.length === 0) {
    console.error('❌ В конфигурации отсутствуют сборки (builds)');
    process.exit(1);
  }
  
  let hasValidBuild = false;
  for (const build of vercelConfig.builds) {
    if (build.src === 'api/server.js' && build.use === '@vercel/node') {
      hasValidBuild = true;
      console.log(`✅ Найдена корректная сборка для: ${build.src}`);
      break;
    }
  }
  
  if (!hasValidBuild) {
    console.error('❌ Не найдена корректная сборка для api/server.js');
    process.exit(1);
  }
  
  console.log('✅ Конфигурация Vercel корректна');
} catch (error) {
  console.error('❌ Ошибка при чтении или парсинге vercel.json:', error.message);
  process.exit(1);
}

// Проверяем package.json
try {
  const packageConfig = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (!packageConfig.scripts || !packageConfig.scripts['vercel-build']) {
    console.warn('⚠️  Рекомендуется добавить скрипт vercel-build в package.json');
  } else {
    console.log('✅ Найден скрипт vercel-build');
  }
} catch (error) {
  console.error('❌ Ошибка при чтении или парсинге package.json:', error.message);
  process.exit(1);
}

// Проверяем, что api/server.js экспортирует приложение
try {
  const serverContent = fs.readFileSync('api/server.js', 'utf8');
  
  if (!serverContent.includes('module.exports = app;')) {
    console.error('❌ Файл api/server.js не экспортирует приложение (module.exports = app;)');
    process.exit(1);
  } else {
    console.log('✅ Файл api/server.js экспортирует приложение');
  }
} catch (error) {
  console.error('❌ Ошибка при чтении api/server.js:', error.message);
  process.exit(1);
}

console.log('\n🎉 Все проверки пройдены! Конфигурация готова к развертыванию на Vercel.');
console.log('\nДля развертывания выполните:');
console.log('1. Установите CLI Vercel: npm install -g vercel');
console.log('2. Войдите в аккаунт: vercel login');
console.log('3. Разверните приложение: vercel --prod');
console.log('\nИли импортируйте проект в Vercel Dashboard и подключите репозиторий GitHub.');