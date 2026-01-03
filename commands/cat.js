const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cat')
        .setDescription('Показать случайное изображение кота'),

    async execute(interaction) {
        try {
            // Отправляем сообщение о загрузке
            await interaction.reply({ content: '😺 Загрузка котика...', ephemeral: true });
            
            // Получаем изображение кота с Cat API
            const response = await axios.get('https://api.thecatapi.com/v1/images/search');
            
            if (response.data && response.data[0] && response.data[0].url) {
                const catUrl = response.data[0].url;
                
                const catEmbed = new EmbedBuilder()
                    .setTitle('😺 Мяу! Вот тебе котик!')
                    .setImage(catUrl)
                    .setColor('#FFA500')
                    .setFooter({ 
                        text: 'theCatAPI.com', 
                        iconURL: 'https://cdn.discordapp.com/emojis/852823024249856000.png' 
                    })
                    .setTimestamp();
                
                // Редактируем сообщение с загрузкой на изображение кота
                await interaction.editReply({ content: null, embeds: [catEmbed] });
            } else {
                // Если Cat API не работает, используем альтернативный источник
                const altResponse = await axios.get('https://aws.random.cat/meow');
                
                if (altResponse.data && altResponse.data.file) {
                    const catEmbed = new EmbedBuilder()
                        .setTitle('😺 Мяу! Вот тебе котик!')
                        .setImage(altResponse.data.file)
                        .setColor('#FFA500')
                        .setFooter({ 
                            text: 'random.cat', 
                            iconURL: 'https://cdn.discordapp.com/emojis/852823024249856000.png' 
                        })
                        .setTimestamp();
                    
                    await interaction.editReply({ content: null, embeds: [catEmbed] });
                } else {
                    throw new Error('Нет данных о коте');
                }
            }
        } catch (error) {
            console.error('Ошибка при получении кота:', error);
            
            // В случае ошибки отправляем резервное изображение кота
            const fallbackEmbed = new EmbedBuilder()
                .setTitle('😺 Мяу! Вот тебе котик!')
                .setImage('https://cdn2.thecatapi.com/images/123.jpg') // Резервное изображение
                .setColor('#FFA500')
                .setFooter({ 
                    text: 'Резервный источник', 
                    iconURL: 'https://cdn.discordapp.com/emojis/852823024249856000.png' 
                })
                .setTimestamp();
            
            await interaction.editReply({ content: null, embeds: [fallbackEmbed] });
        }
    }
};