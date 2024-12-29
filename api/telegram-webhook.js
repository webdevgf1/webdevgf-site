import { Telegraf } from 'telegraf';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    console.log('Received webhook request:', req.method, req.url);
    
    if (req.method !== 'POST') {
        return res.status(405).end();
    }

    try {
        const update = req.body;
        console.log('Received update:', JSON.stringify(update, null, 2));
        
        if (!update || !update.message || !update.message.text) {
            console.log('Invalid update object, skipping');
            return res.status(200).end();
        }

        // Get bot token from the webhook URL
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];
        console.log('Extracted token from URL:', token.slice(0, 10) + '...');

        // Get bot config from KV storage
        const botConfig = await kv.get(`bot:${token}`);
        console.log('Retrieved bot config:', botConfig ? 'Found' : 'Not found');
        
        if (!botConfig) {
            console.error('Bot configuration not found for token:', token.slice(0, 10) + '...');
            return res.status(400).json({ error: 'Bot not configured' });
        }

        const bot = new Telegraf(token);

        try {
            console.log('Sending typing action...');
            await bot.telegram.sendChatAction(update.message.chat.id, 'typing');

            console.log('Making request to Anthropic API...');
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
                const errorText = await response.text();
                console.error('Anthropic API error:', response.status, errorText);
                throw new Error(`Anthropic API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Received response from Anthropic:', data ? 'Success' : 'Empty response');
            
            if (data.content && data.content[0] && data.content[0].text) {
                console.log('Sending message back to user...');
                await bot.telegram.sendMessage(update.message.chat.id, data.content[0].text, {
                    parse_mode: 'Markdown'
                });
                console.log('Message sent successfully');
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

        res.status(200).end();
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
}