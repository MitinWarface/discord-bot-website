const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { toggleLoop } = require('../System/Audio/lavalinkSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Включить/выключить повтор очереди'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        try {
            const result = await toggleLoop(guildId);
            
            const embed = new EmbedBuilder()
                .setTitle(result.success ? '🔁 Повтор включен' : '🔁 Повтор выключен')
                .setDescription(result.message)
                .setColor('#8b00ff')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Ошибка при переключении повтора:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при попытке переключить повтор.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};