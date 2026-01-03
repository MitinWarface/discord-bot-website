// const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
// const { toggleLoop } = require('../System/Audio/lavalinkSystem');

// module.exports = {
//     data: new SlashCommandBuilder()
//         .setName('loop')
//         .setDescription('Включает/выключает режим повтора текущего трека'),
    
//     async execute(interaction) {
//         try {
//             // Переключаем режим loop
//             const result = await toggleLoop(interaction.guild.id);
            
//             if (result.success) {
//                 const embed = new EmbedBuilder()
//                     .setTitle('🔁 Режим повтора')
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
//             console.error('Ошибка при переключении режима loop:', error);
            
//             const embed = new EmbedBuilder()
//                 .setTitle('❌ Ошибка')
//                 .setDescription('Произошла ошибка при попытке переключить режим повтора.')
//                 .setColor('#ff0000')
//                 .setTimestamp();
            
//             await interaction.reply({ embeds: [embed], ephemeral: true });
//         }
//     }
// };