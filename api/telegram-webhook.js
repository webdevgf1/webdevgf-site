export default async function handler(req, res) {
    console.log('Webhook received');
    
    try {
        const chatId = req.body?.message?.chat?.id;
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];
        
        // First respond to Telegram
        res.status(200).json({ ok: true });

        // Use the method we know works
        const apiUrl = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=Test direct message`;
        
        console.log('Making request to:', apiUrl);
        const response = await fetch(apiUrl);
        const result = await response.json();
        console.log('Response:', result);

    } catch (error) {
        console.error('Error:', error);
    }
}