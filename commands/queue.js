// const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
// const { getQueue } = require('../System/Audio/lavalinkSystem');

// module.exports = {
//     data: new SlashCommandBuilder()
//         .setName('queue')
//         .setDescription('Показывает текущую очередь воспроизведения'),
    
//     async execute(interaction) {
//         try {
//             // Получаем очередь
//             const queue = getQueue(interaction.guild.id);
            
//             if (!queue.tracks || queue.tracks.length === 0) {
//                 const embed = new EmbedBuilder()
//                     .setTitle('📋 Очередь воспроизведения')
//                     .setDescription('Очередь пуста.')
//                     .setColor('#8b00ff')
//                     .setTimestamp();
                
//                 return await interaction.reply({ embeds: [embed] });
//             }
            
//             // Создаем Embed с очередью
//             const queueEmbed = new EmbedBuilder()
//                 .setTitle('📋 Очередь воспроизведения')
//                 .setColor('#8b00ff')
//                 .setTimestamp();
            
//             // Добавляем информацию о текущем треке (первом в очереди)
//             if (queue.tracks.length > 0) {
//                 const currentTrack = queue.tracks[0];
//                 queueEmbed.addFields({
//                     name: 'Сейчас играет',
//                     value: `**${currentTrack.title}** - Запрошено: <@${currentTrack.requestedBy.id}>`,
//                     inline: false
//                 });
//             }
            
//             // Добавляем следующие треки в очередь (до 10)
//             if (queue.tracks.length > 1) {
//                 const nextTracks = queue.tracks.slice(1, 11); // Следующие 10 треков
//                 let queueList = '';
                
//                 for (let i = 0; i < nextTracks.length; i++) {
//                     const track = nextTracks[i];
//                     queueList += `${i + 1}. **${track.title}** - Запрошено: <@${track.requestedBy.id}>\n`;
//                 }
                
//                 queueEmbed.addFields({
//                     name: 'Следующие треки',
//                     value: queueList,
//                     inline: false
//                 });
                
//                 if (queue.tracks.length > 11) {
//                     queueEmbed.addFields({
//                         name: 'Дополнительно',
//                         value: `И еще ${queue.tracks.length - 11} треков...`,
//                         inline: false
//                     });
//                 }
//             }
            
//             queueEmbed.setFooter({ text: `Всего треков: ${queue.tracks.length}` });
            
//             await interaction.reply({ embeds: [queueEmbed] });
//         } catch (error) {
//             console.error('Ошибка при получении очереди:', error);
            
//             const embed = new EmbedBuilder()
//                 .setTitle('❌ Ошибка')
//                 .setDescription('Произошла ошибка при попытке получить очередь воспроизведения.')
//                 .setColor('#ff0000')
//                 .setTimestamp();
            
//             await interaction.reply({ embeds: [embed], ephemeral: true });
//         }
//     }
// };