import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SupabaseProjectLink {
  id: string;
  user_id: string;
  repo_name: string;
  supabase_project_ref: string;
  supabase_project_name: string | null;
  auto_detected: boolean;
  schema_chunks_count: number;
  last_synced_at: string | null;
  created_at: string;
}

export function useSupabaseProjects(userId?: string) {
  const [links, setLinks] = useState<SupabaseProjectLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLinks = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('idealist_supabase_projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch Supabase project links:', error.message);
    } else {
      setLinks((data || []) as SupabaseProjectLink[]);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const addLink = useCallback(async (repoName: string, supabaseProjectRef: string, autoDetected = false) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('idealist_supabase_projects')
      .upsert({
        user_id: userId,
        repo_name: repoName,
        supabase_project_ref: supabaseProjectRef,
        auto_detected: autoDetected,
      }, { onConflict: 'user_id,repo_name' })
      .select()
      .single();

    if (error) {
      console.error('Failed to add Supabase project link:', error.message);
      throw error;
    }

    setLinks((prev) => {
      const existing = prev.findIndex((l) => l.repo_name === repoName);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = data as SupabaseProjectLink;
        return updated;
      }
      return [data as SupabaseProjectLink, ...prev];
    });

    return data as SupabaseProjectLink;
  }, [userId]);

  const removeLink = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('idealist_supabase_projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to remove Supabase project link:', error.message);
      throw error;
    }

    setLinks((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateLink = useCallback(async (id: string, updates: Partial<Pick<SupabaseProjectLink, 'schema_chunks_count' | 'last_synced_at' | 'supabase_project_name'>>) => {
    const { data, error } = await supabase
      .from('idealist_supabase_projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update Supabase project link:', error.message);
      throw error;
    }

    setLinks((prev) => prev.map((l) => l.id === id ? (data as SupabaseProjectLink) : l));
  }, []);

  return { links, isLoading, addLink, removeLink, updateLink, refetch: fetchLinks };
}
