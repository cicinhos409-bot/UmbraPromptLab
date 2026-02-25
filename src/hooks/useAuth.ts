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
        // If there's an access_token in the URL hash (email confirmation redirect),
        // skip getSession() and wait for onAuthStateChange to fire first —
        // otherwise the guard would redirect to landing before the session is set.
        const hasTokenInHash = window.location.hash.includes('access_token');

        if (!hasTokenInHash) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                setUser(session?.user ?? null);
                setLoading(false);
            });
        }
        // If token is in hash, stay loading until onAuthStateChange fires.

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
            // Clean hash from URL after Supabase processes it
            if (window.location.hash.includes('access_token')) {
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
