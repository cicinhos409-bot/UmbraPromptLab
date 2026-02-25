import { useState, useCallback, useEffect } from 'react';
import type { GeneratedPrompt } from '../types/prompt';
import {
    fetchHistory,
    upsertPrompt,
    deletePromptById,
    clearAllHistory,
} from '../lib/db';

const STORAGE_KEY = 'umbra_prompt_history';
const MAX_HISTORY = 50;

function loadLocalHistory(): GeneratedPrompt[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as GeneratedPrompt[];
    } catch {
        return [];
    }
}

function saveLocalHistory(history: GeneratedPrompt[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
        console.warn('[history] Failed to save to localStorage');
    }
}

export function usePromptHistory() {
    const [history, setHistory] = useState<GeneratedPrompt[]>(loadLocalHistory);
    const [synced, setSynced] = useState(false);

    // ── Bootstrap: load from Supabase on mount, merge with local ──
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const remote = await fetchHistory();
            if (cancelled) return;
            if (remote.length > 0) {
                // Remote wins — update state and localStorage
                const limited = remote.slice(0, MAX_HISTORY);
                setHistory(limited);
                saveLocalHistory(limited);
            } else {
                // Nothing remote yet — push local data up (first sync)
                const local = loadLocalHistory();
                for (const p of local) {
                    await upsertPrompt(p);
                }
            }
            if (!cancelled) setSynced(true);
        })();
        return () => { cancelled = true; };
    }, []);

    const addPrompt = useCallback((prompt: GeneratedPrompt) => {
        setHistory(prev => {
            const next = [prompt, ...prev.filter(p => p.id !== prompt.id)].slice(0, MAX_HISTORY);
            saveLocalHistory(next);
            // Fire-and-forget Supabase upsert
            upsertPrompt(prompt).catch(console.warn);
            return next;
        });
    }, []);

    const removePrompt = useCallback((id: string) => {
        setHistory(prev => {
            const next = prev.filter(p => p.id !== id);
            saveLocalHistory(next);
            deletePromptById(id).catch(console.warn);
            return next;
        });
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        localStorage.removeItem(STORAGE_KEY);
        clearAllHistory().catch(console.warn);
    }, []);

    return { history, addPrompt, removePrompt, clearHistory, synced };
}
