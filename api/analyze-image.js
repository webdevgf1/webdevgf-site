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
        const { image } = req.body;
        console.log('Received image data length:', image?.length); // Debug log

        if (!image) {
            throw new Error('No image data received');
        }

        // Format the prompt for Claude
        const prompt = "You are an AI assistant helping to create chatbot personas. Please analyze this image and provide a name and personality description that matches what you see. Focus on the character's appearance, style, and apparent traits. Format your response as valid JSON with exactly two fields: 'name' and 'personality'. Keep the personality description concise but detailed.";

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
                            text: prompt
                        },
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: "image/jpeg",
                                data: image.replace(/^data:image\/[a-z]+;base64,/, '')
                            }
                        }
                    ]
                }],
                temperature: 0.7
            })
        });

        console.log('Claude API response status:', response.status); // Debug log

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Anthropic API error:', errorData);
            throw new Error(`Anthropic API error: ${errorData}`);
        }

        const data = await response.json();
        console.log('Claude response:', data); // Debug log

        // Parse Claude's response to ensure it's in the correct format
        let result = data.content[0].text;
        try {
            // Try to parse as JSON
            result = JSON.parse(result);
        } catch (e) {
            // If parsing fails, try to extract just the needed info
            console.log('Failed to parse JSON, attempting to format response');
            const name = result.match(/["']name["']\s*:\s*["']([^"']+)["']/)?.[1] || 'Unknown Name';
            const personality = result.match(/["']personality["']\s*:\s*["']([^"']+)["']/)?.[1] || 'Unknown Personality';
            result = { name, personality };
        }

        res.status(200).json(result);

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}