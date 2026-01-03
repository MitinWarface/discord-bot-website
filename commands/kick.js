const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Выгнать пользователя с сервера')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, которого хотите выгнать')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина исключения')
                .setRequired(false)),

    async execute(interaction) {
        // Проверяем права администратора
        if (!interaction.member.permissions.has('KickMembers')) {
            return await interaction.reply({ 
                content: 'У вас нет прав для использования этой команды!', 
                ephemeral: true 
            });
        }

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Нарушение правил';
        const moderator = interaction.user;

        try {
            // Получаем участника сервера
            const member = await interaction.guild.members.fetch(targetUser.id);
            
            // Выгоняем пользователя
            await member.kick(reason);
            
            const embed = new EmbedBuilder()
                .setTitle('Пользователь исключен')
                .setDescription(`<@${moderator.id}> исключил(а) пользователя <@${targetUser.id}>`)
                .addFields(
                    { name: 'Причина', value: reason, inline: true }
                )
                .setColor('#8b00ff')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Ошибка при исключении пользователя:', error);
            await interaction.reply({ 
                content: 'Произошла ошибка при попытке исключить пользователя.', 
                ephemeral: true 
            });
        }
    }
};