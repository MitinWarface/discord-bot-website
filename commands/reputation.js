const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Путь к файлу с данными о репутации
const reputationPath = path.join(__dirname, '../System/reputation.json');

// Загрузка данных о репутации
function loadReputationData() {
    if (fs.existsSync(reputationPath)) {
        const data = fs.readFileSync(reputationPath, 'utf8');
        return JSON.parse(data);
    }
    return {};
}

// Сохранение данных о репутации
function saveReputationData(data) {
    fs.writeFileSync(reputationPath, JSON.stringify(data, null, 2));
}

// Проверка, может ли пользователь выдать репутацию
function canGiveReputation(userId, targetUserId) {
    const repData = loadReputationData();
    const userRepData = repData[userId] || {};
    
    // Проверяем, выдавал ли пользователь репутацию этому пользователю за последние 24 часа
    if (userRepData[targetUserId]) {
        const lastGiven = new Date(userRepData[targetUserId]);
        const now = new Date();
        const timeDiff = now - lastGiven;
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        return hoursDiff >= 24; // Можно выдавать раз в 24 часа
    }
    
    return true; // Если еще не выдавал, можно
}

// Выдача репутации
function giveReputation(userId, targetUserId) {
    const repData = loadReputationData();
    
    // Инициализируем данные, если их нет
    if (!repData[targetUserId]) {
        repData[targetUserId] = { reputation: 0, receivedFrom: {} };
    }
    
    // Обновляем время последней выдачи репутации
    if (!repData[userId]) {
        repData[userId] = { reputation: 0, receivedFrom: {} };
    }
    
    repData[userId][targetUserId] = new Date().toISOString();
    
    // Увеличиваем репутацию целевого пользователя
    repData[targetUserId].reputation += 1;
    repData[targetUserId].receivedFrom[userId] = new Date().toISOString();
    
    saveReputationData(repData);
    
    return {
        success: true,
        newReputation: repData[targetUserId].reputation
    };
}

// Получение репутации пользователя
function getUserReputation(userId) {
    const repData = loadReputationData();
    return repData[userId]?.reputation || 0;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rep')
        .setDescription('Выдать репутацию пользователю')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, которому хотите выдать репутацию')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина выдачи репутации')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'За активность';
        const giverUser = interaction.user;
        
        // Проверяем, что пользователь не пытается выдать репутацию себе
        if (targetUser.id === giverUser.id) {
            const selfRepEmbed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Вы не можете выдать репутацию себе!')
                .setColor('#ff0000')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [selfRepEmbed], ephemeral: true });
        }
        
        // Проверяем, может ли пользователь выдать репутацию
        if (!canGiveReputation(giverUser.id, targetUser.id)) {
            const lastGiven = new Date(loadReputationData()[giverUser.id][targetUser.id]);
            const nextAvailable = new Date(lastGiven);
            nextAvailable.setHours(nextAvailable.getHours() + 24);
            
            const cooldownEmbed = new EmbedBuilder()
                .setTitle('⏰ Ожидание')
                .setDescription(`Вы уже выдавали репутацию <@${targetUser.id}> менее 24 часов назад!\nСледующая возможность: <t:${Math.floor(nextAvailable.getTime()/1000)}:R>`)
                .setColor('#ffa500')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
        }
        
        try {
            // Выдаем репутацию
            const result = giveReputation(giverUser.id, targetUser.id);
            
            if (result.success) {
                // Обновляем прогресс квестов на выдачу репутации
                try {
                    require('../System/userProfiles').updateQuestProgressByType(giverUser.id, 'rep', 1);
                    require('../System/userProfiles').updateQuestProgressByType(targetUser.id, 'rep_received', 1);
                } catch (questError) {
                    console.error('Ошибка при обновлении прогресса квестов на репутацию:', questError);
                }
                
                // Создаем embed с уведомлением
                const repEmbed = new EmbedBuilder()
                    .setTitle('⭐ Репутация выдана')
                    .setDescription(`<@${giverUser.id}> выдал репутацию пользователю <@${targetUser.id}>`)
                    .addFields(
                        { name: 'Причина', value: reason, inline: true },
                        { name: 'Новая репутация', value: result.newReputation.toString(), inline: true }
                    )
                    .setColor('#8b00ff')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [repEmbed] });
                
                // Отправляем уведомление пользователю, которому выдали репутацию
                try {
                    const notifyEmbed = new EmbedBuilder()
                        .setTitle('🌟 Вам выдали репутацию!')
                        .setDescription(`Пользователь <@${giverUser.id}> выдал вам репутацию на сервере **${interaction.guild.name}**`)
                        .addFields(
                            { name: 'Причина', value: reason, inline: true },
                            { name: 'Всего репутации', value: result.newReputation.toString(), inline: true }
                        )
                        .setColor('#8b00ff')
                        .setTimestamp();
                    
                    await targetUser.send({ embeds: [notifyEmbed] });
                } catch (error) {
                    // Не удалось отправить личное сообщение
                    console.log(`Не удалось отправить уведомление о репутации пользователю ${targetUser.id}`);
                }
            }
        } catch (error) {
            console.error('Ошибка при выдаче репутации:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при попытке выдать репутацию.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

// Команда для просмотра репутации пользователя
module.exports.checkrep = {
    data: new SlashCommandBuilder()
        .setName('checkrep')
        .setDescription('Проверить репутацию пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, чью репутацию хотите проверить')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        
        const userRep = getUserReputation(targetUser.id);
        
        const repEmbed = new EmbedBuilder()
            .setTitle(`🌟 Репутация ${targetUser.username}`)
            .setDescription(`Количество репутации: **${userRep}**`)
            .setColor('#8b00ff')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp();
        
        await interaction.reply({ embeds: [repEmbed] });
    }
};