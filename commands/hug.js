const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios'); // Убедитесь, что установлен пакет axios: npm install axios

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hug')
        .setDescription('Обнять пользователя с милой гифкой')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, которого хотите обнять')
                .setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        
        // Проверяем, что пользователь не пытается обнять самого себя
        if (user.id === interaction.user.id) {
            const selfHugEmbed = new EmbedBuilder()
                .setTitle('🤗 Самообнимашки')
                .setDescription(`<@${interaction.user.id}> обнимает сам себя!`)
                .setColor('#FFB6C1')
                .setImage('https://media.tenor.com/L1ORxlgkqPAAAAAC/self-hug-hug.gif'); // GIF для самообнимашек
            
            return await interaction.reply({ embeds: [selfHugEmbed] });
        }

        try {
            // Получаем гифку с hugs с помощью Tenor API (замените YOUR_API_KEY на реальный ключ)
            // Альтернатива - использовать заранее подготовленный список URL гифок
            const hugGifs = [
                'https://media.tenor.com/BIUAzWBdY6MAAAAC/anime-hug.gif',
                'https://media.tenor.com/nPih6bsQtKcAAAAC/anime-hugs-anime.gif',
                'https://media.tenor.com/kH8NPJNSNAEAAAAC/hug-embrace.gif',
                'https://media.tenor.com/7BaN9N8NuXIAAAAC/anime-love-anime.gif',
                'https://media.tenor.com/VCAVnNxuYXQAAAAC/anime-cuddle-hug.gif',
                'https://media.tenor.com/fNZl4wEPKn0AAAAC/anime-hug.gif',
                'https://media.tenor.com/8rY7z8zecXIAAAAC/anime-affection-love.gif',
                'https://media.tenor.com/xo0HoI6Cp5MAAAAC/anime-hug-anime.gif'
            ];
            
            // Выбираем случайную гифку
            const randomHugGif = hugGifs[Math.floor(Math.random() * hugGifs.length)];
            
            const embed = new EmbedBuilder()
                .setTitle('🤗 Обнимашки')
                .setDescription(`<@${interaction.user.id}> обнимает <@${user.id}>!`)
                .setColor('#FFB6C1')
                .setImage(randomHugGif)
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Ошибка при выполнении команды hug:', error);
            
            // В случае ошибки отправляем стандартное сообщение
            const fallbackEmbed = new EmbedBuilder()
                .setTitle('🤗 Обнимашки')
                .setDescription(`<@${interaction.user.id}> обнимает <@${user.id}>!`)
                .setColor('#FFB6C1')
                .setImage('https://media.tenor.com/BIUAzWBdY6MAAAAC/anime-hug.gif'); // Резервная гифка
            
            await interaction.reply({ embeds: [fallbackEmbed] });
        }
    }
};