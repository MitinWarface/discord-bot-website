const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { skipTrack } = require('../System/Audio/lavalinkSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Пропускает текущий трек'),
    
    async execute(interaction) {
        try {
            // Пропускаем трек
            const result = await skipTrack(interaction.guild.id);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('⏭️ Трек пропущен')
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
            console.error('Ошибка при пропуске трека:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при попытке пропустить трек.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};