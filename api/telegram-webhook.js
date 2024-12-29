import https from 'https';

export default async function handler(req, res) {
    console.log('1. Webhook received');
    
    try {
        const chatId = req.body?.message?.chat?.id;
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];
        
        console.log('2. Processing message for:', { chatId, token });
        
        // Respond to Telegram immediately
        res.status(200).json({ ok: true });
        console.log('3. Sent 200 response');

        // Make HTTP request using native https module
        await new Promise((resolve, reject) => {
            const encodedText = encodeURIComponent('Test message via HTTPS');
            const path = `/bot${token}/sendMessage?chat_id=${chatId}&text=${encodedText}`;
            
            console.log('4. Making HTTPS request to api.telegram.org');
            
            const options = {
                hostname: 'api.telegram.org',
                port: 443,
                path: path,
                method: 'GET'
            };

            const request = https.request(options, (response) => {
                console.log('5. Got response code:', response.statusCode);
                
                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    console.log('6. Response data:', data);
                    resolve(data);
                });
            });

            request.on('error', (error) => {
                console.error('7. Request error:', error);
                reject(error);
            });

            console.log('8. Ending request');
            request.end();
        });

        console.log('9. Request completed');

    } catch (error) {
        console.error('10. Error:', error.message);
        console.error('Full error:', error);
    }
}