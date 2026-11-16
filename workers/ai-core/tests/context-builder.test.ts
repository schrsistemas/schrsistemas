import { test } from "node:test";
import assert from "node:assert/strict";
import { buildKnowledgeContext } from "../src/knowledge/context-builder.js";
import { KnowledgeServiceError } from "../src/knowledge/knowledge-service.js";

function chunk(overrides: Partial<Parameters<typeof buildKnowledgeContext>[1][number]> = {}) {
  return {
    chunk_id: "chunk-a",
    document_id: "doc-a",
    source_id: "source-a",
    document_title: "Manual",
    source_name: "Base técnica",
    chunk_index: 0,
    content: "abcdefghij",
    start_offset: 0,
    end_offset: 10,
    content_hash: "hash-a",
    score: 0.1,
    ...overrides
  };
}

test("Context Builder selects best-ranked chunks and returns verifiable citations", () => {
  const result = buildKnowledgeContext("consulta", [
    chunk({ chunk_id: "worse", content: "texto pior", end_offset: 10, score: 0.8 }),
    chunk({ chunk_id: "best", content: "texto melhor", end_offset: 12, score: 0.1 })
  ]);
  assert.equal(result.strategy, "lexical_fts5_context");
  assert.equal(result.semantic, false);
  assert.equal(result.citations[0]?.chunk_id, "best");
  assert.equal(result.citations[0]?.document_id, "doc-a");
  assert.match(result.context, /\[best\]/);
  assert.equal(result.token_estimate, Math.ceil(result.context.length / 4));
  assert.equal(result.token_estimate_method, "ceil(context_utf16_chars / 4)");
});

test("Context Builder removes overlapping ranges from the same document", () => {
  const result = buildKnowledgeContext("overlap", [
    chunk({ chunk_id: "first", content: "abcdefgh", start_offset: 0, end_offset: 8, score: 0.1 }),
    chunk({ chunk_id: "second", chunk_index: 1, content: "efghijkl", start_offset: 4, end_offset: 12, score: 0.2 })
  ]);
  assert.equal(result.selected_chunks.length, 2);
  assert.equal(result.selected_chunks[1]?.start_offset, 8);
  assert.equal(result.selected_chunks[1]?.end_offset, 12);
  assert.equal(result.selected_chunks[1]?.content, "ijkl");
  assert.equal(result.citations[1]?.start_offset, 8);
  assert.equal(result.citations[1]?.end_offset, 12);
});

test("Context Builder applies character and estimated-token budgets and marks truncation", () => {
  const result = buildKnowledgeContext("budget", [chunk()], { maxContextChars: 65, maxContextTokens: 16 });
  assert.ok(result.context.length <= 65);
  assert.ok(result.token_estimate <= 16);
  assert.equal(result.truncated, true);
  assert.equal(result.citations.length, 1);
  assert.equal(result.citations[0]?.end_offset, result.selected_chunks[0]?.end_offset);
});

test("Context Builder returns an empty pack for no retrieval results", () => {
  const result = buildKnowledgeContext("nothing", []);
  assert.equal(result.context, "");
  assert.equal(result.token_estimate, 0);
  assert.equal(result.truncated, false);
  assert.deepEqual(result.citations, []);
});

test("Context Builder rejects invalid budgets and inconsistent source offsets", () => {
  assert.throws(
    () => buildKnowledgeContext("query", [], { maxContextTokens: 0 }),
    (error: unknown) => error instanceof KnowledgeServiceError && error.code === "KNOWLEDGE_CONTEXT_VALIDATION_ERROR"
  );
  assert.throws(
    () => buildKnowledgeContext("query", [chunk({ end_offset: 9 })]),
    /invalid content, offsets or score/
  );
});
