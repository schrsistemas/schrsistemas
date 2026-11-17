import type Database from "better-sqlite3";

export interface StoredEmbedding {
  id: string;
  project_id: string;
  source_id: string;
  document_id: string;
  chunk_id: string;
  content_hash: string;
  provider: string;
  model: string;
  model_version: string;
  dimensions: number;
  simulated: boolean;
  semantic: boolean;
  vector: number[];
  created_at: string;
}

export interface VectorStore {
  upsert(embedding: Omit<StoredEmbedding, "id" | "created_at">): void;
  listByDocument(projectId: string, documentId: string): StoredEmbedding[];
  deleteByDocument(projectId: string, documentId: string): number;
}

/** SQLite persistence only. This adapter does not perform vector similarity search. */
export class SqliteVectorStore implements VectorStore {
  constructor(private readonly db: Database.Database) {}

  upsert(embedding: NewStoredEmbedding): void {
    this.db.prepare(`
      INSERT INTO knowledge_embeddings(
        id,project_id,source_id,document_id,chunk_id,content_hash,
        provider,model,model_version,dimensions,simulated,semantic,vector_json
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(chunk_id,provider,model,model_version) DO UPDATE SET
        project_id=excluded.project_id,
        source_id=excluded.source_id,
        document_id=excluded.document_id,
        content_hash=excluded.content_hash,
        dimensions=excluded.dimensions,
        simulated=excluded.simulated,
        semantic=excluded.semantic,
        vector_json=excluded.vector_json,
        updated_at=CURRENT_TIMESTAMP
    `).run(
      embedding.id,
      embedding.project_id,
      embedding.source_id,
      embedding.document_id,
      embedding.chunk_id,
      embedding.content_hash,
      embedding.provider,
      embedding.model,
      embedding.model_version,
      embedding.dimensions,
      embedding.simulated ? 1 : 0,
      embedding.semantic ? 1 : 0,
      JSON.stringify(embedding.vector)
    );
  }

  listByDocument(projectId: string, documentId: string): StoredEmbedding[] {
    const rows = this.db.prepare(`
      SELECT id,project_id,source_id,document_id,chunk_id,content_hash,
        provider,model,model_version,dimensions,simulated,semantic,vector_json,created_at
      FROM knowledge_embeddings
      WHERE project_id=? AND document_id=?
      ORDER BY chunk_id ASC, provider ASC, model ASC, model_version ASC
    `).all(projectId, documentId) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      project_id: String(row.project_id),
      source_id: String(row.source_id),
      document_id: String(row.document_id),
      chunk_id: String(row.chunk_id),
      content_hash: String(row.content_hash),
      provider: String(row.provider),
      model: String(row.model),
      model_version: String(row.model_version),
      dimensions: Number(row.dimensions),
      simulated: Number(row.simulated) === 1,
      semantic: Number(row.semantic) === 1,
      vector: JSON.parse(String(row.vector_json)) as number[],
      created_at: String(row.created_at)
    }));
  }

  deleteByDocument(projectId: string, documentId: string): number {
    return this.db.prepare("DELETE FROM knowledge_embeddings WHERE project_id=? AND document_id=?")
      .run(projectId, documentId).changes;
  }
}
