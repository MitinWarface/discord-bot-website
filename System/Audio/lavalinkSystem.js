// const { LavalinkManager } = require('lavalink-client');
// const { getUserProfile } = require('../userProfiles');

// // Глобальные переменные для клиента Lavalink и менеджера плееров
// let lavalinkClient;
// let playerManager;

// // Хранилище для очередей музыки
// const musicQueue = new Map();

// class PlayerManager {
//     constructor() {
//         this.players = new Map();
//     }

//     createPlayer(guildId, node) {
//         const player = new Player(node, guildId);
//         this.players.set(guildId, player);
//         return player;
//     }

//     getPlayer(guildId) {
//         return this.players.get(guildId);
//     }

//     destroyPlayer(guildId) {
//         const player = this.players.get(guildId);
//         if (player) {
//             player.destroy();
//             this.players.delete(guildId);
//         }
//     }

//     getAllPlayers() {
//         return this.players;
//     }
// }

// class Player {
//     constructor(node, guildId) {
//         this.node = node;
//         this.guildId = guildId;
//         this.player = null;
//         this.track = null;
//         this.paused = false;
//         this.volume = 100;
//         this.queue = [];
//         this.loop = false;
//         this.textChannel = null;
//     }

//     async connect(voiceChannelId, options = {}) {
//         try {
//             this.player = await this.node.joinVoice({
//                 guildId: this.guildId,
//                 channelId: voiceChannelId,
//                 deaf: options.deaf ?? true,
//                 mute: options.mute ?? false
//             });
//             return this.player;
//         } catch (error) {
//             console.error(`Ошибка подключения к голосовому каналу:`, error);
//             throw error;
//         }
//     }

//     async playTrack(track) {
//         if (!this.player) {
//             throw new Error('Не подключен к голосовому каналу');
//         }

//         this.track = track;
//         await this.player.play({
//             track: track.encoded,
//             volume: this.volume / 100,
//             paused: false
//         });
//     }

//     async stop() {
//         if (this.player) {
//             await this.player.stop();
//         }
//     }

//     async pause(pause = true) {
//         if (this.player) {
//             await this.player.pause(pause);
//             this.paused = pause;
//         }
//     }

//     async setVolume(volume) {
//         if (this.player) {
//             const normalizedVolume = Math.min(150, Math.max(0, volume));
//             await this.player.setVolume(normalizedVolume / 100);
//             this.volume = normalizedVolume;
//         }
//     }

//     async disconnect() {
//         if (this.player) {
//             await this.player.leave();
//             this.player = null;
//         }
//     }

//     destroy() {
//         this.stop().catch(() => {});
//         this.disconnect().catch(() => {});
//         this.track = null;
//         this.queue = [];
//     }
// }

// async function initializeLavalink(client, lavalinkFullConfig) {
//     const { nodes, options } = lavalinkFullConfig;

//     try {
//         console.log('[Lavalink] Получена конфигурация:', { nodes: nodes, options: Object.keys(options || {}) });
        
//         // Проверяем, что nodes - это массив и он не пустой
//         if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
//             throw new Error('Конфигурация узлов Lavalink недействительна или пуста');
//         }

//         console.log(`[Lavalink] Инициализация с ${nodes.length} узлами...`);
//         console.log(`[Lavalink] Узлы:`, nodes.map(node => ({
//             id: node.id,
//             host: node.host,
//             port: node.port,
//             secure: node.secure
//         })));

//         // Создаем новый экземпляр LavalinkManager
//         lavalinkClient = new LavalinkManager({
//             nodes: nodes,
//             sendToShard: (guildId, packet) => {
//                 const guild = client.guilds.cache.get(guildId);
//                 if (guild) {
//                     guild.shard.send(packet);
//                 }
//             },
//             ...options // Распространяем остальные опции из lavalinkFullConfig.options
//         });

