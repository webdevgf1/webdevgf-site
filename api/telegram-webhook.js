export default async function handler(req, res) {
    console.log('Webhook received');
    
    try {
        const chatId = req.body?.message?.chat?.id;
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];
        
        // Log initial details
        console.log('Chat ID:', chatId);
        console.log('Token:', token);
        
        // Respond to Telegram immediately
        res.status(200).json({ ok: true });

        console.log('Making telegram request...');
        
        const response = await fetch(
            'https://api.telegram.org/bot' + token + '/sendMessage',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: 'Simple test message'
                })
            }
        );

        const data = await response.json();
        console.log('Telegram response:', data);

        if (!data.ok) {
            throw new Error('Telegram API error: ' + JSON.stringify(data));
        }

    } catch (error) {
        console.error('Error:', error.message);
        console.error('Full error:', error);
    }
}