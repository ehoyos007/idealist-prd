import { supabase } from '@/integrations/supabase/client';

/**
 * Invoke a Supabase edge function. Authorization is the signed-in user's access token, which
 * supabase.functions.invoke attaches automatically; the functions verify it server-side against the
 * Idealist allowlist (see supabase/functions/_shared/auth.ts). The former VITE_IDEALIST_API_SECRET
 * x-api-key header was removed: a value compiled into the client bundle is not an authority.
 */
export async function invokeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  return { data: data as T | null, error: error ? new Error(error.message) : null };
}
