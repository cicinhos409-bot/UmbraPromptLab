/**
 * mistralProxy.ts — Centralized Mistral AI proxy client
 *
 * All components call this instead of hitting the Mistral API directly.
 * Requests go to /api/chat (Vercel serverless function) which has the API key.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface MistralProxyParams {
    model?: string;
    messages: { role: string; content: string | any[] }[];
    temperature?: number;
    max_tokens?: number;
    response_format?: { type: string };
}

/**
 * Calls the server-side Mistral proxy and returns the assistant's text content.
 */
export async function callMistralProxy(options: MistralProxyParams): Promise<string> {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        if (response.status === 401) throw new Error('Erro de autenticação com a API Mistral.');
        if (response.status === 429) throw new Error('Limite de requisições atingido. Aguarde um momento.');
        throw new Error(`Erro da API (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error('Resposta vazia da API.');

    return content;
}
