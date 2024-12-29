import { Telegraf } from 'telegraf';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { token, agent, systemPrompt } = req.body;
            console.log('Deploying bot with token:', token.slice(0, 10) + '...');
            console.log('VERCEL_URL:', process.env.VERCEL_URL);

            if (!token) {
                return res.status(400).json({ error: 'Bot token is required' });
            }

            // Validate token format
            if (!/^\d+:[A-Za-z0-9_-]{35,}$/.test(token)) {
                return res.status(400).json({ error: 'Invalid bot token format' });
            }

            const bot = new Telegraf(token);
            
            // Get your Vercel deployment URL
            const VERCEL_URL = process.env.VERCEL_URL || req.headers.host;
            if (!VERCEL_URL) {
                throw new Error('VERCEL_URL is not defined');
            }

            // Set webhook URL with the token in the path
            const webhookUrl = `https://${VERCEL_URL}/api/telegram-webhook/${token}`;
            console.log('Setting webhook URL:', webhookUrl);
            
            try {
                // Test bot token by getting bot info
                const botInfo = await bot.telegram.getMe();
                console.log('Bot info retrieved:', botInfo);
                
                // Delete any existing webhook
                console.log('Deleting existing webhook...');
                await bot.telegram.deleteWebhook();
                
                // Set new webhook
                console.log('Setting new webhook...');
                await bot.telegram.setWebhook(webhookUrl, {
                    allowed_updates: ['message'],
                    drop_pending_updates: true
                });
                
                // Verify webhook was set
                const webhookInfo = await bot.telegram.getWebhookInfo();
                console.log('Webhook info:', webhookInfo);
                
                if (!webhookInfo.url) {
                    throw new Error('Webhook setup failed - URL is empty');
                }

                // Store bot config in KV storage
                await kv.set(`bot:${token}`, {
                    agent,
                    systemPrompt,
                    created_at: new Date().toISOString()
                });

                res.status(200).json({ 
                    success: true, 
                    message: 'Bot deployed successfully',
                    webhook_url: webhookUrl,
                    webhook_info: webhookInfo
                });
            } catch (error) {
                console.error('Error during webhook setup:', error);
                if (error.response && error.response.description === 'Unauthorized') {
                    return res.status(400).json({ error: 'Invalid bot token' });
                }
                throw error;
            }
        } catch (error) {
            console.error('Bot deployment error:', error);
            res.status(500).json({ 
                error: 'Failed to deploy bot: ' + error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}