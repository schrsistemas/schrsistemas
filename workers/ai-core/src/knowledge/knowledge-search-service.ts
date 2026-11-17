import type Database from "better-sqlite3";
import { KnowledgeServiceError, getKnowledgeSource, getKnowledgeDocument } from "./knowledge-service.js";

export interface KnowledgeSearchOptions {
  sourceId?: string;
  documentId?: string;
  limit?: number;
}
function invalid(message: string): never {
  throw new KnowledgeServiceError("KNOWLEDGE_SEARCH_VALIDATION_ERROR", 400, message);
}
function buildMatchQuery(query: string): string {
  const terms = query.match(/[\p{L}\p{N}_]+/gu) ?? [];
  const unique = [...new Set(terms.map((term) => term.toLocaleLowerCase("und")))];
  if (unique.length === 0) return invalid("q must contain at least one searchable word or number.");
  return unique.map((term) => '"' + term.replaceAll('"', '""') + '"').join(" AND ");
}
export function isKnowledgeFtsAvailable(db: Database.Database): boolean {
  const row = db.prepare("SELECT 1 AS available FROM sqlite_master WHERE type='table' AND name='knowledge_chunks_fts'").get();
  return Boolean(row);
}
export function searchKnowledge(
  db: Database.Database,
  projectId: string,
  query: unknown,
  options: KnowledgeSearchOptions = {}
) {
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 200) {
    return invalid("q must contain 2-200 characters.");
  }
  const limit = options.limit ?? 10;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return invalid("limit must be an integer from 1 to 50.");
  if (options.sourceId) getKnowledgeSource(db, projectId, options.sourceId);
  if (options.documentId) getKnowledgeDocument(db, projectId, options.documentId);
  if (!isKnowledgeFtsAvailable(db)) {
    throw new KnowledgeServiceError("KNOWLEDGE_SEARCH_UNAVAILABLE", 503, "SQLite FTS5 is not available in this runtime.");
  }
  const match = buildMatchQuery(query.trim());
  const conditions = ["f.project_id = ?"];
  const params: Array<string | number> = [match, projectId];
  if (options.sourceId) {
    conditions.push("f.source_id = ?");
    params.push(options.sourceId);
  }
  if (options.documentId) {
    conditions.push("f.document_id = ?");
    params.push(options.documentId);
  }
  params.push(limit);
  const rows = db.prepare(`
    SELECT
      f.chunk_id AS chunk_id,
      f.document_id AS document_id,
      f.source_id AS source_id,
      d.title AS document_title,
      s.name AS source_name,
      c.chunk_index AS chunk_index,
      c.content AS content,
      c.start_offset AS start_offset,
      c.end_offset AS end_offset,
      c.content_hash AS content_hash,
      bm25(knowledge_chunks_fts) AS score
    FROM knowledge_chunks_fts f
    INNER JOIN knowledge_chunks c ON c.id = f.chunk_id AND c.project_id = f.project_id
    INNER JOIN knowledge_documents d ON d.id = f.document_id AND d.project_id = f.project_id
    INNER JOIN knowledge_sources s ON s.id = f.source_id AND s.project_id = f.project_id
    WHERE knowledge_chunks_fts MATCH ? AND ${conditions.join(" AND ")}
    ORDER BY score ASC, c.document_id ASC, c.chunk_index ASC
    LIMIT ?
  `).all(...params) as Array<Record<string, unknown>>;
  return {
    query: query.trim(),
    strategy: "lexical_fts5",
    semantic: false,
    count: rows.length,
    results: rows
  };
}
