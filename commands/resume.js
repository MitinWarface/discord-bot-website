const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { resume } = require('../System/Audio/lavalinkSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Возобновить воспроизведение'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        try {
            const result = await resume(guildId);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('▶️ Воспроизведение возобновлено')
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
            console.error('Ошибка при возобновлении воспроизведения:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при попытке возобновить воспроизведение.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};