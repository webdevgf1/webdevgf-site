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
        const chatId = update?.message?.chat?.id;
        const messageText = update?.message?.text;

        if (!chatId || !messageText) {
            console.log('Invalid update:', update);
            return;
        }

        // Get bot token from URL
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];
        console.log('Processing message for chat ID:', chatId);

        // Send initial response
        await sendTelegramMessage(token, chatId, "Processing your message...");

        // Get bot config from Redis
        if (!redis.isOpen) {
            await redis.connect();
        }

        const botConfig = await redis.get(`bot:${token}`);
        const config = botConfig ? JSON.parse(botConfig) : null;
        console.log('Bot config:', config);

        try {
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
                        content: messageText
                    }],
                    system: config?.systemPrompt || "You are a helpful assistant",
                    model: 'claude-3-opus-20240229',
                    max_tokens: 1000
                })
            });

            const data = await response.json();
            
            if (data.content?.[0]?.text) {
                await sendTelegramMessage(token, chatId, data.content[0].text);
            } else {
                throw new Error('Invalid Claude API response');
            }
        } catch (error) {
            console.error('Error processing message:', error);
            await sendTelegramMessage(token, chatId, "Sorry, I encountered an error. Please try again.");
        }

    } catch (error) {
        console.error('Main handler error:', error);
    } finally {
        if (redis.isOpen) {
            await redis.disconnect();
        }
    }
}

async function sendTelegramMessage(token, chatId, text) {
    try {
        console.log('Sending message to chat ID:', chatId);
        const response = await fetch(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: text
                })
            }
        );
        
        const result = await response.json();
        console.log('Telegram API response:', result);
        return result;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}