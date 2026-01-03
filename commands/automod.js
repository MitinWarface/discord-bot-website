const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildModerationConfig, setGuildModerationConfig } = require('../System/moderationSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Настройка автоматической модерации')
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('Просмотр текущих настроек автомодерации'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Включение/выключение автомодерации')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Включить или выключить автомодерацию')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('filter')
                .setDescription('Настройка фильтров')
                .addStringOption(option =>
                    option.setName('filter_type')
                        .setDescription('Тип фильтра')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Мат/непристойности', value: 'profanity' },
                            { name: 'Ссылки', value: 'links' },
                            { name: 'Спам', value: 'spam' },
                            { name: 'Капс', value: 'caps' },
                            { name: 'Приглашения Discord', value: 'invites' }
                        ))
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Включить или выключить фильтр')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('actions')
                .setDescription('Настройка действий автомодерации')
                .addIntegerOption(option =>
                    option.setName('warn')
                        .setDescription('Количество предупреждений перед мутом')
                        .setMinValue(1)
                        .setMaxValue(10)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const config = getGuildModerationConfig(guildId);

        switch (subcommand) {
            case 'settings':
                await handleSettings(interaction, config);
                break;
            case 'toggle':
                await handleToggle(interaction, config);
                break;
            case 'filter':
                await handleFilter(interaction, config);
                break;
            case 'actions':
                await handleActions(interaction, config);
                break;
        }
    }
};

async function handleSettings(interaction, config) {
    const embed = new EmbedBuilder()
        .setTitle('⚙️ Настройки автоматической модерации')
        .setDescription('Текущие настройки автомодерации для этого сервера')
        .addFields(
            { name: 'Статус', value: config.automod.enabled ? '✅ Включена' : '❌ Выключена', inline: true },
            { name: 'Фильтр мата', value: config.automod.filter.profanity ? '✅ Включен' : '❌ Выключен', inline: true },
            { name: 'Фильтр ссылок', value: config.automod.filter.links ? '✅ Включен' : '❌ Выключен', inline: true },
            { name: 'Фильтр спама', value: config.automod.filter.spam ? '✅ Включен' : '❌ Выключен', inline: true },
            { name: 'Фильтр капса', value: config.automod.filter.caps ? '✅ Включен' : '❌ Выключен', inline: true },
            { name: 'Фильтр приглашений', value: config.automod.filter.invites ? '✅ Включен' : '❌ Выключен', inline: true },
            { name: 'Действия', value: `Предупреждения: ${config.automod.actions.warn}\nМут: ${config.automod.actions.mute}\nКик: ${config.automod.actions.kick}\nБан: ${config.automod.actions.ban}`, inline: false }
        )
        .setColor('#8b00ff')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleToggle(interaction, config) {
    const enabled = interaction.options.getBoolean('enabled');
    config.automod.enabled = enabled;
    setGuildModerationConfig(interaction.guild.id, config);

    const embed = new EmbedBuilder()
        .setTitle(enabled ? '✅ Автомодерация включена' : '❌ Автомодерация выключена')
        .setDescription(`Автомодерация теперь ${enabled ? 'включена' : 'выключена'} на этом сервере`)
        .setColor(enabled ? '#00FF00' : '#FF0000')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleFilter(interaction, config) {
    const filterType = interaction.options.getString('filter_type');
    const enabled = interaction.options.getBoolean('enabled');

    config.automod.filter[filterType] = enabled;
    setGuildModerationConfig(interaction.guild.id, config);

    const filterNames = {
        'profanity': 'мата/непристойностей',
        'links': 'ссылок',
        'spam': 'спама',
        'caps': 'капса',
        'invites': 'приглашений Discord'
    };

    const embed = new EmbedBuilder()
        .setTitle(`✅ Фильтр ${filterNames[filterType]} ${enabled ? 'включен' : 'выключен'}`)
        .setDescription(`Фильтр ${filterNames[filterType]} теперь ${enabled ? 'включен' : 'выключен'}`)
        .setColor('#8b00ff')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleActions(interaction, config) {
    const warnThreshold = interaction.options.getInteger('warn');

    if (warnThreshold !== undefined) {
        config.automod.actions.warn = warnThreshold;
        setGuildModerationConfig(interaction.guild.id, config);

        const embed = new EmbedBuilder()
            .setTitle('✅ Порог предупреждений обновлен')
            .setDescription(`Порог предупреждений установлен на ${warnThreshold}`)
            .setColor('#8b00ff')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}