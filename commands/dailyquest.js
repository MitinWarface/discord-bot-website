const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');
const { getUserProfile, getUserQuests, getCompletedUserQuests, assignRandomQuest, addUserQuest, updateQuestProgressByType } = require('../System/userProfiles');
const questList = require('../questList');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dailyquest')
        .setDescription('Получите ежедневный квест'),
        
    async execute(interaction) {
        const userProfile = getUserProfile(interaction.user.id);
        const userQuests = getUserQuests(interaction.user.id);
        
        // Проверяем, не выполняет ли пользователь уже ежедневный квест
        const dailyQuest = userQuests.find(quest => quest.type === 'daily');
        
        if (dailyQuest) {
            const progressPercentage = Math.round((dailyQuest.progress / dailyQuest.target) * 100);
            const progressBar = '█'.repeat(Math.floor(progressPercentage / 10)) + '░'.repeat(10 - Math.floor(progressPercentage / 10));
            
            const embed = new EmbedBuilder()
                .setTitle('🎯 Ежедневный квест')
                .setDescription(`У вас уже есть ежедневный квест!`)
                .addFields({
                    name: `${dailyQuest.name} [${dailyQuest.progress}/${dailyQuest.target}]`,
                    value: `${dailyQuest.description}\n${progressBar} ${progressPercentage}%\nНаграда: ${dailyQuest.reward.points} очков`,
                    inline: false
                })
                .setColor('#9b59b6')
                .setTimestamp()
                .setFooter({ text: `Ежедневный квест`, iconURL: interaction.client.user.displayAvatarURL() });
                
            return interaction.reply({ embeds: [embed] });
        }
        
        // Находим доступные ежедневные квесты
        const dailyQuests = questList.filter(quest => quest.type === 'daily');
        const completedQuests = getCompletedUserQuests(interaction.user.id);
        
        // Фильтруем квесты, которые пользователь еще не выполнял сегодня
        const availableDailyQuests = dailyQuests.filter(quest =>
            !completedQuests.some(q => q.id === quest.id)
        );
        
        if (availableDailyQuests.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('🎯 Ежедневный квест')
                .setDescription('К сожалению, на сегодня больше нет доступных ежедневных квестов.')
                .setColor('#9b59b6')
                .setTimestamp()
                .setFooter({ text: `Ежедневный квест`, iconURL: interaction.client.user.displayAvatarURL() });
                
            return interaction.reply({ embeds: [embed] });
        }
        
        // Выбираем случайный ежедневный квест
        const randomDailyQuest = availableDailyQuests[Math.floor(Math.random() * availableDailyQuests.length)];
        const newQuest = addUserQuest(interaction.user.id, randomDailyQuest.id);
        
        if (newQuest) {
            const embed = new EmbedBuilder()
                .setTitle('🎯 Новый ежедневный квест')
                .setDescription(`Вы получили новый ежедневный квест!`)
                .addFields({
                    name: `${newQuest.name} [${newQuest.progress}/${newQuest.target}]`,
                    value: `${newQuest.description}\nНаграда: ${newQuest.reward.points} очков`,
                    inline: false
                })
                .setColor('#9b59b6')
                .setTimestamp()
                .setFooter({ text: `Ежедневный квест`, iconURL: interaction.client.user.displayAvatarURL() });
                
            await interaction.reply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Не удалось получить ежедневный квест. Попробуйте позже.')
                .setColor('#ff0000')
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed] });
        }
    }
};