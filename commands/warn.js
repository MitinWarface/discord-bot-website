const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addWarning, removeWarning, getUserProfile } = require('../System/userProfiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Выдать предупреждение пользователю')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, которому хотите выдать предупреждение')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина предупреждения')
                .setRequired(false)),

    async execute(interaction) {
        // Проверяем права администратора
        if (!interaction.member.permissions.has('Administrator')) {
            return await interaction.reply({ 
                content: 'У вас нет прав для использования этой команды!', 
                ephemeral: true 
            });
        }

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Нарушение правил';
        const moderator = interaction.user;

        // Выдаем предупреждение
        const result = addWarning(targetUser.id, reason);

        const targetUserProfile = getUserProfile(targetUser.id);
        const embed = new EmbedBuilder()
            .setTitle('Пользователь предупрежден')
            .setDescription(`<@${moderator.id}> выдал(а) предупреждение пользователю <@${targetUser.id}>`)
            .addFields(
                { name: 'Причина', value: reason, inline: true },
                { name: 'Всего предупреждений', value: `${result.warnings}`, inline: true }
            )
            .setColor('#8b00ff')
            .setTimestamp();

        // Проверяем, достиг ли пользователь 3 предупреждений
        if (result.action === 'ban') {
            embed.addFields({ name: 'Действие', value: 'Пользователь заблокирован (3 предупреждения)', inline: true });
            
            try {
                // Пытаемся заблокировать пользователя
                await interaction.guild.members.ban(targetUser, { reason: `Достигнуто 3 предупреждения: ${reason}` });
            } catch (error) {
                console.error('Ошибка при блокировке пользователя:', error);
            }
        } else if (result.action === 'mute') {
            embed.addFields({ name: 'Действие', value: 'Пользователь замучен (2 предупреждения)', inline: true });
        }

        await interaction.reply({ embeds: [embed] });
    }
};