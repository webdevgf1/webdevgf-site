import { Telegraf } from 'telegraf';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        console.log(`Received ${req.method} request instead of POST`);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('Received webhook request');
        const update = req.body;
        
        // Validate update object
        if (!update || !update.message || !update.message.text) {
            console.log('Invalid update object, skipping');
            return res.status(200).end();
        }

        // Get bot token from the webhook URL
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];
        console.log('Processing message for bot:', token.slice(0, 10) + '...');

        // Get bot config from KV storage
        const botConfig = await kv.get(`bot:${token}`);
        
        if (!botConfig) {
            console.error('Bot configuration not found');
            return res.status(400).json({ error: 'Bot not configured' });
        }

        const bot = new Telegraf(token);

        // Send typing action
        await bot.telegram.sendChatAction(update.message.chat.id, 'typing');

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
                        content: update.message.text
                    }],
                    system: botConfig.systemPrompt,
                    model: 'claude-3-opus-20240229',
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                throw new Error(`Anthropic API error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.content && data.content[0] && data.content[0].text) {
                await bot.telegram.sendMessage(update.message.chat.id, data.content[0].text, {
                    parse_mode: 'Markdown'
                });
            } else {
                throw new Error('Invalid response format from Anthropic API');
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
        console.error('Webhook error:', error);
        return res.status(500).json({ error: 'Webhook processing failed' });
    }
}