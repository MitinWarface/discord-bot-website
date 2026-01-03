const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createGuild, getGuild, joinGuild, leaveGuild, getGuildMembers, addGuildXP, updateGuildLevel, getTopGuilds } = require('../System/guildSystem');
const { getUserProfile } = require('../System/userProfiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild')
        .setDescription('Управление гильдией')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Создать новую гильдию')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Название гильдии')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Получить информацию о гильдии')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Название гильдии')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Присоединиться к гильдии')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Название гильдии')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Покинуть гильдию'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('top')
                .setDescription('Топ гильдий')),
                
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.user;
        const userProfile = getUserProfile(user.id);

        try {
            if (subcommand === 'create') {
                const guildName = interaction.options.getString('name');
                
                // Проверяем, есть ли уже у пользователя гильдия
                if (userProfile.guildId) {
                    return await interaction.reply({ content: 'Вы уже состоите в гильдии!', ephemeral: true });
                }
                
                const result = createGuild(user.id, guildName);
                
                if (result.success) {
                    await interaction.reply({ 
                        content: `Гильдия "${guildName}" успешно создана!`, 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: result.message, 
                        ephemeral: true 
                    });
                }
                
            } else if (subcommand === 'info') {
                const guildName = interaction.options.getString('name') || getGuild(userProfile.guildId)?.name;
                
                if (!guildName && !userProfile.guildId) {
                    return await interaction.reply({ content: 'Вы не состоите в гильдии и не указали название гильдии для просмотра!', ephemeral: true });
                }
                
                let guildInfo;
                if (userProfile.guildId) {
                    guildInfo = getGuild(userProfile.guildId);
                } else {
                    // Ищем гильдию по названию
                    const guilds = require('../guildData.json');
                    const guildId = Object.keys(guilds).find(id => guilds[id].name.toLowerCase() === guildName.toLowerCase());
                    if (guildId) {
                        guildInfo = getGuild(guildId);
                    }
                }
                
                if (guildInfo) {
                    const members = getGuildMembers(guildInfo.id);
                    const embed = new EmbedBuilder()
                        .setTitle(`Гильдия: ${guildInfo.name}`)
                        .setDescription(guildInfo.description || 'Нет описания')
                        .addFields(
                            { name: 'Участники', value: `${members.length}`, inline: true },
                            { name: 'Уровень', value: `${guildInfo.level}`, inline: true },
                            { name: 'Опыт', value: `${guildInfo.xp}`, inline: true },
                            { name: 'Создатель', value: `<@${guildInfo.ownerId}>`, inline: true },
                            { name: 'Дата создания', value: new Date(guildInfo.createdAt).toLocaleDateString('ru-RU'), inline: true }
                        )
                        .setColor(0x0099ff);
                    
                    await interaction.reply({ embeds: [embed] });
                } else {
                    await interaction.reply({ content: 'Гильдия не найдена!', ephemeral: true });
                }
                
            } else if (subcommand === 'join') {
                const guildName = interaction.options.getString('name');
                
                // Проверяем, есть ли уже у пользователя гильдия
                if (userProfile.guildId) {
                    return await interaction.reply({ content: 'Вы уже состоите в гильдии!', ephemeral: true });
                }
                
                const result = joinGuild(user.id, guildName);
                
                if (result.success) {
                    await interaction.reply({ 
                        content: `Вы успешно присоединились к гильдии "${guildName}"!`, 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: result.message, 
                        ephemeral: true 
                    });
                }
                
            } else if (subcommand === 'leave') {
                // Проверяем, состоит ли пользователь в гильдии
                if (!userProfile.guildId) {
                    return await interaction.reply({ content: 'Вы не состоите в гильдии!', ephemeral: true });
                }
                
                const result = leaveGuild(user.id);
                
                if (result.success) {
                    await interaction.reply({ 
                        content: `Вы покинули гильдию!`, 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: result.message, 
                        ephemeral: true 
                    });
                }
                
            } else if (subcommand === 'top') {
                const topGuilds = getTopGuilds(10);
                
                if (topGuilds.length === 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('Топ гильдий')
                        .setDescription('Пока нет созданных гильдий.')
                        .setColor(0x0099ff);
                    
                    return await interaction.reply({ embeds: [embed] });
                }
                
                let description = '';
                for (let i = 0; i < topGuilds.length; i++) {
                    const guild = topGuilds[i];
                    description += `${i + 1}. **${guild.name}** (Ур. ${guild.level}) - ${guild.xp} XP\n`;
                }
                
                const embed = new EmbedBuilder()
                    .setTitle('🏆 Топ гильдий')
                    .setDescription(description)
                    .setColor(0x0099ff);
                
                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Ошибка в команде /guild:', error);
            await interaction.reply({ content: 'Произошла ошибка при выполнении команды.', ephemeral: true });
        }
    }
};