import https from 'https';

export default async function handler(req, res) {
    console.log('Webhook received');
    
    // First respond to Telegram
    res.status(200).json({ ok: true });

    try {
        const chatId = req.body?.message?.chat?.id;
        const urlParts = req.url.split('/');
        const token = urlParts[urlParts.length - 1];

        // Function to make HTTPS request
        const sendMessage = () => {
            return new Promise((resolve, reject) => {
                const options = {
                    hostname: 'api.telegram.org',
                    path: `/bot${token}/sendMessage?chat_id=${chatId}&text=Testing HTTPS request`,
                    method: 'GET'
                };

                console.log('Making HTTPS request with options:', options);

                const req = https.request(options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        console.log('Response received:', data);
                        resolve(data);
                    });
                });

                req.on('error', (error) => {
                    console.error('Request error:', error);
                    reject(error);
                });

                req.end();
            });
        };

        console.log('Starting message send...');
        const result = await sendMessage();
        console.log('Message send completed:', result);

    } catch (error) {
        console.error('Handler error:', error);
    }
}