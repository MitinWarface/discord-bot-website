const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');
const shopItems = require('../shopItems');
const { getUserProfile, updateUserProfile } = require('../System/userProfiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Купить предмет в магазине')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Название предмета для покупки')
                .setRequired(true)),
                
    async execute(interaction) {
        const itemName = interaction.options.getString('item').toLowerCase();
        const userProfile = getUserProfile(interaction.user.id);
        const userPoints = userProfile.points;
        
        // Находим товар по названию
        const item = shopItems.find(i => 
            i.name.toLowerCase().includes(itemName) || 
            i.id === itemName
        );
        
        if (!item) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription(`Товар "${itemName}" не найден в магазине!`)
                .setColor('#ff0000')
                .setTimestamp();
                
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        // Проверяем, достаточно ли очков у пользователя
        if (userPoints < item.price) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Недостаточно очков')
                .setDescription(`Вам не хватает **${item.price - userPoints}** очков для покупки "${item.name}"`)
                .setColor('#ff000')
                .setTimestamp();
                
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        // Вычитаем стоимость товара из очков пользователя
        const newPoints = userPoints - item.price;
        
        // Обновляем инвентарь пользователя
        const userInventory = userProfile.inventory || [];
        userInventory.push({
            id: item.id,
            name: item.name,
            type: item.type,
            effect: item.effect,
            purchasedAt: new Date().toISOString()
        });
        
        // Обновляем профиль пользователя
        updateUserProfile(interaction.user.id, {
            points: newPoints,
            inventory: userInventory
        });
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Покупка успешна')
            .setDescription(`Вы купили **${item.name}** за **${item.price}** очков!`)
            .addFields(
                { name: 'Описание', value: item.description, inline: false },
                { name: 'Очки после покупки', value: newPoints.toString(), inline: true }
            )
            .setColor('#00ff00')
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
};