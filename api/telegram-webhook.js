import { Telegraf } from 'telegraf';

export default async function handler(req, res) {
    console.log('Webhook received with message:', req.body?.message?.text);
    console.log('Full update object:', JSON.stringify(req.body, null, 2));

    // Always respond OK to Telegram first
    res.status(200).json({ ok: true });

    try {
        const update = req.body;
        const chatId = update?.message?.chat?.id;
        console.log('Chat ID:', chatId);

        if (!chatId) {
            console.log('No valid chat ID found in update');
            return;
        }

        // Get bot token from URL
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];
        console.log('Using token:', token);

        // Try direct API call first
        try {
            console.log('Attempting direct API call...');
            const response = await fetch(
                `https://api.telegram.org/bot${token}/sendMessage`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: "Test message via direct API call"
                    })
                }
            );
            
            const result = await response.json();
            console.log('Direct API response:', JSON.stringify(result, null, 2));
        } catch (error) {
            console.error('Direct API error:', error);
        }

        // Try telegraf
        try {
            console.log('Attempting Telegraf send...');
            const bot = new Telegraf(token);
            await bot.telegram.sendMessage(chatId, "Test message via Telegraf");
            console.log('Telegraf message sent successfully');
        } catch (error) {
            console.error('Telegraf error:', error.message);
            console.error('Full error:', error);
        }

    } catch (error) {
        console.error('Main handler error:', error);
    }
}