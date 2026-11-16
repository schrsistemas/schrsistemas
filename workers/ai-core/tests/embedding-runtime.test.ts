import { test } from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../src/database.js";
import { MockEmbeddingProvider } from "../src/knowledge/embedding-provider.js";
import { indexKnowledgeDocumentEmbeddings, listKnowledgeDocumentEmbeddings } from "../src/knowledge/embedding-service.js";
import { createKnowledgeSource, ingestKnowledgeDocument } from "../src/knowledge/knowledge-service.js";

function database() {
  return openDatabase(":memory:", "project-a", "Project A", "test-api-key-with-at-least-16-chars");
}

test("MockEmbeddingProvider returns deterministic normalized vectors explicitly marked simulated", async () => {
  const provider = new MockEmbeddingProvider();
  const first = await provider.embed(["texto de teste"]);
  const second = await provider.embed(["texto de teste"]);
  assert.deepEqual(first, second);
  assert.equal(first.model.provider, "mock");
  assert.equal(first.model.simulated, true);
  assert.equal(first.model.semantic, false);
  assert.equal(first.model.dimensions, 32);
  assert.equal(first.vectors[0]?.length, 32);
  const norm = Math.sqrt((first.vectors[0] ?? []).reduce((sum, value) => sum + value * value, 0));
  assert.ok(Math.abs(norm - 1) < 0.00001);
  await assert.rejects(() => provider.embed([]), /1-128 texts/);
});

test("Embedding Runtime persists versioned vector metadata and is idempotent", async (t) => {
  const db = database();
  t.after(() => db.close());
  const source = createKnowledgeSource(db, "project-a", { name: "Manual" }) as { id: string };
  const document = ingestKnowledgeDocument(db, "project-a", {
    source_id: source.id,
    title: "Documento",
    content: "Local embedding runtime persists this document chunk."
  }) as { id: string };
  const provider = new MockEmbeddingProvider();
  const indexed = await indexKnowledgeDocumentEmbeddings(db, "project-a", document.id, provider);
  assert.equal(indexed.indexed_chunks, 1);
  assert.equal(indexed.simulated, true);
  assert.equal(indexed.semantic, false);
  const first = listKnowledgeDocumentEmbeddings(db, "project-a", document.id);
  assert.equal(first.length, 1);
  assert.equal(first[0]?.dimensions, 32);
  assert.equal(first[0]?.model, "schr-mock-embedding-v1");
  assert.equal(first[0]?.simulated, true);
  assert.equal(first[0]?.semantic, false);
  await indexKnowledgeDocumentEmbeddings(db, "project-a", document.id, provider);
  const second = listKnowledgeDocumentEmbeddings(db, "project-a", document.id);
  assert.equal(second.length, 1);
  assert.equal(second[0]?.id, first[0]?.id);
});

test("Embedding Runtime isolates projects and cascades old vectors on document replacement", async (t) => {
  const db = database();
  t.after(() => db.close());
  const source = createKnowledgeSource(db, "project-a", { name: "Manual" }) as { id: string };
  const first = ingestKnowledgeDocument(db, "project-a", {
    source_id: source.id, external_id: "manual-1", title: "Documento", content: "first version content"
  }) as { id: string };
  await indexKnowledgeDocumentEmbeddings(db, "project-a", first.id, new MockEmbeddingProvider());
  assert.equal(listKnowledgeDocumentEmbeddings(db, "project-b", first.id).length, 0);
  ingestKnowledgeDocument(db, "project-a", {
    source_id: source.id, external_id: "manual-1", title: "Documento", content: "replacement version content"
  });
  assert.equal(listKnowledgeDocumentEmbeddings(db, "project-a", first.id).length, 0);
});
