const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('Начать викторину с вопросами'),

    async execute(interaction) {
        // Отправляем сообщение с викториной
        await interaction.reply({ content: '🧠 Подготовка викторины...', ephemeral: true });
        
        // Вопросы для викторины
        const triviaQuestions = [
            {
                question: "Какой элемент периодической таблицы имеет символ 'Au'?",
                options: ["Серебро", "Золото", "Алюминий", "Аргон"],
                answer: 1,
                explanation: "Au - это химический символ золота от латинского слова 'Aurum'."
            },
            {
                question: "Кто написал роман 'Преступление и наказание'?",
                options: ["Лев Толстой", "Федор Достоевский", "Александр Пушкин", "Антон Чехов"],
                answer: 1,
                explanation: "Федор Достоевский написал 'Преступление и наказание' в 1866 году."
            },
            {
                question: "Какой газ составляет наибольшую часть атмосферы Земли?",
                options: ["Кислород", "Углекислый газ", "Азот", "Водород"],
                answer: 2,
                explanation: "Азот составляет около 78% атмосферы Земли."
            },
            {
                question: "Какой фильм считается первым звуковым фильмом в истории кино?",
                options: ["Великий Гэтсби", "Песнь о любви", "Унесенные ветром", "Певец джаза"],
                answer: 3,
                explanation: "Певец джаза (1927) считается первым полноценным звуковым фильмом."
            },
            {
                question: "Сколько сторон у шестиугольника?",
                options: ["Пять", "Шесть", "Семь", "Восемь"],
                answer: 1,
                explanation: "Шестиугольник имеет шесть сторон, что понятно из его названия."
            },
            {
                question: "Кто изображен на американской банкноте достоинством в 1 доллар?",
                options: ["Джордж Вашингтон", "Томас Джефферсон", "Авраам Линкольн", "Бенджамин Франклин"],
                answer: 0,
                explanation: "На банкноте в 1 доллар изображен Джордж Вашингтон."
            },
            {
                question: "Какой океан самый большой по площади?",
                options: ["Атлантический", "Индийский", "Северный Ледовитый", "Тихий"],
                answer: 3,
                explanation: "Тихий океан - самый большой океан по площади поверхности."
            },
            {
                question: "В какой стране впервые были проведены Олимпийские игры?",
                options: ["Италия", "Греция", "Франция", "США"],
                answer: 1,
                explanation: "Олимпийские игры впервые были проведены в Древней Греции в 776 году до н.э."
            }
        ];
        
        // Выбираем случайный вопрос
        const randomQuestion = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
        
        // Создаем embed с вопросом
        const questionEmbed = new EmbedBuilder()
            .setTitle('🧠 Викторина')
            .setDescription(randomQuestion.question)
            .setColor('#9370DB')
            .setTimestamp();
        
        // Создаем кнопки для вариантов ответов
        const buttons = [];
        for (let i = 0; i < randomQuestion.options.length; i++) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`trivia_option_${i}`)
                    .setLabel(`${i + 1}. ${randomQuestion.options[i]}`)
                    .setStyle(ButtonStyle.Primary)
            );
        }
        
        // Разбиваем кнопки на строки (максимум 5 кнопок в строке)
        const rows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            const row = new ActionRowBuilder();
            for (let j = i; j < i + 5 && j < buttons.length; j++) {
                row.addComponents(buttons[j]);
            }
            rows.push(row);
        }
        
        // Редактируем сообщение с вопросом и кнопками
        const reply = await interaction.editReply({ 
            content: null, 
            embeds: [questionEmbed], 
            components: rows 
        });
        
        // Создаем коллектор для кнопок
        const filter = (buttonInteraction) => {
            buttonInteraction.user.id === interaction.user.id && 
            buttonInteraction.customId.startsWith('trivia_option_');
        };
        
        const collector = reply.createMessageComponentCollector({ 
            filter, 
            time: 30000 // 30 секунд на ответ
        });
        
        collector.on('collect', async (buttonInteraction) => {
            // Получаем номер выбранного варианта
            const selectedOption = parseInt(buttonInteraction.customId.split('_')[2]);
            
            // Проверяем правильность ответа
            const isCorrect = selectedOption === randomQuestion.answer;
            
            // Создаем embed с результатом
            const resultEmbed = new EmbedBuilder()
                .setTitle(isCorrect ? '✅ Правильно!' : '❌ Неправильно!')
                .setDescription(`${randomQuestion.explanation}\n\nПравильный ответ: **${randomQuestion.options[randomQuestion.answer]}**`)
                .setColor(isCorrect ? '#00FF00' : '#FF0000')
                .setTimestamp();
            
            // Отправляем результат
            await buttonInteraction.update({ 
                embeds: [resultEmbed], 
                components: [] // Убираем кнопки
            });
            
            collector.stop();
        });
        
        collector.on('end', (collected) => {
            if (collected.size === 0) {
                // Время вышло
                interaction.editReply({ 
                    content: '⏰ Время вышло! Вы не успели ответить на вопрос.',
                    embeds: [],
                    components: []
                }).catch(() => {});
            }
        });
    }
};