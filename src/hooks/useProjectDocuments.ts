import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProjectDocument } from '@/types/project';

export function useProjectDocuments(projectId: string | undefined) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setDocuments([]);
      return;
    }

    const fetchDocuments = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('project_documents')
          .select('id, file_name, file_type, chunk_count, created_at')
          .eq('project_id', projectId);

        if (error) {
          console.error('Error fetching project documents:', error);
          return;
        }

        const mappedDocs: ProjectDocument[] = (data || []).map(doc => ({
          id: doc.id,
          fileName: doc.file_name,
          fileType: doc.file_type,
          chunkCount: doc.chunk_count || 0,
          createdAt: doc.created_at
        }));

        setDocuments(mappedDocs);
      } catch (err) {
        console.error('Error fetching documents:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [projectId]);

  return { documents, isLoading };
}
