// Этот файл предназначен для запуска Discord бота на Vercel
// Важно: Vercel не рекомендован для запуска Discord ботов из-за их постоянного соединения
// Этот файл предоставляется для случаев, когда вы хотите использовать только веб-панель на Vercel

// Имитация запуска бота - на самом деле, бот не будет запущен на Vercel
// потому что Discord боты требуют постоянного соединения

module.exports = async (req, res) => {
    // Установка заголовков CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Возвращаем информацию о том, что бот не запущен на Vercel
    res.status(200).json({
        status: 'success',
        message: 'Aurora Bot Web Dashboard API',
        note: 'Основной Discord бот не запускается на Vercel. Используйте этот URL только для веб-панели.',
        endpoints: {
            dashboard: '/',
            auth: '/auth/login',
            settings: '/api/server/:id/settings'
        }
    });
};