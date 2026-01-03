const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverstats')
        .setDescription('Показать статистику сервера')
        .addSubcommand(subcommand =>
            subcommand
                .setName('overview')
                .setDescription('Обзор основной статистики сервера'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('channels')
                .setDescription('Статистика каналов сервера'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('members')
                .setDescription('Статистика участников сервера'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('roles')
                .setDescription('Статистика ролей сервера')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guild = interaction.guild;
        
        switch (subcommand) {
            case 'overview':
                await handleOverviewStats(interaction, guild);
                break;
            case 'channels':
                await handleChannelStats(interaction, guild);
                break;
            case 'members':
                await handleMemberStats(interaction, guild);
                break;
            case 'roles':
                await handleRoleStats(interaction, guild);
                break;
        }
    }
};

async function handleOverviewStats(interaction, guild) {
    // Получаем статистику сервера
    const totalMembers = guild.memberCount;
    const humans = guild.members.cache.filter(member => !member.user.bot).size;
    const bots = totalMembers - humans;
    const textChannels = guild.channels.cache.filter(channel => channel.type === 0).size; // Text channels
    const voiceChannels = guild.channels.cache.filter(channel => channel.type === 2).size; // Voice channels
    const categories = guild.channels.cache.filter(channel => channel.type === 4).size; // Category channels
    const roles = guild.roles.cache.size - 1; // Exclude @everyone
    const emojis = guild.emojis.cache.size;
    const stickers = guild.stickers.cache.size;
    
    // Получаем количество онлайн пользователей
    const onlineMembers = guild.members.cache.filter(member => 
        member.presence?.status === 'online' || 
        member.presence?.status === 'idle' || 
        member.presence?.status === 'dnd'
    ).size;
    
    // Создаем embed с основной статистикой
    const overviewEmbed = new EmbedBuilder()
        .setTitle(`📊 Статистика сервера ${guild.name}`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
            { name: 'Основная информация', value: `**ID:** ${guild.id}\n**Создан:** <t:${Math.floor(guild.createdTimestamp/1000)}:R>\n**Владелец:** <@${guild.ownerId}>`, inline: false },
            { name: 'Участники', value: `**Всего:** ${totalMembers}\n**Людей:** ${humans}\n**Ботов:** ${bots}\n**Онлайн:** ${onlineMembers}`, inline: true },
            { name: 'Каналы', value: `**Текстовые:** ${textChannels}\n**Голосовые:** ${voiceChannels}\n**Категории:** ${categories}`, inline: true },
            { name: 'Другое', value: `**Роли:** ${roles}\n**Эмодзи:** ${emojis}\n**Стикеры:** ${stickers}`, inline: true }
        )
        .setColor('#8b00ff')
        .setTimestamp();
    
    await interaction.reply({ embeds: [overviewEmbed] });
}

async function handleChannelStats(interaction, guild) {
    // Получаем статистику каналов
    const textChannels = guild.channels.cache.filter(channel => channel.type === 0);
    const voiceChannels = guild.channels.cache.filter(channel => channel.type === 2);
    const categoryChannels = guild.channels.cache.filter(channel => channel.type === 4);
    
    // Подсчитываем количество каналов по категориям
    const nsfwChannels = textChannels.filter(channel => channel.nsfw).size;
    const newsChannels = textChannels.filter(channel => channel.type === 'GUILD_NEWS').size;
    const storeChannels = textChannels.filter(channel => channel.type === 'GUILD_STORE').size;
    
    // Создаем embed с информацией о каналах
    const channelEmbed = new EmbedBuilder()
        .setTitle(`📺 Статистика каналов сервера ${guild.name}`)
        .setDescription(`Всего каналов: **${textChannels.size + voiceChannels.size + categoryChannels.size}**`)
        .addFields(
            { name: 'Текстовые каналы', value: `**Всего:** ${textChannels.size}\n**NSFW:** ${nsfwChannels}\n**Новости:** ${newsChannels}\n**Магазин:** ${storeChannels}`, inline: true },
            { name: 'Голосовые каналы', value: `**Всего:** ${voiceChannels.size}`, inline: true },
            { name: 'Категории', value: `**Всего:** ${categoryChannels.size}`, inline: true }
        )
        .setColor('#8b00ff')
        .setTimestamp();
    
    // Добавляем информацию о наиболее активных каналах (топ 5 по количеству сообщений за последнюю неделю)
    try {
        // Получаем последние сообщения в текстовых каналах (для примера)
        const activeChannels = [];
        for (const [id, channel] of textChannels) {
            if (channel.isTextBased()) {
                try {
                    const messages = await channel.messages.fetch({ limit: 100 }); // Получаем последние 100 сообщений
                    activeChannels.push({ channel: channel, messageCount: messages.size });
                } catch (error) {
                    // Некоторые каналы могут быть недоступны для бота
                    continue;
                }
            }
        }
        
        // Сортируем по количеству сообщений
        activeChannels.sort((a, b) => b.messageCount - a.messageCount);
        
        if (activeChannels.length > 0) {
            let topChannelsStr = '';
            for (let i = 0; i < Math.min(5, activeChannels.length); i++) {
                const ch = activeChannels[i];
                topChannelsStr += `${i + 1}. <#${ch.channel.id}> - ${ch.messageCount} сообщений\n`;
            }
            
            channelEmbed.addFields({
                name: 'ТОП активных каналов',
                value: topChannelsStr,
                inline: false
            });
        }
    } catch (error) {
        console.error('Ошибка при получении активных каналов:', error);
    }
    
    await interaction.reply({ embeds: [channelEmbed] });
}

async function handleMemberStats(interaction, guild) {
    // Получаем статистику участников
    const totalMembers = guild.memberCount;
    const humans = guild.members.cache.filter(member => !member.user.bot).size;
    const bots = totalMembers - humans;
    
    // Статистика по статусам
    const onlineMembers = guild.members.cache.filter(member => 
        member.presence?.status === 'online'
    ).size;
    
    const idleMembers = guild.members.cache.filter(member => 
        member.presence?.status === 'idle'
    ).size;
    
    const dndMembers = guild.members.cache.filter(member => 
        member.presence?.status === 'dnd'
    ).size;
    
    const offlineMembers = totalMembers - onlineMembers - idleMembers - dndMembers;
    
    // Статистика по времени вступления
    const membersByJoinDate = guild.members.cache.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
    const newestMembers = membersByJoinDate.first(5).map(member => `<@${member.id}>`);
    const oldestMembers = membersByJoinDate.last(5).map(member => `<@${member.id}>`);
    
    // Создаем embed с информацией об участниках
    const memberEmbed = new EmbedBuilder()
        .setTitle(`👥 Статистика участников сервера ${guild.name}`)
        .setDescription(`Всего участников: **${totalMembers}**`)
        .addFields(
            { name: 'Разделение', value: `**Люди:** ${humans}\n**Боты:** ${bots}`, inline: true },
            { name: 'Статусы', value: `**🟢 Онлайн:** ${onlineMembers}\n**🌙 Неактивен:** ${idleMembers}\n**🔴 Не беспокоить:** ${dndMembers}\n**⚫ Офлайн:** ${offlineMembers}`, inline: true }
        )
        .setColor('#8b00ff')
        .setTimestamp();
    
    // Добавляем информацию о новых и старых участниках
    if (newestMembers.length > 0) {
        memberEmbed.addFields({
            name: 'Недавние участники',
            value: newestMembers.join('\n'),
            inline: true
        });
    }
    
    if (oldestMembers.length > 0) {
        memberEmbed.addFields({
            name: 'Давние участники',
            value: oldestMembers.join('\n'),
            inline: true
        });
    }
    
    await interaction.reply({ embeds: [memberEmbed] });
}

async function handleRoleStats(interaction, guild) {
    // Получаем статистику ролей
    const roles = guild.roles.cache
        .filter(role => role.name !== '@everyone') // Исключаем @everyone
        .sort((a, b) => b.position - a.position); // Сортируем по позиции (сверху вниз)
    
    // Подсчитываем количество ролей с особыми свойствами
    const mentionableRoles = roles.filter(role => role.mentionable).size;
    const hoistedRoles = roles.filter(role => role.hoist).size;
    const managedRoles = roles.filter(role => role.managed).size;
    
    // Создаем embed с информацией о ролях
    const roleEmbed = new EmbedBuilder()
        .setTitle(`🎭 Статистика ролей сервера ${guild.name}`)
        .setDescription(`Всего ролей: **${roles.size}**`)
        .addFields(
            { name: 'Информация о ролях', value: `**Упоминаемые:** ${mentionableRoles}\n**Отделенные:** ${hoistedRoles}\n**Управляемые:** ${managedRoles}`, inline: true }
        )
        .setColor('#8b00ff')
        .setTimestamp();
    
    // Добавляем информацию о топ 10 ролях по количеству участников
    const rolesWithMembers = roles.map(role => ({
        role: role,
        memberCount: guild.members.cache.filter(member => member.roles.cache.has(role.id)).size
    })).sort((a, b) => b.memberCount - a.memberCount);
    
    if (rolesWithMembers.length > 0) {
        let topRolesStr = '';
        for (let i = 0; i < Math.min(10, rolesWithMembers.length); i++) {
            const roleData = rolesWithMembers[i];
            topRolesStr += `${i + 1}. ${roleData.role} - ${roleData.memberCount} участников\n`;
        }
        
        roleEmbed.addFields({
            name: 'ТОП ролей по участникам',
            value: topRolesStr,
            inline: false
        });
    }
    
    await interaction.reply({ embeds: [roleEmbed] });
}