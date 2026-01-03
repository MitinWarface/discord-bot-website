const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Путь к файлу с репутацией
const repPath = path.join(__dirname, '../System/rep.json');

// Загрузка данных о репутации
function loadRepData() {
    if (fs.existsSync(repPath)) {
        const data = fs.readFileSync(repPath, 'utf8');
        return JSON.parse(data);
    }
    return {};
}

// Сохранение данных о репутации
function saveRepData(data) {
    fs.writeFileSync(repPath, JSON.stringify(data, null, 2));
}

// Проверка, может ли пользователь выдать репутацию
function canGiveReputation(userId) {
    const repData = loadRepData();
    const userRepData = repData[userId] || {};
    
    if (!userRepData.lastGiven) {
        return true; // Первый раз
    }
    
    const lastGiven = new Date(userRepData.lastGiven);
    const now = new Date();
    const timeDiff = now - lastGiven;
    const hoursDiff = timeDiff / (1000 * 60);
    
    return hoursDiff >= 24; // Раз в 24 часа
}

// Выдача репутации
function giveReputation(targetUserId, giverUserId) {
    if (!canGiveReputation(giverUserId)) {
        return { success: false, message: 'Вы уже выдавали репутацию за последние 24 часа!' };
    }
    
    const repData = loadRepData();
    
    // Инициализируем записи, если их нет
    if (!repData[targetUserId]) {
        repData[targetUserId] = { reputation: 0, receivedFrom: {} };
    }
    
    if (!repData[giverUserId]) {
        repData[giverUserId] = { reputation: 0, receivedFrom: {} };
    }
    
    // Увеличиваем репутацию целевого пользователя
    repData[targetUserId].reputation += 1;
    
    // Отмечаем, что репутацию выдал именно этот пользователь
    repData[targetUserId].receivedFrom[giverUserId] = new Date().toISOString();
    
    // Обновляем время последней выдачи репутации
    repData[giverUserId].lastGiven = new Date().toISOString();
    
    saveRepData(repData);
    
    return {
        success: true,
        newReputation: repData[targetUserId].reputation,
        message: `Репутация выдана пользователю!`
    };
}

// Получение репутации пользователя
function getReputation(userId) {
    const repData = loadRepData();
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
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

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
        
        // Проверяем, что пользователь не пытается выдать репутацию боту
        if (targetUser.bot) {
            const botRepEmbed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Вы не можете выдать репутацию боту!')
                .setColor('#ff0000')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [botRepEmbed], ephemeral: true });
        }
        
        // Проверяем, может ли пользователь выдать репутацию
        if (!canGiveReputation(giverUser.id)) {
            const repData = loadRepData();
            const lastGiven = new Date(repData[giverUser.id]?.lastGiven);
            const nextRep = new Date(lastGiven);
            nextRep.setDate(nextRep.getDate() + 1); // Следующая репутация завтра
            
            const timeUntilNext = nextRep - Date.now();
            const hours = Math.floor(timeUntilNext / (1000 * 60));
            const minutes = Math.floor((timeUntilNext % (100 * 60)) / (1000 * 60));
            
            const cooldownEmbed = new EmbedBuilder()
                .setTitle('⏰ Ожидание')
                .setDescription(`Вы уже выдавали репутацию за последние 24 часа!\nСледующая возможность через ${hours}ч ${minutes}м`)
                .setColor('#ffa500')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
        }
        
        try {
            // Выдаем репутацию
            const result = giveReputation(targetUser.id, giverUser.id);
            
            if (result.success) {
                // Обновляем прогресс квестов на использование репутации
                try {
                    require('./System/userProfiles').updateQuestProgressByType(giverUser.id, 'rep', 1);
                    require('./System/userProfiles').updateQuestProgressByType(targetUser.id, 'rep_received', 1);
                } catch (questError) {
                    console.error('Ошибка при обновлении прогресса квеста на репутацию:', questError);
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
                    console.log(`Не удалось отправить уведомление пользователю ${targetUser.tag}`);
                }
                
                // Если пользователь состоит в гильдии, добавляем опыт гильдии
                const userGuild = require('./System/guildSystem').getUserGuild(targetUser.id);
                if (userGuild) {
                    require('./System/guildSystem').addGuildExperience(userGuild.id, 1); // 1 очко опыта за репутацию
                }
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Ошибка')
                    .setDescription(result.message)
                    .setColor('#ff0000')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
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

module.exports.checkrep = {
    data: new SlashCommandBuilder()
        .setName('checkrep')
        .setDescription('Проверить репутацию пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, чью репутацию хотите проверить')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        
        const userRep = getReputation(targetUser.id);
        
        const repEmbed = new EmbedBuilder()
            .setTitle(`🌟 Репутация ${targetUser.username}`)
            .setDescription(`Количество репутации: **${userRep}**`)
            .setColor('#8b00ff')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp();
        
        await interaction.reply({ embeds: [repEmbed] });
    }
};