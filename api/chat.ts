import type { VercelRequest, VercelResponse } from '@vercel/node';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check server-side key
    if (!MISTRAL_API_KEY) {
        return res.status(500).json({ error: 'Server API key not configured.' });
    }

    try {
        const { model, messages, temperature, max_tokens, response_format } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Missing or invalid "messages" field.' });
        }

        const requestBody = JSON.stringify({
            model: model || 'mistral-large-latest',
            messages,
            temperature: temperature ?? 0.85,
            max_tokens: max_tokens ?? 1200,
            ...(response_format ? { response_format } : {}),
        });

        const MAX_RETRIES = 3;
        let lastError: any = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            if (attempt > 0) {
                // Exponential backoff: 1s, 3s
                const delay = Math.pow(3, attempt - 1) * 1000;
                console.log(`[api/chat] Retry attempt ${attempt}/${MAX_RETRIES - 1} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                },
                body: requestBody,
            });

            const data = await response.json();

            if (response.ok) {
                return res.status(200).json(data);
            }

            // Only retry on 500/502/503/529 (server errors / overloaded)
            if ([500, 502, 503, 529].includes(response.status) && attempt < MAX_RETRIES - 1) {
                console.warn(`[api/chat] Mistral returned ${response.status}, retrying...`, data);
                lastError = { status: response.status, data };
                continue;
            }

            // Non-retryable error or last attempt — forward as-is
            return res.status(response.status).json(data);
        }

        // Should not reach here, but safety net
        return res.status(lastError?.status || 500).json(lastError?.data || { error: 'Max retries exceeded.' });
    } catch (err: unknown) {
        console.error('[api/chat] Error:', err);
        return res.status(500).json({ error: 'Internal proxy error.' });
    }
}
