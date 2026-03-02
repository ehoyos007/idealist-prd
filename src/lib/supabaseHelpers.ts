import { supabase } from '@/integrations/supabase/client';

const API_SECRET = import.meta.env.VITE_IDEALIST_API_SECRET;

/**
 * Invoke a Supabase edge function with the API key header attached.
 */
export async function invokeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> {
  const headers: Record<string, string> = {};
  if (API_SECRET) {
    headers['x-api-key'] = API_SECRET;
  }

  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers,
  });

  return { data: data as T | null, error: error ? new Error(error.message) : null };
}
