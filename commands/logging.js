const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getGuildLoggingConfig, setGuildLoggingConfig } = require('../System/loggingSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logging')
        .setDescription('Настройка логирования событий сервера')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Настроить канал для логирования')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Канал для отправки логов')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Включить/выключить логирование определенного события')
                .addStringOption(option =>
                    option.setName('event')
                        .setDescription('Тип события для настройки')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Удаление сообщений', value: 'messageDelete' },
                            { name: 'Изменение сообщений', value: 'messageUpdate' },
                            { name: 'Присоединение участников', value: 'memberJoin' },
                            { name: 'Выход участников', value: 'memberLeave' },
                            { name: 'Блокировка участников', value: 'memberBan' },
                            { name: 'Разблокировка участников', value: 'memberUnban' },
                            { name: 'Выдача ролей', value: 'memberRoleAdd' },
                            { name: 'Снятие ролей', value: 'memberRoleRemove' },
                            { name: 'Изменение никнейма', value: 'memberNicknameUpdate' },
                            { name: 'Изменения в голосовых каналах', value: 'voiceStateUpdate' }
                        ))
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Включить или выключить логирование события')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('Просмотр текущих настроек логирования'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const config = getGuildLoggingConfig(guildId);

        switch (subcommand) {
            case 'setup':
                await handleSetup(interaction, config);
                break;
            case 'toggle':
                await handleToggle(interaction, config);
                break;
            case 'settings':
                await handleSettings(interaction, config);
                break;
        }
    }
};

async function handleSetup(interaction, config) {
    const channel = interaction.options.getChannel('channel');
    
    config.logChannel = channel.id;
    setGuildLoggingConfig(interaction.guild.id, config);

    const embed = new EmbedBuilder()
        .setTitle('✅ Канал логирования установлен')
        .setDescription(`Канал <#${channel.id}> теперь будет использоваться для логирования событий сервера`)
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleToggle(interaction, config) {
    const event = interaction.options.getString('event');
    const enabled = interaction.options.getBoolean('enabled');

    config.events[event] = enabled;
    setGuildLoggingConfig(interaction.guild.id, config);

    const eventNames = {
        'messageDelete': 'удаление сообщений',
        'messageUpdate': 'изменение сообщений',
        'memberJoin': 'присоединение участников',
        'memberLeave': 'выход участников',
        'memberBan': 'блокировка участников',
        'memberUnban': 'разблокировка участников',
        'memberRoleAdd': 'выдача ролей',
        'memberRoleRemove': 'снятие ролей',
        'memberNicknameUpdate': 'изменение никнейма',
        'voiceStateUpdate': 'изменения в голосовых каналах'
    };

    const embed = new EmbedBuilder()
        .setTitle(`✅ Логирование ${eventNames[event]} ${enabled ? 'включено' : 'выключено'}`)
        .setDescription(`Логирование события "${eventNames[event]}" теперь ${enabled ? 'включено' : 'выключено'}`)
        .setColor(enabled ? '#00FF00' : '#FF0000')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleSettings(interaction, config) {
    const eventNames = {
        'messageDelete': 'Удаление сообщений',
        'messageUpdate': 'Изменение сообщений',
        'memberJoin': 'Присоединение участников',
        'memberLeave': 'Выход участников',
        'memberBan': 'Блокировка участников',
        'memberUnban': 'Разблокировка участников',
        'memberRoleAdd': 'Выдача ролей',
        'memberRoleRemove': 'Снятие ролей',
        'memberNicknameUpdate': 'Изменение никнейма',
        'voiceStateUpdate': 'Изменения в голосовых каналах'
    };

    const logChannel = config.logChannel ? `<#${config.logChannel}>` : 'Не установлен';

    const embed = new EmbedBuilder()
        .setTitle('⚙️ Настройки логирования')
        .setDescription(`Текущие настройки логирования для этого сервера`)
        .addFields(
            { name: 'Канал логов', value: logChannel, inline: true }
        )
        .setColor('#8b00ff')
        .setTimestamp();

    // Добавляем информацию о каждом событии
    for (const [eventKey, eventName] of Object.entries(eventNames)) {
        const isEnabled = config.events[eventKey] ? '✅ Вкл' : '❌ Выкл';
        embed.addFields({ name: eventName, value: isEnabled, inline: true });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
}