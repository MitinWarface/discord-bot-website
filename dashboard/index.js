const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const fs = require('fs');

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
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/callback`,
    scope: ['identify', 'guilds', 'guilds.join']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Здесь можно добавить логику сохранения пользователя в базу данных
        // Пока просто возвращаем профиль пользователя
        return done(null, profile);
    } catch (error) {
        return done(error, null);
    }
}));

// Сериализация и десериализация пользователя для сессий
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        // Здесь можно получить пользователя из базы данных по ID
        // Пока просто возвращаем ID
        done(null, { id: id });
    } catch (error) {
        done(error, null);
    }
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

// Страница управления серверами
app.get('/servers', ensureAuth, async (req, res) => {
    try {
        // Здесь должна быть логика получения серверов, где пользователь администратор
        // Пока просто возвращаем пустой массив
        const userGuilds = req.user.guilds || [];
        
        // Фильтруем серверы, где пользователь имеет права администратора
        const adminGuilds = userGuilds.filter(guild => {
            // Проверяем права администратора (битовая маска)
            const permissions = parseInt(guild.permissions);
            return (permissions & 0x8) === 0x8; // ADMINISTRATOR_PERMISSION = 0x8
        });
        
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
        
        // Здесь должна быть логика получения настроек сервера из базы данных
        // Пока просто возвращаем пустой объект настроек
        const guildSettings = {
            name: userGuild.name,
            prefix: '!',
            automod: {
                enabled: false,
                filter: {
                    profanity: false,
                    links: false,
                    spam: false
                },
                actions: {
                    warn: 3,
                    mute: 5,
                    kick: 8,
                    ban: 10
                }
            },
            logging: {
                enabled: false,
                channel: null
            },
            leveling: {
                enabled: false,
                xpPerMessage: 1,
                xpCooldown: 30
            },
            economy: {
                enabled: false,
                currencyName: 'монеты',
                dailyAmount: 100
            }
        };
        
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
        
        // Здесь должна быть логика сохранения настроек в базе данных
        // Пока просто возвращаем успех
        console.log(`Обновлены настройки сервера ${guildId}:`, settings);
        
        res.json({ success: true, message: 'Настройки обновлены успешно' });
    } catch (error) {
        console.error('Ошибка при обновлении настроек сервера:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Маршрут для получения статистики сервера
app.get('/api/server/:id/stats', ensureAuth, async (req, res) => {
    const guildId = req.params.id;
    
    try {
        // Проверяем, имеет ли пользователь доступ к этому серверу
        const userGuilds = req.user.guilds || [];
        const userGuild = userGuilds.find(guild => guild.id === guildId);
        
        if (!userGuild || (parseInt(userGuild.permissions) & 0x8) !== 0x8) {
            return res.status(403).json({ error: 'Нет доступа к этому серверу' });
        }
        
        // Здесь должна быть логика получения статистики сервера
        // Пока возвращаем заглушку
        const stats = {
            members: {
                total: 1000,
                online: 150,
                offline: 850
            },
            channels: {
                text: 20,
                voice: 10,
                category: 5
            },
            messages: {
                today: 500,
                week: 3500
            },
            botStats: {
                uptime: '24 часа',
                commandsUsed: 1250
            }
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Ошибка при получении статистики сервера:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Панель управления запущена на http://localhost:${PORT}`);
});

module.exports = app;