const { 
    SlashCommandBuilder, 
    EmbedBuilder 
} = require('discord.js');
const { getUserProfile } = require('../System/userProfiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Просмотрите свой инвентарь'),
        
    async execute(interaction) {
        const userProfile = getUserProfile(interaction.user.id);
        const inventory = userProfile.inventory || [];
        
        if (inventory.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('🎒 Ваш инвентарь')
                .setColor('#95a5a6')
                .setDescription('Ваш инвентарь пуст. Посетите магазин, чтобы купить что-нибудь!')
                .setTimestamp()
                .setFooter({ text: `Инвентарь`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({ embeds: [embed], flags: ['Ephemeral'] });
            return;
        }
        
        // Группируем предметы по типам и считаем количество
        const itemsCount = {};
        inventory.forEach(item => {
            if (itemsCount[item.id]) {
                itemsCount[item.id].count++;
            } else {
                itemsCount[item.id] = {
                    ...item,
                    count: 1
                };
            }
        });
        
        const embed = new EmbedBuilder()
            .setTitle('🎒 Ваш инвентарь')
            .setColor('#95a5a6')
            .setDescription(`У вас в инвентаре **${inventory.length}** предметов`)
            .setTimestamp()
            .setFooter({ text: `Инвентарь`, iconURL: interaction.user.displayAvatarURL() });

        // Добавляем информацию о каждом уникальном предмете
        for (const itemId in itemsCount) {
            const item = itemsCount[itemId];
            embed.addFields({
                name: `${item.name} ${item.count > 1 ? `×${item.count}` : ''}`,
                value: `${item.description}`,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed], flags: [] });
    },
};