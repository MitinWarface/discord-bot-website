const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fox')
        .setDescription('Показать случайное изображение лисы'),

    async execute(interaction) {
        try {
            // Отправляем сообщение о загрузке
            await interaction.reply({ content: '🦊 Загрузка лисички...', ephemeral: true });
            
            // Получаем изображение лисы с Fox API
            const response = await axios.get('https://randomfox.ca/floof/');
            
            if (response.data && response.data.image) {
                const foxUrl = response.data.image;
                
                const foxEmbed = new EmbedBuilder()
                    .setTitle('🦊 Фокс! Вот тебе лисичка!')
                    .setImage(foxUrl)
                    .setColor('#FFA500')
                    .setFooter({ 
                        text: 'randomfox.ca', 
                        iconURL: 'https://cdn.discordapp.com/emojis/852823024249856000.png' 
                    })
                    .setTimestamp();
                
                // Редактируем сообщение с загрузкой на изображение лисы
                await interaction.editReply({ content: null, embeds: [foxEmbed] });
            } else {
                // Если основной API не работает, используем альтернативный источник
                const altResponse = await axios.get('https://some-random-api.ml/animal/fox');
                
                if (altResponse.data && altResponse.data.image) {
                    const foxEmbed = new EmbedBuilder()
                        .setTitle('🦊 Фокс! Вот тебе лисичка!')
                        .setImage(altResponse.data.image)
                        .setColor('#FFA500')
                        .setFooter({ 
                            text: 'some-random-api.ml', 
                            iconURL: 'https://cdn.discordapp.com/emojis/852823024249856000.png' 
                        })
                        .setTimestamp();
                    
                    await interaction.editReply({ content: null, embeds: [foxEmbed] });
                } else {
                    throw new Error('Нет данных о лисе');
                }
            }
        } catch (error) {
            console.error('Ошибка при получении лисы:', error);
            
            // В случае ошибки отправляем резервное изображение лисы
            const fallbackEmbed = new EmbedBuilder()
                .setTitle('🦊 Фокс! Вот тебе лисичка!')
                .setImage('https://cdn.pixabay.com/photo/2017/02/20/16/38/fox-2082727_1280.jpg') // Резервное изображение
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