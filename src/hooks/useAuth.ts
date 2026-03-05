import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface AuthState {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const initRan = useRef(false);
    const resolved = useRef(false);
    const currentUserId = useRef<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const resolve = (u: User | null) => {
            if (!isMounted) return;
            // Prevent redundant state updates that cause re-render loops
            const newId = u?.id ?? null;
            if (resolved.current && currentUserId.current === newId) return;
            resolved.current = true;
            currentUserId.current = newId;
            setUser(u);
            setLoading(false);
        };

        // 1) Subscribe to future auth changes (token refresh, sign-out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!isMounted) return;
            // Skip INITIAL_SESSION — we handle initial resolution ourselves below
            // to avoid a premature null during PKCE exchange.
            if (event === 'INITIAL_SESSION') return;
            resolve(session?.user ?? null);
        });

        // 2) Resolve the initial auth state
        const init = async () => {
            try {
                // If there's a PKCE code in the URL, exchange it first
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');

                if (code && !initRan.current) {
                    initRan.current = true;
                    // Clean the URL immediately to prevent re-processing
                    window.history.replaceState(null, '', window.location.pathname);
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    if (!error && data.session) {
                        resolve(data.session.user);
                        return;
                    }
                    // If exchange fails, fall through to getSession
                }

                // If there's an access_token hash (email confirmation), let
                // Supabase process it, then read the resulting session.
                if (window.location.hash.includes('access_token')) {
                    // Give Supabase a moment to ingest the hash
                    await new Promise(r => setTimeout(r, 500));
                    if (!isMounted) return;
                    window.history.replaceState(null, '', window.location.pathname);
                }

                // Normal case or fallback: read current session
                const { data: { session } } = await supabase.auth.getSession();
                resolve(session?.user ?? null);
            } catch (err) {
                console.error('[useAuth] init error:', err);
                // Network error etc. — resolve with no user
                resolve(null);
            }
        };

        init();

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/landing.html';
    };

    return { user, loading, signOut };
}
