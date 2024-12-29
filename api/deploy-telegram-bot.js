import { Telegraf } from 'telegraf';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { token, agent, systemPrompt } = req.body;
            console.log('Starting bot deployment...');

            if (!token) {
                return res.status(400).json({ error: 'Bot token is required' });
            }

            const bot = new Telegraf(token);
            
            // First, delete any existing webhook
            console.log('Deleting existing webhook...');
            await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);

            // Construct webhook URL - ensuring we use the non-www domain
            const webhookUrl = `https://webdevgf.xyz/api/telegram-webhook/${token}`;
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

            // Store bot config in KV storage
            await kv.set(`bot:${token}`, {
                agent,
                systemPrompt,
                created_at: new Date().toISOString()
            });

            // Get webhook info to verify
            const webhookInfo = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then(r => r.json());
            
            res.status(200).json({ 
                success: true, 
                message: 'Bot deployed successfully',
                webhook_url: webhookUrl,
                webhook_info: webhookInfo
            });
        } catch (error) {
            console.error('Bot deployment error:', error);
            res.status(500).json({ error: 'Failed to deploy bot: ' + error.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}