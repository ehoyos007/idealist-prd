import { errorResponse } from './cors.ts';

/**
 * Validates the x-api-key header against IDEALIST_API_SECRET env var.
 * Fails open if secret is not set (dev mode).
 * Returns null if valid, or an error Response if invalid.
 */
export function validateApiKey(req: Request): Response | null {
  const secret = Deno.env.get('IDEALIST_API_SECRET');

  // Fail open in dev mode (no secret configured)
  if (!secret) return null;

  const apiKey = req.headers.get('x-api-key');
  if (!apiKey || apiKey !== secret) {
    return errorResponse('Unauthorized', 401);
  }

  return null;
}
