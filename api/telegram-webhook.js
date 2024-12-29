export default async function handler(req, res) {
    console.log('1. Webhook received');
    
    try {
        const chatId = req.body?.message?.chat?.id;
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];
        
        // Log initial details
        console.log('2. Processing message for:', { chatId, token });
        
        // Respond to Telegram immediately
        res.status(200).json({ ok: true });
        console.log('3. Sent 200 response');

        // Use URL method that worked in browser
        const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=Test message via URL`;
        console.log('4. Making request to URL:', url);
        
        const response = await fetch(url);
        console.log('5. Got response status:', response.status);

        const data = await response.json();
        console.log('6. Response data:', data);

    } catch (error) {
        console.error('Error:', error.message);
        console.error('Full error:', error);
    }
}