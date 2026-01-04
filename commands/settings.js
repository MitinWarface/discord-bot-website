const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Загружаем систему настроек сервера
const guildSettingsModule = require('../System/guildSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Настройки сервера')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Просмотр текущих настроек сервера'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('update')
                .setDescription('Обновить настройки сервера')
                .addStringOption(option =>
                    option.setName('prefix')
                        .setDescription('Новый префикс команд')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('automod')
                        .setDescription('Включить/выключить автомодерацию')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('leveling')
                        .setDescription('Включить/выключить систему уровней')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('economy')
                        .setDescription('Включить/выключить экономическую систему')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('music')
                        .setDescription('Включить/выключить музыкальную систему')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('reactions')
                        .setDescription('Включить/выключить систему реакций')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('autoroles')
                        .setDescription('Включить/выключить автовороли')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('log-channel')
                        .setDescription('ID канала для логов')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('welcome-channel')
                        .setDescription('ID канала для приветствий')
                        .setRequired(false))),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'view') {
            await handleViewSettings(interaction);
        } else if (subcommand === 'update') {
            await handleUpdateSettings(interaction);
        }
    }
};

async function handleViewSettings(interaction) {
    const guildId = interaction.guild.id;
    const settings = guildSettingsModule.getGuildSettings(guildId);
    
    const settingsEmbed = new EmbedBuilder()
        .setTitle(`🔧 Настройки сервера: ${interaction.guild.name}`)
        .setDescription('Текущие настройки бота на этом сервере')
        .addFields(
            { name: 'Префикс', value: `\`${settings.prefix}\``, inline: true },
            { name: 'Автомодерация', value: settings.automod.enabled ? '✅ Включена' : '❌ Выключена', inline: true },
            { name: 'Система уровней', value: settings.leveling.enabled ? '✅ Включена' : '❌ Выключена', inline: true },
            { name: 'Экономическая система', value: settings.economy.enabled ? '✅ Включена' : '❌ Выключена', inline: true },
            { name: 'Ежедневная награда', value: settings.economy.dailyAmount.toString(), inline: true },
            { name: 'Работа', value: settings.work.enabled ? '✅ Включена' : '❌ Выключена', inline: true },
            { name: 'Музыка', value: settings.music.enabled ? '✅ Включена' : '❌ Выключена', inline: true },
            { name: 'Реакции', value: settings.reactions.enabled ? '✅ Включены' : '❌ Выключены', inline: true },
            { name: 'Автовороли', value: settings.autoroles.enabled ? '✅ Включены' : '❌ Выключены', inline: true }
        )
        .setColor('#8b00ff')
        .setTimestamp();
    
    if (settings.logging.logChannel) {
        settingsEmbed.addFields({ name: 'Канал логов', value: `<#${settings.logging.logChannel}>`, inline: true });
    }
    
    await interaction.reply({ embeds: [settingsEmbed] });
}

async function handleUpdateSettings(interaction) {
    const guildId = interaction.guild.id;
    const currentSettings = guildSettingsModule.getGuildSettings(guildId);
    const newSettings = {};
    
    // Обрабатываем опции команды и обновляем соответствующие настройки
    const prefix = interaction.options.getString('prefix');
    const automodToggle = interaction.options.getBoolean('automod');
    const levelingToggle = interaction.options.getBoolean('leveling');
    const economyToggle = interaction.options.getBoolean('economy');
    const musicToggle = interaction.options.getBoolean('music');
    const reactionsToggle = interaction.options.getBoolean('reactions');
    const autorolesToggle = interaction.options.getBoolean('autoroles');
    const logChannel = interaction.options.getString('log-channel');
    const welcomeChannel = interaction.options.getString('welcome-channel');
    
    if (prefix) newSettings.prefix = prefix;
    if (automodToggle !== null) {
        if (!newSettings.automod) newSettings.automod = {};
        newSettings.automod.enabled = automodToggle;
    }
    if (levelingToggle !== null) {
        if (!newSettings.leveling) newSettings.leveling = {};
        newSettings.leveling.enabled = levelingToggle;
    }
    if (economyToggle !== null) {
        if (!newSettings.economy) newSettings.economy = {};
        newSettings.economy.enabled = economyToggle;
    }
    if (musicToggle !== null) {
        if (!newSettings.music) newSettings.music = {};
        newSettings.music.enabled = musicToggle;
    }
    if (reactionsToggle !== null) {
        if (!newSettings.reactions) newSettings.reactions = {};
        newSettings.reactions.enabled = reactionsToggle;
    }
    if (autorolesToggle !== null) {
        if (!newSettings.autoroles) newSettings.autoroles = {};
        newSettings.autoroles.enabled = autorolesToggle;
    }
    if (logChannel) {
        if (!newSettings.logging) newSettings.logging = {};
        // Проверяем, что это действительный ID канала (число)
        if (/^\d+$/.test(logChannel)) {
            newSettings.logging.logChannel = logChannel;
        } else {
            await interaction.reply({ content: 'Неверный ID канала для логов!', ephemeral: true });
            return;
        }
    }
    if (welcomeChannel) {
        // Проверяем, что это действительный ID канала (число)
        if (/^\d+$/.test(welcomeChannel)) {
            newSettings.welcomeChannel = welcomeChannel;
        } else {
            await interaction.reply({ content: 'Неверный ID канала для приветствий!', ephemeral: true });
            return;
        }
    }
    
    // Обновляем настройки
    guildSettingsModule.setGuildSettings(guildId, newSettings);
    
    // Получаем обновленные настройки для отображения
    const updatedSettings = guildSettingsModule.getGuildSettings(guildId);
    
    const updatedEmbed = new EmbedBuilder()
        .setTitle('✅ Настройки обновлены')
        .setDescription('Настройки сервера были успешно обновлены')
        .addFields(
            { name: 'Префикс', value: `\`${updatedSettings.prefix}\``, inline: true },
            { name: 'Автомодерация', value: updatedSettings.automod.enabled ? '✅ Включена' : '❌ Выключена', inline: true },
            { name: 'Система уровней', value: updatedSettings.leveling.enabled ? '✅ Включена' : '❌ Выключена', inline: true },
            { name: 'Экономическая система', value: updatedSettings.economy.enabled ? '✅ Включена' : '❌ Выключена', inline: true }
        )
        .setColor('#00ff00')
        .setTimestamp();
    
    await interaction.reply({ embeds: [updatedEmbed] });
}