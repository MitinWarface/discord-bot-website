const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { pause } = require('../System/Audio/lavalinkSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Приостанавливает воспроизведение музыки'),
    
    async execute(interaction) {
        try {
            // Делаем паузу
            const result = await pause(interaction.guild.id);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('⏸️ Воспроизведение приостановлено')
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
            console.error('Ошибка при паузе воспроизведения:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при попытке приостановить воспроизведение.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};