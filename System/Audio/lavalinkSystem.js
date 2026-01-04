// Полнофункциональная музыкальная система с использованием lavalink-client
const { EmbedBuilder } = require('discord.js');
const { LavalinkManager, Track } = require('lavalink-client');

// Глобальные переменные для хранения клиента и менеджера плееров
let lavalinkClient = null;
let playerManager = null;

// Хранилище для очередей музыки
const musicQueue = new Map();

class PlayerManager {
    constructor(lavalink) {
        this.lavalink = lavalink;
        this.players = new Map();
    }

    createPlayer(guildId) {
        const player = this.lavalink.createPlayer({
            guildId: guildId,
            deafen: true,
            volume: 100,
        });
        this.players.set(guildId, player);
        return player;
    }

    getPlayer(guildId) {
        return this.players.get(guildId);
    }

    destroyPlayer(guildId) {
        const player = this.players.get(guildId);
        if (player) {
            player.destroy();
            this.players.delete(guildId);
        }
    }

    getAllPlayers() {
        return this.players;
    }
}

async function initializeLavalink(client, lavalinkFullConfig) {
    console.log('[Lavalink] Инициализация системы...');
    
    try {
        // Создаем клиент Lavalink
        lavalinkClient = new LavalinkManager({
            nodes: lavalinkFullConfig.nodes,
            sendToShard: (guildId, payload) => {
                const guild = client.guilds.cache.get(guildId);
                if (guild) {
                    guild.shard.send(payload);
                }
            },
            defaultSearchPlatform: 'youtube',
            playerOptions: {
                volumeDecrementer: 0.75,
                // Отключаем нормализацию громкости
                // muteManager: false,
            },
            queueOptions: {
                maxPreviousTracks: 25,
            },
        });

        // Инициализируем менеджер плееров
        playerManager = new PlayerManager(lavalinkClient);
        
        // Обработчики событий
        lavalinkClient.on('nodeConnect', (node) => {
            console.log(`[Lavalink] Подключен к узлу: ${node.id}`);
        });

        lavalinkClient.on('nodeReconnect', (node) => {
            console.log(`[Lavalink] Переподключение к узлу: ${node.id}`);
        });

        lavalinkClient.on('nodeDisconnect', (node, reason) => {
            console.log(`[Lavalink] Отключен от узла: ${node.id}`, reason);
        });

        lavalinkClient.on('nodeError', (node, error) => {
            console.error(`[Lavalink] Ошибка узла ${node.id}:`, error);
        });

        // Обработчик события начала воспроизведения трека
        lavalinkClient.on('trackStart', (player, track) => {
            console.log(`[Lavalink] Началось воспроизведение трека: ${track.info.title}`);
            
            // Отправляем сообщение о начале воспроизведения
            const textChannel = client.channels.cache.get(player.textChannelId);
            if (textChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('🎵 Воспроизведение началось')
                    .setDescription(`Сейчас играет: **${track.info.title}**`)
                    .setURL(track.info.uri)
                    .setThumbnail(track.info.artworkUrl)
                    .addFields(
                        { name: 'Автор', value: track.info.author, inline: true },
                        { name: 'Длительность', value: formatTime(track.info.length), inline: true },
                        { name: 'Запрошено', value: `<@${track.requester}>`, inline: false }
                    )
                    .setColor('#8b00ff')
                    .setTimestamp();
                
                textChannel.send({ embeds: [embed] }).catch(console.error);
            }
        });

        // Обработчик события завершения воспроизведения трека
        lavalinkClient.on('trackEnd', (player, track, reason) => {
            console.log(`[Lavalink] Завершено воспроизведение трека: ${track.info.title}, причина: ${reason}`);
            
            // Если трек завершился нормально, а не из-за остановки, пропуска или ошибки
            if (reason === 'FINISHED') {
                // Получаем очередь для гильдии
                const queue = musicQueue.get(player.guildId);
                if (queue && queue.tracks.length > 0) {
                    // Если включена опция loop (повтор), добавляем трек обратно в очередь
                    if (queue.loop) {
                        queue.tracks.push(track);
                    }
                    
                    // Воспроизводим следующий трек
                    playNextTrack(player.guildId);
                } else {
                    // Если очередь пуста, отключаемся от голосового канала
                    setTimeout(() => {
                        const currentPlayer = playerManager.getPlayer(player.guildId);
                        if (currentPlayer && currentPlayer.playing) {
                            // Проверяем, все ли участники в голосовом канале
                            const voiceChannel = client.channels.cache.get(currentPlayer.voiceChannelId);
                            if (voiceChannel && voiceChannel.members.size <= 1) {
                                // Только бот, отключаемся
                                stop(player.guildId);
                            }
                        }
                    }, 60000); // Отключаемся через 1 минуту, если очередь пуста
                }
            }
        });

        // Обработчик ошибок трека
        lavalinkClient.on('trackError', (player, track, error) => {
            console.error(`[Lavalink] Ошибка воспроизведения трека: ${track.info.title}`, error);
            
            const textChannel = client.channels.cache.get(player.textChannelId);
            if (textChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Ошибка воспроизведения')
                    .setDescription(`Ошибка при воспроизведении: **${track.info.title}**`)
                    .addFields(
                        { name: 'Ошибка', value: error.message.substring(0, 1024), inline: false }
                    )
                    .setColor('#ff000')
                    .setTimestamp();
                
                textChannel.send({ embeds: [embed] }).catch(console.error);
            }
            
            // Пробуем воспроизвести следующий трек
            const queue = musicQueue.get(player.guildId);
            if (queue && queue.tracks.length > 0) {
                playNextTrack(player.guildId);
            }
        });

        // Обработчик события изменения состояния плеера
        lavalinkClient.on('playerUpdate', (player, event) => {
            console.log(`[Lavalink] Обновление состояния плеера для гильдии ${player.guildId}`);
        });

        console.log('[Lavalink] Система инициализирована');
        return lavalinkClient;
    } catch (error) {
        console.error('[Lavalink] Ошибка при инициализации:', error);
        throw error;
    }
}

