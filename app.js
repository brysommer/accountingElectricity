import TelegramBot from 'node-telegram-bot-api';
import schedule from 'node-schedule';
import values from './values.js';

// Створіть екземпляр бота
const bot = new TelegramBot(values.token, { polling: true });

// Масив даних користувачів
const users = [
    { name: 'Sadova 26', chatId: 444222333, balance: 1235 },
    { name: 'Green Street 12', chatId: 555333222, balance: 0 },
    { name: 'Ocean View', chatId: 666777888, balance: 540 },
];

// Admin Chat ID
const adminChatId = 123456789; // Замініть на ваш actual admin chat ID

// Функція для надсилання повідомлень про борг
const notifyUsers = () => {
    users.forEach(user => {
        if (user.balance > 0) {
            const message = `${user.name} борг за електроенергію: ${user.balance} грн. Надішліть знімок екрану після проведення оплати`;
            bot.sendMessage(user.chatId, message);
        }
    });
};

// Форвардинг всіх отриманих повідомлень
bot.on('photo', (msg) => {
    if (msg.chat.id !== adminChatId) {
        bot.forwardMessage(adminChatId, msg.chat.id, msg.message_id)
            .catch(error => console.error('Error forwarding message:', error));
    }
});



// Функція для надсилання звіту адміну
const sendAdminReport = () => {
    const debtors = users.filter(user => user.balance > 0);
    if (debtors.length > 0) {
        const report = debtors.map(user => `${user.name}: ${user.balance} грн`).join('\n');
        bot.sendMessage(adminChatId, `Список користувачів із боргом:\n${report}`);
    } else {
        bot.sendMessage(adminChatId, `Немає користувачів із боргом.`);
    }
};

// Функція для нагадування про подачу показників
const remindUsersToSubmitReadings = () => {

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Внести показник", callback_data: "submit_reading" }]
            ]
        }
    };
    
    // Надсилання повідомлення з клавіатурою
    bot.sendMessage(chatId, "Натисніть кнопку, щоб внести показник:", keyboard);
    
    users.forEach(user => {
        const message = `🔔 Шановний(а) ${user.name}, нагадуємо, що з 28-го по 31-ше число потрібно подати показники електролічильника.`;
        bot.sendMessage(user.chatId, message, keyboard);
    });
};

bot.on('callback_query', (query) => {
    if (query.data === "submit_reading") {
        bot.sendMessage(query.message.chat.id, "Будь ласка, введіть ваш показник.");
    }
});


// Розклад для перевірки боргів (щодня о 12:00 з 1-го по 5-те число)
schedule.scheduleJob('0 12 1-5 * *', notifyUsers);

// Розклад для надсилання звіту адміну (6-го числа о 12:00)
schedule.scheduleJob('0 12 6 * *', sendAdminReport);

// Розклад для нагадування про подачу показників (25-го числа о 12:00)
schedule.scheduleJob('0 12 25 * *', remindUsersToSubmitReadings);
