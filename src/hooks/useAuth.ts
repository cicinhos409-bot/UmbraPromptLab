import { useState, useEffect } from 'react';
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

    useEffect(() => {
        // If there's an access_token in the URL hash (email confirmation)
        // OR a code in the query string (Google OAuth PKCE flow),
        // skip getSession() and wait for onAuthStateChange to fire first —
        // otherwise the guard would redirect to landing before the session is set.
        const hasTokenInHash = window.location.hash.includes('access_token');
        const hasCodeInQuery = new URLSearchParams(window.location.search).has('code');
        const isAuthRedirect = hasTokenInHash || hasCodeInQuery;

        if (!isAuthRedirect) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                setUser(session?.user ?? null);
                setLoading(false);
            });
        }
        // If auth redirect detected, stay loading until onAuthStateChange fires.

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
            // Clean URL after Supabase processes the auth tokens
            if (window.location.hash.includes('access_token') || new URLSearchParams(window.location.search).has('code')) {
                window.history.replaceState(null, '', window.location.pathname);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/landing.html';
    };

    return { user, loading, signOut };
}
