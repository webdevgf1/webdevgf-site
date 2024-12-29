import axios from 'axios';

export default async function handler(req, res) {
    console.log('Webhook received');
    
    try {
        const chatId = req.body?.message?.chat?.id;
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];
        
        // Respond to Telegram immediately
        res.status(200).json({ ok: true });

        console.log('Sending message attempt 1...');
        const response = await axios({
            method: 'post',
            url: `https://api.telegram.org/bot${token}/sendMessage`,
            data: {
                chat_id: chatId,
                text: 'Test message via axios'
            },
            timeout: 5000
        });

        console.log('Response from Telegram:', response.data);

    } catch (error) {
        console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
    }
}