//         console.log('[Lavalink] LavalinkManager создан');
//         console.log('[Lavalink] Проверка доступности узлов...');
//         console.log('[Lavalink] lavalinkClient:', !!lavalinkClient);
//         console.log('[Lavalink] lavalinkClient.nodes:', lavalinkClient.nodes);
//         console.log('[Lavalink] lavalinkClient.bestNode:', lavalinkClient.bestNode);
//         console.log('[Lavalink] Тип lavalinkClient.nodes:', typeof lavalinkClient.nodes);
//         console.log('[Lavalink] Есть ли метод values у nodes:', typeof lavalinkClient.nodes?.values);

//         // Обработчики событий Lavalink
//         lavalinkClient
//             .on('nodeConnect', (node) => {
//                 console.log(`[Lavalink] Узел ${node.id} подключен!`);
//                 console.log(`[Lavalink] Узел ${node.id} готов: ${node.connected ? 'Да' : 'Нет'}`);
//                 console.log(`[Lavalink] bestNode теперь:`, lavalinkClient.bestNode ? lavalinkClient.bestNode.id : 'null');
//                 console.log(`[Lavalink] Доступные узлы:`, lavalinkClient.nodes ? Array.from(lavalinkClient.nodes.values()).map(n => ({id: n.id, connected: n.connected})) : 'null');
//             })
//             .on('nodeError', (node, error) => {
//                 console.error(`[Lavalink] Ошибка узла ${node.id}:`, error);
//                 console.error(`[Lavalink] Подробная ошибка:`, error.stack);
//             })
//             .on('nodeClose', (node, code, reason) => {
//                 console.log(`[Lavalink] Узел ${node.id} закрыт (${code}): ${reason}`);
//             })
//             .on('nodeDisconnect', (node, players, moved) => {
//                 console.log(`[Lavalink] Узел ${node.id} отключен, игроков затронуто: ${players.size}, перемещено: ${moved}`);
//             })
//             .on('nodeReconnect', (node) => {
//                 console.log(`[Lavalink] Переподключение узла ${node.id}...`);
//             })
//             .on('nodeCreate', (node) => {
//                 console.log(`[Lavalink] Узел ${node.id} создан`);
//                 console.log(`[Lavalink] Тип узла:`, typeof node);
//                 console.log(`[Lavalink] Свойства узла:`, Object.keys(node || {}));
//             })
//             .on('nodeDestroy', (node) => {
//                 console.log(`[Lavalink] Узел ${node.id} уничтожен`);
//             })
//             .on('nodeConnectError', (node, error) => {
//                 console.error(`[Lavalink] Ошибка подключения узла ${node.id}:`, error);
//                 console.error(`[Lavalink] Подробная ошибка подключения:`, error.stack);
//             });

//         // Инициализируем менеджер плееров
//         playerManager = new PlayerManager();

//         // Ждем подключения узла в течение 10 секунд
//         await new Promise((resolve, reject) => {
//             const timeout = setTimeout(() => {
//                 console.log('[Lavalink] Таймаут ожидания подключения узла');
//                 resolve(); // Резолвим промис, чтобы не блокировать инициализацию
//             }, 10000); // 10 секунд таймаута

//             // Если узел подключается, отменяем таймаут
//             lavalinkClient.on('nodeConnect', () => {
//                 clearTimeout(timeout);
//                 console.log('[Lavalink] Узел подключен, продолжаем выполнение');
//                 resolve();
//             });

//             // Если происходит ошибка подключения, также отменяем таймаут
//             lavalinkClient.on('nodeConnectError', (node, error) => {
//                 clearTimeout(timeout);
//                 console.log('[Lavalink] Ошибка подключения узла, продолжаем выполнение');
//                 resolve();
//             });
//         });

//         console.log('[Lavalink] Инициализация завершена');
//         return lavalinkClient;
//     } catch (error) {
//         console.error('[Lavalink] Ошибка инициализации Lavalink:', error);
//         console.error('[Lavalink] Стек ошибки:', error.stack);
//         throw error;
//     }
// }

