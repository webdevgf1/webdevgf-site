import { Telegraf } from 'telegraf';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { token, agent, systemPrompt } = req.body;

            if (!token) {
                return res.status(400).json({ error: 'Bot token is required' });
            }

            const bot = new Telegraf(token);
            const VERCEL_URL = process.env.VERCEL_URL;
            
            // Set webhook URL to your Vercel deployment
            const webhookUrl = `https://${VERCEL_URL}/api/telegram-webhook`;
            await bot.telegram.setWebhook(webhookUrl);

            // Store bot info in environment or database
            // This is just an example - you'll need to implement proper storage
            global.botConfig = {
                token,
                agent,
                systemPrompt
            };

            res.status(200).json({ success: true, message: 'Bot deployed successfully' });
        } catch (error) {
            console.error('Bot deployment error:', error);
            res.status(500).json({ error: 'Failed to deploy bot: ' + error.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}