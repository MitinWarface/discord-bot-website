const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../System/Audio/lavalinkSystem');

// Функция форматирования времени
function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

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
            // В новой системе у трека есть свойство info
            queueDescription += `${position} [${track.info.title}](${track.info.uri}) - ${track.info.author} (${formatTime(track.info.length)})\n`;
        }
        
        if (queue.tracks.length > 10) {
            queueDescription += `\n...и еще ${queue.tracks.length - 10} трек(ов)`;
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`🎵 Очередь воспроизведения (${queue.tracks.length} треков)`)
            .setDescription(queueDescription)
            .addFields(
                { name: 'Режим повтора', value: queue.loop ? '🔁 Включен' : '🔁 Выключен', inline: true },
                { name: 'Громкость', value: `🔊 ${queue.volume}%`, inline: true }
            )
            .setColor('#8b00ff')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
};