// // Функция для проверки инициализации Lavalink
// function isLavalinkReady() {
//     const hasClient = !!lavalinkClient;
//     const hasBestNode = !!(lavalinkClient && lavalinkClient.bestNode);
    
//     // Если есть bestNode, считаем Lavalink готовым
//     if (hasBestNode) {
//         return true;
//     }
    
//     // Если есть клиент, проверяем наличие и состояние узлов
//     if (hasClient) {
//         try {
//             // Проверяем, существуют ли узлы (они могут быть не сразу доступны)
//             if (lavalinkClient.nodes && typeof lavalinkClient.nodes.values === 'function') {
//                 const nodes = Array.from(lavalinkClient.nodes.values());
//                 // Проверяем, есть ли подключенные узлы
//                 const connectedNodes = nodes.filter(node => node && node.connected);
//                 return connectedNodes.length > 0;
//             } else {
//                 // Если узлы еще не доступны, возможно инициализация еще не завершена
//                 return false;
//             }
//         } catch (error) {
//             console.log('[Lavalink] Ошибка при проверке состояния узлов:', error.message);
//             return false;
//         }
//     }
    
//     return false;
// }

// // Функция для получения детальной информации о состоянии Lavalink
// function getLavalinkStatus() {
//     if (!lavalinkClient) {
//         return {
//             lavalink: false,
//             bestNode: false,
//             nodes: 0,
//             connectedNodes: 0,
//             hasNodes: false,
//             ready: false
//         };
//     }
    
//     let nodes = [];
//     let connectedNodes = [];
//     let hasNodes = false;
//     let nodeDetails = [];
//     let hasBestNode = !!(lavalinkClient && lavalinkClient.bestNode);
    
//     try {
//         if (lavalinkClient.nodes && typeof lavalinkClient.nodes.values === 'function') {
//             nodes = Array.from(lavalinkClient.nodes.values());
//             connectedNodes = nodes.filter(node => node && node.connected);
//             hasNodes = true;
//             nodeDetails = nodes.map(node => ({
//                 id: node?.id || 'unknown',
//                 connected: node?.connected || false,
//                 ping: node?.ping || 0,
//                 address: `${node?.host || 'unknown'}:${node?.port || 'unknown'}`
//             }));
//         } else {
//             // Если узлы еще не доступны
//             hasNodes = false;
//         }
//     } catch (error) {
//         console.log('[Lavalink] Ошибка при получении списка узлов:', error.message);
//     }
    
//     const ready = hasBestNode || (hasNodes && connectedNodes.length > 0);
    
//     return {
//         lavalink: !!lavalinkClient,
//         bestNode: hasBestNode,
//         nodes: nodes.length,
//         connectedNodes: connectedNodes.length,
//         hasNodes: hasNodes,
//         ready: ready,
//         nodeDetails: nodeDetails
//     };
// }

// // Подключение к голосовому каналу
// function connectToVoiceChannel(interaction) {
//     const voiceChannel = interaction.member.voice.channel;

//     if (!voiceChannel) {
//         return { success: false, message: 'Вы должны быть в голосовом канале, чтобы использовать эту команду!' };
//     }

//     return { success: true, voiceChannel, memberId: interaction.member.id };
// }

// // Воспроизведение трека
// async function playTrack(interaction, query) {
//     try {
//         // Проверяем, инициализирован ли Lavalink
//         if (!isLavalinkReady()) {
//             console.log('DEBUG: Lavalink не готов. Состояние:', getLavalinkStatus());
//             return { success: false, message: 'Lavalink клиент не инициализирован!' };
//         }

//         const connectionResult = connectToVoiceChannel(interaction);

//         if (!connectionResult.success) {
//             return connectionResult;
//         }

//         // Получаем существующую очередь или создаем новую
//         let queue = musicQueue.get(interaction.guild.id);
//         if (!queue) {
//             queue = {
//                 tracks: [],
//                 voiceChannel: connectionResult.voiceChannel,
//                 loop: false,
//                 volume: 100,
//                 textChannel: interaction.channel
//             };

