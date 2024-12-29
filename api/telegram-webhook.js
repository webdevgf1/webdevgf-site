export default async function handler(req, res) {
    console.log('1. Webhook received');
    
    try {
        const chatId = req.body?.message?.chat?.id;
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];
        
        // Respond to Telegram immediately
        res.status(200).json({ ok: true });
        console.log('2. Sent 200 response');

        // Create AbortController with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, 5000);

        try {
            console.log('3. Starting fetch request');
            const response = await fetch(
                `https://api.telegram.org/bot${token}/sendMessage`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: 'Test with AbortController'
                    }),
                    signal: controller.signal
                }
            );
            
            console.log('4. Got response:', response.status);
            const data = await response.json();
            console.log('5. Response data:', data);

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Request timed out');
            } else {
                console.error('Request failed:', error);
            }
        } finally {
            clearTimeout(timeout);
        }

    } catch (error) {
        console.error('Main error:', error);
    }
}