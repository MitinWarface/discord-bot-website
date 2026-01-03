// Определение предметов магазина
const shopItems = [
    {
        id: 'basic_potion',
        name: 'Базовое зелье',
        description: 'Восстанавливает 10 очков',
        price: 50,
        type: 'potion',
        effect: { points: 10 }
    },
    {
        id: 'premium_potion',
        name: 'Премиум зелье',
        description: 'Восстанавливает 25 очков',
        price: 100,
        type: 'potion',
        effect: { points: 25 }
    },
    {
        id: 'bronze_badge',
        name: 'Бронзовое звание',
        description: 'Бронзовое звание для профиля',
        price: 200,
        type: 'badge',
        effect: { badge: 'bronze' }
    },
    {
        id: 'silver_badge',
        name: 'Серебряное звание',
        description: 'Серебряное звание для профиля',
        price: 400,
        type: 'badge',
        effect: { badge: 'silver' }
    },
    {
        id: 'gold_badge',
        name: 'Золотое звание',
        description: 'Золотое звание для профиля',
        price: 800,
        type: 'badge',
        effect: { badge: 'gold' }
    },
    {
        id: 'xp_boost_small',
        name: 'Ускорение XP (малое)',
        description: 'Удваивает получение очков на 1 час',
        price: 150,
        type: 'boost',
        effect: { boost: 'xp_2x_1h' }
    },
    {
        id: 'xp_boost_medium',
        name: 'Ускорение XP (среднее)',
        description: 'Удваивает получение очков на 3 часа',
        price: 350,
        type: 'boost',
        effect: { boost: 'xp_2x_3h' }
    },
    {
        id: 'xp_boost_large',
        name: 'Ускорение XP (большое)',
        description: 'Удваивает получение очков на 12 часов',
        price: 750,
        type: 'boost',
        effect: { boost: 'xp_2x_12h' }
    },
    {
        id: 'guild_exp_boost',
        name: 'Ускорение XP гильдии',
        description: 'Удваивает получение опыта гильдией на 3 часа',
        price: 500,
        type: 'guild_boost',
        effect: { guild_boost: 'guild_xp_2x_3h' }
    },
    {
        id: 'special_title',
        name: 'Специальное звание',
        description: 'Эксклюзивное звание для профиля',
        price: 1000,
        type: 'title',
        effect: { title: 'special' }
    }
];

module.exports = shopItems;