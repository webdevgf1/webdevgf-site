import { createClient } from 'redis';

// Create Redis client
const redis = createClient({
    url: process.env.REDIS_URL,
    socket: {
        connectTimeout: 10000
    }
});

// Helper function to send messages
async function sendTelegramMessage(token, chatId, text) {
    const response = await fetch(
        'https://api.telegram.org/bot' + token + '/sendMessage',
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
    return await response.json();
}

export default async function handler(req, res) {
    console.log('Webhook received');
    
    try {
        const chatId = req.body?.message?.chat?.id;
        const messageText = req.body?.message?.text;
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];
        
        // Respond to Telegram immediately
        res.status(200).json({ ok: true });

        // Send acknowledgment
        await sendTelegramMessage(token, chatId, "Processing your message...");

        try {
            // Connect to Redis and get bot config
            if (!redis.isOpen) {
                await redis.connect();
            }
            const botConfig = await redis.get(`bot:${token}`);
            const config = botConfig ? JSON.parse(botConfig) : null;
            
            // Make Claude API request
            const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
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

            const claudeData = await claudeResponse.json();
            
            if (claudeData.content?.[0]?.text) {
                await sendTelegramMessage(token, chatId, claudeData.content[0].text);
            } else {
                throw new Error('Invalid Claude API response');
            }

        } catch (error) {
            console.error('Processing error:', error);
            await sendTelegramMessage(token, chatId, "Sorry, I encountered an error. Please try again.");
        } finally {
            if (redis.isOpen) {
                await redis.disconnect();
            }
        }

    } catch (error) {
        console.error('Main handler error:', error);
    }
}