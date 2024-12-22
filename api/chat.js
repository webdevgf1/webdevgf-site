// api/chat.js
export default async function handler(req, res) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { message, systemPrompt } = req.body;

        console.log('Received request:', { message, systemPrompt }); // Debug log

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': process.env.ANTHROPIC_API_KEY
            },
            body: JSON.stringify({
                model: 'claude-3-opus-20240229',
                messages: [{
                    role: 'user',
                    content: message
                }],
                system: systemPrompt,
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        const data = await response.json();
        
        console.log('Anthropic API response:', data); // Debug log

        if (data.error) {
            console.error('Anthropic API error:', data.error);
            res.status(500).json({ error: data.error.message || 'Unknown API error' });
            return;
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
}