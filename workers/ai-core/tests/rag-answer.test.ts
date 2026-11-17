import { test } from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../src/database.js";
import { answerFromKnowledge, type RagGenerator } from "../src/knowledge/rag-answer-service.js";
import { createKnowledgeSource, ingestKnowledgeDocument } from "../src/knowledge/knowledge-service.js";
import type { ProviderResult } from "../src/types.js";

function database() {
  return openDatabase(":memory:", "project-a", "Project A", "test-api-key-with-at-least-16-chars");
}

class CapturingGenerator implements RagGenerator {
  readonly name = "test-local";
  calls = 0;
  lastInput: Parameters<RagGenerator["generate"]>[0] | null = null;
  async generate(input: Parameters<RagGenerator["generate"]>[0]): Promise<ProviderResult> {
    this.calls += 1;
    this.lastInput = input;
    return {
      output: "Resposta baseada em [cite_test].",
      model: input.model,
      usage: { input_tokens: 20, output_tokens: 10, total_tokens: 30 }
    };
  }
}

test("RAG answers with retrieved context, source citations and provider metadata", async (t) => {
  const db = database();
  t.after(() => db.close());
  const source = createKnowledgeSource(db, "project-a", { name: "Manual interno" }) as { id: string };
  const document = ingestKnowledgeDocument(db, "project-a", {
    source_id: source.id,
    title: "Política de manutenção",
    content: "A manutenção preventiva deve ser realizada a cada 90 dias."
  }) as { id: string };
  const generator = new CapturingGenerator();

  const result = await answerFromKnowledge(db, "project-a", "manutenção preventiva", "local-test-v1", generator);

  assert.equal(generator.calls, 1);
  assert.equal(result.abstained, false);
  assert.equal(result.retrieval.strategy, "lexical_fts5");
  assert.equal(result.context.semantic, false);
  assert.equal(result.context.citations.length, 1);
  assert.equal(result.context.citations[0]?.document_id, document.id);
  assert.equal(result.context.citations[0]?.source_id, source.id);
  assert.match(generator.lastInput?.instructions ?? "", /Responda exclusivamente com base nas evidências/);
  assert.match(generator.lastInput?.instructions ?? "", /90 dias/);
  assert.equal(result.generation?.provider, "test-local");
  assert.equal(result.generation?.simulated, false);
});

test("RAG abstains without evidence and does not invoke the generator", async (t) => {
  const db = database();
  t.after(() => db.close());
  const generator = new CapturingGenerator();

  const result = await answerFromKnowledge(db, "project-a", "pergunta sem evidência", "local-test-v1", generator);

  assert.equal(result.abstained, true);
  assert.equal(result.abstention_reason, "NO_RETRIEVED_EVIDENCE");
  assert.equal(result.generation, null);
  assert.equal(result.context.citations.length, 0);
  assert.equal(generator.calls, 0);
});

test("RAG validates query and generation budgets", async (t) => {
  const db = database();
  t.after(() => db.close());
  const generator = new CapturingGenerator();

  await assert.rejects(
    () => answerFromKnowledge(db, "project-a", "x", "local-test-v1", generator),
    /query must contain 2-200 characters/
  );
  await assert.rejects(
    () => answerFromKnowledge(db, "project-a", "valid query", "local-test-v1", generator, { maxOutputTokens: 5000 }),
    /max_output_tokens must be an integer from 1 to 4096/
  );
  assert.equal(generator.calls, 0);
});