//             musicQueue.set(interaction.guild.id, queue);
//         }

//         // Получаем узел для поиска трека
//         let node = null;
//         try {
//             node = lavalinkClient.bestNode;
//             if (!node && lavalinkClient.nodes && typeof lavalinkClient.nodes.values === 'function') {
//                 // Если bestNode недоступен, пробуем получить первый подключенный узел
//                 const nodes = Array.from(lavalinkClient.nodes.values());
//                 node = nodes.find(n => n && n.connected);
//             }
//         } catch (error) {
//             console.log('[Lavalink] Ошибка при получении узла:', error.message);
//         }
        
//         if (!node) {
//             return { success: false, message: 'Нет доступных узлов для обработки запроса!' };
//         }

//         // Поиск трека через Lavalink
//         const response = await node.rest.resolve(query);

//         if (!response || !response.tracks || response.tracks.length === 0) {
//             return { success: false, message: 'Трек не найден!' };
//         }

//         // Выбираем первый трек из результата
//         const track = response.tracks[0];

//         // Добавляем трек в очередь
//         const trackInfo = {
//             title: track.info.title,
//             uri: track.info.uri,
//             duration: track.info.length,
//             author: track.info.author,
//             requestedBy: interaction.user,
//             requesterId: interaction.member.id,
//             encoded: track.encoded // Закодированная информация о треке
//         };

//         // Проверяем максимальный размер очереди
//         const maxQueueSize = parseInt(process.env.MAX_QUEUE_SIZE) || 100;
//         if (queue.tracks.length >= maxQueueSize) {
//             return { success: false, message: `Очередь достигла максимального размера (${maxQueueSize})!` };
//         }

//         queue.tracks.push(trackInfo);
//         musicQueue.set(interaction.guild.id, queue);

//         // Получаем или создаем плеер
//         let player = playerManager.getPlayer(interaction.guild.id);
//         if (!player) {
//             player = playerManager.createPlayer(interaction.guild.id, node);
//             player.textChannel = interaction.channel;
//         }

//         // Подключаемся к голосовому каналу если еще не подключены
//         if (!player.player) {
//             await player.connect(connectionResult.voiceChannel.id);
//             player.volume = queue.volume;
//         }

//         // Если это первый трек в очереди, начинаем воспроизведение
//         if (queue.tracks.length === 1) {
//             await playNextTrack(interaction.guild.id);
//         }

//         return {
//             success: true,
//             track: trackInfo,
//             message: `Трек добавлен в очередь: **${trackInfo.title}**`
//         };
//     } catch (error) {
//         console.error('Ошибка при воспроизведении трека:', error);
//         return { success: false, message: 'Произошла ошибка при попытке воспроизвести трек!' };
//     }
// }

// // Воспроизведение следующего трека
// async function playNextTrack(guildId) {
//     const queue = musicQueue.get(guildId);

//     if (!queue || !queue.tracks.length) {
//         // Очередь пуста, удаляем из хранилища и останавливаем плеер
//         musicQueue.delete(guildId);
//         const player = playerManager.getPlayer(guildId);
//         if (player) {
//             await player.disconnect();
//             playerManager.destroyPlayer(guildId);
//         }
//         return;
//     }

//     try {
//         // Проверяем, инициализирован ли Lavalink
//         if (!isLavalinkReady()) {
//             console.log('DEBUG: Lavalink не готов в playNextTrack. Состояние:', getLavalinkStatus());
//             console.error('Lavalink клиент не инициализирован!');
//             return;
//         }

//         // Получаем текущий трек
//         const currentTrack = queue.tracks[0];

//         // Получаем узел для воспроизведения
//         let node = null;
//         try {
//             node = lavalinkClient.bestNode;
//             if (!node && lavalinkClient.nodes && typeof lavalinkClient.nodes.values === 'function') {
//                 // Если bestNode недоступен, пробуем получить первый подключенный узел
//                 const nodes = Array.from(lavalinkClient.nodes.values());
//                 node = nodes.find(n => n && n.connected);
//             }
//         } catch (error) {
//             console.log('[Lavalink] Ошибка при получении узла:', error.message);
//         }
        
