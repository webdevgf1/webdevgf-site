// api/analyze-image.js
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
        console.log('Received request');
        const { image } = req.body;
        
        if (!image) {
            throw new Error('No image data received');
        }

        console.log('Image data length:', image.length);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': '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',
                'anthropic-beta': 'messages-2023-12-15'
            },
            body: JSON.stringify({
                model: 'claude-3-opus-20240229',
                max_tokens: 1000,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: "text",
                            text: "Analyze this image and create a fitting name and personality description for a chatbot based on what you see. Return your response in JSON format with only two fields: 'name' and 'personality'."
                        },
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: "image/jpeg",
                                data: image.split(',')[1]
                            }
                        }
                    ]
                }]
            })
        });

        console.log('Claude API response status:', response.status);

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Claude API error:', errorData);
            throw new Error(`Claude API error: ${errorData}`);
        }

        const data = await response.json();
        console.log('Claude response:', data);

        res.status(200).json({
            name: "Test Name",  // Temporary hardcoded response for testing
            personality: "Test Personality"
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: error.message,
            details: error.stack
        });
    }
}