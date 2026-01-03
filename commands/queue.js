const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../System/Audio/lavalinkSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Показать текущую очередь воспроизведения'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const queue = getQueue(guildId);
        
        if (!queue || !queue.tracks || queue.tracks.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('🎵 Очередь воспроизведения')
                .setDescription('Очередь пуста.')
                .setColor('#8b00ff')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed] });
        }
        
        // Показываем первые 10 треков в очереди
        const tracksToShow = queue.tracks.slice(0, 10);
        let queueDescription = '';
        
        for (let i = 0; i < tracksToShow.length; i++) {
            const track = tracksToShow[i];
            const position = i === 0 ? '🎵 Сейчас играет:' : `${i + 1}.`;
            queueDescription += `${position} [${track.title}](${track.uri})\n`;
        }
        
        if (queue.tracks.length > 10) {
            queueDescription += `\n...и еще ${queue.tracks.length - 10} трек(ов)`;
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`🎵 Очередь воспроизведения (${queue.tracks.length} треков)`)
            .setDescription(queueDescription)
            .setColor('#8b00ff')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
};