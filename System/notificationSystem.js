const { EmbedBuilder, DMChannel } = require('discord.js');
const { getUserProfile } = require('./userProfiles');

// Система уведомлений для бота Aurora

class NotificationSystem {
    constructor(client) {
        this.client = client;
        this.notificationsQueue = new Map(); // Очередь уведомлений
    }

    // Отправить уведомление пользователю
    async sendNotification(userId, title, description, color = '#8b00ff', fields = []) {
        try {
            const user = await this.client.users.fetch(userId);
            if (!user) {
                console.log(`[УВЕДОМЛЕНИЯ] Пользователь ${userId} не найден`);
                return false;
            }

            // Проверяем настройки уведомлений пользователя
            const userProfile = getUserProfile(userId);
            if (!userProfile || !userProfile.settings || !userProfile.settings.notifications) {
                console.log(`[УВЕДОМЛЕНИЯ] Не найдены настройки уведомлений для пользователя ${userId}`);
                return false;
            }

            // Создаем embed для уведомления
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(color)
                .setTimestamp()
                .setFooter({ 
                    text: 'Aurora Bot - Уведомления', 
                    iconURL: this.client.user?.displayAvatarURL() || undefined 
                });

            if (fields.length > 0) {
                embed.addFields(fields);
            }

            // Отправляем уведомление в ЛС
            await user.send({ embeds: [embed] });
            console.log(`[УВЕДОМЛЕНИЯ] Уведомление отправлено пользователю ${user.username} (${userId})`);
            return true;
        } catch (error) {
            console.error(`[УВЕДОМЛЕНИЯ] Ошибка при отправке уведомления пользователю ${userId}:`, error.message);
            return false;
        }
    }

    // Отправить уведомление о выполнении квеста
    async sendQuestNotification(userId, quest) {
        const userProfile = getUserProfile(userId);
        if (!userProfile || !userProfile.settings?.notifications?.quests) {
            // Уведомления о квестах отключены
            return false;
        }

        const title = '🎯 Квест выполнен!';
        const description = `Поздравляем! Вы выполнили квест: **${quest.name}**\n\n${quest.description}`;
        const fields = [
            { name: 'Награда', value: `${quest.reward.points || 0} очков`, inline: true },
            { name: 'Тип', value: this.getQuestTypeText(quest.type), inline: true }
        ];

        return await this.sendNotification(userId, title, description, '#f1c40f', fields);
    }

    // Отправить уведомление о повышении уровня
    async sendLevelUpNotification(userId, newLevel) {
        const userProfile = getUserProfile(userId);
        if (!userProfile || !userProfile.settings?.notifications?.level) {
            // Уведомления о уровне отключены
            return false;
        }

        const title = '🆙 Повышение уровня!';
        const description = `Поздравляем! Вы достигли **${newLevel} уровня**!`;
        const fields = [
            { name: 'Новый уровень', value: newLevel.toString(), inline: true }
        ];

        return await this.sendNotification(userId, title, description, '#9b59b6', fields);
    }

    // Отправить уведомление о получении репутации
    async sendReputationNotification(userId, fromUser, amount = 1) {
        const userProfile = getUserProfile(userId);
        if (!userProfile || !userProfile.settings?.notifications?.rep) {
            // Уведомления о репутации отключены
            return false;
        }

        const title = '⭐ Репутация';
        const description = `Пользователь <@${fromUser}> повысил вашу репутацию!`;
        const fields = [
            { name: 'Повышено на', value: amount.toString(), inline: true }
        ];

        return await this.sendNotification(userId, title, description, '#3498db', fields);
    }

    // Отправить уведомление о событии
    async sendEventNotification(userId, eventName, eventDescription) {
        const userProfile = getUserProfile(userId);
        if (!userProfile || !userProfile.settings?.notifications?.events) {
            // Уведомления о событиях отключены
            return false;
        }

        const title = `🎊 ${eventName}`;
        const description = eventDescription;

        return await this.sendNotification(userId, title, description, '#e91e63');
    }

    // Вспомогательная функция для получения текстового описания типа квеста
    getQuestTypeText(questType) {
        const typeMap = {
            'message': 'Сообщения',
            'command': 'Команды',
            'daily': 'Ежедневные',
            'purchase': 'Покупки',
            'level': 'Уровень',
            'rep': 'Репутация',
            'guild': 'Гильдия',
            'event': 'События'
        };
        
        return typeMap[questType] || questType;
    }

    // Добавить уведомление в очередь (для будущего использования)
    addNotificationToQueue(userId, notificationData) {
        if (!this.notificationsQueue.has(userId)) {
            this.notificationsQueue.set(userId, []);
        }
        
        const queue = this.notificationsQueue.get(userId);
        queue.push({
            ...notificationData,
            timestamp: Date.now()
        });
    }

    // Получить количество уведомлений в очереди для пользователя
    getQueueSize(userId) {
        return this.notificationsQueue.has(userId) ? this.notificationsQueue.get(userId).length : 0;
    }

    // Очистить очередь уведомлений для пользователя
    clearQueue(userId) {
        this.notificationsQueue.delete(userId);
    }
    
    // Отправить уведомление о событии сервера
    async sendServerEventNotification(guildId, eventName, eventDescription, userId = null) {
        // Получаем всех участников гильдии
        let members;
        try {
            const guild = await this.client.guilds.fetch(guildId);
            members = await guild.members.fetch();
        } catch (error) {
            console.error(`[УВЕДОМЛЕНИЯ] Ошибка при получении участников гильдии ${guildId}:`, error.message);
            return false;
        }
        
        let sentCount = 0;
        const failedSends = [];
        
        // Отправляем уведомление каждому участнику (или определенному пользователю)
        for (const member of members.values()) {
            // Пропускаем ботов
            if (member.user.bot) continue;
            
            // Если указан конкретный userId, отправляем только ему
            if (userId && member.id !== userId) continue;
            
            // Проверяем настройки уведомлений пользователя
            const userProfile = getUserProfile(member.id);
            if (!userProfile || !userProfile.settings?.notifications?.events) {
                // Уведомления о событиях отключены для этого пользователя
                continue;
            }
            
            const success = await this.sendEventNotification(member.id, eventName, eventDescription);
            if (success) {
                sentCount++;
            } else {
                failedSends.push(member.id);
            }
        }
        
        console.log(`[УВЕДОМЛЕНИЯ] Уведомления о событии "${eventName}" отправлены ${sentCount} пользователям${failedSends.length > 0 ? `, неудачных отправок: ${failedSends.length}` : ''}`);
        return { sent: sentCount, failed: failedSends.length };
    }
}

module.exports = NotificationSystem;