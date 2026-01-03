const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { playTrack } = require('../System/Audio/lavalinkSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Воспроизводит музыку из YouTube')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Название трека или ссылка на YouTube')
                .setRequired(true)),
    
    async execute(interaction) {
        const query = interaction.options.getString('query');
        
        // Проверяем, что пользователь находится в голосовом канале
        if (!interaction.member.voice.channel) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Вы должны быть в голосовом канале, чтобы использовать эту команду!')
                .setColor('#ff0000')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        try {
            // Воспроизводим трек
            const result = await playTrack(interaction, query);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('🎵 Воспроизведение')
                    .setDescription(result.message)
                    .setColor('#8b00ff')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Ошибка')
                    .setDescription(result.message)
                    .setColor('#ff0000')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error) {
            console.error('Ошибка при воспроизведении трека:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при попытке воспроизвести трек.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};