const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUserProfile, updateUserProfile } = require('./userProfiles');

// Система мини-игр для бота Aurora

class GameSystem {
    constructor() {
        this.activeGames = new Map(); // Хранит активные игры
        this.gameTimeouts = new Map(); // Хранит таймеры игр
    }

    // Игра "Угадай число"
    async startGuessNumberGame(interaction) {
        const userId = interaction.user.id;
        
        // Проверяем, не играет ли пользователь уже в какую-то игру
        if (this.activeGames.has(userId)) {
            await interaction.reply({
                content: 'Вы уже играете в игру! Завершите текущую игру перед началом новой.',
                flags: ['Ephemeral']
            });
            return;
        }
        
        // Генерируем случайное число от 1 до 100
        const secretNumber = Math.floor(Math.random() * 100) + 1;
        const gameId = `guess_${Date.now()}_${userId}`;
        
        // Создаем объект игры
        const gameData = {
            id: gameId,
            type: 'guess_number',
            userId: userId,
            secretNumber: secretNumber,
            attempts: 0,
            maxAttempts: 7,
            startTime: Date.now()
        };
        
        // Сохраняем игру
        this.activeGames.set(userId, gameData);
        
        // Создаем embed с информацией об игре
        const gameEmbed = new EmbedBuilder()
            .setTitle('🎲 Игра "Угадай число"')
            .setColor('#8b00ff')
            .setDescription('Я загадал число от 1 до 100. Попробуй угадать его за 7 попыток!\n\nВведите число от 1 до 100:')
            .addFields(
                { name: 'Попытки', value: `${gameData.attempts}/${gameData.maxAttempts}`, inline: true },
                { name: 'Время начала', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Игра запущена`, iconURL: interaction.user.displayAvatarURL() });
        
        // Создаем кнопки для быстрых чисел
        const quickNumbersRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('quick_num_10')
                    .setLabel('10')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('quick_num_25')
                    .setLabel('25')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('quick_num_50')
                    .setLabel('50')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('quick_num_75')
                    .setLabel('75')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('quick_num_90')
                    .setLabel('90')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        await interaction.reply({
            embeds: [gameEmbed],
            components: [quickNumbersRow],
            flags: []
        });
        
        // Устанавливаем таймер на завершение игры (10 минут)
        const timeoutId = setTimeout(() => {
            this.endGame(userId, interaction, 'timeout');
        }, 600000); // 10 минут
        
        this.gameTimeouts.set(userId, timeoutId);
    }
    
    // Обработка ввода числа в игре "Угадай число"
    async handleGuessNumberInput(interaction, guess) {
        const userId = interaction.user.id;
        const game = this.activeGames.get(userId);
        
        if (!game) {
            await interaction.reply({
                content: 'Вы не участвуете в активной игре!',
                flags: ['Ephemeral']
            });
            return;
        }
        
        // Проверяем, является ли это игрой "Угадай число"
        if (game.type !== 'guess_number') {
            await interaction.reply({
                content: 'Эта команда работает только в игре "Угадай число"!',
                flags: ['Ephemeral']
            });
            return;
        }
        
        // Проверяем, является ли ввод числом
        const number = parseInt(guess);
        if (isNaN(number) || number < 1 || number > 100) {
            await interaction.reply({
                content: 'Пожалуйста, введите число от 1 до 100!',
                flags: ['Ephemeral']
            });
            return;
        }
        
        // Увеличиваем количество попыток
        game.attempts++;
        
        let resultMessage = '';
        let gameEnded = false;
        
        if (number === game.secretNumber) {
            // Игрок угадал число!
            const pointsWon = Math.max(10, 30 - (game.attempts * 2)); // Чем меньше попыток, тем больше очков
            const userProfile = getUserProfile(userId);
            const newPoints = userProfile.points + pointsWon;
            const newLevel = Math.floor(newPoints / 10) + 1;
            
            // Обновляем профиль пользователя
            updateUserProfile(userId, {
                points: newPoints,
                level: newLevel
            });
            
            resultMessage = `🎉 Поздравляем! Вы угадали число **${game.secretNumber}** за ${game.attempts} попыток!\n\nВы получили **${pointsWon}** очков!`;
            gameEnded = true;
        } else if (game.attempts >= game.maxAttempts) {
            // Лимит попыток исчерпан
            resultMessage = `😔 К сожалению, вы не угадали число. Загаданное число было **${game.secretNumber}**.\n\nПопробуйте еще раз!`;
            gameEnded = true;
        } else {
            // Игрок не угадал, даем подсказку
            const difference = Math.abs(number - game.secretNumber);
            let hint = '';
            
            if (difference <= 5) {
                hint = ' 🔥 Очень близко!';
            } else if (difference <= 10) {
                hint = ' 🌡️ Близко!';
            } else if (difference <= 20) {
                hint = ' 🌡️ Не так далеко!';
            } else {
                hint = ' ❄️ Холодно!';
            }
            
            if (number < game.secretNumber) {
                resultMessage = `📈 Ваше число **${number}** меньше загаданного.${hint}\nПопробуйте больше!`;
            } else {
                resultMessage = `📉 Ваше число **${number}** больше загаданного.${hint}\nПопробуйте меньше!`;
            }
        }
        
        // Обновляем embed с результатом
        const gameEmbed = new EmbedBuilder()
            .setTitle('🎲 Игра "Угадай число"')
            .setColor(number === game.secretNumber ? '#2ecc71' : '#e74c3c')
            .setDescription(resultMessage)
            .addFields(
                { name: 'Попытки', value: `${game.attempts}/${game.maxAttempts}`, inline: true },
                { name: 'Ваше число', value: number.toString(), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: gameEnded ? 'Игра завершена' : 'Продолжайте угадывать', iconURL: interaction.user.displayAvatarURL() });
        
        if (gameEnded) {
            // Удаляем игру из активных
            this.activeGames.delete(userId);
            
            // Удаляем таймер
            if (this.gameTimeouts.has(userId)) {
                clearTimeout(this.gameTimeouts.get(userId));
                this.gameTimeouts.delete(userId);
            }
            
            await interaction.editReply({
                embeds: [gameEmbed],
                components: []
            });
        } else {
            await interaction.editReply({
                embeds: [gameEmbed]
            });
        }
    }
    
    // Игра "Камень, ножницы, бумага"
    async startRockPaperScissors(interaction) {
        const userId = interaction.user.id;
        
        // Проверяем, не играет ли пользователь уже в какую-то игру
        if (this.activeGames.has(userId)) {
            await interaction.reply({
                content: 'Вы уже играете в игру! Завершите текущую игру перед началом новой.',
                flags: ['Ephemeral']
            });
            return;
        }
        
        const choices = ['rock', 'scissors', 'paper'];
        const botChoice = choices[Math.floor(Math.random() * 3)];
        
        // Создаем embed с информацией об игре
        const gameEmbed = new EmbedBuilder()
            .setTitle('✂️ Камень, ножницы, бумага')
            .setColor('#8b00ff')
            .setDescription('Выберите свой вариант:')
            .setTimestamp()
            .setFooter({ text: 'Выберите один из вариантов', iconURL: interaction.user.displayAvatarURL() });
        
        // Создаем кнопки для выбора
        const choiceRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('rps_rock')
                    .setLabel('🪨 Камень')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('rps_scissors')
                    .setLabel('✂️ Ножницы')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('rps_paper')
                    .setLabel('📄 Бумага')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        await interaction.reply({
            embeds: [gameEmbed],
            components: [choiceRow],
            flags: []
        });
        
        // Сохраняем временную информацию об игре
        const tempGameId = `rps_${Date.now()}_${userId}`;
        const tempGameData = {
            id: tempGameId,
            type: 'rock_paper_scissors',
            userId: userId,
            botChoice: botChoice,
            startTime: Date.now()
        };
        
        this.activeGames.set(userId, tempGameData);
        
        // Устанавливаем таймер на завершение игры (1 минута)
        const timeoutId = setTimeout(() => {
            if (this.activeGames.has(userId)) {
                this.activeGames.delete(userId);
            }
            if (this.gameTimeouts.has(userId)) {
                clearTimeout(this.gameTimeouts.get(userId));
                this.gameTimeouts.delete(userId);
            }
        }, 60000);
        
        this.gameTimeouts.set(userId, timeoutId);
    }
    
    // Обработка выбора в игре "Камень, ножницы, бумага"
    async handleRPSChoice(interaction, userChoice) {
        const userId = interaction.user.id;
        const game = this.activeGames.get(userId);
        
        if (!game || game.type !== 'rock_paper_scissors') {
            await interaction.reply({
                content: 'Вы не участвуете в активной игре!',
                flags: ['Ephemeral']
            });
            return;
        }
        
        // Удаляем игру из активных
        this.activeGames.delete(userId);
        
        // Удаляем таймер
        if (this.gameTimeouts.has(userId)) {
            clearTimeout(this.gameTimeouts.get(userId));
            this.gameTimeouts.delete(userId);
        }
        
        const botChoice = game.botChoice;
        const result = this.determineRPSResult(userChoice, botChoice);
        
        let resultMessage = '';
        let pointsWon = 0;
        
        if (result === 'win') {
            pointsWon = 5;
            const userProfile = getUserProfile(userId);
            const newPoints = userProfile.points + pointsWon;
            const newLevel = Math.floor(newPoints / 10) + 1;
            
            // Обновляем профиль пользователя
            updateUserProfile(userId, {
                points: newPoints,
                level: newLevel
            });
            
            resultMessage = `🎉 Вы выиграли! ${this.getEmojiForChoice(userChoice)} победил ${this.getEmojiForChoice(botChoice)}\n\nВы получили **${pointsWon}** очков!`;
        } else if (result === 'lose') {
            resultMessage = `😔 Вы проиграли. ${this.getEmojiForChoice(botChoice)} победил ${this.getEmojiForChoice(userChoice)}`;
        } else {
            resultMessage = `🤝 Ничья! Вы оба выбрали ${this.getEmojiForChoice(userChoice)}`;
        }
        
        const gameEmbed = new EmbedBuilder()
            .setTitle('✂️ Результат: Камень, ножницы, бумага')
            .setColor(result === 'win' ? '#2ecc71' : result === 'lose' ? '#e74c3c' : '#3498db')
            .setDescription(resultMessage)
            .addFields(
                { name: 'Ваш выбор', value: `${this.getEmojiForChoice(userChoice)} ${userChoice}`, inline: true },
                { name: 'Выбор бота', value: `${this.getEmojiForChoice(botChoice)} ${botChoice}`, inline: true },
                { name: 'Результат', value: result === 'win' ? '🏆 Победа' : result === 'lose' ? '😞 Поражение' : '🤝 Ничья', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Игра завершена', iconURL: interaction.user.displayAvatarURL() });
        
        await interaction.update({
            embeds: [gameEmbed],
            components: []
        });
    }
    
    // Определение результата в RPS
    determineRPSResult(userChoice, botChoice) {
        if (userChoice === botChoice) return 'draw';
        
        if (
            (userChoice === 'rock' && botChoice === 'scissors') ||
            (userChoice === 'scissors' && botChoice === 'paper') ||
            (userChoice === 'paper' && botChoice === 'rock')
        ) {
            return 'win';
        } else {
            return 'lose';
        }
    }
    
    // Получение эмодзи для выбора
    getEmojiForChoice(choice) {
        switch (choice) {
            case 'rock': return '🪨';
            case 'scissors': return '✂️';
            case 'paper': return '📄';
            default: return '';
        }
    }
    
    // Завершение игры по таймауту
    endGame(userId, interaction, reason) {
        if (this.activeGames.has(userId)) {
            this.activeGames.delete(userId);
            
            if (this.gameTimeouts.has(userId)) {
                clearTimeout(this.gameTimeouts.get(userId));
                this.gameTimeouts.delete(userId);
            }
            
            if (reason === 'timeout') {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('⏰ Время вышло!')
                    .setColor('#e74c3c')
                    .setDescription('Вы не завершили игру вовремя. Игра была автоматически завершена.')
                    .setTimestamp()
                    .setFooter({ text: 'Игра завершена по таймауту', iconURL: interaction.user.displayAvatarURL() });
                
                interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: []
                }).catch(() => {});
            }
        }
    }
    
    // Получить статистику игр пользователя
    getUserGameStats(userId) {
        // В реальной реализации здесь будет сохранение и чтение статистики игр
        // Пока что возвращаем заглушку
        return {
            gamesPlayed: 0,
            gamesWon: 0,
            totalPointsEarned: 0
        };
    }
}

module.exports = new GameSystem();