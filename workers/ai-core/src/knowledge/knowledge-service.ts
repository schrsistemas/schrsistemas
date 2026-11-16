import { createHash, randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

export type KnowledgeFormat = "text" | "markdown";
export interface KnowledgeChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  start_offset: number;
  end_offset: number;
  content_hash: string;
}
export class KnowledgeServiceError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) {
    super(message);
    this.name = "KnowledgeServiceError";
  }
}
function invalid(message: string): never {
  throw new KnowledgeServiceError("KNOWLEDGE_VALIDATION_ERROR", 400, message);
}
function asObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return invalid("Request body must be a JSON object.");
  return value as Record<string, unknown>;
}
function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
function normalizeText(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/\u0000/g, "").normalize("NFC");
}
function makeChunks(documentId: string, content: string, chunkSize: number, overlap: number): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];
  let start = 0;
  while (start < content.length) {
    let end = Math.min(content.length, start + chunkSize);
    if (end < content.length) {
      const boundary = content.lastIndexOf("\n", end);
      if (boundary > start + Math.floor(chunkSize * 0.6)) end = boundary;
    }
    const body = content.slice(start, end);
    if (body.length > 0) {
      chunks.push({
        id: "kc_" + randomUUID().replaceAll("-", ""),
        document_id: documentId,
        chunk_index: chunks.length,
        content: body,
        start_offset: start,
        end_offset: end,
        content_hash: sha256(body)
      });
    }
    if (end >= content.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}
export function createKnowledgeSource(db: Database.Database, projectId: string, value: unknown) {
  const input = asObject(value);
  if (typeof input.name !== "string" || input.name.trim().length < 1 || input.name.length > 120) return invalid("name must contain 1-120 characters.");
  if (input.description !== undefined && (typeof input.description !== "string" || input.description.length > 500)) return invalid("description must be a string of at most 500 characters.");
  const id = "ks_" + randomUUID().replaceAll("-", "");
  db.prepare("INSERT INTO knowledge_sources(id,project_id,name,description) VALUES(?,?,?,?)")
    .run(id, projectId, input.name.trim(), typeof input.description === "string" ? input.description : null);
  return getKnowledgeSource(db, projectId, id);
}
export function listKnowledgeSources(db: Database.Database, projectId: string) {
  return db.prepare("SELECT s.id,s.name,s.description,s.status,s.created_at,s.updated_at,(SELECT COUNT(*) FROM knowledge_documents d WHERE d.source_id=s.id AND d.project_id=s.project_id) AS document_count FROM knowledge_sources s WHERE s.project_id=? ORDER BY s.created_at DESC").all(projectId);
}
export function getKnowledgeSource(db: Database.Database, projectId: string, sourceId: string) {
  const source = db.prepare("SELECT id,project_id,name,description,status,created_at,updated_at FROM knowledge_sources WHERE id=? AND project_id=?")
    .get(sourceId, projectId);
  if (!source) throw new KnowledgeServiceError("KNOWLEDGE_SOURCE_NOT_FOUND", 404, "Knowledge source not found.");
  return source;
}
export function ingestKnowledgeDocument(db: Database.Database, projectId: string, value: unknown) {
  const input = asObject(value);
  if (typeof input.source_id !== "string" || input.source_id.length < 1) return invalid("source_id is required.");
  if (typeof input.title !== "string" || title.length < 1 || input.title.length > 240) return invalid("title must contain 1-240 characters.");
  const title = title;
  if (typeof input.content !== "string" || input.content.length < 1 || input.content.length > 200000) return invalid("content must contain 1-200000 characters.");
  const format = input.format === undefined ? "text" : input.format;
  if (format !== "text" && format !== "markdown") return invalid("format must be text or markdown.");
  const externalId = input.external_id === undefined ? null : input.external_id;
  if (externalId !== null && (typeof externalId !== "string" || externalId.length < 1 || externalId.length > 200)) return invalid("external_id must contain 1-200 characters.");
  getKnowledgeSource(db, projectId, input.source_id);
  const content = normalizeText(input.content);
  if (content.trim().length === 0) return invalid("content must contain non-whitespace text.");
  const contentHash = sha256(content);
  const duplicate = db.prepare("SELECT id,source_id,title,format,content_hash,version,chunk_count,created_at,updated_at FROM knowledge_documents WHERE source_id=? AND project_id=? AND content_hash=?")
    .get(input.source_id, projectId, contentHash) as Record<string, unknown> | undefined;
  if (duplicate) return { ...duplicate, duplicate: true, processed: false };
  const existing = externalId === null ? undefined : db.prepare("SELECT id,version FROM knowledge_documents WHERE source_id=? AND project_id=? AND external_id=?")
    .get(input.source_id, projectId, externalId) as { id: string; version: number } | undefined;
  const documentId = existing?.id ?? "kd_" + randomUUID().replaceAll("-", "");
  const version = existing ? existing.version + 1 : 1;
  const chunks = makeChunks(documentId, content, 1200, 150);
  const transaction = db.transaction(() => {
    if (existing) {
      db.prepare("DELETE FROM knowledge_chunks WHERE document_id=? AND project_id=?").run(documentId, projectId);
      db.prepare("UPDATE knowledge_documents SET title=?,format=?,content=?,content_hash=?,version=?,chunk_count=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND project_id=?")
        .run(title, format, content, contentHash, version, chunks.length, documentId, projectId);
    } else {
      db.prepare("INSERT INTO knowledge_documents(id,source_id,project_id,external_id,title,format,content,content_hash,version,chunk_count) VALUES(?,?,?,?,?,?,?,?,?,?)")
        .run(documentId, input.source_id, projectId, externalId, title, format, content, contentHash, version, chunks.length);
    }
    const insert = db.prepare("INSERT INTO knowledge_chunks(id,document_id,source_id,project_id,chunk_index,content,start_offset,end_offset,content_hash) VALUES(?,?,?,?,?,?,?,?,?)");
    for (const chunk of chunks) insert.run(chunk.id, documentId, input.source_id, projectId, chunk.chunk_index, chunk.content, chunk.start_offset, chunk.end_offset, chunk.content_hash);
    db.prepare("UPDATE knowledge_sources SET updated_at=CURRENT_TIMESTAMP WHERE id=? AND project_id=?").run(input.source_id, projectId);
  });
  transaction();
  return {
    id: documentId,
    source_id: input.source_id,
    title: title,
    format,
    content_hash: contentHash,
    version,
    chunk_count: chunks.length,
    duplicate: false,
    processed: true
  };
}
export function listKnowledgeDocuments(db: Database.Database, projectId: string, sourceId?: string) {
  if (sourceId) getKnowledgeSource(db, projectId, sourceId);
  const query = sourceId
    ? "SELECT id,source_id,title,format,content_hash,version,chunk_count,created_at,updated_at FROM knowledge_documents WHERE project_id=? AND source_id=? ORDER BY created_at DESC"
    : "SELECT id,source_id,title,format,content_hash,version,chunk_count,created_at,updated_at FROM knowledge_documents WHERE project_id=? ORDER BY created_at DESC";
  return sourceId ? db.prepare(query).all(projectId, sourceId) : db.prepare(query).all(projectId);
}
export function getKnowledgeDocument(db: Database.Database, projectId: string, documentId: string) {
  const document = db.prepare("SELECT id,source_id,title,format,content,content_hash,version,chunk_count,created_at,updated_at FROM knowledge_documents WHERE id=? AND project_id=?")
    .get(documentId, projectId) as Record<string, unknown> | undefined;
  if (!document) throw new KnowledgeServiceError("KNOWLEDGE_DOCUMENT_NOT_FOUND", 404, "Knowledge document not found.");
  const chunks = db.prepare("SELECT id,chunk_index,content,start_offset,end_offset,content_hash FROM knowledge_chunks WHERE document_id=? AND project_id=? ORDER BY chunk_index ASC")
    .all(documentId, projectId);
  return { ...document, chunks };
}
