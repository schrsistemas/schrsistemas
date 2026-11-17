import type Database from "better-sqlite3";
import type { EmbeddingModelDescriptor, EmbeddingResult } from "./embedding-provider.js";
import { KnowledgeServiceError } from "./knowledge-service.js";
import { searchKnowledge, type KnowledgeSearchOptions } from "./knowledge-search-service.js";

export interface QueryEmbeddingProvider {
  readonly descriptor: EmbeddingModelDescriptor;
  embedQuery(texts: string[]): Promise<EmbeddingResult>;
}

export interface HybridSearchOptions extends KnowledgeSearchOptions {
  candidateLimit?: number;
  rrfK?: number;
}

interface Candidate extends Record<string, unknown> {
  chunk_id: string;
  document_id: string;
  source_id: string;
  content_hash: string;
  vector_json: string;
}

function fail(code: string, status: number, message: string): never {
  throw new KnowledgeServiceError(code, status, message);
}

function validateVector(value: unknown, dimensions: number): number[] {
  if (!Array.isArray(value) || value.length !== dimensions ||
      value.some((entry) => typeof entry !== "number" || !Number.isFinite(entry))) {
    return fail("VECTOR_DATA_INVALID", 500, "A persisted embedding has an invalid vector payload.");
  }
  const vector = value as number[];
  const norm = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0));
  if (!Number.isFinite(norm) || norm < 1e-12 || Math.abs(norm - 1) > 0.05) {
    return fail("VECTOR_DATA_INVALID", 500, "A persisted embedding is zero-length or not normalized.");
  }
  return vector;
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length) return fail("VECTOR_DIMENSION_MISMATCH", 500, "Embedding dimensions do not match.");
  let dot = 0;
  for (let index = 0; index < left.length; index += 1) dot += (left[index] ?? 0) * (right[index] ?? 0);
  return dot;
}

/**
 * Bounded in-process vector scan. Only current, real semantic vectors for the
 * exact query model revision are eligible. Candidate memory is capped at 500.
 */