//         if (!node) {
//             console.error('Нет доступных узлов для воспроизведения!');
//             return;
//         }

//         // Получаем или создаем плеер
//         let player = playerManager.getPlayer(guildId);
//         if (!player) {
//             player = playerManager.createPlayer(guildId, node);
//         }

//         // Устанавливаем громкость плеера из очереди
//         player.volume = queue.volume;

//         // Подключаемся к голосовому каналу если еще не подключены
//         if (!player.player) {
//             await player.connect(queue.voiceChannel.id);
//         }

//         // Воспроизводим трек
//         await player.playTrack(currentTrack);

//         // Устанавливаем обработчики событий трека
//         player.player
//             .on('start', (data) => {
//                 console.log(`[Lavalink] Началось воспроизведение: ${currentTrack.title}`);
//             })
//             .on('end', async (data) => {
//                 console.log(`[Lavalink] Воспроизведение закончено: ${currentTrack.title}, reason: ${data.reason}`);

//                 const queue = musicQueue.get(guildId);
//                 if (!queue) return;

//                 // Если это был нормальный конец трека
//                 if (data.reason === 'FINISHED') {
//                     // Если включён режим loop, добавляем трек обратно в очередь
//                     if (queue.loop) {
//                         queue.tracks.push(queue.tracks[0]);
//                     }

//                     // Удаляем первый трек из очереди
//                     queue.tracks.shift();
//                     musicQueue.set(guildId, queue);

//                     // Воспроизводим следующий трек
//                     await playNextTrack(guildId);
//                 } else if (data.reason === 'LOAD_FAILED') {
//                     // Удаляем проблемный трек и пробуем следующий
//                     queue.tracks.shift();
//                     musicQueue.set(guildId, queue);

//                     await playNextTrack(guildId);
//                 }
//             })
//             .on('error', async (data) => {
//                 console.error('[Lavalink] Ошибка воспроизведения:', data.error);

//                 // Удаляем проблемный трек и пробуем следующий
//                 const queue = musicQueue.get(guildId);
//                 if (queue) {
//                     queue.tracks.shift();
//                     musicQueue.set(guildId, queue);

//                     setTimeout(() => playNextTrack(guildId), 1000);
//                 }
//             });
//     } catch (error) {
//         console.error('Ошибка при воспроизведении следующего трека:', error);

//         // Удаляем проблемный трек и пробуем следующий
//         const queue = musicQueue.get(guildId);
//         if (queue) {
//             queue.tracks.shift();
//             musicQueue.set(guildId, queue);

//             setTimeout(() => playNextTrack(guildId), 1000);
//         }
//     }
// }

// // Получение очереди треков
// function getQueue(guildId) {
//     return musicQueue.get(guildId) || { tracks: [], loop: false, volume: 100 };
// }

// // Пропуск трека
// async function skipTrack(guildId) {
//     const queue = musicQueue.get(guildId);

//     if (!queue || !queue.tracks.length) {
//         return { success: false, message: 'Очередь пуста!' };
//     }

//     try {
//         // Удаляем первый трек из очереди
//         const skippedTrack = queue.tracks.shift();

//         // Останавливаем текущий трек
//         const player = playerManager.getPlayer(guildId);
//         if (player && player.player) {
//             await player.stop();
//         }

//         // Если есть другие треки в очереди, воспроизводим следующий
//         if (queue.tracks.length > 0) {
//             await playNextTrack(guildId);

//             return { success: true, track: skippedTrack, message: `Пропущен трек: **${skippedTrack.title}**` };
//         } else {
//             // Если в очереди больше нет треков, останавливаем воспроизведение
//             if (player) {
//                 await player.disconnect();
//                 playerManager.destroyPlayer(guildId);
//             }
//             musicQueue.delete(guildId);

