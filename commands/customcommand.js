const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Путь к файлу с кастомными командами
const customCommandsPath = path.join(__dirname, '../System/customCommands.json');

// Загрузка кастомных команд
function loadCustomCommands() {
    if (fs.existsSync(customCommandsPath)) {
        const data = fs.readFileSync(customCommandsPath, 'utf8');
        return JSON.parse(data);
    }
    return {};
}

// Сохранение кастомных команд
function saveCustomCommands(commands) {
    fs.writeFileSync(customCommandsPath, JSON.stringify(commands, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('customcommand')
        .setDescription('Управление кастомными командами')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Создать новую кастомную команду')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Название команды (без /)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('response')
                        .setDescription('Ответ команды')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Описание команды')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Изменить существующую кастомную команду')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Название команды для редактирования')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('response')
                        .setDescription('Новый ответ команды')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Новое описание команды')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Удалить кастомную команду')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Название команды для удаления')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Показать список всех кастомных команд'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const commands = loadCustomCommands();
        const guildId = interaction.guild.id;

        // Инициализируем хранилище для гильдии, если его нет
        if (!commands[guildId]) {
            commands[guildId] = {};
        }

        switch (subcommand) {
            case 'create':
                await handleCreateCommand(interaction, commands, guildId);
                break;
            case 'edit':
                await handleEditCommand(interaction, commands, guildId);
                break;
            case 'delete':
                await handleDeleteCommand(interaction, commands, guildId);
                break;
            case 'list':
                await handleListCommands(interaction, commands, guildId);
                break;
        }
    }
};

async function handleCreateCommand(interaction, commands, guildId) {
    const name = interaction.options.getString('name').toLowerCase();
    const response = interaction.options.getString('response');
    const description = interaction.options.getString('description') || `Кастомная команда ${name}`;

    // Проверяем, существует ли уже команда с таким именем
    if (commands[guildId][name]) {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription(`Команда с именем **${name}** уже существует!`)
            .setColor('#ff0000')
            .setTimestamp();

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    // Проверяем, не превышает ли количество команд лимит (например, 50 команд)
    const commandCount = Object.keys(commands[guildId]).length;
    if (commandCount >= 50) {
        const limitEmbed = new EmbedBuilder()
            .setTitle('❌ Лимит команд')
            .setDescription('Достигнут лимит на количество кастомных команд (50). Удалите ненужные команды, чтобы создать новые.')
            .setColor('#ff0000')
            .setTimestamp();

        return await interaction.reply({ embeds: [limitEmbed], ephemeral: true });
    }

    // Создаем новую команду
    commands[guildId][name] = {
        response: response,
        description: description,
        createdBy: interaction.user.id,
        createdDate: new Date().toISOString(),
        uses: 0
    };

    saveCustomCommands(commands);

    const successEmbed = new EmbedBuilder()
        .setTitle('✅ Команда создана')
        .setDescription(`Кастомная команда **/${name}** создана успешно!`)
        .addFields(
            { name: 'Ответ', value: response.substring(0, 1024), inline: false }, // Ограничиваем длину описания
            { name: 'Описание', value: description, inline: false }
        )
        .setColor('#00ff00')
        .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
}

async function handleEditCommand(interaction, commands, guildId) {
    const name = interaction.options.getString('name').toLowerCase();
    const response = interaction.options.getString('response');
    const description = interaction.options.getString('description');

    // Проверяем, существует ли команда
    if (!commands[guildId][name]) {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription(`Команда с именем **${name}** не найдена!`)
            .setColor('#ff0000')
            .setTimestamp();

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    // Проверяем права на редактирование (только создатель или администратор)
    const command = commands[guildId][name];
    if (command.createdBy !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        const permEmbed = new EmbedBuilder()
            .setTitle('❌ Нет прав')
            .setDescription('Вы не можете редактировать эту команду! Только создатель команды или администратор может ее редактировать.')
            .setColor('#ff0000')
            .setTimestamp();

        return await interaction.reply({ embeds: [permEmbed], ephemeral: true });
    }

    // Обновляем команду
    if (response) command.response = response;
    if (description) command.description = description;

    saveCustomCommands(commands);

    const successEmbed = new EmbedBuilder()
        .setTitle('✏️ Команда изменена')
        .setDescription(`Кастомная команда **/${name}** изменена успешно!`)
        .addFields(
            { name: 'Новый ответ', value: command.response.substring(0, 1024), inline: false },
            { name: 'Новое описание', value: command.description, inline: false }
        )
        .setColor('#ffff00')
        .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
}

async function handleDeleteCommand(interaction, commands, guildId) {
    const name = interaction.options.getString('name').toLowerCase();

    // Проверяем, существует ли команда
    if (!commands[guildId][name]) {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Ошибка')
            .setDescription(`Команда с именем **${name}** не найдена!`)
            .setColor('#ff0000')
            .setTimestamp();

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    // Проверяем права на удаление (только создатель или администратор)
    const command = commands[guildId][name];
    if (command.createdBy !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        const permEmbed = new EmbedBuilder()
            .setTitle('❌ Нет прав')
            .setDescription('Вы не можете удалить эту команду! Только создатель команды или администратор может ее удалить.')
            .setColor('#ff0000')
            .setTimestamp();

        return await interaction.reply({ embeds: [permEmbed], ephemeral: true });
    }

    // Удаляем команду
    delete commands[guildId][name];
    saveCustomCommands(commands);

    const successEmbed = new EmbedBuilder()
        .setTitle('🗑️ Команда удалена')
        .setDescription(`Кастомная команда **/${name}** удалена успешно!`)
        .setColor('#ff0000')
        .setTimestamp();

    await interaction.reply({ embeds: [successEmbed] });
}

async function handleListCommands(interaction, commands, guildId) {
    const guildCommands = commands[guildId];

    if (Object.keys(guildCommands).length === 0) {
        const emptyEmbed = new EmbedBuilder()
            .setTitle('📋 Кастомные команды')
            .setDescription('На этом сервере пока нет кастомных команд.')
            .setColor('#8b00ff')
            .setTimestamp();

        return await interaction.reply({ embeds: [emptyEmbed], ephemeral: true });
    }

    // Создаем embed с информацией о командах
    const listEmbed = new EmbedBuilder()
        .setTitle('📋 Кастомные команды')
        .setDescription(`На этом сервере доступно **${Object.keys(guildCommands).length}** кастомных команд:`)
        .setColor('#8b00ff')
        .setTimestamp();

    // Добавляем информацию о первых 25 командах (ограничение embed)
    const commandEntries = Object.entries(guildCommands).slice(0, 25);
    for (const [name, cmd] of commandEntries) {
        const creator = await interaction.guild.members.fetch(cmd.createdBy).catch(() => null);
        listEmbed.addFields({
            name: `/${name}`,
            value: `${cmd.description}\nСоздал: ${creator ? `<@${cmd.createdBy}>` : 'Неизвестно'}\nИспользований: ${cmd.uses}`,
            inline: true
        });
    }

    if (Object.keys(guildCommands).length > 25) {
        listEmbed.setFooter({ text: `Показаны первые 25 команд из ${Object.keys(guildCommands).length}`, iconURL: interaction.client.user.displayAvatarURL() });
    } else {
        listEmbed.setFooter({ text: `Всего команд: ${Object.keys(guildCommands).length}`, iconURL: interaction.client.user.displayAvatarURL() });
    }

    await interaction.reply({ embeds: [listEmbed], ephemeral: true });
}