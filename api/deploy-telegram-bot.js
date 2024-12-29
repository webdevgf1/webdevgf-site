import { Telegraf } from 'telegraf';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { token, agent, systemPrompt } = req.body;

            if (!token) {
                return res.status(400).json({ error: 'Bot token is required' });
            }

            const bot = new Telegraf(token);
            
            // Get your Vercel deployment URL
            const VERCEL_URL = req.headers.host || process.env.VERCEL_URL;
            
            // Set webhook URL
            const webhookUrl = `https://${VERCEL_URL}/api/telegram-webhook`;
            await bot.telegram.setWebhook(webhookUrl);

            // Store bot config in KV storage
            await kv.set(`bot:${token}`, {
                agent,
                systemPrompt
            });

            res.status(200).json({ success: true, message: 'Bot deployed successfully' });
        } catch (error) {
            console.error('Bot deployment error:', error);
            res.status(500).json({ error: 'Failed to deploy bot: ' + error.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}