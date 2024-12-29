import { Telegraf } from 'telegraf';

export default async function handler(req, res) {
    console.log('Webhook received with message:', req.body?.message?.text);

    // Always respond OK to Telegram first
    res.status(200).json({ ok: true });

    try {
        const update = req.body;
        if (!update?.message?.chat?.id) {
            console.log('No valid message in update');
            return;
        }

        // Get bot token from URL
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];
        console.log('Token:', token);

        // Create bot instance
        const bot = new Telegraf(token);

        // Try to send a simple test message
        try {
            console.log('Attempting to send message...');
            await bot.telegram.sendMessage(update.message.chat.id, "Test message - I received your message!");
            console.log('Message sent successfully');
        } catch (error) {
            console.error('Error sending message:', error);
        }

    } catch (error) {
        console.error('Main handler error:', error);
    }
}