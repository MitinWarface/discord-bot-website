const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Функция для проверки существования команды
function commandExists(command) {
    try {
        execSync(command, { stdio: 'pipe' });
        return true;
    } catch (error) {
        return false;
    }
}

// Проверяем, установлен ли Vercel CLI
if (!commandExists('vercel --version')) {
    console.error('Vercel CLI не установлен. Установите его с помощью: npm install -g vercel');
    process.exit(1);
}

// Читаем файл .env
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
    console.error('Файл .env не найден в корне проекта');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

// Объект для хранения переменных из .env
const envVars = {};

// Парсим переменные из .env файла
for (const line of envLines) {
    if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        const trimmedKey = key.trim();
        const trimmedValue = valueParts.join('=').trim(); // Сохраняем полное значение, включая '=' внутри
        
        if (trimmedKey && trimmedValue) {
            envVars[trimmedKey] = trimmedValue;
        }
    }
}

// Основные переменные, которые нужно установить в Vercel
const requiredVars = [
    'DISCORD_TOKEN',
    'DISCORD_CLIENT_ID', 
    'DISCORD_CLIENT_SECRET',
    'GUILD_ID',
    'SESSION_SECRET',
    'BASE_URL',
    'YOUTUBE_TOKEN',
    'OPENWEATHER_API_KEY',
    'LAVALINK_HOST',
    'LAVALINK_PORT',
    'LAVALINK_PASSWORD'
];

console.log('Начинаем настройку переменных окружения Vercel...');

// Устанавливаем каждую переменную
for (const varName of requiredVars) {
    if (envVars[varName]) {
        try {
            // Проверяем, существует ли уже такой секрет
            try {
                execSync(`vercel secrets inspect ${varName.toLowerCase()}`, { stdio: 'pipe' });
                console.log(`Секрет ${varName.toLowerCase()} уже существует, пропускаем...`);
            } catch (inspectError) {
                // Секрет не существует, создаем его
                console.log(`Создание секрета для ${varName}...`);
                execSync(`vercel secrets add ${varName.toLowerCase()} "${envVars[varName]}"`, { stdio: 'inherit' });
            }
            
            // Связываем секрет с переменной окружения для всех сред
            console.log(`Связывание ${varName} с секретом...`);
            execSync(`vercel env add ${varName} preview`, { stdio: 'inherit' });
            execSync(`vercel env add ${varName} production`, { stdio: 'inherit' });
        } catch (error) {
            console.error(`Ошибка при настройке переменной ${varName}:`, error.message);
        }
    } else {
        console.warn(`Предупреждение: Переменная ${varName} не найдена в .env файле`);
    }
}

console.log('Настройка переменных окружения Vercel завершена!');
console.log('Теперь выполните: vercel --prod');
