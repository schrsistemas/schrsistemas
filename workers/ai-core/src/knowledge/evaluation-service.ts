import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import { searchKnowledge } from "./knowledge-search-service.js";
import { KnowledgeServiceError } from "./knowledge-service.js";

export interface RetrievalEvaluationCase {
  id: string;
  query: string;
  expected_chunk_ids: string[];
}

export interface RetrievalEvaluationInput {
  dataset_name: string;
  dataset_version: string;
  cases: RetrievalEvaluationCase[];
  top_k?: number;
}

function invalid(message: string): never {
  throw new KnowledgeServiceError("EVALUATION_VALIDATION_ERROR", 400, message);
}

function validateDatasetName(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length < 1 || value.length > 120) {
    invalid(field + " must contain 1-120 characters.");
  }
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Runs a version-labelled, deterministic retrieval dataset against the current local index. */
export function evaluateKnowledgeRetrieval(
  db: Database.Database,
  projectId: string,
  input: unknown
) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) invalid("Request body must be a JSON object.");
  const body = input as Record<string, unknown>;
  validateDatasetName(body.dataset_name, "dataset_name");
  validateDatasetName(body.dataset_version, "dataset_version");
  if (!Array.isArray(body.cases) || body.cases.length < 1 || body.cases.length > 500) {
    invalid("cases must contain 1-500 evaluation cases.");
  }
  const topK = body.top_k ?? 5;
  if (!Number.isInteger(topK) || (topK as number) < 1 || (topK as number) > 50) {
    invalid("top_k must be an integer from 1 to 50.");
  }

  const cases = body.cases.map((value, index) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) invalid("cases[" + index + "] must be an object.");
    const item = value as Record<string, unknown>;
    if (typeof item.id !== "string" || item.id.trim().length < 1 || item.id.length > 120) invalid("cases[" + index + "].id is invalid.");
    if (typeof item.query !== "string" || item.query.trim().length < 2 || item.query.length > 200) invalid("cases[" + index + "].query must contain 2-200 characters.");
    if (!Array.isArray(item.expected_chunk_ids) || item.expected_chunk_ids.length < 1 || item.expected_chunk_ids.length > 500 ||
        item.expected_chunk_ids.some((id) => typeof id !== "string" || id.length < 1 || id.length > 128)) {
      invalid("cases[" + index + "].expected_chunk_ids must contain 1-500 chunk IDs.");
    }
    const expected = [...new Set(item.expected_chunk_ids as string[])];
    if (expected.length !== item.expected_chunk_ids.length) invalid("cases[" + index + "] contains duplicate expected chunk IDs.");
    return { id: item.id, query: item.query, expected_chunk_ids: expected };
  });
  if (new Set(cases.map((item) => item.id)).size !== cases.length) invalid("case IDs must be unique.");

  const canonical = JSON.stringify({
    dataset_name: body.dataset_name.trim(),
    dataset_version: body.dataset_version.trim(),
    top_k: topK,
    cases
  });
  const datasetHash = createHash("sha256").update(canonical, "utf8").digest("hex");
  const details = cases.map((item) => {
    const retrieval = searchKnowledge(db, projectId, item.query, { limit: topK as number });
    const rankedIds = retrieval.results.map((row) => String(row.chunk_id));
    const expected = new Set(item.expected_chunk_ids);
    const relevantRanks = rankedIds.map((id, index) => expected.has(id) ? index + 1 : 0).filter((rank) => rank > 0);
    const hits = relevantRanks.length;
    const precision = hits / (topK as number);
    const recall = hits / expected.size;
    const reciprocalRank = relevantRanks.length > 0 ? 1 / Math.min(...relevantRanks) : 0;
    return {
      id: item.id,
      query: item.query,
      expected_count: expected.size,
      retrieved_count: rankedIds.length,
      relevant_retrieved: hits,
      precision_at_k: precision,
      recall_at_k: recall,
      reciprocal_rank: reciprocalRank,
      hit: hits > 0,
      retrieved_chunk_ids: rankedIds,
      missing_chunk_ids: item.expected_chunk_ids.filter((id) => !rankedIds.includes(id))
    };
  });

  return {
    dataset: { name: body.dataset_name.trim(), version: body.dataset_version.trim(), sha256: datasetHash, cases: cases.length },
    retrieval: { strategy: "lexical_fts5", semantic: false, top_k: topK },
    metrics: {
      precision_at_k: mean(details.map((item) => item.precision_at_k)),
      recall_at_k: mean(details.map((item) => item.recall_at_k)),
      mrr: mean(details.map((item) => item.reciprocal_rank)),
      hit_rate_at_k: mean(details.map((item) => item.hit ? 1 : 0))
    },
    cases: details,
    limitations: [
      "Metrics are macro-averaged over cases.",
      "Expected chunk IDs must refer to the current indexed document revision.",
      "This evaluator measures lexical retrieval only; it does not measure answer correctness or semantic relevance."
    ]
  };
}

export function evaluateAnswerGrounding(input: unknown) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) invalid("Request body must be a JSON object.");
  const body = input as Record<string, unknown>;
  if (typeof body.answer !== "string" || body.answer.length > 50000) invalid("answer must be a string of at most 50000 characters.");
  if (!Array.isArray(body.available_citation_ids) || body.available_citation_ids.length > 500 ||
      body.available_citation_ids.some((id) => typeof id !== "string" || id.length < 1 || id.length > 200)) {
    invalid("available_citation_ids must be an array of citation IDs.");
  }
  const available = new Set(body.available_citation_ids as string[]);
  const cited = [...body.answer.matchAll(/\[([a-zA-Z0-9_-]{1,200})\]/g)].map((match) => match[1] as string);
  const uniqueCited = [...new Set(cited)];
  const valid = uniqueCited.filter((id) => available.has(id));
  const invalidIds = uniqueCited.filter((id) => !available.has(id));
  const sentences = body.answer.split(/[.!?\n]+/u).map((part) => part.trim()).filter((part) => part.length > 0);
  const citedSentences = sentences.filter((sentence) => {
    const refs = [...sentence.matchAll(/\[([a-zA-Z0-9_-]{1,200})\]/g)].map((match) => match[1] as string);
    return refs.some((id) => available.has(id));
  }).length;
  const abstained = body.abstained === true;
  return {
    abstained,
    metrics: {
      citation_precision: uniqueCited.length === 0 ? 0 : valid.length / uniqueCited.length,
      citation_coverage: sentences.length === 0 ? 0 : citedSentences / sentences.length,
      valid_citation_count: valid.length,
      invalid_citation_count: invalidIds.length,
      unique_citation_count: uniqueCited.length,
      sentence_count: sentences.length,
      cited_sentence_count: citedSentences
    },
    invalid_citation_ids: invalidIds,
    valid_citation_ids: valid,
    limitations: [
      "Citation validation checks identifier membership only; it does not prove that a cited source entails a claim.",
      "Citation coverage is a syntactic sentence-level proxy, not semantic groundedness.",
      "Abstention is reported as supplied metadata and is not independently inferred from answer text."
    ]
  };
}
