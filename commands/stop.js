const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stop } = require('../System/Audio/lavalinkSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Останавливает воспроизведение музыки и очищает очередь'),
    
    async execute(interaction) {
        try {
            // Останавливаем воспроизведение
            const result = await stop(interaction.guild.id);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('⏹️ Воспроизведение остановлено')
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
            console.error('Ошибка при остановке воспроизведения:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при попытке остановить воспроизведение.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};