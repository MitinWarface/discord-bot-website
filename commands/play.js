const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { playTrack, getQueue, skipTrack, stop, pause, resume, setVolume, toggleLoop } = require('../System/Audio/lavalinkSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Воспроизводит музыку из YouTube')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Название трека или ссылка на YouTube')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('shuffle')
                .setDescription('Добавить трек в случайное место в очереди')
                .setRequired(false)),

    async execute(interaction) {
        const query = interaction.options.getString('query');
        const shuffle = interaction.options.getBoolean('shuffle') || false;
        
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
            const result = await playTrack(interaction, query, shuffle);
            
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