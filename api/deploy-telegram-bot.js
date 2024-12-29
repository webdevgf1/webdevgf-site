import { Telegraf } from 'telegraf';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { token, agent, systemPrompt } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Bot token is required' });
        }

        // Create new bot instance
        const bot = new Telegraf(token);

        // Setup message handler
        bot.on('message', async (ctx) => {
            try {
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
                            content: ctx.message.text
                        }],
                        system: systemPrompt,
                        model: 'claude-3-opus-20240229'
                    })
                });

                const data = await response.json();
                await ctx.reply(data.content[0].text);
            } catch (error) {
                console.error('Error processing message:', error);
                await ctx.reply('Sorry, I encountered an error processing your message.');
            }
        });

        // Start bot
        await bot.launch();

        res.status(200).json({ success: true, message: 'Bot deployed successfully' });
    } catch (error) {
        console.error('Bot deployment error:', error);
        res.status(500).json({ error: 'Failed to deploy bot: ' + error.message });
    }
}