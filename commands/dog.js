const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dog')
        .setDescription('Показать случайное изображение собаки'),

    async execute(interaction) {
        try {
            // Отправляем сообщение о загрузке
            await interaction.reply({ content: '🐶 Загрузка собачки...', ephemeral: true });
            
            // Получаем изображение собаки с Dog API
            const response = await axios.get('https://dog.ceo/api/breeds/image/random');
            
            if (response.data && response.data.message) {
                const dogUrl = response.data.message;
                
                const dogEmbed = new EmbedBuilder()
                    .setTitle('🐶 Гав! Вот тебе собачка!')
                    .setImage(dogUrl)
                    .setColor('#8B4513')
                    .setFooter({ 
                        text: 'dog.ceo', 
                        iconURL: 'https://cdn.discordapp.com/emojis/852823024249856000.png' 
                    })
                    .setTimestamp();
                
                // Редактируем сообщение с загрузкой на изображение собаки
                await interaction.editReply({ content: null, embeds: [dogEmbed] });
            } else {
                // Если основной API не работает, используем альтернативный источник
                const altResponse = await axios.get('https://random.dog/woof.json');
                
                if (altResponse.data && altResponse.data.url) {
                    const dogEmbed = new EmbedBuilder()
                        .setTitle('🐶 Гав! Вот тебе собачка!')
                        .setImage(altResponse.data.url)
                        .setColor('#8B4513')
                        .setFooter({ 
                            text: 'random.dog', 
                            iconURL: 'https://cdn.discordapp.com/emojis/852823024249856000.png' 
                        })
                        .setTimestamp();
                    
                    await interaction.editReply({ content: null, embeds: [dogEmbed] });
                } else {
                    throw new Error('Нет данных о собаке');
                }
            }
        } catch (error) {
            console.error('Ошибка при получении собаки:', error);
            
            // В случае ошибки отправляем резервное изображение собаки
            const fallbackEmbed = new EmbedBuilder()
                .setTitle('🐶 Гав! Вот тебе собачка!')
                .setImage('https://placedog.net/500/400') // Резервное изображение
                .setColor('#8B4513')
                .setFooter({ 
                    text: 'Резервный источник', 
                    iconURL: 'https://cdn.discordapp.com/emojis/852823024249856000.png' 
                })
                .setTimestamp();
            
            await interaction.editReply({ content: null, embeds: [fallbackEmbed] });
        }
    }
};