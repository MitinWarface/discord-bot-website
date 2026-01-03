const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { getUserProfile, getUserQuests, getCompletedUserQuests, assignRandomQuest, addUserQuest } = require('../System/userProfiles');
const questList = require('../questList');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quests')
        .setDescription('Просмотрите доступные квесты'),
        
    async execute(interaction) {
        const userProfile = getUserProfile(interaction.user.id);
        const userQuests = getUserQuests(interaction.user.id);
        const completedQuests = getCompletedUserQuests(interaction.user.id);
        
        // Создаем Embed с квестами
        const embed = new EmbedBuilder()
            .setTitle('🎯 Квесты')
            .setColor('#9b59b6')
            .setDescription(`Ваши очки: **${userProfile.points}**\n\nВаши активные квесты:`)
            .setTimestamp()
            .setFooter({ text: `Квесты`, iconURL: interaction.client.user.displayAvatarURL() });

        // Если у пользователя нет активных квестов, предлагаем взять новый
        if (userQuests.length === 0) {
            embed.addFields({
                name: 'Нет активных квестов',
                value: 'Вы можете взять новый квест, нажав на кнопку ниже.',
                inline: false
            });
        } else {
            // Отображаем активные квесты
            for (const quest of userQuests) {
                const progressPercentage = Math.round((quest.progress / quest.target) * 100);
                const progressBar = '█'.repeat(Math.floor(progressPercentage / 10)) + '░'.repeat(10 - Math.floor(progressPercentage / 10));
                
                embed.addFields({
                    name: `${quest.name} [${quest.progress}/${quest.target}]`,
                    value: `${quest.description}\n${progressBar} ${progressPercentage}%\nНаграда: ${quest.reward.points} очков`,
                    inline: false
                });
            }
        }

        // Отображаем недавно завершенные квесты (последние 3)
        if (completedQuests.length > 0) {
            const recentCompleted = completedQuests.slice(-3); // последние 3 квеста
            if (recentCompleted.length > 0) {
                let completedText = '';
                for (const quest of recentCompleted) {
                    completedText += `✅ ${quest.name} (награда: ${quest.reward.points} очков)\n`;
                }
                
                embed.addFields({
                    name: 'Недавно выполненные квесты',
                    value: completedText,
                    inline: false
                });
            }
        }

        // Создаем кнопки
        const row = new ActionRowBuilder();
        
        // Кнопка для получения нового квеста
        const availableQuests = questList.filter(quest => 
            !userQuests.some(q => q.id === quest.id) && 
            !completedQuests.some(q => q.id === quest.id)
        );
        
        if (availableQuests.length > 0) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('get_new_quest')
                    .setLabel('Получить новый квест')
                    .setStyle(ButtonStyle.Success)
            );
        } else {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('no_quests_available')
                    .setLabel('Нет доступных квестов')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
        }

        await interaction.reply({ 
            embeds: [embed], 
            components: [row],
            flags: [] 
        });
    },
};