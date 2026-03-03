/**
 * Voyage AI code embedding and reranking module.
 * Uses voyage-code-3 (1024 dimensions) for code-specific embeddings
 * and rerank-2 for result reranking.
 */

const VOYAGE_API_URL = "https://api.voyageai.com/v1";
const CODE_MODEL = "voyage-code-3";
const RERANK_MODEL = "rerank-2";
const BATCH_SIZE = 128;
const OUTPUT_DIMENSION = 1024;

function getApiKey(): string {
  const key = Deno.env.get("VOYAGE_API_KEY");
  if (!key) throw new Error("VOYAGE_API_KEY not set");
  return key;
}

/**
 * Embed code inputs in batches using voyage-code-3.
 * @param inputs - Array of code strings to embed
 * @param inputType - "document" for indexing, "query" for searching
 * @returns Array of embedding vectors (null for failed items)
 */
export async function embedCode(
  inputs: string[],
  inputType: "document" | "query" = "document"
): Promise<(number[] | null)[]> {
  const apiKey = getApiKey();
  const allEmbeddings: (number[] | null)[] = new Array(inputs.length).fill(null);

  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE);
    try {
      const response = await fetch(`${VOYAGE_API_URL}/embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: CODE_MODEL,
          input: batch,
          input_type: inputType,
          output_dimension: OUTPUT_DIMENSION,
        }),
      });

      if (!response.ok) {
        console.error(
          `Voyage code embedding batch ${i / BATCH_SIZE} failed: ${response.status}`
        );
        continue;
      }

      const data = await response.json();
      for (let j = 0; j < data.data.length; j++) {
        allEmbeddings[i + j] = data.data[j].embedding;
      }
    } catch (error) {
      console.error(`Voyage code embedding batch ${i / BATCH_SIZE} error:`, error);
    }
  }

  return allEmbeddings;
}

/**
 * Embed a single query string for searching code.
 * @param query - The search query
 * @returns Embedding vector or null on failure
 */
export async function embedQuery(query: string): Promise<number[] | null> {
  const results = await embedCode([query], "query");
  return results[0];
}

/**
 * Rerank documents against a query using Voyage rerank-2.
 * @param query - The search query
 * @param documents - Array of document strings to rerank
 * @param topK - Number of top results to return (default 10)
 * @returns Reranked results with index and relevance score
 */
export async function rerankDocuments(
  query: string,
  documents: string[],
  topK = 10
): Promise<{ index: number; relevance_score: number }[]> {
  const apiKey = getApiKey();

  try {
    const response = await fetch(`${VOYAGE_API_URL}/rerank`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: RERANK_MODEL,
        query,
        documents,
        top_k: topK,
      }),
    });

    if (!response.ok) {
      console.error(`Voyage rerank failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Voyage rerank error:", error);
    return [];
  }
}
