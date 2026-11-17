import { test } from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../src/database.js";
import {
  createKnowledgeSource,
  getKnowledgeDocument,
  ingestKnowledgeDocument,
  KnowledgeServiceError,
  listKnowledgeDocuments,
  listKnowledgeSources
} from "../src/knowledge/knowledge-service.js";

function database() {
  return openDatabase(":memory:", "project-a", "Project A", "test-api-key-with-at-least-16-chars");
}

test("Knowledge Engine creates sources and ingests traceable deterministic chunks", (t) => {
  const db = database();
  t.after(() => db.close());
  const source = createKnowledgeSource(db, "project-a", { name: "Manual técnico" }) as { id: string };
  const content = "A".repeat(2600);
  const result = ingestKnowledgeDocument(db, "project-a", {
    source_id: source.id,
    title: "Documento 1",
    format: "markdown",
    content
  });
  assert.equal(result.processed, true);
  assert.equal(result.version, 1);
  assert.ok(result.chunk_count >= 2);
  const document = getKnowledgeDocument(db, "project-a", result.id) as {
    content: string;
    chunks: Array<{ chunk_index: number; content: string; start_offset: number; end_offset: number; content_hash: string }>;
  };
  assert.equal(document.content, content);
  assert.equal(document.chunks[0]?.start_offset, 0);
  assert.equal(document.chunks[0]?.content, content.slice(0, 1200));
  assert.equal(document.chunks[1]?.start_offset, 1050);
  assert.equal(document.chunks[1]?.content, content.slice(1050, 2250));
  for (const [index, chunk] of document.chunks.entries()) {
    assert.equal(chunk.chunk_index, index);
    assert.equal(chunk.content, content.slice(chunk.start_offset, chunk.end_offset));
    assert.equal(chunk.content_hash.length, 64);
  }
  assert.equal(listKnowledgeDocuments(db, "project-a", source.id).length, 1);
  assert.equal(listKnowledgeSources(db, "project-a").length, 1);
});

test("Knowledge Engine is idempotent for identical normalized content", (t) => {
  const db = database();
  t.after(() => db.close());
  const source = createKnowledgeSource(db, "project-a", { name: "Base" }) as { id: string };
  const first = ingestKnowledgeDocument(db, "project-a", {
    source_id: source.id,
    title: "Texto",
    content: "Linha 1\r\nLinha 2"
  });
  const second = ingestKnowledgeDocument(db, "project-a", {
    source_id: source.id,
    title: "Texto alterado",
    content: "Linha 1\nLinha 2"
  });
  assert.equal(first.id, second.id);
  assert.equal(second.duplicate, true);
  assert.equal(second.processed, false);
  assert.equal(listKnowledgeDocuments(db, "project-a").length, 1);
});

test("Knowledge Engine versions changed external documents and replaces their chunks transactionally", (t) => {
  const db = database();
  t.after(() => db.close());
  const source = createKnowledgeSource(db, "project-a", { name: "Importação" }) as { id: string };
  const first = ingestKnowledgeDocument(db, "project-a", {
    source_id: source.id,
    external_id: "manual-001",
    title: "Manual",
    content: "Versão inicial"
  });
  const second = ingestKnowledgeDocument(db, "project-a", {
    source_id: source.id,
    external_id: "manual-001",
    title: "Manual",
    content: "Versão atualizada"
  });
  assert.equal(second.id, first.id);
  assert.equal(second.version, 2);
  const document = getKnowledgeDocument(db, "project-a", first.id) as { content: string; chunks: unknown[] };
  assert.equal(document.content, "Versão atualizada");
  assert.equal(document.chunks.length, 1);
});

test("Knowledge Engine isolates sources and documents by project", (t) => {
  const db = database();
  t.after(() => db.close());
  const source = createKnowledgeSource(db, "project-a", { name: "Privado" }) as { id: string };
  assert.throws(
    () => ingestKnowledgeDocument(db, "project-b", {
      source_id: source.id,
      title: "Tentativa",
      content: "Não autorizado"
    }),
    (error: unknown) => error instanceof KnowledgeServiceError && error.status === 404
  );
  assert.equal(listKnowledgeSources(db, "project-b").length, 0);
  assert.equal(listKnowledgeDocuments(db, "project-b").length, 0);
});

test("Knowledge Engine validates formats and rejects empty content", (t) => {
  const db = database();
  t.after(() => db.close());
  const source = createKnowledgeSource(db, "project-a", { name: "Validação" }) as { id: string };
  assert.throws(
    () => ingestKnowledgeDocument(db, "project-a", {
      source_id: source.id,
      title: "Inválido",
      format: "pdf",
      content: "conteúdo"
    }),
    /format must be text or markdown/
  );
  assert.throws(
    () => ingestKnowledgeDocument(db, "project-a", {
      source_id: source.id,
      title: "Vazio",
      content: "   "
    }),
    /non-whitespace text/
  );
});
