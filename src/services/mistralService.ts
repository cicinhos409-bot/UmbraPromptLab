import type { PromptRequest, GeneratedPrompt, AppSettings } from '../types/prompt';
import { SYSTEM_UMBRA } from '../constants';
import { callMistralProxy } from './mistralProxy';

function buildUserMessage(req: PromptRequest): string {
    const styleMap: Record<string, string> = {
        'anime': 'classic anime',
        'cyberpunk-anime': 'cyberpunk anime',
        'fantasy-anime': 'fantasy anime',
        'shonen': 'shonen action anime',
        'shoujo': 'shoujo romantic anime',
        'mecha': 'mecha anime',
        'horror-anime': 'horror anime',
        'slice-of-life': 'slice-of-life anime',
        'historical-anime': 'historical samurai anime',
    };

    const moodMap: Record<string, string> = {
        'epic': 'epic and powerful',
        'melancholic': 'melancholic and wistful',
        'romantic': 'romantic and tender',
        'mysterious': 'mysterious and enigmatic',
        'joyful': 'joyful and vibrant',
        'dark': 'dark and foreboding',
        'ethereal': 'ethereal and dreamlike',
        'intense': 'intense and dramatic',
    };

    let message = `Create an image generation prompt for the following idea:\n\n"${req.idea}"\n\nStyle: ${styleMap[req.style] || req.style}\nMood: ${moodMap[req.mood] || req.mood}`;

    if (req.characterType && req.characterType !== 'Sem personagem (cena)') {
        message += `\nCharacter type: ${req.characterType}`;
    }

    return message;
}

export async function generatePrompt(
    request: PromptRequest,
    settings: AppSettings
): Promise<GeneratedPrompt> {
    const content = await callMistralProxy({
        model: settings.model || 'mistral-large-latest',
        messages: [
            { role: 'system', content: SYSTEM_UMBRA },
            { role: 'user', content: buildUserMessage(request) },
        ],
        temperature: 0.85,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
    });

    let parsed: Omit<GeneratedPrompt, 'id' | 'style' | 'mood' | 'originalIdea' | 'createdAt'>;
    try {
        parsed = JSON.parse(content);
    } catch {
        throw new Error('Failed to parse API response. Please try again.');
    }

    if (!parsed.mainPrompt || !parsed.negativePrompt) {
        throw new Error('Incomplete response from API. Please try again.');
    }

    return {
        id: `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        title: parsed.title || 'Untitled Prompt',
        mainPrompt: parsed.mainPrompt,
        negativePrompt: parsed.negativePrompt,
        parameters: parsed.parameters || {
            steps: 28,
            cfg: 7.5,
            sampler: 'DPM++ 2M Karras',
            width: 832,
            height: 1216,
            denoise: 1.0,
        },
        quickPrompt: parsed.quickPrompt || parsed.mainPrompt.split(',').slice(0, 5).join(','),
        style: request.style,
        mood: request.mood,
        originalIdea: request.idea,
        createdAt: Date.now(),
    };
}
