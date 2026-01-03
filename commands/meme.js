const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Показать случайный мем с Reddit'),

    async execute(interaction) {
        try {
            // Отправляем сообщение о загрузке
            await interaction.reply({ content: '🔄 Загрузка мема...', ephemeral: true });
            
            // Получаем мем с Reddit API
            const response = await axios.get('https://meme-api.com/gimme');
            
            if (response.data && response.data.url) {
                const memeData = response.data;
                
                const memeEmbed = new EmbedBuilder()
                    .setTitle(memeData.title || 'Случайный мем')
                    .setURL(memeData.postLink || '')
                    .setImage(memeData.url)
                    .setColor('#FFC0CB')
                    .setFooter({ 
                        text: `r/${memeData.subreddit} • 👍 ${memeData.ups || 0}`, 
                        iconURL: 'https://cdn.discordapp.com/emojis/852823024249856000.png' 
                    })
                    .setTimestamp();
                
                // Редактируем сообщение с загрузкой на мем
                await interaction.editReply({ content: null, embeds: [memeEmbed] });
            } else {
                throw new Error('Нет данных о меме');
            }
        } catch (error) {
            console.error('Ошибка при получении мема:', error);
            
            // В случае ошибки отправляем сообщение об ошибке
            await interaction.editReply({ 
                content: '❌ Не удалось загрузить мем. Попробуйте еще раз позже.', 
                embeds: [] 
            });
        }
    }
};