// Функция для проверки инициализации Lavalink
function isLavalinkReady() {
    return !!lavalinkClient;
}

// Функция для получения детальной информации о состоянии Lavalink
function getLavalinkStatus() {
    if (!lavalinkClient) {
        return {
            lavalink: false,
            nodes: 0,
            connectedNodes: 0,
            hasNodes: false,
            ready: false
        };
    }

    const nodes = lavalinkClient.nodes;
    const connectedNodes = Array.from(nodes.values()).filter(node => node.connected);

    return {
        lavalink: !!lavalinkClient,
        nodes: nodes.size,
        connectedNodes: connectedNodes.length,
        hasNodes: nodes.size > 0,
        ready: isLavalinkReady(),
        nodeDetails: Array.from(nodes.values()).map(node => ({
            id: node.id,
            connected: node.connected,
            ping: node.ping || 0
        }))
    };
}

// Подключение к голосовому каналу
function connectToVoiceChannel(interaction) {
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
        return { success: false, message: 'Вы должны быть в голосовом канале, чтобы использовать эту команду!' };
    }

    return { success: true, voiceChannel, memberId: interaction.member.id };
}

// Функция форматирования времени
function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

// Функция для поиска трека
async function searchTrack(query) {
    try {
        // Проверяем, является ли запрос ссылкой
        if (query.startsWith('http')) {
            // Прямая ссылка
            const result = await lavalinkClient.search(query, { requester: 'System' });
            return result;
        } else {
            // Поиск по названию
            const result = await lavalinkClient.search(query, { requester: 'System' });
            return result;
        }
    } catch (error) {
        console.error('Ошибка при поиске трека:', error);
        throw error;
    }
}

// Воспроизведение следующего трека в очереди
async function playNextTrack(guildId) {
    try {
        const queue = musicQueue.get(guildId);
        if (!queue || !queue.tracks.length) {
            // Очередь пуста, останавливаем воспроизведение
            const player = playerManager.getPlayer(guildId);
            if (player) {
                player.stop();
                // Удаляем очередь
                musicQueue.delete(guildId);
            }
            return;
        }

        // Получаем первый трек из очереди
        const track = queue.tracks.shift();
        const player = playerManager.getPlayer(guildId);

        if (player) {
            // Устанавливаем текстовый канал для плеера
            player.textChannelId = queue.textChannel.id;
            player.voiceChannelId = queue.voiceChannel.id;

            // Воспроизводим трек
            await player.play(track);
        }
    } catch (error) {
        console.error('Ошибка при воспроизведении следующего трека:', error);
    }
}

