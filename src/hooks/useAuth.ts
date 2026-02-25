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
    const resolved = useRef(false);

    useEffect(() => {
        // onAuthStateChange fires INITIAL_SESSION on subscribe (Supabase v2.39+).
        // For OAuth PKCE redirects (?code=…), Supabase exchanges the code
        // during client init, then fires SIGNED_IN. We rely on this single
        // listener for ALL auth scenarios.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!resolved.current) resolved.current = true;
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Fallback: if onAuthStateChange doesn't fire within 4s
        // (e.g. network issue), resolve via getSession so the UI isn't stuck.
        const fallback = setTimeout(async () => {
            if (!resolved.current) {
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);
                setLoading(false);
            }
        }, 4000);

        // Clean auth params from URL after Supabase processes them
        const cleanUrl = setTimeout(() => {
            if (
                window.location.hash.includes('access_token') ||
                new URLSearchParams(window.location.search).has('code')
            ) {
                window.history.replaceState(null, '', window.location.pathname);
            }
        }, 1500);

        return () => {
            clearTimeout(fallback);
            clearTimeout(cleanUrl);
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/landing.html';
    };

    return { user, loading, signOut };
}
