import { Telegraf } from 'telegraf';
import { createClient } from 'redis';

export default async function handler(req, res) {
    console.log('1. Webhook received');
    console.log('Request body:', req.body);

    try {
        // Test direct Telegram message
        const bot = new Telegraf('7423027832:AAEu_46R2KXQOC1X6EbUO5B-txnGpwbnd3E');
        console.log('2. Bot created');

        if (req.body && req.body.message && req.body.message.chat) {
            console.log('3. Found chat id:', req.body.message.chat.id);
            
            // Try to send a direct test message
            await bot.telegram.sendMessage(req.body.message.chat.id, 'Test message received');
            console.log('4. Test message sent');
        }

        res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(200).json({ ok: true }); // Still return 200 to Telegram
    }
}