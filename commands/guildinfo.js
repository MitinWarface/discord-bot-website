const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');
const { getGuild, getGuildMembers, getTopGuilds } = require('../System/guildSystem');
const { getUserProfile } = require('../System/userProfiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guildinfo')
        .setDescription('Показывает информацию о гильдии')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Название гильдии')
                .setRequired(true)),
                
    async execute(interaction) {
        const guildName = interaction.options.getString('name');
        
        // Ищем гильдию по названию
        const guilds = require('../guildData.json');
        let guildId = null;
        
        for (const id in guilds) {
            if (guilds[id].name.toLowerCase() === guildName.toLowerCase()) {
                guildId = id;
                break;
            }
        }
        
        if (!guildId) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription(`Гильдия "${guildName}" не найдена!`)
                .setColor('#ff000')
                .setTimestamp();
                
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        const guildInfo = getGuild(guildId);
        if (!guildInfo) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription(`Гильдия "${guildName}" не найдена!`)
                .setColor('#ff0000')
                .setTimestamp();
                
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        const members = getGuildMembers(guildInfo.id);
        const ownerProfile = getUserProfile(guildInfo.ownerId);
        
        const embed = new EmbedBuilder()
            .setTitle(`🏰 Гильдия: ${guildInfo.name}`)
            .setDescription(guildInfo.description || 'Нет описания')
            .addFields(
                { name: 'Участники', value: `${members.length}`, inline: true },
                { name: 'Уровень', value: `${guildInfo.level}`, inline: true },
                { name: 'Опыт', value: `${guildInfo.xp}`, inline: true },
                { name: 'Лидер', value: `<@${guildInfo.ownerId}>`, inline: true },
                { name: 'Дата создания', value: new Date(guildInfo.createdAt).toLocaleDateString('ru-RU'), inline: true }
            )
            .setColor('#0099ff')
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
};