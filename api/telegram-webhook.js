import { Telegraf } from 'telegraf';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    console.log('Webhook received request:', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body
    });

    if (req.method !== 'POST') {
        console.log(`Invalid method: ${req.method}`);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const update = req.body;
        console.log('Telegram update:', JSON.stringify(update, null, 2));
        
        if (!update || !update.message || !update.message.text) {
            console.log('Invalid update object:', update);
            return res.status(200).end();
        }

        // Get bot token from URL
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];
        console.log('Bot token from URL:', token);

        // Get bot config
        const botConfig = await kv.get(`bot:${token}`);
        console.log('Bot config:', botConfig);
        
        if (!botConfig) {
            console.error('Bot config not found for token:', token);
            return res.status(400).json({ error: 'Bot not configured' });
        }

        const bot = new Telegraf(token);

        try {
            // Send typing indicator
            console.log('Sending typing action...');
            await bot.telegram.sendChatAction(update.message.chat.id, 'typing');

            console.log('Making Claude API request...');
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
                    model: 'claude-3-opus-20240229',
                    max_tokens: 1000
                })
            });

            console.log('Claude API response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Claude API error:', errorText);
                throw new Error(`Claude API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Claude API response:', data);
            
            if (data.content && data.content[0] && data.content[0].text) {
                console.log('Sending message back to user...');
                await bot.telegram.sendMessage(update.message.chat.id, data.content[0].text, {
                    parse_mode: 'Markdown'
                });
                console.log('Message sent successfully');
            } else {
                throw new Error('Invalid Claude API response format');
            }
        } catch (error) {
            console.error('Error processing message:', error);
            await bot.telegram.sendMessage(
                update.message.chat.id, 
                'Sorry, I encountered an error processing your message. Please try again later.'
            );
        }

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Webhook handler error:', error);
        return res.status(500).json({ error: 'Webhook processing failed: ' + error.message });
    }
}