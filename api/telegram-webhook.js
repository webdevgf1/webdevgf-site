import { Telegraf } from 'telegraf';
import { createClient } from 'redis';

// Create Redis client with better timeout and retry options
const redis = createClient({
    url: process.env.REDIS_URL,
    socket: {
        connectTimeout: 10000,
        reconnectStrategy: (retries) => {
            if (retries > 10) return new Error('Too many retries');
            return Math.min(retries * 100, 3000);
        }
    }
});

redis.on('error', (err) => console.error('Redis Client Error:', err));

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

        // Create bot instance first
        const bot = new Telegraf(token);

        // Try to send a direct test message first
        try {
            await bot.telegram.sendMessage(update.message.chat.id, "Processing your message...");
            console.log('Initial message sent successfully');
        } catch (error) {
            console.error('Error sending initial message:', error);
            return;
        }

        // Now try Redis connection
        try {
            if (!redis.isOpen) {
                console.log('Connecting to Redis...');
                await redis.connect();
            }

            const botConfig = await redis.get(`bot:${token}`);
            if (!botConfig) {
                console.log('No bot config found, using default prompt');
                await bot.telegram.sendMessage(
                    update.message.chat.id, 
                    "I'm here to help! What would you like to know?"
                );
                return;
            }

            // Make Claude API request
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
                    system: JSON.parse(botConfig).systemPrompt || "You are a helpful assistant",
                    model: 'claude-3-opus-20240229',
                    max_tokens: 1000
                })
            });

            const data = await response.json();
            
            if (data.content?.[0]?.text) {
                await bot.telegram.sendMessage(update.message.chat.id, data.content[0].text);
                console.log('Response sent successfully');
            }

        } catch (redisError) {
            console.error('Redis error:', redisError);
            // If Redis fails, still try to respond
            await bot.telegram.sendMessage(
                update.message.chat.id, 
                "I'm here to help! What would you like to know?"
            );
        }

    } catch (error) {
        console.error('Main handler error:', error);
    } finally {
        try {
            if (redis.isOpen) await redis.disconnect();
        } catch (error) {
            console.error('Error disconnecting from Redis:', error);
        }
    }
}