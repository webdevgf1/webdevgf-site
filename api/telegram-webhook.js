import { createClient } from 'redis';

async function sendTelegramMessage(token, chatId, text) {
    try {
        console.log(`Sending message: ${text}`);
        const response = await fetch(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: text })
            }
        );
        const result = await response.json();
        console.log('Message sent successfully:', result.ok);
        return result;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}

export default async function handler(req, res) {
    const update = req.body;
    const chatId = update?.message?.chat?.id;
    const messageText = update?.message?.text;
    const urlParts = req.url.split('/');
    const token = urlParts[urlParts.length - 1];

    // Respond to Telegram immediately
    res.status(200).json({ ok: true });

    try {
        // Step 1: Send initial message
        await sendTelegramMessage(token, chatId, "Step 1: Starting processing...");

        // Step 2: Test Redis
        try {
            const redis = createClient({ url: process.env.REDIS_URL });
            await sendTelegramMessage(token, chatId, "Step 2: Testing Redis connection...");
            
            await redis.connect();
            const botConfig = await redis.get(`bot:${token}`);
            await redis.disconnect();
            
            await sendTelegramMessage(token, chatId, "Step 2: Redis connection successful!");
        } catch (redisError) {
            console.error('Redis error:', redisError);
            await sendTelegramMessage(token, chatId, "Step 2: Redis connection failed!");
            return;
        }

        // Step 3: Test Claude API
        try {
            await sendTelegramMessage(token, chatId, "Step 3: Testing Claude API...");
            
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: messageText }],
                    system: "You are a helpful assistant",
                    model: 'claude-3-opus-20240229',
                    max_tokens: 1000
                })
            });

            const data = await response.json();
            
            if (data.content?.[0]?.text) {
                await sendTelegramMessage(token, chatId, "Step 3: Claude API working!");
                await sendTelegramMessage(token, chatId, data.content[0].text);
            } else {
                throw new Error('Invalid Claude API response');
            }
        } catch (claudeError) {
            console.error('Claude API error:', claudeError);
            await sendTelegramMessage(token, chatId, "Step 3: Claude API call failed!");
        }

    } catch (error) {
        console.error('Main handler error:', error);
        await sendTelegramMessage(token, chatId, "Error in processing. Please try again.");
    }
}