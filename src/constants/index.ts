import type { StyleConfig, MoodConfig, PresetIdea } from '../types/prompt';

export const STYLES: StyleConfig[] = [
    { id: 'anime', label: 'Anime Clássico', icon: '⛩️', description: 'Estilo anime tradicional, paleta vibrante' },
    { id: 'cyberpunk-anime', label: 'Cyberpunk Anime', icon: '🌆', description: 'Neon, megacidades e tecnologia distópica' },
    { id: 'fantasy-anime', label: 'Fantasy Anime', icon: '🐉', description: 'Magia, criaturas e mundos épicos' },
    { id: 'shonen', label: 'Shonen', icon: '⚡', description: 'Ação intensa, protagonistas determinados' },
    { id: 'shoujo', label: 'Shoujo', icon: '🌸', description: 'Romance, emoção e efeitos florais' },
    { id: 'mecha', label: 'Mecha', icon: '🤖', description: 'Robôs gigantes, pilotos e batalhas épicas' },
    { id: 'horror-anime', label: 'Horror Anime', icon: '🕯️', description: 'Atmosfera sombria, terror psicológico' },
    { id: 'slice-of-life', label: 'Slice of Life', icon: '☕', description: 'Cotidiano, melancolia suave, realismo' },
    { id: 'historical-anime', label: 'Histórico/Samurai', icon: '⚔️', description: 'Feudal japonês, ronins e espiritualidade' },
];

export const MOODS: MoodConfig[] = [
    { id: 'epic', label: 'Épico', icon: '⚡', color: '#c9a84c' },
    { id: 'melancholic', label: 'Melancólico', icon: '🌧️', color: '#6b8cb8' },
    { id: 'romantic', label: 'Romântico', icon: '🌸', color: '#c87aa0' },
    { id: 'mysterious', label: 'Misterioso', icon: '🌑', color: '#8b6cb8' },
    { id: 'joyful', label: 'Alegre', icon: '✨', color: '#c8b84c' },
    { id: 'dark', label: 'Sombrio', icon: '🗡️', color: '#6b3a3a' },
    { id: 'ethereal', label: 'Etéreo', icon: '🌫️', color: '#7ab8c8' },
    { id: 'intense', label: 'Intenso', icon: '🔥', color: '#c86b3a' },
];

export const PRESETS: PresetIdea[] = [
    {
        id: 'samurai-moon',
        title: 'Samurai sob a Lua',
        idea: 'Um samurai solitário em pé na beira de um penhasco, sob uma lua cheia enorme, pétalas de cerejeira caindo ao vento, neblina ao fundo',
        style: 'historical-anime',
        mood: 'melancholic',
        icon: '⚔️',
        tags: ['samurai', 'lua', 'sakura', 'solidão'],
    },
    {
        id: 'cyber-schoolgirl',
        title: 'Cyber Schoolgirl',
        idea: 'Garota de uniforme escolar modificado com implantes cibernéticos andando por uma metrópole neon chuvosa à noite, reflexos na calçada molhada',
        style: 'cyberpunk-anime',
        mood: 'mysterious',
        icon: '🌆',
        tags: ['cyberpunk', 'neon', 'garota', 'chuva'],
    },
    {
        id: 'dragon-mage',
        title: 'Mago dos Dragões',
        idea: 'Um mago ancião com olhos brilhantes invocando um dragão de energia pura, torres mágicas ao fundo, céu estrelado épico',
        style: 'fantasy-anime',
        mood: 'epic',
        icon: '🐉',
        tags: ['mago', 'dragão', 'feitiço', 'épico'],
    },
    {
        id: 'spirit-forest',
        title: 'Espírito da Floresta',
        idea: 'Uma jovem com cabelo branco e orelhas de raposa em uma floresta encantada com espíritos flutuantes, luz filtrada entre as árvores antigas',
        style: 'fantasy-anime',
        mood: 'ethereal',
        icon: '🦊',
        tags: ['espírito', 'floresta', 'raposa', 'mística'],
    },
    {
        id: 'mecha-pilot',
        title: 'Piloto de Mecha',
        idea: 'Uma jovem piloto determinada dentro da cabine de seu mecha gigante, consoles iluminado em vermelho, batalha acontecendo ao fundo',
        style: 'mecha',
        mood: 'intense',
        icon: '🤖',
        tags: ['mecha', 'piloto', 'batalha', 'ação'],
    },
    {
        id: 'rainy-cafe',
        title: 'Café na Chuva',
        idea: 'Um casal em um café vazio, janela com chuva forte, xícaras quentes, luz quente interna em contraste com o frio lá fora',
        style: 'slice-of-life',
        mood: 'romantic',
        icon: '☕',
        tags: ['romance', 'chuva', 'café', 'cotidiano'],
    },
];

export const CHARACTER_TYPES = [
    'Protagonista feminina',
    'Protagonista masculino',
    'Anti-herói',
    'Guerreiro',
    'Mago / Feiticeiro',
    'Espírito / Criatura',
    'Robô / Androide',
    'Samurai / Ninja',
    'Estudante',
    'Vilão',
    'Sem personagem (cena)',
];

export const SYSTEM_UMBRA = `You are Umbra Prompt Lab, an expert AI prompt engineer specializing in anime-style image generation prompts.

Your task: Transform the user's idea into a perfectly structured, optimized image generation prompt.

RULES:
1. Always write the main prompt in ENGLISH
2. Be visually descriptive: lighting, composition, camera angle, atmosphere, color palette, art style details
3. Follow anime art style conventions (soft shading, expressive eyes, dynamic composition, etc.)
4. The output MUST be valid JSON following the exact schema provided
5. Never explain your reasoning — only output the JSON

OUTPUT SCHEMA (valid JSON only, no markdown):
{
  "title": "Short poetic title in the user's language",
  "mainPrompt": "detailed English prompt here",
  "negativePrompt": "English negative prompt here",
  "parameters": {
    "steps": 28,
    "cfg": 7.5,
    "sampler": "DPM++ 2M Karras",
    "width": 832,
    "height": 1216,
    "denoise": 1.0
  },
  "quickPrompt": "brief 30-word version of the main prompt"
}

PROMPT BUILDING FORMULA:
[Subject + clothing + appearance] + [expression + pose] + [environment + architecture] + [lighting + time of day] + [atmosphere + mood] + [camera angle + composition] + [art style tags] + [quality tags]

QUALITY TAGS TO ALWAYS APPEND:
masterpiece, best quality, ultra-detailed, sharp focus, 8k, intricate details, professional illustration, anime art style

NEGATIVE PROMPT TEMPLATE:
lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, bad feet, deformed, disfigured, ugly, out of frame, poorly drawn face, cloned face, weird colors, extra limbs, mutation, mutated, gross proportions

Adapt the style tags and specific descriptors based on:
- Style (e.g., cyberpunk → neon lights, rain, holographic ads; historical → cherry blossoms, tatami, paper lanterns)
- Mood (e.g., melancholic → overcast, muted colors, solo figure; epic → dynamic angle, dramatic lighting, action lines)`;
