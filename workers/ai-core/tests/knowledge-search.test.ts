import { test } from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../src/database.js";
import { createKnowledgeSource, ingestKnowledgeDocument, KnowledgeServiceError } from "../src/knowledge/knowledge-service.js";
import { isKnowledgeFtsAvailable, searchKnowledge } from "../src/knowledge/knowledge-search-service.js";

function database() {
  return openDatabase(":memory:", "project-a", "Project A", "test-api-key-with-at-least-16-chars");
}

test("Retrieval Engine indexes chunks and returns ranked lexical matches with provenance", (t) => {
  const db = database();
  t.after(() => db.close());
  assert.equal(isKnowledgeFtsAvailable(db), true);
  const source = createKnowledgeSource(db, "project-a", { name: "Manual de operação" }) as { id: string };
  const document = ingestKnowledgeDocument(db, "project-a", {
    source_id: source.id,
    title: "Procedimento de manutenção",
    format: "markdown",
    content: "# Motor\nA manutenção preventiva do motor exige inspeção periódica.\nVerifique óleo e filtros."
  });
  const result = searchKnowledge(db, "project-a", "manutenção motor") as {
    strategy: string;
    semantic: boolean;
    count: number;
    results: Array<{ document_id: string; source_id: string; document_title: string; source_name: string; content: string; start_offset: number; end_offset: number; score: number }>;
  };
  assert.equal(result.strategy, "lexical_fts5");
  assert.equal(result.semantic, false);
  assert.equal(result.count, 1);
  assert.equal(result.results[0]?.document_id, document.id);
  assert.equal(result.results[0]?.source_id, source.id);
  assert.equal(result.results[0]?.document_title, "Procedimento de manutenção");
  assert.equal(result.results[0]?.source_name, "Manual de operação");
  assert.match(result.results[0]?.content ?? "", /manutenção preventiva/);
  assert.equal(result.results[0]?.start_offset, 0);
  assert.ok((result.results[0]?.end_offset ?? 0) > 0);
  assert.equal(typeof result.results[0]?.score, "number");
});

test("Retrieval Engine applies source and document filters", (t) => {
  const db = database();
  t.after(() => db.close());
  const firstSource = createKnowledgeSource(db, "project-a", { name: "Fonte A" }) as { id: string };
  const secondSource = createKnowledgeSource(db, "project-a", { name: "Fonte B" }) as { id: string };
  const first = ingestKnowledgeDocument(db, "project-a", { source_id: firstSource.id, title: "Doc A", content: "alpha beta knowledge" });
  ingestKnowledgeDocument(db, "project-a", { source_id: secondSource.id, title: "Doc B", content: "alpha beta knowledge" });
  const bySource = searchKnowledge(db, "project-a", "alpha beta", { sourceId: firstSource.id }) as { results: Array<{ document_id: string }> };
  assert.equal(bySource.results.length, 1);
  assert.equal(bySource.results[0]?.document_id, first.id);
  const byDocument = searchKnowledge(db, "project-a", "alpha beta", { documentId: first.id }) as { results: Array<{ document_id: string }> };
  assert.equal(byDocument.results.length, 1);
  assert.equal(byDocument.results[0]?.document_id, first.id);
});

test("Retrieval Engine updates the FTS index when an external document is reprocessed", (t) => {
  const db = database();
  t.after(() => db.close());
  const source = createKnowledgeSource(db, "project-a", { name: "Atualizações" }) as { id: string };
  const first = ingestKnowledgeDocument(db, "project-a", {
    source_id: source.id, external_id: "doc-1", title: "Documento", content: "legacyterm appears in the old content"
  });
  const before = searchKnowledge(db, "project-a", "legacyterm") as { count: number };
  assert.equal(before.count, 1);
  ingestKnowledgeDocument(db, "project-a", {
    source_id: source.id, external_id: "doc-1", title: "Documento", content: "newterm appears in the replacement content"
  });
  assert.equal((searchKnowledge(db, "project-a", "legacyterm") as { count: number }).count, 0);
  assert.equal((searchKnowledge(db, "project-a", "newterm") as { count: number }).count, 1);
  assert.equal(first.version, 1);
});

test("Retrieval Engine isolates projects and validates query and limits", (t) => {
  const db = database();
  t.after(() => db.close());
  const source = createKnowledgeSource(db, "project-a", { name: "Privado" }) as { id: string };
  ingestKnowledgeDocument(db, "project-a", { source_id: source.id, title: "Privado", content: "confidential phrase" });
  assert.equal((searchKnowledge(db, "project-b", "confidential") as { count: number }).count, 0);
  assert.throws(() => searchKnowledge(db, "project-b", "confidential", { sourceId: source.id }), (error: unknown) =>
    error instanceof KnowledgeServiceError && error.status === 404
  );
  assert.throws(() => searchKnowledge(db, "project-a", "x"), /2-200 characters/);
  assert.throws(() => searchKnowledge(db, "project-a", "!!!"), /searchable word or number/);
  assert.throws(() => searchKnowledge(db, "project-a", "confidential", { limit: 100 }), /limit must be an integer/);
});
