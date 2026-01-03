const { 
    SlashCommandBuilder, 
    EmbedBuilder 
} = require('discord.js');
const { claimDaily, canClaimDaily, getUserProfile } = require('../System/userProfiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Получите свою ежедневную награду'),
        
    async execute(interaction) {
        if (canClaimDaily(interaction.user.id)) {
            const result = claimDaily(interaction.user.id);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('🎁 Ежедневная награда')
                    .setColor('#f1c40f')
                    .setDescription(`Поздравляем! Вы получили ${result.reward} очков!`)
                    .addFields(
                        { name: 'Всего очков', value: result.newPoints.toString(), inline: true },
                        { name: 'Уровень', value: result.newLevel.toString(), inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Награда получена`, iconURL: interaction.user.displayAvatarURL() });

                await interaction.reply({ embeds: [embed], flags: [] });
            }
        } else {
            const userProfile = getUserProfile(interaction.user.id);
            const lastDaily = new Date(userProfile.lastDaily);
            const nextDaily = new Date(lastDaily);
            nextDaily.setDate(nextDaily.getDate() + 1); // Следующая награда завтра
            
            const timeUntilNext = nextDaily - Date.now();
            const hours = Math.floor(timeUntilNext / (1000 * 60));
            const minutes = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
            
            const embed = new EmbedBuilder()
                .setTitle('⏳ Ежедневная награда')
                .setColor('#e74c3c')
                .setDescription(`Вы уже получили ежедневную награду!\nСледующая награда будет доступна через ${hours}ч ${minutes}м`)
                .setTimestamp()
                .setFooter({ text: `Попробуйте позже`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({ embeds: [embed], flags: ['Ephemeral'] });
        }
    },
};