import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface UsageParams {
  functionName: string;
  model: string;
  provider: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log AI API usage to prd_usage_logs. Fire-and-forget — never blocks the caller.
 */
export function logUsage(params: UsageParams): void {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  supabase
    .from('prd_usage_logs')
    .insert({
      function_name: params.functionName,
      model: params.model,
      provider: params.provider,
      input_tokens: params.inputTokens ?? null,
      output_tokens: params.outputTokens ?? null,
      total_tokens: params.totalTokens ?? null,
      estimated_cost: params.estimatedCost ?? null,
      session_id: params.sessionId ?? null,
      metadata: params.metadata ?? {},
    })
    .then(({ error }) => {
      if (error) console.error('Usage log failed:', error.message);
    });
}

/**
 * Extract usage from an OpenRouter API response body and log it.
 */
export function logOpenRouterUsage(
  responseBody: Record<string, unknown>,
  functionName: string,
  model: string,
  sessionId?: string
): void {
  const usage = responseBody.usage as Record<string, number> | undefined;
  if (!usage) return;

  logUsage({
    functionName,
    model,
    provider: 'openrouter',
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    sessionId,
  });
}

/**
 * Log Voyage API usage (embeddings / reranking).
 */
export function logVoyageUsage(
  functionName: string,
  model: string,
  totalTokens?: number,
  sessionId?: string
): void {
  logUsage({
    functionName,
    model,
    provider: 'voyageai',
    totalTokens,
    sessionId,
  });
}