// Воспроизведение трека
async function playTrack(interaction, query, shuffle = false) {
    console.log(`[Lavalink] Попытка воспроизвести трек: ${query} для гильдии ${interaction.guild.id}`);
    const startTime = Date.now();
    try {
        // Проверяем, инициализирован ли Lavalink
        if (!isLavalinkReady()) {
            console.log('DEBUG: Lavalink не готов. Состояние:', getLavalinkStatus());
            return { success: false, message: 'Музыкальная система временно недоступна!' };
        }

        const connectionResult = connectToVoiceChannel(interaction);

        if (!connectionResult.success) {
            return connectionResult;
        }

        // Поиск трека
        let searchResult;
        try {
            searchResult = await searchTrack(query);
        } catch (searchError) {
            console.error('Ошибка при поиске трека:', searchError);
            return { success: false, message: 'Ошибка при поиске трека. Пожалуйста, попробуйте позже.' };
        }

        if (!searchResult || !searchResult.tracks || searchResult.tracks.length === 0) {
            return { success: false, message: 'Трек не найден!' };
        }

        // Выбираем первый трек из результата поиска
        const track = searchResult.tracks[0];
        if (!track) {
            return { success: false, message: 'Не удалось получить трек из результатов поиска.' };
        }

        track.requester = interaction.user.id; // Устанавливаем requester

        // Получаем существующую очередь или создаем новую
        let queue = musicQueue.get(interaction.guild.id);
        if (!queue) {
            queue = {
                tracks: [],
                voiceChannel: connectionResult.voiceChannel,
                loop: false,
                volume: 100, // Исправляем начальный уровень громкости
                textChannel: interaction.channel
            };

            musicQueue.set(interaction.guild.id, queue);
        }

        // Проверяем максимальный размер очереди
        const maxQueueSize = parseInt(process.env.MAX_QUEUE_SIZE) || 100;
        if (queue.tracks.length >= maxQueueSize) {
            return { success: false, message: `Очередь достигла максимального размера (${maxQueueSize})!` };
        }

        // Добавляем трек в очередь
        queue.tracks.push(track);
        if (shuffle) {
            // Перемешиваем очередь, но оставляем первый трек на месте если очередь была пуста
            if (queue.tracks.length > 1) {
                // Сохраняем первый элемент
                const firstTrack = queue.tracks.shift();
                // Перемешиваем остальные
                for (let i = queue.tracks.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [queue.tracks[i], queue.tracks[j]] = [queue.tracks[j], queue.tracks[i]];
                }
                // Возвращаем первый элемент обратно
                queue.tracks.unshift(firstTrack);
            }
        }

        musicQueue.set(interaction.guild.id, queue);

        // Получаем или создаем плеер
        let player = playerManager ? playerManager.getPlayer(interaction.guild.id) : null;
        if (!player) {
            if (!playerManager) {
                console.error('PlayerManager не инициализирован');
                return { success: false, message: 'Система воспроизведения не готова. Пожалуйста, повторите попытку позже.' };
            }
            player = playerManager.createPlayer(interaction.guild.id);
        }

        // Подключаемся к голосовому каналу если еще не подключены
        if (!player.voiceChannelId) {
            try {
                await player.connect(connectionResult.voiceChannel.id, { deaf: true });
                player.setVolume(queue.volume);
            } catch (connectionError) {
                console.error('Ошибка подключения к голосовому каналу:', connectionError);
                // Удаляем созданную очередь, если не удалось подключиться
                musicQueue.delete(interaction.guild.id);
                return { success: false, message: 'Не удалось подключиться к голосовому каналу.' };
            }
        }

        // Устанавливаем текстовый канал
        player.textChannelId = interaction.channel.id;
        player.voiceChannelId = connectionResult.voiceChannel.id;

        // Если это первый трек в очереди, начинаем воспроизведение
        if (queue.tracks.length === 1) {
            await playNextTrack(interaction.guild.id);
        }

        return {
            success: true,
            track: track,
            message: `Трек добавлен в очередь: **${track.info.title}**`
        };
    } catch (error) {
        console.error('Критическая ошибка при воспроизведении трека:', error);
        // В случае критической ошибки удаляем очередь, чтобы избежать проблем
        musicQueue.delete(interaction.guild.id);
        const duration = Date.now() - startTime;
        console.log(`[Lavalink] Ошибка воспроизведения завершена за ${duration}мс`);
        return { success: false, message: 'Произошла критическая ошибка при попытке воспроизвести трек!' };
    }
    const duration = Date.now() - startTime;
    console.log(`[Lavalink] Воспроизведение трека завершено за ${duration}мс`);
}

