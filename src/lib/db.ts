/**
 * db.ts — Umbra Prompt Lab · Supabase data layer
 *
 * All operations are scoped to the current device_id (anonymous session).
 * The apiKey for Mistral NEVER leaves localStorage — it is NOT stored here.
 */

import { getSupabase, getDeviceId } from './supabase';
import type { GeneratedPrompt } from '../types/prompt';

// ── Types ────────────────────────────────────────────────────────────

export interface DbSettings {
    model: 'mistral-large-latest' | 'mistral-small-latest' | 'open-mistral-7b';
    autoSave: boolean;
    language: 'pt' | 'en';
}

export interface DbVocalProfile {
    id: number;
    profile: Record<string, unknown>;
    savedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function rowToPrompt(row: Record<string, unknown>): GeneratedPrompt {
    return {
        id: row.id as string,
        title: row.title as string,
        mainPrompt: row.main_prompt as string,
        negativePrompt: row.negative_prompt as string,
        quickPrompt: row.quick_prompt as string,
        style: row.style as string,
        mood: row.mood as string,
        originalIdea: row.original_idea as string,
        parameters: row.parameters as GeneratedPrompt['parameters'],
        createdAt: row.created_at as number,
    };
}

function promptToRow(p: GeneratedPrompt, deviceId: string) {
    return {
        id: p.id,
        device_id: deviceId,
        title: p.title,
        main_prompt: p.mainPrompt,
        negative_prompt: p.negativePrompt,
        quick_prompt: p.quickPrompt,
        style: p.style,
        mood: p.mood,
        original_idea: p.originalIdea,
        parameters: p.parameters,
        created_at: p.createdAt,
    };
}

// ── Prompt History ───────────────────────────────────────────────────

export async function fetchHistory(): Promise<GeneratedPrompt[]> {
    const deviceId = getDeviceId();
    const { data, error } = await getSupabase()
        .from('prompt_history')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(50);
    if (error) { console.warn('[db] fetchHistory error:', error.message); return []; }
    return (data ?? []).map((row) => rowToPrompt(row as Record<string, unknown>));
}

export async function upsertPrompt(prompt: GeneratedPrompt): Promise<void> {
    const deviceId = getDeviceId();
    const { error } = await getSupabase()
        .from('prompt_history')
        .upsert(promptToRow(prompt, deviceId), { onConflict: 'id' });
    if (error) console.warn('[db] upsertPrompt error:', error.message);
}

export async function deletePromptById(id: string): Promise<void> {
    const deviceId = getDeviceId();
    const { error } = await getSupabase()
        .from('prompt_history')
        .delete()
        .eq('id', id)
        .eq('device_id', deviceId);
    if (error) console.warn('[db] deletePrompt error:', error.message);
}

export async function clearAllHistory(): Promise<void> {
    const deviceId = getDeviceId();
    const { error } = await getSupabase()
        .from('prompt_history')
        .delete()
        .eq('device_id', deviceId);
    if (error) console.warn('[db] clearHistory error:', error.message);
}

// ── Vocal Profiles ───────────────────────────────────────────────────

export async function fetchVocalProfiles(): Promise<DbVocalProfile[]> {
    const deviceId = getDeviceId();
    const { data, error } = await getSupabase()
        .from('vocal_profiles')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false });
    if (error) { console.warn('[db] fetchVocalProfiles error:', error.message); return []; }
    return (data ?? []).map((row) => ({
        id: (row as Record<string, unknown>).id as number,
        profile: (row as Record<string, unknown>).profile as Record<string, unknown>,
        savedAt: (row as Record<string, unknown>).saved_at as string,
    }));
}

export async function insertVocalProfile(profile: Record<string, unknown>, savedAt: string): Promise<number | null> {
    const deviceId = getDeviceId();
    const { data, error } = await getSupabase()
        .from('vocal_profiles')
        .insert({ device_id: deviceId, profile, saved_at: savedAt })
        .select('id')
        .single();
    if (error) { console.warn('[db] insertVocalProfile error:', error.message); return null; }
    return (data as Record<string, unknown>).id as number;
}

export async function deleteVocalProfile(id: number): Promise<void> {
    const deviceId = getDeviceId();
    const { error } = await getSupabase()
        .from('vocal_profiles')
        .delete()
        .eq('id', id)
        .eq('device_id', deviceId);
    if (error) console.warn('[db] deleteVocalProfile error:', error.message);
}

// ── Settings (excludes apiKey) ────────────────────────────────────────

export async function fetchSettings(): Promise<DbSettings | null> {
    const deviceId = getDeviceId();
    const { data, error } = await getSupabase()
        .from('user_settings')
        .select('model, auto_save, language')
        .eq('device_id', deviceId)
        .maybeSingle();
    if (error) { console.warn('[db] fetchSettings error:', error.message); return null; }
    if (!data) return null;
    const row = data as Record<string, unknown>;
    return {
        model: row.model as DbSettings['model'],
        autoSave: row.auto_save as boolean,
        language: row.language as DbSettings['language'],
    };
}

export async function upsertSettings(s: DbSettings): Promise<void> {
    const deviceId = getDeviceId();
    const { error } = await getSupabase()
        .from('user_settings')
        .upsert({
            device_id: deviceId,
            model: s.model,
            auto_save: s.autoSave,
            language: s.language,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'device_id' });
    if (error) console.warn('[db] upsertSettings error:', error.message);
}
