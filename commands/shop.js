const { 
    SlashCommandBuilder, 
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const shopItems = require('../shopItems');
const { getUserProfile } = require('../System/userProfiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Посетите виртуальный магазин'),
        
    async execute(interaction) {
        const userProfile = getUserProfile(interaction.user.id);
        const userPoints = userProfile.points;
        
        // Создаем Embed с товарами магазина
        const embed = new EmbedBuilder()
            .setTitle('🛒 Виртуальный магазин')
            .setColor('#3498db')
            .setDescription(`Ваши очки: **${userPoints}**\n\nВыберите товар для покупки:`)
            .setTimestamp()
            .setFooter({ text: `Aurora Shop`, iconURL: interaction.client.user.displayAvatarURL() });

        // Добавляем информацию о товарах
        for (const item of shopItems) {
            const affordable = userPoints >= item.price ? '✅' : '❌';
            embed.addFields({
                name: `${affordable} ${item.name} - ${item.price} очков`,
                value: `${item.description}`,
                inline: false
            });
        }

        // Создаем кнопки для покупки товаров
        const rows = [];
        let currentRow = new ActionRowBuilder();
        let buttonCount = 0;

        for (const item of shopItems) {
            if (buttonCount >= 5) { // Максимум 5 кнопок в строке
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
                buttonCount = 0;
            }

            const button = new ButtonBuilder()
                .setCustomId(`buy_${item.id}`)
                .setLabel(item.name)
                .setStyle(userProfile.points >= item.price ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(userProfile.points < item.price);

            currentRow.addComponents(button);
            buttonCount++;
        }

        if (buttonCount > 0) {
            rows.push(currentRow);
        }

        await interaction.reply({ 
            embeds: [embed], 
            components: rows,
            flags: [] 
        });
    },
};