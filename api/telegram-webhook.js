import { Telegraf } from 'telegraf';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).end();
    }

    try {
        const { botConfig } = global;
        if (!botConfig || !botConfig.token) {
            return res.status(400).json({ error: 'Bot not configured' });
        }

        const bot = new Telegraf(botConfig.token);
        const update = req.body;

        if (update.message) {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    messages: [{
                        role: 'user',
                        content: update.message.text
                    }],
                    system: botConfig.systemPrompt,
                    model: 'claude-3-opus-20240229'
                })
            });

            const data = await response.json();
            if (data.content && data.content[0] && data.content[0].text) {
                await bot.telegram.sendMessage(update.message.chat.id, data.content[0].text);
            }
        }

        res.status(200).end();
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
}