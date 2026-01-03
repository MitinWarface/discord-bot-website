const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Путь к файлу с голосованиями
const pollsPath = path.join(__dirname, '../System/polls.json');

// Загрузка голосований
function loadPolls() {
    if (fs.existsSync(pollsPath)) {
        const data = fs.readFileSync(pollsPath, 'utf8');
        return JSON.parse(data);
    }
    return {};
}

// Сохранение голосований
function savePolls(data) {
    fs.writeFileSync(pollsPath, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Создать голосование с кнопками')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Вопрос для голосования')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option1')
                .setDescription('Первый вариант ответа')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option2')
                .setDescription('Второй вариант ответа')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option3')
                .setDescription('Третий вариант ответа')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option4')
                .setDescription('Четвертый вариант ответа')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option5')
                .setDescription('Пятый вариант ответа')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Длительность голосования в минутах (по умолчанию 60)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(1440)), // Максимум 24 часа

    async execute(interaction) {
        const question = interaction.options.getString('question');
        const option1 = interaction.options.getString('option1');
        const option2 = interaction.options.getString('option2');
        const option3 = interaction.options.getString('option3');
        const option4 = interaction.options.getString('option4');
        const option5 = interaction.options.getString('option5');
        const duration = interaction.options.getInteger('duration') || 60; // По умолчанию 60 минут
        
        // Собираем все варианты ответов
        const options = [option1, option2];
        if (option3) options.push(option3);
        if (option4) options.push(option4);
        if (option5) options.push(option5);
        
        // Проверяем, что не больше 5 вариантов
        if (options.length > 5) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Нельзя создать голосование с более чем 5 вариантами ответа!')
                .setColor('#ff0000')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        // Создаем embed для голосования
        const pollEmbed = new EmbedBuilder()
            .setTitle('📊 Голосование')
            .setDescription(question)
            .setColor('#8b00ff')
            .setTimestamp()
            .setFooter({ 
                text: `Голосование от ${interaction.user.username}`, 
                iconURL: interaction.user.displayAvatarURL() 
            });
        
        // Добавляем поля для вариантов ответов
        for (let i = 0; i < options.length; i++) {
            const optionLetter = String.fromCharCode(65 + i); // A, B, C, D, E
            pollEmbed.addFields({ name: `${optionLetter}. ${options[i]}`, value: 'Голосов: 0', inline: false });
        }
        
        // Добавляем информацию о длительности
        pollEmbed.addFields({ 
            name: '⏱️ Длительность', 
            value: `${duration} минут${duration === 1 ? '' : 'ы'}`, 
            inline: false 
        });
        
        // Создаем кнопки для голосования
        const row = new ActionRowBuilder();
        const reactions = ['🇦', '🇧', '🇨', '🇩', '🇪'];
        
        for (let i = 0; i < options.length; i++) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`poll_vote_${i}`)
                    .setLabel(`${String.fromCharCode(65 + i)}. ${options[i]}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(reactions[i])
            );
        }
        
        // Отправляем сообщение с голосованием
        const pollMessage = await interaction.reply({ 
            embeds: [pollEmbed], 
            components: [row],
            fetchReply: true
        });
        
        // Сохраняем данные голосования
        const polls = loadPolls();
        const pollId = `poll_${Date.now()}_${interaction.user.id}`;
        
        const newPoll = {
            id: pollId,
            messageId: pollMessage.id,
            channelId: interaction.channel.id,
            question: question,
            options: options.map((opt, idx) => ({
                id: idx,
                text: opt,
                votes: [],
                emoji: reactions[idx],
                letter: String.fromCharCode(65 + idx)
            })),
            creatorId: interaction.user.id,
            endTime: new Date(Date.now() + duration * 60 * 100).toISOString(), // Конвертируем минуты в миллисекунды
            results: null
        };
        
        polls[pollId] = newPoll;
        savePolls(polls);
        
        // Создаем таймер для завершения голосования
        setTimeout(async () => {
            try {
                // Получаем актуальные данные голосования
                const finalPollData = polls[pollId];
                if (!finalPollData) return;
                
                // Подсчитываем результаты
                const results = finalPollData.options.map(opt => ({
                    id: opt.id,
                    text: opt.text,
                    votes: opt.votes.length,
                    percentage: finalPollData.options.reduce((sum, o) => sum + o.votes.length, 0) > 0 ? 
                        Math.round((opt.votes.length / finalPollData.options.reduce((sum, o) => sum + o.votes.length, 0)) * 100) : 0
                }));
                
                // Сортируем по количеству голосов
                results.sort((a, b) => b.votes - a.votes);
                
                // Обновляем embed с результатами
                const resultsEmbed = new EmbedBuilder()
                    .setTitle('📊 Результаты голосования')
                    .setDescription(finalPollData.question)
                    .setColor('#8b00ff')
                    .setTimestamp();
                
                for (const result of results) {
                    const winnerIndicator = result.votes === results[0].votes ? '🏆' : '';
                    resultsEmbed.addFields({
                        name: `${winnerIndicator} ${String.fromCharCode(65 + result.id)}. ${result.text}`,
                        value: `Голосов: ${result.votes} (${result.percentage}%)`,
                        inline: false
                    });
                }
                
                resultsEmbed.addFields({
                    name: '⏱️ Голосование завершено',
                    value: `Всего голосов: ${results.reduce((sum, res) => sum + res.votes, 0)}`,
                    inline: false
                });
                
                // Получаем канал и сообщение для обновления
                const channel = interaction.guild.channels.cache.get(finalPollData.channelId);
                if (channel) {
                    const message = await channel.messages.fetch(finalPollData.messageId).catch(() => null);
                    if (message) {
                        // Убираем кнопки и обновляем сообщение
                        await message.edit({ embeds: [resultsEmbed], components: [] });
                    }
                }
                
                // Обновляем данные голосования
                finalPollData.results = results;
                finalPollData.status = 'completed';
                savePolls(polls);
                
            } catch (error) {
                console.error('Ошибка при завершении голосования:', error);
            }
        }, duration * 60 * 1000); // Конвертируем минуты в миллисекунды
    }
};

// Обработка нажатий на кнопки голосования должна быть в основном файле index.js

// Функция для обработки голосования, которая будет вызываться из index.js
function handlePollVote(interaction) {
    const polls = loadPolls();
    const pollId = Object.keys(polls).find(id => polls[id].messageId === interaction.message.id);
    
    if (!pollId || polls[pollId].status === 'completed') {
        interaction.reply({ 
            content: '❌ Это голосование уже завершено!', 
            ephemeral: true 
        }).catch(console.error);
        return;
    }
    
    const poll = polls[pollId];
    const optionIndex = parseInt(interaction.customId.split('_')[2]);
    const userVote = poll.options[optionIndex];
    
    // Проверяем, голосовал ли пользователь уже за этот вариант
    if (userVote.votes.includes(interaction.user.id)) {
        // Убираем голос
        userVote.votes = userVote.votes.filter(id => id !== interaction.user.id);
        
        interaction.reply({ 
            content: `✅ Вы убрали свой голос за **${userVote.text}**`, 
            ephemeral: true 
        }).catch(console.error);
    } else {
        // Проверяем, голосовал ли пользователь за другие варианты
        for (const option of poll.options) {
            if (option.votes.includes(interaction.user.id)) {
                // Убираем предыдущий голос
                option.votes = option.votes.filter(id => id !== interaction.user.id);
            }
        }
        
        // Добавляем голос за выбранный вариант
        userVote.votes.push(interaction.user.id);
        
        interaction.reply({ 
            content: `✅ Вы проголосовали за **${userVote.text}**`, 
            ephemeral: true 
        }).catch(console.error);
    }
    
    // Обновляем embed с актуальными результатами
    try {
        const updatedEmbed = new EmbedBuilder()
            .setTitle('📊 Голосование')
            .setDescription(poll.question)
            .setColor('#8b00ff')
            .setTimestamp()
            .setFooter({ 
                text: `Голосование от ${interaction.user.username}`, 
                iconURL: interaction.user.displayAvatarURL() 
            });
        
        // Добавляем поля с обновленными голосами
        for (const option of poll.options) {
            const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
            const voteCount = option.votes.length;
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            
            updatedEmbed.addFields({
                name: `${option.letter}. ${option.text}`,
                value: `Голосов: ${voteCount} (${percentage}%)`,
                inline: false
            });
        }
        
        // Обновляем длительность
        const timeLeft = Math.ceil((new Date(poll.endTime) - new Date()) / (1000 * 60));
        updatedEmbed.addFields({ 
            name: '⏱️ Осталось времени', 
            value: timeLeft > 0 ? `${timeLeft} минут${timeLeft === 1 ? '' : 'ы'}` : 'Завершено', 
            inline: false 
        });
        
        // Обновляем сообщение
        interaction.message.edit({ embeds: [updatedEmbed] }).catch(console.error);
        
        // Сохраняем обновленные данные голосования
        savePolls(polls);
    } catch (error) {
        console.error('Ошибка при обновлении голосования:', error);
    }
}

// Экспортируем функцию для использования в основном файле
module.exports.handlePollVote = handlePollVote;