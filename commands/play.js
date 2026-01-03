const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { playTrack, getQueue, skipTrack, stop, pause, resume, setVolume, toggleLoop } = require('../System/Audio/lavalinkSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Воспроизводит музыку из YouTube')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Название трека или ссылка на YouTube')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('shuffle')
                .setDescription('Добавить трек в случайное место в очереди')
                .setRequired(false)),
    
    async execute(interaction) {
        const query = interaction.options.getString('query');
        const shuffle = interaction.options.getBoolean('shuffle') || false;
        
        // Проверяем, что пользователь находится в голосовом канале
        if (!interaction.member.voice.channel) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Вы должны быть в голосовом канале, чтобы использовать эту команду!')
                .setColor('#ff0000')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        try {
            // Воспроизводим трек
            const result = await playTrack(interaction, query, shuffle);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('🎵 Воспроизведение')
                    .setDescription(result.message)
                    .setColor('#8b00ff')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Ошибка')
                    .setDescription(result.message)
                    .setColor('#ff0000')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error) {
            console.error('Ошибка при воспроизведении трека:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при попытке воспроизвести трек.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};

module.exports.skip = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Пропустить текущий трек')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        try {
            const result = await skipTrack(guildId);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('⏭️ Трек пропущен')
                    .setDescription(result.message)
                    .setColor('#8b00ff')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Ошибка')
                    .setDescription(result.message)
                    .setColor('#ff0000')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error) {
            console.error('Ошибка при пропуске трека:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при попытке пропустить трек.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};

module.exports.stop = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Остановить воспроизведение и очистить очередь')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        try {
            const result = await stop(guildId);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('⏹️ Воспроизведение остановлено')
                    .setDescription(result.message)
                    .setColor('#8b00ff')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Ошибка')
                    .setDescription(result.message)
                    .setColor('#ff0000')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error) {
            console.error('Ошибка при остановке воспроизведения:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при попытке остановить воспроизведение.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};

module.exports.pause = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Приостановить воспроизведение'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        try {
            const result = await pause(guildId);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('⏸️ Воспроизведение приостановлено')
                    .setDescription(result.message)
                    .setColor('#8b00ff')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Ошибка')
                    .setDescription(result.message)
                    .setColor('#ff0000')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error) {
            console.error('Ошибка при паузе воспроизведения:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при попытке приостановить воспроизведение.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};

module.exports.resume = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Возобновить воспроизведение'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        try {
            const result = await resume(guildId);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('▶️ Воспроизведение возобновлено')
                    .setDescription(result.message)
                    .setColor('#8b00ff')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Ошибка')
                    .setDescription(result.message)
                    .setColor('#ff0000')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error) {
            console.error('Ошибка при возобновлении воспроизведения:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при попытке возобновить воспроизведение.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};

module.exports.volume = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Изменить громкость воспроизведения')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Уровень громкости (0-150)')
                .setRequired(true)),

    async execute(interaction) {
        const volume = interaction.options.getInteger('level');
        const guildId = interaction.guild.id;
        
        if (volume < 0 || volume > 150) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Уровень громкости должен быть от 0 до 150.')
                .setColor('#ff0000')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        try {
            const result = await setVolume(guildId, volume);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('🔊 Громкость изменена')
                    .setDescription(result.message)
                    .setColor('#8b00ff')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Ошибка')
                    .setDescription(result.message)
                    .setColor('#ff0000')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error) {
            console.error('Ошибка при изменении громкости:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при попытке изменить громкость.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};

module.exports.queue = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Показать текущую очередь воспроизведения'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const queue = getQueue(guildId);
        
        if (!queue || !queue.tracks || queue.tracks.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('🎵 Очередь воспроизведения')
                .setDescription('Очередь пуста.')
                .setColor('#8b00ff')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed] });
        }
        
        // Показываем первые 10 треков в очереди
        const tracksToShow = queue.tracks.slice(0, 10);
        let queueDescription = '';
        
        for (let i = 0; i < tracksToShow.length; i++) {
            const track = tracksToShow[i];
            const position = i === 0 ? '🎵 Сейчас играет:' : `${i + 1}.`;
            queueDescription += `${position} [${track.title}](${track.uri})\n`;
        }
        
        if (queue.tracks.length > 10) {
            queueDescription += `\n...и еще ${queue.tracks.length - 10} трек(ов)`;
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`🎵 Очередь воспроизведения (${queue.tracks.length} треков)`)
            .setDescription(queueDescription)
            .setColor('#8b00ff')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
};

module.exports.loop = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Включить/выключить повтор очереди'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        try {
            const result = await toggleLoop(guildId);
            
            const embed = new EmbedBuilder()
                .setTitle(result.success ? '🔁 Повтор включен' : '🔁 Повтор выключен')
                .setDescription(result.message)
                .setColor('#8b00ff')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Ошибка при переключении повтора:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Ошибка')
                .setDescription('Произошла ошибка при попытке переключить повтор.')
                .setColor('#ff0000')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};