import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ── Device ID (anonymous session) ──────────────────────────────────
const DEVICE_ID_KEY = 'umbra_device_id';

export function getDeviceId(): string {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
}

// ── Supabase client with x-device-id header for RLS ────────────────
export function getSupabase() {
    const deviceId = getDeviceId();
    return createClient(SUPABASE_URL, SUPABASE_ANON, {
        global: {
            headers: {
                'x-device-id': deviceId,
            },
        },
    });
}

// Default client (no header — use getSupabase() for DB ops)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
