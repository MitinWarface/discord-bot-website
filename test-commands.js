const fs = require('fs');
const path = require('path');

// Изменяем путь командам
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('Проверка всех файлов команд...');
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    
    try {
        // Удаляем кэш модуля перед импортом
        delete require.cache[require.resolve(filePath)];
        
        const command = require(filePath);
        console.log(`${file}: OK - экспорт содержит: ${JSON.stringify(Object.keys(command))}`);
        
        // Проверяем, есть ли у команды необходимые свойства
        if (command.data && command.data.name) {
            console.log(`  -> Slash команда: ${command.data.name}`);
        } else if (command.name) {
            console.log(`  -> Префиксная команда: ${command.name}`);
        } else {
            console.log(`  -> ВНИМАНИЕ: Команда не содержит name или data.name`);
        }
    } catch (e) {
        console.log(`${file}: ERROR - ${e.message}`);
        console.log(`  -> Stack: ${e.stack}`);
    }
}

console.log('\nПроверка завершена.');