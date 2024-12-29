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
    console.log('Starting deployment handler');
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { token, agent, systemPrompt } = req.body;
        console.log('Received deployment request for token:', token);

        // Connect to Redis
        console.log('Connecting to Redis...');
        if (!redis.isOpen) {
            await redis.connect();
        }
        console.log('Redis connected');

        // First verify bot token is valid
        try {
            const bot = new Telegraf(token);
            const botInfo = await bot.telegram.getMe();
            console.log('Bot info verified:', botInfo);
        } catch (error) {
            throw new Error('Invalid bot token: ' + error.message);
        }

        // Store bot configuration
        const botConfig = {
            agent,
            systemPrompt,
            created_at: new Date().toISOString()
        };
        
        console.log('Storing bot config:', botConfig);
        await redis.set(`bot:${token}`, JSON.stringify(botConfig));
        console.log('Bot config stored in Redis');

        // Verify storage
        const storedConfig = await redis.get(`bot:${token}`);
        console.log('Verified stored config:', storedConfig);

        // Delete any existing webhook
        console.log('Deleting existing webhook...');
        await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);

        // Set up new webhook
        const webhookUrl = `https://www.webdevgf.xyz/api/telegram-webhook/${token}`;
        console.log('Setting webhook to:', webhookUrl);

        const setWebhookResponse = await fetch(
            `https://api.telegram.org/bot${token}/setWebhook`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: webhookUrl,
                    allowed_updates: ['message'],
                    drop_pending_updates: true
                })
            }
        );

        const webhookResult = await setWebhookResponse.json();
        console.log('Webhook setup result:', webhookResult);

        if (!webhookResult.ok) {
            throw new Error(`Failed to set webhook: ${webhookResult.description}`);
        }

        // Verify webhook was set
        const webhookInfo = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then(r => r.json());
        console.log('Webhook info:', webhookInfo);

        res.status(200).json({
            success: true,
            message: 'Bot deployed successfully',
            webhook_url: webhookUrl,
            config_stored: true,
            webhook_info: webhookInfo
        });
    } catch (error) {
        console.error('Deployment error:', error);
        res.status(500).json({ error: 'Failed to deploy bot: ' + error.message });
    } finally {
        try {
            if (redis && redis.isOpen) {
                await redis.disconnect();
            }
        } catch (error) {
            console.error('Error disconnecting from Redis:', error);
        }
    }
}