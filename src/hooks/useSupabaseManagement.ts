import { useState, useCallback } from 'react';
import { invokeFunction } from '@/lib/supabaseHelpers';

interface SchemaResult {
  success: boolean;
  projectName: string;
  tablesCount: number;
  rlsPoliciesCount: number;
  functionsCount: number;
  edgeFunctionsCount: number;
  storageBucketsCount?: number;
  chunksCreated: number;
}

export function useSupabaseManagement() {
  const [schemaStatus, setSchemaStatus] = useState<'idle' | 'fetching' | 'ready' | 'error'>('idle');
  const [schemaResult, setSchemaResult] = useState<SchemaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSchema = useCallback(async (supabaseProjectRef: string, repoName?: string) => {
    setSchemaStatus('fetching');
    setError(null);
    setSchemaResult(null);

    const { data, error: fetchError } = await invokeFunction<SchemaResult>('fetch-supabase-schema', {
      supabaseProjectRef,
      repoName,
    });

    if (fetchError) {
      setSchemaStatus('error');
      setError(fetchError.message);
      return null;
    }

    if (data?.success) {
      setSchemaStatus('ready');
      setSchemaResult(data);
      return data;
    }

    setSchemaStatus('error');
    setError('Schema fetch returned no data');
    return null;
  }, []);

  return {
    fetchSchema,
    schemaStatus,
    schemaResult,
    error,
  };
}
