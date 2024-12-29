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

async function sendTelegramMessage(token, chatId, text) {
    try {
        console.log('Starting sendTelegramMessage...');
        console.log(`Parameters - chatId: ${chatId}, text length: ${text.length}`);

        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        console.log('Request URL:', url);

        const body = JSON.stringify({
            chat_id: chatId,
            text: text
        });
        console.log('Request body:', body);

        console.log('Making fetch request...');
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: body
        });
        
        console.log('Fetch response status:', response.status);
        const result = await response.json();
        console.log('API Response:', JSON.stringify(result, null, 2));

        return result;
    } catch (error) {
        console.error('Error in sendTelegramMessage:', error);
        throw error;
    }
}

export default async function handler(req, res) {
    console.log('Webhook received with message:', req.body?.message?.text);

    try {
        const update = req.body;
        const chatId = update?.message?.chat?.id;
        const messageText = update?.message?.text;

        if (!chatId || !messageText) {
            console.log('Invalid update:', update);
            return res.status(400).json({ error: 'Invalid update' });
        }

        // Get bot token from URL
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];
        console.log('Processing message for chat ID:', chatId);

        // Send test message first
        console.log('Sending test message...');
        await sendTelegramMessage(token, chatId, "Test message before processing...");
        
        // Send response to Telegram after initial message
        res.status(200).json({ ok: true });

        // Continue with regular processing...
        try {
            await sendTelegramMessage(token, chatId, "Processing your message...");
            console.log('Initial message sent successfully');

            // Get bot config from Redis
            if (!redis.isOpen) {
                await redis.connect();
            }

            const botConfig = await redis.get(`bot:${token}`);
            const config = botConfig ? JSON.parse(botConfig) : null;
            console.log('Bot config:', config);

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
            console.log('Claude response:', data);
            
            if (data.content?.[0]?.text) {
                await sendTelegramMessage(token, chatId, data.content[0].text);
                console.log('Final response sent');
            } else {
                throw new Error('Invalid Claude API response');
            }
        } catch (error) {
            console.error('Processing error:', error);
            await sendTelegramMessage(token, chatId, "Sorry, I encountered an error. Please try again.");
        }

    } catch (error) {
        console.error('Main handler error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (redis.isOpen) {
            await redis.disconnect();
        }
    }
}