import { test } from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../src/database.js";
import { MockEmbeddingProvider, type EmbeddingModelDescriptor, type EmbeddingResult, type EmbeddingProvider } from "../src/knowledge/embedding-provider.js";
import { indexKnowledgeDocumentEmbeddings } from "../src/knowledge/embedding-service.js";
import { searchKnowledgeHybrid, type QueryEmbeddingProvider } from "../src/knowledge/hybrid-search-service.js";
import { createKnowledgeSource, ingestKnowledgeDocument } from "../src/knowledge/knowledge-service.js";

const descriptor: EmbeddingModelDescriptor = {
  provider: "test-local",
  model: "test-semantic",
  modelVersion: "rev-1",
  dimensions: 2,
  simulated: false,
  semantic: true
};

class TestSemanticProvider implements EmbeddingProvider, QueryEmbeddingProvider {
  readonly descriptor = descriptor;
  async embed(texts: string[]): Promise<EmbeddingResult> {
    return { model: this.descriptor, vectors: texts.map((text) => text.includes("manual") ? [1, 0] : [0, 1]) };
  }
  async embedQuery(_texts: string[]): Promise<EmbeddingResult> {
    return { model: this.descriptor, vectors: [[1, 0]] };
  }
}

function database() {
  return openDatabase(":memory:", "project-a", "Project A", "test-api-key-with-at-least-16-chars");
}

test("hybrid retrieval ranks semantic vectors and combines lexical/vector ranks with RRF", async (t) => {
  const db = database();
  t.after(() => db.close());
  const source = createKnowledgeSource(db, "project-a", { name: "Manual" }) as { id: string };
  const first = ingestKnowledgeDocument(db, "project-a", {
    source_id: source.id, title: "Manual técnico", content: "manual técnico manutenção preventiva"
  }) as { id: string };
  const second = ingestKnowledgeDocument(db, "project-a", {
    source_id: source.id, title: "Outro documento", content: "catálogo geral de equipamentos"
  }) as { id: string };
  const provider = new TestSemanticProvider();
  await indexKnowledgeDocumentEmbeddings(db, "project-a", first.id, provider);
  await indexKnowledgeDocumentEmbeddings(db, "project-a", second.id, provider);

  const result = await searchKnowledgeHybrid(db, "project-a", "manual manutenção", provider, { limit: 10 });
  assert.equal(result.strategy, "hybrid_rrf");
  assert.equal(result.semantic, true);
  assert.equal(result.count, 2);
  assert.equal(result.results[0]?.document_id, first.id);
  assert.equal(result.results[0]?.vector_rank, 1);
  assert.ok((result.results[0]?.hybrid_score ?? 0) > 0);
  assert.equal(result.results[0]?.simulated, false);
});

test("hybrid retrieval rejects mock providers and excludes stale content hashes", async (t) => {
  const db = database();
  t.after(() => db.close());
  const source = createKnowledgeSource(db, "project-a", { name: "Manual" }) as { id: string };
  const document = ingestKnowledgeDocument(db, "project-a", {
    source_id: source.id, external_id: "manual-1", title: "Manual", content: "manual original content"
  }) as { id: string };
  const provider = new TestSemanticProvider();
  await indexKnowledgeDocumentEmbeddings(db, "project-a", document.id, provider);
  await assert.rejects(
    () => searchKnowledgeHybrid(db, "project-a", "manual original", new MockEmbeddingProvider() as unknown as QueryEmbeddingProvider),
    /real semantic embedding provider is required/
  );
  ingestKnowledgeDocument(db, "project-a", {
    source_id: source.id, external_id: "manual-1", title: "Manual", content: "manual updated content"
  });
  const result = await searchKnowledgeHybrid(db, "project-a", "manual updated", provider);
  assert.equal(result.candidates_scanned, 0);
  assert.equal(result.count, 0);
});

test("hybrid retrieval rejects corrupt persisted vectors", async (t) => {
  const db = database();
  t.after(() => db.close());
  const source = createKnowledgeSource(db, "project-a", { name: "Manual" }) as { id: string };
  const document = ingestKnowledgeDocument(db, "project-a", {
    source_id: source.id, title: "Manual", content: "manual técnico"
  }) as { id: string };
  const provider = new TestSemanticProvider();
  await indexKnowledgeDocumentEmbeddings(db, "project-a", document.id, provider);
  db.prepare("UPDATE knowledge_embeddings SET vector_json = ? WHERE project_id = ?")
    .run("[0,0]", "project-a");
  await assert.rejects(
    () => searchKnowledgeHybrid(db, "project-a", "manual técnico", provider),
    /zero-length or not normalized/
  );
});