// Получение очереди треков
function getQueue(guildId) {
    try {
        const queue = musicQueue.get(guildId);
        if (!queue) {
            return { tracks: [], loop: false, volume: 100, voiceChannel: null, textChannel: null };
        }
        return queue;
    } catch (error) {
        console.error('Ошибка при получении очереди:', error);
        return { tracks: [], loop: false, volume: 100, voiceChannel: null, textChannel: null };
    }
}

// Пропуск трека
async function skipTrack(guildId) {
    console.log(`[Lavalink] Попытка пропустить трек для гильдии ${guildId}`);
    const startTime = Date.now();
    try {
        if (!playerManager) {
            console.error('PlayerManager не инициализирован');
            return { success: false, message: 'Система воспроизведения не готова.' };
        }

        const queue = musicQueue.get(guildId);
        if (!queue || !queue.tracks.length) {
            return { success: false, message: 'Очередь пуста!' };
        }

        const player = playerManager.getPlayer(guildId);
        if (player) {
            try {
                // Останавливаем текущий трек, что приведет к воспроизведению следующего
                await player.stop();
            } catch (playerError) {
                console.error('Ошибка при остановке плеера:', playerError);
                // Продолжаем выполнение, даже если возникла ошибка с плеером
            }
        }

        // Возвращаем результат
        if (queue.tracks.length > 0) {
            const skippedTrack = queue.tracks[0]; // Трек, который был пропущен
            return {
                success: true,
                track: skippedTrack,
                message: `Пропущен трек: **${skippedTrack.info.title}**`
            };
        } else {
            // Если в очереди больше нет треков
            musicQueue.delete(guildId);

            return {
                success: true,
                track: null,
                message: 'Воспроизведение остановлено.'
            };
        }
    } catch (error) {
        console.error('Критическая ошибка при пропуске трека:', error);
        const duration = Date.now() - startTime;
        console.log(`[Lavalink] Ошибка пропуска трека завершена за ${duration}мс`);
        return { success: false, message: 'Произошла критическая ошибка при попытке пропустить трек!' };
    }
    const duration = Date.now() - startTime;
    console.log(`[Lavalink] Пропуск трека завершен за ${duration}мс`);
}

// Остановка воспроизведения
async function stop(guildId) {
    console.log(`[Lavalink] Попытка остановить воспроизведение для гильдии ${guildId}`);
    const startTime = Date.now();
    try {
        if (!playerManager) {
            console.error('PlayerManager не инициализирован');
            return { success: false, message: 'Система воспроизведения не готова.' };
        }

        const queue = musicQueue.get(guildId);
        if (!queue) {
            return { success: false, message: 'Нет активной очереди!' };
        }

        const player = playerManager.getPlayer(guildId);
        if (player) {
            try {
                // Останавливаем воспроизведение
                await player.stop();
                // Отключаемся от голосового канала
                await player.disconnect();
                // Уничтожаем плеер
                playerManager.destroyPlayer(guildId);
            } catch (playerError) {
                console.error('Ошибка при остановке плеера:', playerError);
                // Продолжаем выполнение, даже если произошла ошибка с плеером
            }
        }

        // Очищаем очередь
        musicQueue.delete(guildId);

        return { success: true, message: 'Воспроизведение остановлено и очередь очищена!' };
    } catch (error) {
        console.error('Критическая ошибка при остановке воспроизведения:', error);
        // Удаляем очередь в любом случае, чтобы избежать проблем
        musicQueue.delete(guildId);
        const duration = Date.now() - startTime;
        console.log(`[Lavalink] Ошибка остановки воспроизведения завершена за ${duration}мс`);
        return { success: false, message: 'Произошла критическая ошибка при остановке воспроизведения!' };
    }
    const duration = Date.now() - startTime;
    console.log(`[Lavalink] Остановка воспроизведения завершена за ${duration}мс`);
}

