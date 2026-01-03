const { 
    SlashCommandBuilder, 
    EmbedBuilder 
} = require('discord.js');
const { getUserProfile } = require('../System/userProfiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Показывает ваш профиль или профиль другого пользователя')
        .addUserOption(option => 
            option.setName('пользователь')
                .setDescription('Выберите пользователя для просмотра профиля')
                .setRequired(false)),
        
    async execute(interaction) {
        const user = interaction.options.getUser('пользователь') || interaction.user;
        const userProfile = getUserProfile(user.id);
        
        // Обновляем имя пользователя, если оно изменилось
        if (user.username !== userProfile.username) {
            require('../System/userProfiles').updateUserProfile(user.id, { username: user.username });
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`Профиль: ${user.username}`)
            .setColor('#9b59b6')
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: 'Уровень', value: userProfile.level.toString(), inline: true },
                { name: 'Очки', value: userProfile.points.toString(), inline: true },
                { name: 'Дата регистрации', value: new Date(userProfile.joinDate).toLocaleDateString('ru-RU'), inline: false },
                { name: 'Последнее взаимодействие', value: new Date(userProfile.lastInteraction).toLocaleDateString('ru-RU'), inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `ID: ${user.id}`, iconURL: interaction.user.displayAvatarURL() });
            
        // Добавляем информацию о гильдии, если пользователь состоит в гильдии
        if (userProfile.guildId) {
            const { getGuild } = require('../System/guildSystem');
            const userGuild = getGuild(userProfile.guildId);
            if (userGuild) {
                embed.addFields({ name: 'Гильдия', value: userGuild.name, inline: true });
            }
        }

        // Добавляем информацию о репутации и предупреждениях
        embed.addFields(
            { name: 'Репутация', value: userProfile.reputation ? userProfile.reputation.toString() : '0', inline: true },
            { name: 'Предупреждения', value: userProfile.warnings ? userProfile.warnings.toString() : '0', inline: true }
        );
        
        await interaction.reply({ embeds: [embed], flags: [] });
    },
};