export default async function handler(req, res) {
    console.log('1. Webhook received');
    
    try {
        const chatId = req.body?.message?.chat?.id;
        const messageText = req.body?.message?.text;
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];
        
        console.log('2. Message details:', { chatId, messageText });
        
        // Respond to Telegram immediately
        res.status(200).json({ ok: true });
        console.log('3. Sent 200 response');

        console.log('4. Attempting to send acknowledgment...');
        
        try {
            const response = await fetch(
                'https://api.telegram.org/bot' + token + '/sendMessage',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: "Processing your message..."
                    })
                }
            );
            
            const data = await response.json();
            console.log('5. Telegram response:', data);
            
            if (!data.ok) {
                throw new Error('Telegram API error: ' + JSON.stringify(data));
            }
            
            console.log('6. Successfully sent acknowledgment');

        } catch (error) {
            console.error('7. Error sending message:', error);
            throw error;
        }

    } catch (error) {
        console.error('8. Main handler error:', error);
    }
}