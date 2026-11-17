import { test } from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../src/database.js";
import { createKnowledgeSource, ingestKnowledgeDocument } from "../src/knowledge/knowledge-service.js";
import { evaluateAnswerGrounding, evaluateKnowledgeRetrieval } from "../src/knowledge/evaluation-service.js";

function database() {
  return openDatabase(":memory:", "project-eval", "Evaluation", "evaluation-test-api-key-12345");
}

test("retrieval evaluation computes deterministic Precision@K, Recall@K, MRR and hit rate", (t) => {
  const db = database();
  t.after(() => db.close());
  const source = createKnowledgeSource(db, "project-eval", { name: "Evaluation corpus" }) as { id: string };
  ingestKnowledgeDocument(db, "project-eval", {
    source_id: source.id,
    title: "Manutenção preventiva",
    content: "A manutenção preventiva ocorre a cada noventa dias."
  });
  ingestKnowledgeDocument(db, "project-eval", {
    source_id: source.id,
    title: "Troca de óleo",
    content: "A troca de óleo deve ocorrer após dez mil quilômetros."
  });
  const firstChunk = db.prepare("SELECT id FROM knowledge_chunks WHERE content LIKE '%manutenção preventiva%'").get() as { id: string };
  const secondChunk = db.prepare("SELECT id FROM knowledge_chunks WHERE content LIKE '%troca de óleo%'").get() as { id: string };

  const input = {
    dataset_name: "manual-qa",
    dataset_version: "1.0.0",
    top_k: 1,
    cases: [
      { id: "maintenance", query: "manutenção preventiva", expected_chunk_ids: [firstChunk.id] },
      { id: "oil", query: "troca óleo", expected_chunk_ids: [secondChunk.id] }
    ]
  };
  const result = evaluateKnowledgeRetrieval(db, "project-eval", input);
  const repeated = evaluateKnowledgeRetrieval(db, "project-eval", input);

  assert.deepEqual(result, repeated);
  assert.equal(result.dataset.name, "manual-qa");
  assert.equal(result.dataset.version, "1.0.0");
  assert.match(result.dataset.sha256, /^[a-f0-9]{64}$/);
  assert.equal(result.retrieval.semantic, false);
  assert.equal(result.metrics.precision_at_k, 1);
  assert.equal(result.metrics.recall_at_k, 1);
  assert.equal(result.metrics.mrr, 1);
  assert.equal(result.metrics.hit_rate_at_k, 1);
});

test("retrieval evaluation rejects malformed and duplicate dataset cases", (t) => {
  const db = database();
  t.after(() => db.close());
  assert.throws(
    () => evaluateKnowledgeRetrieval(db, "project-eval", {
      dataset_name: "invalid",
      dataset_version: "1",
      cases: [
        { id: "same", query: "query one", expected_chunk_ids: ["kc_one"] },
        { id: "same", query: "query two", expected_chunk_ids: ["kc_two"] }
      ]
    }),
    /case IDs must be unique/
  );
});

test("citation evaluation identifies valid and invalid citation references", () => {
  const result = evaluateAnswerGrounding({
    answer: "A revisão ocorre a cada 90 dias [cite_valid].\nO prazo adicional é de 10 dias [cite_unknown].",
    available_citation_ids: ["cite_valid"],
    abstained: false
  });

  assert.equal(result.abstained, false);
  assert.equal(result.metrics.unique_citation_count, 2);
  assert.equal(result.metrics.valid_citation_count, 1);
  assert.equal(result.metrics.invalid_citation_count, 1);
  assert.equal(result.metrics.citation_precision, 0.5);
  assert.equal(result.metrics.citation_coverage, 0.5);
  assert.deepEqual(result.invalid_citation_ids, ["cite_unknown"]);
});

test("citation evaluation reports empty and abstained answers without claiming semantic grounding", () => {
  const result = evaluateAnswerGrounding({
    answer: "Não há evidências suficientes.",
    available_citation_ids: [],
    abstained: true
  });
  assert.equal(result.abstained, true);
  assert.equal(result.metrics.citation_precision, 0);
  assert.equal(result.metrics.citation_coverage, 0);
  assert.match(result.limitations.join(" "), /does not prove/);
});
