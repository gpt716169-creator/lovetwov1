import { supabase } from '../lib/supabase';

const BOT_TOKEN = '8106796956:AAG8-LrFYp01F1pG1UkE9MdQHdaDLwUY6QU';
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Sends a text message to a specific Telegram Chat ID.
 */
const sendMessage = async (chatId, text) => {
    if (!chatId) return;
    try {
        await fetch(`${BASE_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });
    } catch (error) {
        console.error('Failed to send Telegram notification:', error);
    }
};

/**
 * Fetches the partner's Telegram ID from Supabase.
 */
const getPartnerTelegramId = async (partnerUuid) => {
    if (!partnerUuid) return null;
    const { data } = await supabase
        .from('profiles')
        .select('telegram_id')
        .eq('id', partnerUuid)
        .single();
    return data?.telegram_id;
};

export const TelegramService = {
    /**
     * Notify partner about "Intimacy Signal"
     */
    notifyIntimacySignal: async (partnerUuid, senderName) => {
        const chatId = await getPartnerTelegramId(partnerUuid);
        if (!chatId) return;

        const messages = [
            `🔥 <b>Горячий сигнал!</b>\n\n${senderName} хочет тебя прямо сейчас... Не заставляй ждать! 😈`,
            `🔥 <b>Внимание!</b>\n\n${senderName} сгорает от желания. Время действовать! 💋`,
            `🔥 <b>Срочно в спальню!</b>\n\n${senderName} посылает очень недвусмысленный сигнал... ❤️‍🔥`
        ];
        const text = messages[Math.floor(Math.random() * messages.length)];
        await sendMessage(chatId, text);
    },

    /**
     * Notify partner about a new Task/Quest
     */
    notifyNewTask: async (partnerUuid, senderName, taskTitle, reward) => {
        const chatId = await getPartnerTelegramId(partnerUuid);
        if (!chatId) return;

        const text = `📝 <b>Новое задание!</b>\n\n${senderName} добавил(а) квест: <b>"${taskTitle}"</b>\nНаграда: ${reward} 🪙\n\nПоспеши выполнить!`;
        await sendMessage(chatId, text);
    },

    /**
     * Notify partner about a new Wish
     */
    notifyNewWish: async (partnerUuid, senderName, wishTitle, price) => {
        const chatId = await getPartnerTelegramId(partnerUuid);
        if (!chatId) return;

        const text = `✨ <b>Новое желание!</b>\n\n${senderName} мечтает о: <b>"${wishTitle}"</b>\nЦена: ${price} 🪙\n\nМожет, пора порадовать любимку?`;
        await sendMessage(chatId, text);
    },

    /**
     * Notify partner about a new Fantasy
     */
    notifyNewFantasy: async (partnerUuid, senderName, fantasyTitle) => {
        const chatId = await getPartnerTelegramId(partnerUuid);
        if (!chatId) return;

        const text = `🎭 <b>Новая фантазия...</b>\n\n${senderName} добавил(а) что-то интересное в Красную Комнату: <b>"${fantasyTitle}"</b>\n\nЗайди почитать... и воплотить 🤫`;
        await sendMessage(chatId, text);
    }
};
