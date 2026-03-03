import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/supabaseHelpers';
import type { User, Session } from '@supabase/supabase-js';

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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<IdealistProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  // Fetch or create profile from idealist_profiles
  const syncProfile = useCallback(async (authUser: User, session: Session | null) => {
    const githubUsername = authUser.user_metadata?.user_name;
    const avatarUrl = authUser.user_metadata?.avatar_url;
    const displayName = authUser.user_metadata?.full_name || githubUsername;

    // Capture provider_token — only available on initial sign-in
    const providerToken = session?.provider_token || null;

    // Upsert the profile
    const profileData: Record<string, unknown> = {
      id: authUser.id,
      github_username: githubUsername,
      github_avatar_url: avatarUrl,
      display_name: displayName,
    };

    // Only update the token if we have a fresh one (it's only available once)
    if (providerToken) {
      profileData.github_access_token = providerToken;
    }

    const { data, error } = await supabase
      .from('idealist_profiles')
      .upsert(profileData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Profile sync error:', error.message);
      // Try to fetch existing profile if upsert failed
      const { data: existing } = await supabase
        .from('idealist_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      if (existing) {
        setProfile(existing as IdealistProfile);
      }
    } else {
      setProfile(data as IdealistProfile);
    }
  }, []);

  // Check if user is on the allowlist
  const checkAllowlist = useCallback(async () => {
    const { data } = await invokeFunction<{ allowed: boolean }>('check-allowlist', {});
    setIsAllowed(data?.allowed ?? false);
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const authUser = session?.user ?? null;
      setUser(authUser);

      if (authUser && session) {
        syncProfile(authUser, session).then(() => checkAllowlist()).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const authUser = session?.user ?? null;
        setUser(authUser);

        if (event === 'SIGNED_IN' && authUser && session) {
          // Critical: capture provider_token on SIGNED_IN (only available once)
          await syncProfile(authUser, session);
          await checkAllowlist();
          setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setIsAllowed(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [syncProfile, checkAllowlist]);

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
    const { data, error } = await supabase
      .from('idealist_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error.message);
      throw error;
    }
    setProfile(data as IdealistProfile);
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
