import { Telegraf } from 'telegraf';
import { createClient } from 'redis';

// Create Redis client
const redis = createClient({
    url: process.env.REDIS_URL
});

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            // Connect to Redis
            if (!redis.isOpen) {
                await redis.connect();
            }

            const { token, agent, systemPrompt } = req.body;
            console.log('Starting bot deployment...');

            if (!token) {
                return res.status(400).json({ error: 'Bot token is required' });
            }

            const bot = new Telegraf(token);
            
            // First, delete any existing webhook
            console.log('Deleting existing webhook...');
            await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);

            // Construct webhook URL using www subdomain
            const webhookUrl = `https://www.webdevgf.xyz/api/telegram-webhook/${token}`;
            console.log('Setting webhook to:', webhookUrl);

            // Set webhook directly using Telegram API
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
                        drop_pending_updates: true,
                        max_connections: 100
                    })
                }
            );

            const webhookResult = await setWebhookResponse.json();
            console.log('Webhook setup result:', webhookResult);

            if (!webhookResult.ok) {
                throw new Error(`Failed to set webhook: ${webhookResult.description}`);
            }

            // Store bot config in Redis
            await redis.set(`bot:${token}`, JSON.stringify({
                agent,
                systemPrompt,
                created_at: new Date().toISOString()
            }));

            // Get webhook info to verify
            const webhookInfo = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then(r => r.json());
            
            await redis.disconnect();
            res.status(200).json({ 
                success: true, 
                message: 'Bot deployed successfully',
                webhook_url: webhookUrl,
                webhook_info: webhookInfo
            });
        } catch (error) {
            console.error('Bot deployment error:', error);
            if (redis.isOpen) {
                await redis.disconnect();
            }
            res.status(500).json({ error: 'Failed to deploy bot: ' + error.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}