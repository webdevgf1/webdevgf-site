import { Telegraf } from 'telegraf';
import { createClient } from 'redis';

export default async function handler(req, res) {
    console.log('Starting deployment handler');
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const redis = createClient({
        url: process.env.REDIS_URL
    });

    try {
        const { token, agent, systemPrompt } = req.body;
        console.log('Received deployment request for token:', token);

        // Connect to Redis
        console.log('Connecting to Redis...');
        await redis.connect();
        console.log('Redis connected');

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

        // Set up webhook
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
                    allowed_updates: ['message']
                })
            }
        );

        const webhookResult = await setWebhookResponse.json();
        console.log('Webhook setup result:', webhookResult);

        if (!webhookResult.ok) {
            throw new Error(`Failed to set webhook: ${webhookResult.description}`);
        }

        await redis.disconnect();
        console.log('Deployment completed successfully');

        res.status(200).json({
            success: true,
            message: 'Bot deployed successfully',
            webhook_url: webhookUrl,
            config_stored: true
        });
    } catch (error) {
        console.error('Deployment error:', error);
        if (redis.isOpen) {
            await redis.disconnect();
        }
        res.status(500).json({ error: 'Failed to deploy bot: ' + error.message });
    }
}