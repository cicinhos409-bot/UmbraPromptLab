export interface GeneratedPrompt {
    id: string;
    title: string;
    mainPrompt: string;
    negativePrompt: string;
    parameters: SuggestedParameters;
    quickPrompt: string;
    style: string;
    mood: string;
    originalIdea: string;
    createdAt: number;
}

export interface SuggestedParameters {
    steps: number;
    cfg: number;
    sampler: string;
    width: number;
    height: number;
    denoise?: number;
}

export interface PromptRequest {
    idea: string;
    style: StyleOption;
    mood: MoodOption;
    characterType?: string;
}

export type StyleOption =
    | 'anime'
    | 'cyberpunk-anime'
    | 'fantasy-anime'
    | 'shonen'
    | 'shoujo'
    | 'mecha'
    | 'horror-anime'
    | 'slice-of-life'
    | 'historical-anime';

export type MoodOption =
    | 'epic'
    | 'melancholic'
    | 'romantic'
    | 'mysterious'
    | 'joyful'
    | 'dark'
    | 'ethereal'
    | 'intense';

export interface StyleConfig {
    id: StyleOption;
    label: string;
    icon: string;
    description: string;
}

export interface MoodConfig {
    id: MoodOption;
    label: string;
    icon: string;
    color: string;
}

export interface PresetIdea {
    id: string;
    title: string;
    idea: string;
    style: StyleOption;
    mood: MoodOption;
    icon: string;
    tags: string[];
}

export type AppView = 'generator' | 'history' | 'presets' | 'settings' | 'grimorio' | 'isekai' | 'sinopses' | 'voiceforge' | 'onomancer' | 'inicio' | 'perfil' | 'umbravoz' | 'umbracreator' | 'galeria' | 'academia' | 'cenas' | 'promptscenas' | 'cenasestende' | 'cenaslocais' | 'promptsinicio' | 'promptsvidy' | 'promptsloop';



export interface AppSettings {
    model: 'mistral-large-latest' | 'mistral-small-latest' | 'open-mistral-7b';
    autoSave: boolean;
    language: 'pt' | 'en';
}
