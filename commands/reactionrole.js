const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactionrole')
        .setDescription('Создать сообщение с реакциями для получения ролей')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Настроить сообщение с реакциями для ролей')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Заголовок embed сообщения')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Описание embed сообщения')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role1')
                        .setDescription('Первая роль для выдачи')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji1')
                        .setDescription('Эмодзи для первой роли')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role2')
                        .setDescription('Вторая роль для выдачи')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('emoji2')
                        .setDescription('Эмодзи для второй роли')
                        .setRequired(false))
                .addRoleOption(option =>
                    option.setName('role3')
                        .setDescription('Третья роль для выдачи')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('emoji3')
                        .setDescription('Эмодзи для третьей роли')
                        .setRequired(false))
                .addRoleOption(option =>
                    option.setName('role4')
                        .setDescription('Четвертая роль для выдачи')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('emoji4')
                        .setDescription('Эмодзи для четвертой роли')
                        .setRequired(false))
                .addRoleOption(option =>
                    option.setName('role5')
                        .setDescription('Пятая роль для выдачи')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('emoji5')
                        .setDescription('Эмодзи для пятой роли')
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            
            // Получаем все роли и эмодзи
            const roles = [
                { role: interaction.options.getRole('role1'), emoji: interaction.options.getString('emoji1') },
                { role: interaction.options.getRole('role2'), emoji: interaction.options.getString('emoji2') },
                { role: interaction.options.getRole('role3'), emoji: interaction.options.getString('emoji3') },
                { role: interaction.options.getRole('role4'), emoji: interaction.options.getString('emoji4') },
                { role: interaction.options.getRole('role5'), emoji: interaction.options.getString('emoji5') }
            ].filter(item => item.role && item.emoji); // Фильтруем пустые значения

            // Проверяем, что хотя бы одна роль указана
            if (roles.length === 0) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Ошибка')
                    .setDescription('Вы должны указать хотя бы одну роль и соответствующий эмодзи.')
                    .setColor('#ff0000')
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Создаем embed сообщение
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor('#8b00ff')
                .setTimestamp();

            // Добавляем описание ролей
            let roleDescription = '';
            for (const item of roles) {
                roleDescription += `${item.emoji} - <@&${item.role.id}>\n`;
            }
            embed.addFields({ name: 'Доступные роли', value: roleDescription });

            // Создаем кнопки для каждой роли
            const components = [];
            for (let i = 0; i < roles.length; i += 5) { // Максимум 5 кнопок в ряду
                const row = new ActionRowBuilder();
                for (let j = i; j < i + 5 && j < roles.length; j++) {
                    const item = roles[j];
                    const button = new ButtonBuilder()
                        .setCustomId(`reaction_role_${item.role.id}`)
                        .setLabel(item.role.name)
                        .setEmoji(item.emoji)
                        .setStyle(ButtonStyle.Secondary);
                    row.addComponents(button);
                }
                components.push(row);
            }

            // Отправляем сообщение
            await interaction.reply({ embeds: [embed], components });

            // Отправляем сообщение с подтверждением
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Успешно')
                .setDescription(`Сообщение с реакциями для ролей создано в канале <#${interaction.channel.id}>`)
                .setColor('#00ff00')
                .setTimestamp();
            
            await interaction.followUp({ embeds: [successEmbed], ephemeral: true });
        }
    }
};