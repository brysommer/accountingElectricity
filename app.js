import TelegramBot from 'node-telegram-bot-api';
import schedule from 'node-schedule';
import values from './values.js';
import { createNewUserByChatId, findAllUser, findUserByChatId, updateUserByChatId } from './models/users.js';
import { sequelize } from './models/sequelize.js';

// Створіть екземпляр бота
const bot = new TelegramBot(values.token, { polling: true });

const main = async () => {
    const models = {
        list:  [
            'users'
        ]
    };
    // DB
    const configTables = models.list;
    const dbInterface = sequelize.getQueryInterface();
    const checks = await Promise.all(configTables.map(configTable => {
        return dbInterface.tableExists(configTable);
    }));
    const result = checks.every(el => el === true);
    if (!result) {
        // eslint-disable-next-line no-console
        console.error(`🚩 Failed to check DB tables, see config.models.list`);
        throw (`Some DB tables are missing`);
    }
}; 

main();

bot.setMyCommands([
    { command: "/start", description: "Головне меню" }
]);


// Admin Chat ID
const adminChatId = 123456789; // Замініть на ваш actual admin chat ID

// Функція для надсилання повідомлень про борг
const notifyUsers = async () => {
    const users = await findAllUser();
    users.forEach(user => {
        if (user.balance > 0) {
            const message = `${user.name} кВт день:${user.dayDifference}, кВт ніч:${user.nightDifference} ${user.balance} грн. Надішліть знімок екрану після проведення оплати`;
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

bot.onText('/start', async (msg) => {

    const chatId = msg.chat.id;
    const firstName = msg.from?.first_name || 'Невідомий користувач';

    bot.sendMessage(chatId, `Привіт, ${firstName}!`);

    const user = await findUserByChatId(chatId);

    user || createNewUserByChatId(chatId, firstName);    

    const message = 
        "💡 *Ласкаво просимо!* \n\n" +
        "В цьому боті Ви можете:\n" +
        "✅ Подати *показники лічильника* 📊\n" +
        "✅ Надіслати *квитанцію про оплату* 💳\n" +
        "✅ Перевірити *свій баланс* 💰\n\n" +
        "Оберіть дію нижче ⬇️";

    const keyboard = {
        reply_markup: {
            keyboard: [
                [{ text: "📈 Подати показники" }, { text: "💰 Перевірити баланс" }]
            ],
            resize_keyboard: true
        }
    };

    await bot.sendMessage(chatId, message, { 
        parse_mode: "Markdown",
        ...keyboard
    });
});


bot.onText(/Головне меню/, async (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from?.first_name || 'Невідомий користувач';

    bot.sendMessage(chatId, `Привіт, ${firstName}!`);

    const user = await findUserByChatId(chatId);

    user || createNewUserByChatId(chatId, firstName);    

    const message = 
        "💡 *Ласкаво просимо!* \n\n" +
        "В цьому боті Ви можете:\n" +
        "✅ Подати *показники лічильника* 📊\n" +
        "✅ Надіслати *квитанцію про оплату* 💳\n" +
        "✅ Перевірити *свій баланс* 💰\n\n" +
        "Оберіть дію нижче ⬇️";

    const keyboard = {
        reply_markup: {
            keyboard: [
                [{ text: "📈 Подати показники" }, { text: "💰 Перевірити баланс" }]
            ],
            resize_keyboard: true
        }
    };

    await bot.sendMessage(chatId, message, { 
        parse_mode: "Markdown",
        ...keyboard
    });
        
});

bot.onText(/📈 Подати показники/, async (msg) => {
    const chatId = msg.chat.id;
    
    const message = 
        "📝 *Внесіть показник лічильника* \n\n" +
        "🔹 Для *однотарифного* лічильника введіть значення у форматі:\n" +
        "`ХХХХ`\n\n" +
        "🔹 Для *двотарифного* лічильника введіть значення у форматі:\n" +
        "`ХХХХ YYYY, де XXXX - показник за день, а YYYY - показник за ніч`\n\n" +
        "📌 Наприклад: `1234` або `1234 0078`";

        await bot.sendMessage(chatId, message, {
            parse_mode: "Markdown",
            reply_markup: {
                keyboard: [
                    [{ text: "Головне меню" }]
                ],
                resize_keyboard: true
            }
        });
        
});



// Функція для надсилання звіту адміну
const sendAdminReport = async () => {
    const users = await findAllUser();
    const debtors = users.filter(user => user.balance > 0);
    if (debtors.length > 0) {
        const report = debtors.map(user => `${user.name}: ${user.balance} грн`).join('\n');
        bot.sendMessage(adminChatId, `Список користувачів із боргом:\n${report}`);
    } else {
        bot.sendMessage(adminChatId, `Немає користувачів із боргом.`);
    }
};

// Функція для нагадування про подачу показників
const remindUsersToSubmitReadings = async () => {

    const users = await findAllUser();
    
    users.forEach(user => {
        const message = `🔔 Шановний(а) ${user.name}, нагадуємо, що з 28-го по 31-ше число потрібно подати показники електролічильника.`;
        bot.sendMessage(user.chatId, message);
    });
};


bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    if (!text) return;

    // Перевірка формату: 1234 або 1234 5678
    const singleRateRegex = /^\d{4}$/;
    const doubleRateRegex = /^\d{4} \d{4}$/;

    if (singleRateRegex.test(text)) {
        await updateUserByChatId(chatId, {day: text})
        bot.sendMessage(chatId, `✅ Однотарифний лічильник: ${text} записано.`, {
            reply_markup: {
                keyboard: [
                    [{ text: "Головне меню" }]
                ],
                resize_keyboard: true
            }
        });
    } else if (doubleRateRegex.test(text)) {
        const [dayRate, nightRate] = text.split(' ');
        await updateUserByChatId(chatId, {day: dayRate, night: nightRate})
        bot.sendMessage(chatId, `✅ Двотарифний лічильник: День ${dayRate}, Ніч ${nightRate} записано.`, {
            reply_markup: {
                keyboard: [
                    [{ text: "Головне меню" }]
                ],
                resize_keyboard: true
            }
        });       
        
           
    } 
});

bot.onText(/💰 Перевірити баланс/, async (msg) => {
    const chatId = msg.chat.id;

    // Отримуємо дані користувача з бази
    const user = await findUserByChatId(chatId);

    if (!user) {
        return bot.sendMessage(chatId, "❌ Дані про ваш лічильник не знайдені.");
    }

    const { dayDifference, nightDifference, balance, night } = user;

    // Визначаємо тип лічильника
    let message;
    if (!night || night === 0) {
        message = `🔹 Однозонний лічильник\n⚡ Спожито: ${dayDifference} кВт\n💰 Баланс: ${balance} грн`;
    } else {
        message = `🔹 Двозонний лічильник\n🌞 День: ${dayDifference} кВт\n🌙 Ніч: ${nightDifference} кВт\n💰 Баланс: ${balance} грн`;
    }

    // Відправляємо повідомлення з клавіатурою
    bot.sendMessage(chatId, message, {
        reply_markup: {
            keyboard: [
                [{ text: "Головне меню" }]
            ],
            resize_keyboard: true
        }
    });
});





// Розклад для перевірки боргів (щодня о 12:00 з 1-го по 5-те число)
schedule.scheduleJob('0 12 1-5 * *', notifyUsers);

// Розклад для надсилання звіту адміну (6-го числа о 12:00)
schedule.scheduleJob('0 12 6 * *', sendAdminReport);

// Розклад для нагадування про подачу показників (25-го числа о 12:00)
schedule.scheduleJob('0 12 25 * *', remindUsersToSubmitReadings);
