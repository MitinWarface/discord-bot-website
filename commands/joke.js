const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('joke')
        .setDescription('Рассказать случайную шутку'),

    async execute(interaction) {
        try {
            // Отправляем сообщение о загрузке
            await interaction.reply({ content: '😄 Подготовка хорошей шутки...', ephemeral: true });
            
            // Получаем шутку с Jokes API
            const response = await axios.get('https://v2.jokeapi.dev/joke/Any?lang=ru&type=twopart', {
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            // Проверяем, является ли шутка двухчастной (setup & delivery)
            if (response.data && response.data.setup && response.data.delivery) {
                const joke = `${response.data.setup} ${response.data.delivery}`;
                
                const jokeEmbed = new EmbedBuilder()
                    .setTitle('😄 Случайная шутка')
                    .setDescription(joke)
                    .setColor('#FFD700')
                    .setFooter({
                        text: 'JokeAPI.dev',
                        iconURL: 'https://cdn.discordapp.com/emojis/852823024249856000.png'
                    })
                    .setTimestamp();
                
                // Редактируем сообщение с загрузкой на шутку
                await interaction.editReply({ content: null, embeds: [jokeEmbed] });
            } else if (response.data && response.data.joke) {
                const joke = response.data.joke;
                
                const jokeEmbed = new EmbedBuilder()
                    .setTitle('😄 Случайная шутка')
                    .setDescription(joke)
                    .setColor('#FFD700')
                    .setFooter({
                        text: 'JokeAPI.dev',
                        iconURL: 'https://cdn.discordapp.com/emojis/852823024249856000.png'
                    })
                    .setTimestamp();
                
                // Редактируем сообщение с загрузкой на шутку
                await interaction.editReply({ content: null, embeds: [jokeEmbed] });
            }
        } catch (error) {
            console.error('Ошибка при получении шутки:', error);
            
            // В случае ошибки отправляем резервную шутку
            const fallbackJokes = [
                "Почему программисты всегда путают Хэллоуин и Рождество? Потому что Oct 31 = Dec 25!",
                "Жена программиста: - Сходи в магазин, купи батон колбасы. Если будут яйца, возьми десяток. Программист приносит 10 батонов колбасы.",
                "Если бы программисты были врачами, они бы говорили: 'Хорошая новость - ваша болезнь не передается по наследству. Плохая новость - вылечить можно только переустановкой операционной системы.'",
                "Почему программисты любят темную тему? Потому что светлый режим высвечивает все баги!",
                "Что говорит программист, когда у него не работает код? Это не баг, это фича!",
                "Как программист встречает Новый год? while(true) { party(); }",
                "Почему программисты не играют в прятки? Потому что хорошие баги нигде не прячутся!",
                "Что получится, если скрестить программиста и зомби? while(alive) { eat(); }"
            ];
            
            const randomFallbackJoke = fallbackJokes[Math.floor(Math.random() * fallbackJokes.length)];
            
            const fallbackEmbed = new EmbedBuilder()
                .setTitle('😄 Резервная шутка')
                .setDescription(randomFallbackJoke)
                .setColor('#FFD700')
                .setFooter({ 
                    text: 'Резервный источник', 
                    iconURL: 'https://cdn.discordapp.com/emojis/852823024249856000.png' 
                })
                .setTimestamp();
            
            await interaction.editReply({ content: null, embeds: [fallbackEmbed] });
        }
    }
};