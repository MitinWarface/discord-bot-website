const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kill')
        .setDescription('Убить пользователя с аниме гифкой (в игровой форме)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, которого хотите "убить"')
                .setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        
        // Проверяем, что пользователь не пытается "убить" самого себя
        if (user.id === interaction.user.id) {
            const selfKillEmbed = new EmbedBuilder()
                .setTitle('💀 Самоуничтожение')
                .setDescription(`<@${interaction.user.id}> пытается "убить" самого себя... интересный подход!`)
                .setColor('#800000')
                .setImage('https://media.tenor.com/4VEquAxadKUAAAAC/anime-suicide.gif'); // GIF для самоуничтожения
            
            return await interaction.reply({ embeds: [selfKillEmbed] });
        }

        try {
            // Список "смертельных" гифок (в игровой форме)
            const killGifs = [
                'https://media.tenor.com/6WVFm3DUfVMAAAAC/anime-death.gif',
                'https://media.tenor.com/6kMlczXgY2QAAAAC/anime-kill.gif',
                'https://media.tenor.com/_g1On58DnWYAAAAC/anime-fight.gif',
                'https://media.tenor.com/8m2J-YpmGIUAAAAC/anime-attack.gif',
                'https://media.tenor.com/6kMlczXgY2QAAAAC/anime-kill.gif',
                'https://media.tenor.com/4VEquAxadKUAAAAC/anime-suicide.gif',
                'https://media.tenor.com/7BaN9N8NuXIAAAAC/anime-love-anime.gif',
                'https://media.tenor.com/VCAVnNxuYXQAAAAC/anime-cuddle-hug.gif'
            ];
            
            // Выбираем случайную гифку
            const randomKillGif = killGifs[Math.floor(Math.random() * killGifs.length)];
            
            const embed = new EmbedBuilder()
                .setTitle('💀 Убийство')
                .setDescription(`<@${interaction.user.id}> "убивает" <@${user.id}>!`)
                .setColor('#800000')
                .setImage(randomKillGif)
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Ошибка при выполнении команды kill:', error);
            
            // В случае ошибки отправляем стандартное сообщение
            const fallbackEmbed = new EmbedBuilder()
                .setTitle('💀 Убийство')
                .setDescription(`<@${interaction.user.id}> "убивает" <@${user.id}>!`)
                .setColor('#800000')
                .setImage('https://media.tenor.com/6WVFm3DUfVMAAAAC/anime-death.gif'); // Резервная гифка
            
            await interaction.reply({ embeds: [fallbackEmbed] });
        }
    }
};