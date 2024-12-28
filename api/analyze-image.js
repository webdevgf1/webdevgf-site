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
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY environment variable is not set');
        }

        const { image } = req.body;
        
        if (!image) {
            throw new Error('No image data received');
        }

        // Extract base64 data and media type
        const matches = image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid image data URL format');
        }

        const mediaType = matches[1];
        const base64Data = matches[2];

        // Verify base64 data
        if (!base64Data || base64Data.trim() === '') {
            throw new Error('Empty base64 data');
        }

        // Log for debugging (remove in production)
        console.log('Media Type:', mediaType);
        console.log('Base64 length:', base64Data.length);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
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
                                media_type: mediaType,
                                data: base64Data
                            }
                        }
                    ]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Claude API error response:', errorData);
            throw new Error(`Claude API error: ${errorData}`);
        }

        const data = await response.json();
        
        // Parse the response content to extract the JSON
        let jsonResponse;
        try {
            // Extract the text content from Claude's response
            const content = data.content[0].text;
            // Parse it as JSON
            jsonResponse = JSON.parse(content);
        } catch (e) {
            console.error('Error parsing Claude response:', e);
            jsonResponse = {
                name: "AI Assistant",
                personality: "A helpful and knowledgeable assistant."
            };
        }

        res.status(200).json(jsonResponse);

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: error.message,
            details: error.stack
        });
    }
}