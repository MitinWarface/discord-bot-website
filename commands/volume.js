// const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
// const { setVolume } = require('../System/Audio/lavalinkSystem');

// module.exports = {
//     data: new SlashCommandBuilder()
//         .setName('volume')
//         .setDescription('Изменяет громкость воспроизведения')
//         .addIntegerOption(option =>
//             option.setName('level')
//                 .setDescription('Уровень громкости (0-150)')
//                 .setRequired(true)),
    
//     async execute(interaction) {
//         const volume = interaction.options.getInteger('level');
        
//         // Проверяем, что громкость в допустимом диапазоне
//         if (volume < 0 || volume > 150) {
//             const embed = new EmbedBuilder()
//                 .setTitle('❌ Ошибка')
//                 .setDescription('Громкость должна быть в диапазоне от 0 до 150.')
//                 .setColor('#ff0000')
//                 .setTimestamp();
            
//             return await interaction.reply({ embeds: [embed], ephemeral: true });
//         }
        
//         try {
//             // Устанавливаем громкость
//             const result = await setVolume(interaction.guild.id, volume);
            
//             if (result.success) {
//                 const embed = new EmbedBuilder()
//                     .setTitle('🔊 Громкость изменена')
//                     .setDescription(result.message)
//                     .setColor('#8b00ff')
//                     .setTimestamp();
                
//                 await interaction.reply({ embeds: [embed] });
//             } else {
//                 const embed = new EmbedBuilder()
//                     .setTitle('❌ Ошибка')
//                     .setDescription(result.message)
//                     .setColor('#ff0000')
//                     .setTimestamp();
                
//                 await interaction.reply({ embeds: [embed], ephemeral: true });
//             }
//         } catch (error) {
//             console.error('Ошибка при изменении громкости:', error);
            
//             const embed = new EmbedBuilder()
//                 .setTitle('❌ Ошибка')
//                 .setDescription('Произошла ошибка при попытке изменить громкость.')
//                 .setColor('#ff0000')
//                 .setTimestamp();
            
//             await interaction.reply({ embeds: [embed], ephemeral: true });
//         }
//     }
// };