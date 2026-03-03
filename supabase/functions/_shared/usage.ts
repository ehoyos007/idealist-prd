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

// Approximate cost per million tokens (USD). Update as pricing changes.
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-pro-preview-06-05": { input: 1.25, output: 10.0 },
  "google/gemini-2.0-flash-lite-001": { input: 0.075, output: 0.3 },
  "voyage-3-large": { input: 0.06, output: 0.06 },
  "voyage-code-3": { input: 0.06, output: 0.06 },
  "rerank-2": { input: 0.05, output: 0.05 },
};

function estimateCost(
  model: string,
  inputTokens?: number,
  outputTokens?: number,
  totalTokens?: number
): number | undefined {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return undefined;

  if (inputTokens != null && outputTokens != null) {
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  }
  if (totalTokens != null) {
    return (totalTokens * pricing.input) / 1_000_000;
  }
  return undefined;
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

  const inputTokens = usage.prompt_tokens;
  const outputTokens = usage.completion_tokens;

  logUsage({
    functionName,
    model,
    provider: 'openrouter',
    inputTokens,
    outputTokens,
    totalTokens: usage.total_tokens,
    estimatedCost: estimateCost(model, inputTokens, outputTokens),
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
    estimatedCost: estimateCost(model, undefined, undefined, totalTokens),
    sessionId,
  });
}