//             return { success: true, track: skippedTrack, message: `Пропущен трек: **${skippedTrack.title}**\nВоспроизведение остановлено.` };
//         }
//     } catch (error) {
//         console.error('Ошибка при пропуске трека:', error);
//         return { success: false, message: 'Произошла ошибка при попытке пропустить трек!' };
//     }
// }

// // Остановка воспроизведения
// async function stop(guildId) {
//     const queue = musicQueue.get(guildId);

//     if (!queue) {
//         return { success: false, message: 'Нет активной очереди!' };
//     }

//     try {
//         // Очищаем очередь
//         queue.tracks = [];

//         // Останавливаем воспроизведение
//         const player = playerManager.getPlayer(guildId);
//         if (player) {
//             await player.stop();
//             await player.disconnect();
//             playerManager.destroyPlayer(guildId);
//         }

//         // Удаляем очередь из хранилища
//         musicQueue.delete(guildId);

//         return { success: true, message: 'Воспроизведение остановлено и очередь очищена!' };
//     } catch (error) {
//         console.error('Ошибка при остановке воспроизведения:', error);
//         return { success: false, message: 'Произошла ошибка при попытке остановить воспроизведение!' };
//     }
// }

// // Пауза
// async function pause(guildId) {
//     try {
//         const player = playerManager.getPlayer(guildId);
//         if (player) {
//             await player.pause(true);
//             return { success: true, message: 'Воспроизведение приостановлено!' };
//         } else {
//             return { success: false, message: 'Нет активного плеера!' };
//         }
//     } catch (error) {
//         console.error('Ошибка при паузе:', error);
//         return { success: false, message: 'Произошла ошибка при попытке приостановить воспроизведение!' };
//     }
// }

// // Возобновление
// async function resume(guildId) {
//     try {
//         const player = playerManager.getPlayer(guildId);
//         if (player) {
//             await player.pause(false);
//             return { success: true, message: 'Воспроизведение возобновлено!' };
//         } else {
//             return { success: false, message: 'Нет активного плеера!' };
//         }
//     } catch (error) {
//         console.error('Ошибка при возобновлении:', error);
//         return { success: false, message: 'Произошла ошибка при попытке возобновить воспроизведение!' };
//     }
// }

// // Изменение громкости
// async function setVolume(guildId, volume) {
//     const queue = musicQueue.get(guildId);

//     if (!queue) {
//         return { success: false, message: 'Нет активной очереди!' };
//     }

//     try {
//         // Ограничиваем громкость диапазоном 0-150
//         const volumeLevel = Math.min(150, Math.max(0, volume));

//         const player = playerManager.getPlayer(guildId);
//         if (player) {
//             await player.setVolume(volumeLevel);
//         }
//         queue.volume = volumeLevel;
//         musicQueue.set(guildId, queue);

//         return { success: true, message: `Громкость установлена на ${volumeLevel}%` };
//     } catch (error) {
//         console.error('Ошибка при изменении громкости:', error);
//         return { success: false, message: 'Произошла ошибка при попытке изменить громкость!' };
//     }
// }

// // Переключение режима loop
// function toggleLoop(guildId) {
//     const queue = musicQueue.get(guildId);

//     if (!queue) {
//         return { success: false, message: 'Нет активной очереди!' };
//     }

//     queue.loop = !queue.loop;
//     musicQueue.set(guildId, queue);

//     return {
//         success: true,
//         message: `Режим повтора ${queue.loop ? 'включен' : 'выключен'}!`
//     };
// }

// module.exports = {
//     initializeLavalink,
//     playTrack,
//     getQueue,
//     skipTrack,
//     stop,
//     pause,
//     resume,
//     setVolume,
//     toggleLoop,
//     connectToVoiceChannel,
//     lavalinkClient: () => lavalinkClient,
//     playerManager: () => playerManager,
//     getLavalinkStatus
// };