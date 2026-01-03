const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('Показать погоду в указанном городе')
        .addStringOption(option =>
            option.setName('city')
                .setDescription('Город для проверки погоды')
                .setRequired(true)),

    async execute(interaction) {
        const city = interaction.options.getString('city');
        
        // Отправляем сообщение о загрузке
        await interaction.reply({ content: `🌤️ Получение погоды для **${city}**...`, ephemeral: true });
        
        try {
            // Используем OpenWeatherMap API (замените YOUR_API_KEY на реальный ключ)
            const apiKey = process.env.OPENWEATHER_API_KEY; // Убедитесь, что добавили ключ в .env файл
            
            if (!apiKey) {
                const noApiKeyEmbed = new EmbedBuilder()
                    .setTitle('❌ Ключ API не настроен')
                    .setDescription('Ключ OpenWeatherMap API не настроен. Обратитесь к администратору бота.')
                    .setColor('#ff0000')
                    .setTimestamp();
                
                return await interaction.editReply({ embeds: [noApiKeyEmbed], content: null });
            }
            
            // Запрашиваем погоду
            const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=ru`);
            
            if (response.data && response.data.main) {
                const weather = response.data;
                const main = weather.main;
                const wind = weather.wind;
                const sys = weather.sys;
                
                // Определяем иконку погоды
                const weatherIcons = {
                    'Clear': '☀️',
                    'Clouds': '☁️',
                    'Rain': '🌧️',
                    'Drizzle': '🌦️',
                    'Thunderstorm': '⛈️',
                    'Snow': '❄️',
                    'Mist': '🌫️',
                    'Smoke': '💨',
                    'Haze': '🌫️',
                    'Dust': '💨',
                    'Fog': '🌫️',
                    'Sand': '💨',
                    'Ash': '💨',
                    'Squall': '💨',
                    'Tornado': '🌪️'
                };
                
                const iconCode = weather.weather[0].icon;
                const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
                const weatherIcon = weatherIcons[weather.weather[0].main] || '🌤️';
                
                // Создаем embed с информацией о погоде
                const weatherEmbed = new EmbedBuilder()
                    .setTitle(`🌍 Погода в ${weather.name}, ${sys.country}`)
                    .setDescription(`${weatherIcon} **${weather.weather[0].description.charAt(0).toUpperCase() + weather.weather[0].description.slice(1)}**`)
                    .addFields(
                        { name: '🌡️ Температура', value: `${Math.round(main.temp)}°C`, inline: true },
                        { name: '高低 Oщущается как', value: `${Math.round(main.feels_like)}°C`, inline: true },
                        { name: '📈 Максимальная темп.', value: `${Math.round(main.temp_max)}°C`, inline: true },
                        { name: '📉 Минимальная темп.', value: `${Math.round(main.temp_min)}°C`, inline: true },
                        { name: '💧 Влажность', value: `${main.humidity}%`, inline: true },
                        { name: '💨 Ветер', value: `${wind ? wind.speed + ' м/с' : 'Нет данных'}`, inline: true },
                        { name: '👁️ Видимость', value: weather.visibility ? `${weather.visibility / 1000} км` : 'Нет данных', inline: true },
                        { name: '🌅 Восход', value: `<t:${Math.floor(sys.sunrise)}:t>`, inline: true },
                        { name: '🌇 Закат', value: `<t:${Math.floor(sys.sunset)}:t>`, inline: true }
                    )
                    .setThumbnail(iconUrl)
                    .setColor('#87CEEB')
                    .setTimestamp()
                    .setFooter({ 
                        text: `Запрошено ${interaction.user.username}`, 
                        iconURL: interaction.user.displayAvatarURL() 
                    });
                
                // Редактируем сообщение с информацией о погоде
                await interaction.editReply({ embeds: [weatherEmbed], content: null });
            } else {
                // Если город не найден
                const notFoundEmbed = new EmbedBuilder()
                    .setTitle('❌ Город не найден')
                    .setDescription(`Не удалось найти погоду для **${city}**. Проверьте название города и попробуйте снова.`)
                    .setColor('#ff0000')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [notFoundEmbed], content: null });
            }
        } catch (error) {
            console.error('Ошибка при получении погоды:', error);
            
            // Проверяем, является ли ошибка связанной с отсутствием города
            if (error.response && error.response.data.cod === '404') {
                const notFoundEmbed = new EmbedBuilder()
                    .setTitle('❌ Город не найден')
                    .setDescription(`Не удалось найти погоду для **${city}**. Проверьте название города и попробуйте снова.`)
                    .setColor('#ff0000')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [notFoundEmbed], content: null });
            } else {
                // Общая ошибка
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Ошибка')
                    .setDescription('Произошла ошибка при получении данных о погоде. Попробуйте позже.')
                    .setColor('#ff0000')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [errorEmbed], content: null });
            }
        }
    }
};