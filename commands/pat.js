const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pat')
        .setDescription('Погладить пользователя с милой гифкой')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, которого хотите погладить')
                .setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        
        // Проверяем, что пользователь не пытается погладить самого себя
        if (user.id === interaction.user.id) {
            const selfPatEmbed = new EmbedBuilder()
                .setTitle('👋 Поглаживания себя')
                .setDescription(`<@${interaction.user.id}> поглаживает себя... немного странно, но ладно!`)
                .setColor('#90EE90')
                .setImage('https://media.tenor.com/P2t3HXfpPhAAAAAC/pats-head-pat.gif'); // GIF для само-поглаживания
            
            return await interaction.reply({ embeds: [selfPatEmbed] });
        }

        try {
            // Список гифок для поглаживания
            const patGifs = [
                'https://media.tenor.com/uPmMgaLXMikAAAAC/head-pat-anime.gif',
                'https://media.tenor.com/UBWJT7LEN6UAAAAC/pats-head-pat.gif',
                'https://media.tenor.com/rPH_iE28dtYAAAAC/head-pat-pat.gif',
                'https://media.tenor.com/0vKVrz7nmWMAAAAC/anime-pat.gif',
                'https://media.tenor.com/0h3kq4w66O0AAAAC/head-pat-pat.gif',
                'https://media.tenor.com/Xh8sm0s4oXMAAAAC/head-pats-pat.gif',
                'https://media.tenor.com/ZrNUm0y4TBIAAAAC/head-pat-pat.gif',
                'https://media.tenor.com/DK838qpk50AAAAAC/pat-head.gif'
            ];
            
            // Выбираем случайную гифку
            const randomPatGif = patGifs[Math.floor(Math.random() * patGifs.length)];
            
            const embed = new EmbedBuilder()
                .setTitle('👋 Поглаживание')
                .setDescription(`<@${interaction.user.id}> поглаживает <@${user.id}>!`)
                .setColor('#90EE90')
                .setImage(randomPatGif)
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Ошибка при выполнении команды pat:', error);
            
            // В случае ошибки отправляем стандартное сообщение
            const fallbackEmbed = new EmbedBuilder()
                .setTitle('👋 Поглаживание')
                .setDescription(`<@${interaction.user.id}> поглаживает <@${user.id}>!`)
                .setColor('#90EE90')
                .setImage('https://media.tenor.com/UBWJT7LEN6UAAAAC/pats-head-pat.gif'); // Резервная гифка
            
            await interaction.reply({ embeds: [fallbackEmbed] });
        }
    }
};