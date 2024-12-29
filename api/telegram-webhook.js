import { Telegraf } from 'telegraf';
import { createClient } from 'redis';

// Create Redis client
const redis = createClient({
    url: process.env.REDIS_URL
});

export default async function handler(req, res) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    console.log('Webhook received:', {
        method: req.method,
        headers: req.headers,
        url: req.url,
        body: JSON.stringify(req.body, null, 2)
    });

    if (req.method !== 'POST') {
        return res.status(200).end(); // More permissive with non-POST requests
    }

    try {
        // Always respond 200 to Telegram first
        res.status(200).json({ ok: true });

        const update = req.body;
        if (!update || !update.message) {
            console.log('No message in update:', update);
            return;
        }

        // Get bot token from URL
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];
        console.log('Processing for bot token:', token);

        // Connect to Redis only when needed
        if (!redis.isOpen) {
            console.log('Connecting to Redis...');
            await redis.connect();
        }

        // Get bot config
        const botConfigStr = await redis.get(`bot:${token}`);
        console.log('Redis response:', botConfigStr);
        
        if (!botConfigStr) {
            console.error('No bot config found for token');
            return;
        }

        const botConfig = JSON.parse(botConfigStr);
        console.log('Bot config loaded:', botConfig);

        const bot = new Telegraf(token);

        // Send typing action
        await bot.telegram.sendChatAction(update.message.chat.id, 'typing');

        // Make Claude API request
        console.log('Sending request to Claude...');
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
                    content: update.message.text || ''
                }],
                system: botConfig.systemPrompt,
                model: 'claude-3-opus-20240229',
                max_tokens: 1000
            })
        });

        console.log('Claude response status:', response.status);
        const data = await response.json();
        console.log('Claude response:', data);

        if (data.content && data.content[0] && data.content[0].text) {
            await bot.telegram.sendMessage(update.message.chat.id, data.content[0].text);
            console.log('Response sent to user');
        }

    } catch (error) {
        console.error('Webhook processing error:', error);
        // Don't send error response to Telegram - we already sent 200
    } finally {
        // Clean up Redis connection
        if (redis && redis.isOpen) {
            await redis.disconnect();
        }
    }
}