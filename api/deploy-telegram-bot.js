import { Telegraf } from 'telegraf';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('Received deployment request');

    try {
        const { token, agent, systemPrompt } = req.body;

        if (!token) {
            console.log('No token provided');
            return res.status(400).json({ error: 'Bot token is required' });
        }

        console.log('Creating bot instance');
        const bot = new Telegraf(token);

        // Add error handler
        bot.catch((err, ctx) => {
            console.error('Bot error:', err);
            ctx.reply('An error occurred while processing your message');
        });

        // Setup message handler with logging
        bot.on('message', async (ctx) => {
            console.log('Received message:', ctx.message.text);
            
            try {
                console.log('Making AI request with prompt:', systemPrompt);
                
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
                console.log('AI response:', data);

                if (data.content && data.content[0] && data.content[0].text) {
                    await ctx.reply(data.content[0].text);
                } else {
                    console.error('Unexpected AI response format:', data);
                    await ctx.reply('Sorry, I received an unexpected response format.');
                }
            } catch (error) {
                console.error('Error processing message:', error);
                await ctx.reply('Sorry, I encountered an error processing your message.');
            }
        });

        console.log('Starting bot');
        await bot.launch();
        console.log('Bot launched successfully');

        res.status(200).json({ success: true, message: 'Bot deployed successfully' });
    } catch (error) {
        console.error('Bot deployment error:', error);
        res.status(500).json({ error: 'Failed to deploy bot: ' + error.message });
    }
}