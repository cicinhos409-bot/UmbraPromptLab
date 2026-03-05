import { useState, useCallback, useEffect } from 'react';
import type { AppSettings } from '../types/prompt';
import { fetchSettings, upsertSettings } from '../lib/db';

const SETTINGS_KEY = 'umbra_settings';

const DEFAULT_SETTINGS: AppSettings = {
    model: 'mistral-large-latest',
    autoSave: true,
    language: 'pt',
};

function loadLocalSettings(): AppSettings {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return DEFAULT_SETTINGS;
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

function saveLocalSettings(s: AppSettings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
        console.warn('[settings] Failed to save to localStorage');
    }
}

export function useSettings() {
    const [settings, setSettings] = useState<AppSettings>(loadLocalSettings);

    // ── Bootstrap: sync model/autoSave/language from Supabase ──
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const remote = await fetchSettings();
            if (cancelled || !remote) return;
            setSettings(prev => {
                const merged: AppSettings = {
                    ...prev,
                    model: remote.model,
                    autoSave: remote.autoSave,
                    language: remote.language,
                };
                saveLocalSettings(merged);
                return merged;
            });
        })();
        return () => { cancelled = true; };
    }, []);

    const updateSettings = useCallback((updates: Partial<AppSettings>) => {
        setSettings(prev => {
            const next = { ...prev, ...updates };
            saveLocalSettings(next);

            // Sync fields to Supabase
            upsertSettings({
                model: next.model,
                autoSave: next.autoSave,
                language: next.language,
            }).catch(console.warn);

            return next;
        });
    }, []);

    return { settings, updateSettings };
}
