const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { giveReputation, canGiveReputation, getReputation } = require('../System/repSystem');
const { getUserProfile } = require('../System/userProfiles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rep')
        .setDescription('Выдать репутацию пользователю')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, которому хотите выдать репутацию')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const giverUser = interaction.user;

        // Проверяем, что пользователь не пытается выдать репутацию себе
        if (targetUser.id === giverUser.id) {
            return await interaction.reply({ 
                content: 'Вы не можете выдать репутацию самому себе!', 
                ephemeral: true 
            });
        }

        // Проверяем, можно ли выдать репутацию
        if (!canGiveReputation(giverUser.id)) {
            return await interaction.reply({ 
                content: 'Вы уже выдавали репутацию за последние 24 часа! Попробуйте снова завтра.', 
                ephemeral: true 
            });
        }

        // Выдаем репутацию
        const result = giveReputation(targetUser.id, giverUser.id);

        if (result.success) {
            const targetUserProfile = getUserProfile(targetUser.id);
            const newRep = getReputation(targetUser.id);
            
            const embed = new EmbedBuilder()
                .setTitle('Репутация увеличена!')
                .setDescription(`<@${giverUser.id}> увеличил(а) репутацию пользователю <@${targetUser.id}>!`)
                .addFields(
                    { name: 'Новая репутация', value: `${newRep}`, inline: true }
                )
                .setColor('#8b00ff')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({ 
                content: result.message, 
                ephemeral: true 
            });
        }
    }
};