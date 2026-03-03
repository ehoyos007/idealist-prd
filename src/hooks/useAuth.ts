import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/supabaseHelpers';
import type { User } from '@supabase/supabase-js';

export interface IdealistProfile {
  id: string;
  github_username: string;
  github_avatar_url: string | null;
  display_name: string | null;
  github_access_token: string | null;
  supabase_management_token: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthCheckResponse {
  allowed: boolean;
  profile: IdealistProfile | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<IdealistProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  // Single edge function call that handles both allowlist check AND profile sync
  const syncAuthState = useCallback(async (providerToken?: string | null) => {
    try {
      const { data, error } = await invokeFunction<AuthCheckResponse>('check-allowlist', {
        ...(providerToken ? { providerToken } : {}),
      });

      if (error) {
        console.error('Auth check failed:', error.message);
        setIsAllowed(false);
        return;
      }

      setIsAllowed(data?.allowed ?? false);
      if (data?.profile) {
        setProfile(data.profile);
      }
    } catch (err) {
      console.error('Auth check error:', err);
      setIsAllowed(false);
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const authUser = session?.user ?? null;
      setUser(authUser);

      if (authUser) {
        await syncAuthState(session?.provider_token);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const authUser = session?.user ?? null;
        setUser(authUser);

        if (event === 'SIGNED_IN' && authUser) {
          // Critical: capture provider_token on SIGNED_IN (only available once)
          await syncAuthState(session?.provider_token);
          setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setIsAllowed(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [syncAuthState]);

  const signInWithGitHub = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'repo read:user',
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      console.error('GitHub sign-in error:', error.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Pick<IdealistProfile, 'supabase_management_token'>>) => {
    if (!user) return;
    // Use edge function to update profile since PostgREST may not see the table
    const { data, error } = await invokeFunction<{ profile: IdealistProfile }>('update-profile', updates);

    if (error) {
      console.error('Profile update error:', error.message);
      throw error;
    }
    if (data?.profile) {
      setProfile(data.profile);
    }
  }, [user]);

  return {
    user,
    profile,
    isLoading,
    isAllowed,
    signInWithGitHub,
    signOut,
    updateProfile,
  };
}