export async function searchKnowledgeHybrid(
  db: Database.Database,
  projectId: string,
  query: unknown,
  provider: QueryEmbeddingProvider,
  options: HybridSearchOptions = {}
) {
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 200) {
    fail("KNOWLEDGE_SEARCH_VALIDATION_ERROR", 400, "q must contain 2-200 characters.");
  }
  const descriptor = provider.descriptor;
  if (descriptor.simulated || !descriptor.semantic || !Number.isInteger(descriptor.dimensions) || descriptor.dimensions < 1) {
    fail("SEMANTIC_PROVIDER_UNAVAILABLE", 503, "A real semantic embedding provider is required; simulated vectors are excluded.");
  }
  const limit = options.limit ?? 10;
  const candidateLimit = options.candidateLimit ?? 500;
  const rrfK = options.rrfK ?? 60;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) fail("KNOWLEDGE_SEARCH_VALIDATION_ERROR", 400, "limit must be an integer from 1 to 50.");
  if (!Number.isInteger(candidateLimit) || candidateLimit < 1 || candidateLimit > 500) fail("KNOWLEDGE_SEARCH_VALIDATION_ERROR", 400, "candidate_limit must be an integer from 1 to 500.");
  if (!Number.isInteger(rrfK) || rrfK < 1 || rrfK > 1000) fail("KNOWLEDGE_SEARCH_VALIDATION_ERROR", 400, "rrf_k must be an integer from 1 to 1000.");

  const queryResult = await provider.embedQuery([query.trim()]);
  if (queryResult.model.provider !== descriptor.provider ||
      queryResult.model.model !== descriptor.model ||
      queryResult.model.modelVersion !== descriptor.modelVersion ||
      queryResult.model.dimensions !== descriptor.dimensions ||
      queryResult.model.simulated || !queryResult.model.semantic ||
      queryResult.vectors.length !== 1) {
    fail("EMBEDDING_PROVIDER_INVALID_OUTPUT", 502, "Query embedding metadata does not match the configured semantic model.");
  }
  const queryVector = validateVector(queryResult.vectors[0], descriptor.dimensions);

  const conditions = ["e.project_id = ?", "e.provider = ?", "e.model = ?", "e.model_version = ?",
    "e.dimensions = ?", "e.simulated = 0", "e.semantic = 1", "e.content_hash = c.content_hash"];
  const params: Array<string | number> = [projectId, descriptor.provider, descriptor.model, descriptor.modelVersion, descriptor.dimensions];
  if (options.sourceId) {
    conditions.push("e.source_id = ?");
    params.push(options.sourceId);
  }
  if (options.documentId) {
    conditions.push("e.document_id = ?");
    params.push(options.documentId);
  }
  params.push(candidateLimit);
  const rows = db.prepare(`
    SELECT e.chunk_id, e.document_id, e.source_id, e.content_hash, e.vector_json,
      d.title AS document_title, s.name AS source_name, c.chunk_index, c.content,
      c.start_offset, c.end_offset
    FROM knowledge_embeddings e
    INNER JOIN knowledge_chunks c ON c.id=e.chunk_id AND c.project_id=e.project_id
    INNER JOIN knowledge_documents d ON d.id=e.document_id AND d.project_id=e.project_id
    INNER JOIN knowledge_sources s ON s.id=e.source_id AND s.project_id=e.project_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY e.updated_at DESC, e.chunk_id ASC
    LIMIT ?
  `).all(...params) as Candidate[];

  const vectorRanked = rows.map((row) => {
    let parsed: unknown;
    try { parsed = JSON.parse(row.vector_json); }
    catch { return fail("VECTOR_DATA_INVALID", 500, "A persisted embedding contains invalid JSON."); }
    const vector = validateVector(parsed, descriptor.dimensions);
    return { row, score: cosineSimilarity(queryVector, vector) };
  }).sort((a, b) => b.score - a.score || a.row.chunk_id.localeCompare(b.row.chunk_id))
    .slice(0, limit);

  const lexical = searchKnowledge(db, projectId, query, {
    ...(options.sourceId ? { sourceId: options.sourceId } : {}),
    ...(options.documentId ? { documentId: options.documentId } : {}),
    limit
  });
  const lexicalRanks = new Map<string, { rank: number; score: number; result: Record<string, unknown> }>();
  lexical.results.forEach((item, index) => {
    const result = item as Record<string, unknown>;
    lexicalRanks.set(String(result.chunk_id), { rank: index + 1, score: Number(result.score), result });
  });
  const vectorRanks = new Map(vectorRanked.map((item, index) => [item.row.chunk_id, { rank: index + 1, score: item.score, row: item.row }]));
  const ids = new Set([...lexicalRanks.keys(), ...vectorRanks.keys()]);
  const results = [...ids].map((chunkId) => {
    const lexicalItem = lexicalRanks.get(chunkId);
    const vectorItem = vectorRanks.get(chunkId);
    const base = lexicalItem?.result ?? vectorItem?.row;
    if (!base) return null;
    return {
      chunk_id: chunkId,
      document_id: base.document_id,
      source_id: base.source_id,
      document_title: base.document_title,
      source_name: base.source_name,
      chunk_index: base.chunk_index,
      content: base.content,
      start_offset: base.start_offset,
      end_offset: base.end_offset,
      content_hash: base.content_hash,
      lexical_rank: lexicalItem?.rank ?? null,
      vector_rank: vectorItem?.rank ?? null,
      lexical_score: lexicalItem?.score ?? null,
      vector_score: vectorItem?.score ?? null,
      hybrid_score: (lexicalItem ? 1 / (rrfK + lexicalItem.rank) : 0) + (vectorItem ? 1 / (rrfK + vectorItem.rank) : 0),
      simulated: false,
      semantic: true
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.hybrid_score - a.hybrid_score || a.chunk_id.localeCompare(b.chunk_id))
    .slice(0, limit);

  return {
    query: query.trim(),
    strategy: "hybrid_rrf",
    semantic: true,
    model: { provider: descriptor.provider, model: descriptor.model, model_version: descriptor.modelVersion, dimensions: descriptor.dimensions },
    candidate_limit: candidateLimit,
    candidates_scanned: rows.length,
    rrf_k: rrfK,
    count: results.length,
    results
  };
}