// Пауза
async function pause(guildId) {
    console.log(`[Lavalink] Попытка поставить на паузу воспроизведение для гильдии ${guildId}`);
    const startTime = Date.now();
    try {
        if (!playerManager) {
            console.error('PlayerManager не инициализирован');
            return { success: false, message: 'Система воспроизведения не готова.' };
        }

        const player = playerManager.getPlayer(guildId);
        if (!player) {
            return { success: false, message: 'Нет активного плеера!' };
        }

        await player.pause(true);
        return { success: true, message: 'Воспроизведение приостановлено!' };
    } catch (error) {
        console.error('Ошибка при паузе:', error);
        const duration = Date.now() - startTime;
        console.log(`[Lavalink] Ошибка паузы завершена за ${duration}мс`);
        return { success: false, message: 'Произошла ошибка при попытке приостановить воспроизведение!' };
    }
    const duration = Date.now() - startTime;
    console.log(`[Lavalink] Пауза завершена за ${duration}мс`);
}

// Возобновление
async function resume(guildId) {
    console.log(`[Lavalink] Попытка возобновить воспроизведение для гильдии ${guildId}`);
    const startTime = Date.now();
    try {
        if (!playerManager) {
            console.error('PlayerManager не инициализирован');
            return { success: false, message: 'Система воспроизведения не готова.' };
        }

        const player = playerManager.getPlayer(guildId);
        if (!player) {
            return { success: false, message: 'Нет активного плеера!' };
        }

        await player.pause(false);
        return { success: true, message: 'Воспроизведение возобновлено!' };
    } catch (error) {
        console.error('Ошибка при возобновлении:', error);
        const duration = Date.now() - startTime;
        console.log(`[Lavalink] Ошибка возобновления завершена за ${duration}мс`);
        return { success: false, message: 'Произошла ошибка при попытке возобновить воспроизведение!' };
    }
    const duration = Date.now() - startTime;
    console.log(`[Lavalink] Возобновление завершено за ${duration}мс`);
}

// Изменение громкости
async function setVolume(guildId, volume) {
    console.log(`[Lavalink] Попытка изменить громкость для гильдии ${guildId} на ${volume}%`);
    const startTime = Date.now();
    try {
        if (!playerManager) {
            console.error('PlayerManager не инициализирован');
            return { success: false, message: 'Система воспроизведения не готова.' };
        }

        const queue = musicQueue.get(guildId);
        if (!queue) {
            return { success: false, message: 'Нет активной очереди!' };
        }

        // Ограничиваем громкость диапазоном 0-150
        const volumeLevel = Math.min(150, Math.max(0, volume));

        const player = playerManager.getPlayer(guildId);
        if (player) {
            try {
                await player.setVolume(volumeLevel);
            } catch (playerError) {
                console.error('Ошибка при изменении громкости плеера:', playerError);
                // Продолжаем выполнение, даже если возникла ошибка с плеером
            }
        }

        queue.volume = volumeLevel;
        musicQueue.set(guildId, queue);

        return { success: true, message: `Громкость установлена на ${volumeLevel}%` };
    } catch (error) {
        console.error('Критическая ошибка при изменении громкости:', error);
        const duration = Date.now() - startTime;
        console.log(`[Lavalink] Ошибка изменения громкости завершена за ${duration}мс`);
        return { success: false, message: 'Произошла критическая ошибка при попытке изменить громкость!' };
    }
    const duration = Date.now() - startTime;
    console.log(`[Lavalink] Изменение громкости завершено за ${duration}мс`);
}

// Переключение режима loop
function toggleLoop(guildId) {
    try {
        const queue = musicQueue.get(guildId);

        if (!queue) {
            return { success: false, message: 'Нет активной очереди!' };
        }

        queue.loop = !queue.loop;
        musicQueue.set(guildId, queue);

        return {
            success: true,
            message: `Режим повтора ${queue.loop ? 'включен' : 'выключен'}!`
        };
    } catch (error) {
        console.error('Ошибка при переключении режима loop:', error);
        return { success: false, message: 'Произошла ошибка при переключении режима повтора!' };
    }
}

module.exports = {
    initializeLavalink,
    playTrack,
    getQueue,
    skipTrack,
    stop,
    pause,
    resume,
    setVolume,
    toggleLoop,
    connectToVoiceChannel,
    lavalinkClient: () => lavalinkClient,
    playerManager: () => playerManager,
    getLavalinkStatus
};