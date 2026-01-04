const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const dotenv = require('dotenv');
dotenv.config(); // Загружаем переменные окружения из .env файла

// Инициализация Express приложения
const app = express();

// Настройка сессий
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 1000 // 1 неделя
    }
}));

// Инициализация Passport
app.use(passport.initialize());
app.use(passport.session());

// Настройка стратегии аутентификации Discord
const axios = require('axios');

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/callback`,
    scope: ['identify', 'guilds', 'guilds.join']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Добавляем токен доступа к профилю для последующего использования
        profile.accessToken = accessToken;
        
        // Получаем информацию о серверах пользователя
        try {
            // Добавляем задержку перед запросом для предотвращения рейт-лимитов
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const response = await axios.get('https://discord.com/api/users/@me/guilds', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'User-Agent': 'AuroraBot/1.0'
                },
                timeout: 10000
            });
            profile.guilds = response.data;
        } catch (guildsError) {
            console.error('Ошибка при получении серверов пользователя:', guildsError.message);
            // Проверяем, является ли ошибка рейт-лимитом
            if (guildsError.response && guildsError.response.status === 429) {
                console.error('Превышен рейт-лимит при запросе серверов пользователя');
                // Если превышен рейт-лимит, используем пустой массив серверов
                profile.guilds = [];
            } else {
                // Для других ошибок также используем пустой массив
                profile.guilds = [];
            }
        }
        
        return done(null, profile);
    } catch (error) {
        return done(error, null);
    }
}));

// Сериализация и десериализация пользователя для сессий
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    // Здесь можно получить пользователя из базы данных по ID
    // Пока просто возвращаем ID
    done(null, { id: id });
});

// Middleware для проверки аутентификации
function ensureAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/login');
}

// Настройка шаблонизатора (используем EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Маршруты аутентификации
app.get('/auth/login', (req, res) => {
    res.render('login', { 
        baseURL: process.env.BASE_URL || 'http://localhost:3000' 
    });
});

app.get('/auth/callback', 
    passport.authenticate('discord', { failureRedirect: '/auth/login' }),
    (req, res) => {
        res.redirect('/');
    }
);

app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Ошибка при выходе:', err);
        }
        res.redirect('/');
    });
});

// Главная страница панели управления
app.get('/', ensureAuth, (req, res) => {
    res.render('dashboard', {
        user: req.user,
        baseURL: process.env.BASE_URL || 'http://localhost:3000'
    });
});

// Страница команд
app.get('/commands', ensureAuth, (req, res) => {
    res.render('commands', {
        user: req.user,
        baseURL: process.env.BASE_URL || 'http://localhost:3000'
    });
});

// Страница информации о боте
app.get('/info', ensureAuth, (req, res) => {
    res.render('info', {
        user: req.user,
        baseURL: process.env.BASE_URL || 'http://localhost:3000'
    });
});

// Страница управления серверами
app.get('/servers', ensureAuth, async (req, res) => {
    try {
        // Получаем серверы, на которых пользователь является администратором
        const userGuilds = req.user.guilds || [];
        console.log('Полученные сервера пользователя из профиля:', userGuilds); // Для отладки
        
        // Проверяем, есть ли серверы в профиле пользователя
        if (!userGuilds || userGuilds.length === 0) {
            console.log('У пользователя нет серверов в профиле');
            res.render('servers', {
                user: req.user,
                servers: [],
                baseURL: process.env.BASE_URL || 'http://localhost:3000'
            });
            return;
        }
        
        // Фильтруем серверы, где пользователь имеет права администратора
        const adminGuilds = userGuilds.filter(guild => {
            // Проверяем права администратора (битовая маска)
            const permissions = parseInt(guild.permissions);
            return (permissions & 0x8) === 0x8; // ADMINISTRATOR_PERMISSION = 0x8
        });
        
        console.log('Сервера с правами администратора:', adminGuilds); // Для отладки
        
        res.render('servers', {
            user: req.user,
            servers: adminGuilds,
            baseURL: process.env.BASE_URL || 'http://localhost:3000'
        });
    } catch (error) {
        console.error('Ошибка при получении серверов:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Страница настройки конкретного сервера
app.get('/server/:id', ensureAuth, async (req, res) => {
    const guildId = req.params.id;
    
    try {
        // Проверяем, имеет ли пользователь доступ к этому серверу
        const userGuilds = req.user.guilds || [];
        const userGuild = userGuilds.find(guild => guild.id === guildId);
        
        if (!userGuild || (parseInt(userGuild.permissions) & 0x8) !== 0x8) {
            return res.status(403).send('Нет доступа к этому серверу');
        }
        
        // Получаем реальные настройки сервера из системы настроек
        const guildSettingsModule = require('../System/guildSettings');
        const guildSettings = guildSettingsModule.getGuildSettings(guildId);
        
        res.render('server-settings', {
            user: req.user,
            server: userGuild,
            settings: guildSettings,
            baseURL: process.env.BASE_URL || 'http://localhost:3000'
        });
    } catch (error) {
        console.error('Ошибка при получении настроек сервера:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// API маршруты для обновления настроек
app.post('/api/server/:id/settings', ensureAuth, express.json(), async (req, res) => {
    const guildId = req.params.id;
    const settings = req.body;
    
    try {
        // Проверяем, имеет ли пользователь доступ к этому серверу
        const userGuilds = req.user.guilds || [];
        const userGuild = userGuilds.find(guild => guild.id === guildId);
        
        if (!userGuild || (parseInt(userGuild.permissions) & 0x8) !== 0x8) {
            return res.status(403).json({ error: 'Нет доступа к этому серверу' });
        }
        
        // Валидация и обработка настроек
        const processedSettings = {};
        
        // Обработка префикса
        if (settings.prefix && typeof settings.prefix === 'string' && settings.prefix.length <= 10) {
            processedSettings.prefix = settings.prefix;
        }
        
        // Обработка настроек автомодерации
        if (settings.automod) {
            processedSettings.automod = {};
            if (typeof settings.automod.enabled === 'boolean') {
                processedSettings.automod.enabled = settings.automod.enabled;
            }
            if (settings.automod.filter) {
                processedSettings.automod.filter = {};
                if (typeof settings.automod.filter.profanity === 'boolean') {
                    processedSettings.automod.filter.profanity = settings.automod.filter.profanity;
                }
                if (typeof settings.automod.filter.links === 'boolean') {
                    processedSettings.automod.filter.links = settings.automod.filter.links;
                }
                if (typeof settings.automod.filter.spam === 'boolean') {
                    processedSettings.automod.filter.spam = settings.automod.filter.spam;
                }
                if (typeof settings.automod.filter.caps === 'boolean') {
                    processedSettings.automod.filter.caps = settings.automod.filter.caps;
                }
                if (typeof settings.automod.filter.invites === 'boolean') {
                    processedSettings.automod.filter.invites = settings.automod.filter.invites;
                }
            }
            if (settings.automod.actions) {
                processedSettings.automod.actions = {};
                if (typeof settings.automod.actions.warn === 'number') {
                    processedSettings.automod.actions.warn = Math.max(1, Math.min(20, settings.automod.actions.warn));
                }
                if (typeof settings.automod.actions.mute === 'number') {
                    processedSettings.automod.actions.mute = Math.max(1, Math.min(20, settings.automod.actions.mute));
                }
                if (typeof settings.automod.actions.kick === 'number') {
                    processedSettings.automod.actions.kick = Math.max(1, Math.min(20, settings.automod.actions.kick));
                }
                if (typeof settings.automod.actions.ban === 'number') {
                    processedSettings.automod.actions.ban = Math.max(1, Math.min(20, settings.automod.actions.ban));
                }
            }
        }
        
        // Обработка настроек логирования
        if (settings.logging) {
            processedSettings.logging = {};
            if (typeof settings.logging.enabled === 'boolean') {
                processedSettings.logging.enabled = settings.logging.enabled;
            }
            if (settings.logging.logChannel && typeof settings.logging.logChannel === 'string') {
                // Проверяем, что это действительный ID канала (число)
                if (/^\d+$/.test(settings.logging.logChannel)) {
                    processedSettings.logging.logChannel = settings.logging.logChannel;
                }
            }
            if (settings.logging.events) {
                processedSettings.logging.events = {};
                const eventTypes = ['messageDelete', 'messageUpdate', 'memberJoin', 'memberLeave', 'memberBan', 'memberUnban', 'memberRoleAdd', 'memberRoleRemove', 'memberNicknameUpdate', 'voiceStateUpdate'];
                for (const eventType of eventTypes) {
                    if (typeof settings.logging.events[eventType] === 'boolean') {
                        processedSettings.logging.events[eventType] = settings.logging.events[eventType];
                    }
                }
            }
        }
        
        // Обработка настроек системы уровней
        if (settings.leveling) {
            processedSettings.leveling = {};
            if (typeof settings.leveling.enabled === 'boolean') {
                processedSettings.leveling.enabled = settings.leveling.enabled;
            }
            if (typeof settings.leveling.xpPerMessageMin === 'number') {
                processedSettings.leveling.xpPerMessageMin = Math.max(1, Math.min(100, settings.leveling.xpPerMessageMin));
            }
            if (typeof settings.leveling.xpPerMessageMax === 'number') {
                processedSettings.leveling.xpPerMessageMax = Math.max(1, Math.min(100, settings.leveling.xpPerMessageMax));
            }
            if (typeof settings.leveling.xpCooldownMs === 'number') {
                processedSettings.leveling.xpCooldownMs = Math.max(1000, Math.min(300000, settings.leveling.xpCooldownMs));
            }
        }
        
        // Обработка настроек экономики
        if (settings.economy) {
            processedSettings.economy = {};
            if (typeof settings.economy.enabled === 'boolean') {
                processedSettings.economy.enabled = settings.economy.enabled;
            }
            if (typeof settings.economy.dailyAmount === 'number') {
                processedSettings.economy.dailyAmount = Math.max(1, Math.min(1000, settings.economy.dailyAmount));
            }
            if (typeof settings.economy.workEnabled === 'boolean') {
                processedSettings.economy.workEnabled = settings.economy.workEnabled;
            }
        }
        
        // Обработка настроек системы тикетов
        if (settings.tickets) {
            processedSettings.tickets = {};
            if (typeof settings.tickets.enabled === 'boolean') {
                processedSettings.tickets.enabled = settings.tickets.enabled;
            }
            if (settings.tickets.categoryId && typeof settings.tickets.categoryId === 'string') {
                // Проверяем, что это действительный ID категории (число)
                if (/^\d+$/.test(settings.tickets.categoryId)) {
                    processedSettings.tickets.categoryId = settings.tickets.categoryId;
                }
            }
            if (settings.tickets.supportRoleId && typeof settings.tickets.supportRoleId === 'string') {
                // Проверяем, что это действительный ID роли (число)
                if (/^\d+$/.test(settings.tickets.supportRoleId)) {
                    processedSettings.tickets.supportRoleId = settings.tickets.supportRoleId;
                }
            }
        }
        
        // Обработка настроек событий
        if (settings.events) {
            processedSettings.events = {};
            if (typeof settings.events.enabled === 'boolean') {
                processedSettings.events.enabled = settings.events.enabled;
            }
            if (settings.events.announcementChannel && typeof settings.events.announcementChannel === 'string') {
                // Проверяем, что это действительный ID канала (число)
                if (/^\d+$/.test(settings.events.announcementChannel)) {
                    processedSettings.events.announcementChannel = settings.events.announcementChannel;
                }
            }
        }
        
        // Обработка настроек работы
        if (settings.work) {
            processedSettings.work = {};
            if (typeof settings.work.enabled === 'boolean') {
                processedSettings.work.enabled = settings.work.enabled;
            }
            if (typeof settings.work.minReward === 'number') {
                processedSettings.work.minReward = Math.max(1, Math.min(1000, settings.work.minReward));
            }
            if (typeof settings.work.maxReward === 'number') {
                processedSettings.work.maxReward = Math.max(1, Math.min(1000, settings.work.maxReward));
            }
            if (typeof settings.work.cooldownHours === 'number') {
                processedSettings.work.cooldownHours = Math.max(1, Math.min(24, settings.work.cooldownHours));
            }
        }
        
        // Обработка настроек музыки
        if (settings.music) {
            processedSettings.music = {};
            if (typeof settings.music.enabled === 'boolean') {
                processedSettings.music.enabled = settings.music.enabled;
            }
            if (typeof settings.music.maxQueueSize === 'number') {
                processedSettings.music.maxQueueSize = Math.max(10, Math.min(500, settings.music.maxQueueSize));
            }
            if (typeof settings.music.maxTrackDuration === 'number') {
                processedSettings.music.maxTrackDuration = Math.max(60, Math.min(3600, settings.music.maxTrackDuration)); // от 1 минуты до 1 часа
            }
            if (typeof settings.music.audioQuality === 'number') {
                processedSettings.music.audioQuality = Math.max(1, Math.min(5, settings.music.audioQuality));
            }
            if (typeof settings.music.maxRetryAttempts === 'number') {
                processedSettings.music.maxRetryAttempts = Math.max(1, Math.min(10, settings.music.maxRetryAttempts));
            }
            if (typeof settings.music.streamTimeout === 'number') {
                processedSettings.music.streamTimeout = Math.max(10000, Math.min(120000, settings.music.streamTimeout)); // от 10 секунд до 2 минут
            }
        }
        
        // Обработка настроек реакций
        if (settings.reactions) {
            processedSettings.reactions = {};
            if (typeof settings.reactions.enabled === 'boolean') {
                processedSettings.reactions.enabled = settings.reactions.enabled;
            }
            // reactionRoles пока не обрабатываем, так как это сложная структура
        }
        
        // Обработка настроек автоворолов
        if (settings.autoroles) {
            processedSettings.autoroles = {};
            if (typeof settings.autoroles.enabled === 'boolean') {
                processedSettings.autoroles.enabled = settings.autoroles.enabled;
            }
            if (settings.autoroles.roleId && typeof settings.autoroles.roleId === 'string') {
                // Проверяем, что это действительный ID роли (число)
                if (/^\d+$/.test(settings.autoroles.roleId)) {
                    processedSettings.autoroles.roleId = settings.autoroles.roleId;
                }
            }
        }
        
        // Сохраняем настройки сервера с помощью новой системы
        const guildSettingsModule = require('../System/guildSettings');
        guildSettingsModule.setGuildSettings(guildId, processedSettings);
        
        console.log(`Обновлены настройки сервера ${guildId}:`, processedSettings);
        
        res.json({ success: true, message: 'Настройки обновлены успешно' });
    } catch (error) {
        console.error('Ошибка при обновлении настроек сервера:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Панель управления запущена на http://localhost:${PORT}`);
});

// Экспортируем приложение для Vercel
module.exports = app;

module.exports = app;