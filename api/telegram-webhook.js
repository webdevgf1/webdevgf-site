export default async function handler(req, res) {
    console.log('Webhook received');
    
    // Always respond to Telegram first
    res.status(200).json({ ok: true });

    try {
        const chatId = req.body?.message?.chat?.id;
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];

        // Function to send message with better error handling
        async function sendMessage(text) {
            try {
                console.log('Sending message:', text);
                const response = await fetch(
                    `https://api.telegram.org/bot${token}/sendMessage`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            chat_id: chatId, 
                            text: text
                        })
                    }
                );
                
                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`HTTP error! status: ${response.status}, body: ${errorData}`);
                }
                
                const result = await response.json();
                console.log('Message sent result:', result);
                return result;
            } catch (error) {
                console.error('Error sending message:', error);
                throw error;
            }
        }

        // Send messages with delays between them
        await sendMessage("Message 1");
        await new Promise(resolve => setTimeout(resolve, 1000));
        await sendMessage("Message 2");
        await new Promise(resolve => setTimeout(resolve, 1000));
        await sendMessage("Message 3");

    } catch (error) {
        console.error('Handler error:', error);
    }
}