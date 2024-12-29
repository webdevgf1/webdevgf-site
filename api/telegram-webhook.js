import https from 'https';

export default async function handler(req, res) {
    console.log('1. Webhook received');
    
    try {
        const chatId = req.body?.message?.chat?.id;
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];
        
        // Respond to Telegram immediately
        res.status(200).json({ ok: true });
        console.log('2. Sent 200 response');

        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${token}/sendMessage?chat_id=${chatId}&text=Test`,
            method: 'GET',
            timeout: 5000 // 5 second timeout
        };

        console.log('3. Making request with options:', options);

        const request = https.request(options);

        request.on('timeout', () => {
            console.log('4a. Request timed out');
            request.destroy();
        });

        request.on('error', (error) => {
            console.log('4b. Request error:', error.message);
        });

        request.on('response', (response) => {
            console.log('4c. Got response:', response.statusCode);
            
            response.on('data', (chunk) => {
                console.log('5. Got data:', chunk.toString());
            });

            response.on('end', () => {
                console.log('6. Response complete');
            });
        });

        request.end();
        console.log('7. Request sent');

    } catch (error) {
        console.error('Error:', error);
    }
}