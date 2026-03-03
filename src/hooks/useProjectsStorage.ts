import { useState, useEffect, useCallback } from 'react';
import { ProjectCard } from '@/types/project';
import { supabase } from '@/integrations/supabase/client';
import { dbRowToProjectCard, projectCardToDbRow, ProjectDbRow } from '@/lib/projectTransformers';

export function useProjectsStorage(userId?: string) {
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      let query = supabase
        .from('prd_projects')
        .select('*')
        .order('created_at', { ascending: false });

      // If user is authenticated, show their projects + unclaimed ones
      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch projects:', error);
      } else if (data) {
        setProjects(data.map((row) => dbRowToProjectCard(row as ProjectDbRow)));
      }
      setIsLoading(false);
    };

    fetchProjects();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prd_projects',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newProject = dbRowToProjectCard(payload.new as ProjectDbRow);
            setProjects((prev) => {
              if (prev.some((p) => p.id === newProject.id)) return prev;
              return [newProject, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedProject = dbRowToProjectCard(payload.new as ProjectDbRow);
            setProjects((prev) =>
              prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setProjects((prev) => prev.filter((p) => p.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const saveProject = useCallback(async (project: ProjectCard) => {
    const dbRow = projectCardToDbRow(project);

    const { error } = await supabase
      .from('prd_projects')
      .upsert(dbRow, { onConflict: 'id' });

    if (error) {
      console.error('Failed to save project:', error);
      throw error;
    }
  }, []);

  const saveDraftProject = useCallback(async (id: string, transcript: string) => {
    try {
      const { error } = await supabase
        .from('prd_projects')
        .insert({
          id,
          project_name: 'Generating...',
          transcript,
          tags: [],
          score_complexity: 5,
          score_impact: 5,
          score_urgency: 5,
          score_confidence: 5,
          ...(userId ? { user_id: userId } : {}),
        });

      if (error) {
        console.warn('Failed to save draft project:', error);
      }
    } catch (err) {
      console.warn('Failed to save draft project:', err);
    }
  }, [userId]);

  const deleteProject = useCallback(async (id: string) => {
    const { error } = await supabase.from('prd_projects').delete().eq('id', id);

    if (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  }, []);

  const getProject = useCallback(
    (id: string) => {
      return projects.find((p) => p.id === id);
    },
    [projects]
  );

  return { projects, isLoading, saveProject, saveDraftProject, deleteProject, getProject };
}
