import { test } from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../src/database.js";
import {
  addPromptVersion,
  createPrompt,
  getPrompt,
  listPrompts,
  PromptServiceError,
  renderPrompt
} from "../src/prompts/prompt-service.js";

function createTestDatabase() {
  return openDatabase(":memory:", "project-a", "Project A", "test-api-key-with-at-least-16-chars");
}

test("Prompt Studio creates templates, versions and renders variables locally", (t) => {
  const db = createTestDatabase();
  t.after(() => db.close());

  const created = createPrompt(db, "project-a", {
    project: "project-a",
    name: "Atendimento",
    description: "Prompt base de atendimento",
    body: "Olá {{customer}}, como posso ajudar com {{topic}}?",
    variables: [
      { name: "customer", required: true },
      { name: "topic", required: true }
    ]
  });

  assert.equal(created.version.version, 1);
  const rendered = renderPrompt(db, "project-a", created.id, {
    variables: { customer: "Ana", topic: "pedido" }
  });
  assert.equal(rendered.version, 1);
  assert.equal(rendered.output, "Olá Ana, como posso ajudar com pedido?");

  const second = addPromptVersion(db, "project-a", created.id, {
    body: "Oi {{customer}}. Seu assunto é {{topic}}.",
    variables: [
      { name: "customer", required: true },
      { name: "topic", required: true }
    ]
  });
  assert.equal(second.version, 2);

  const detail = getPrompt(db, "project-a", created.id) as { versions: Array<{version:number}> };
  assert.deepEqual(detail.versions.map((version) => version.version), [2, 1]);
  assert.equal(listPrompts(db, "project-a").length, 1);
  assert.equal(listPrompts(db, "project-b").length, 0);
});

test("Prompt Studio rejects undeclared, missing and non-string variables", (t) => {
  const db = createTestDatabase();
  t.after(() => db.close());

  assert.throws(
    () => createPrompt(db, "project-a", {
      project: "project-a",
      name: "Invalid",
      body: "Olá {{unknown}}",
      variables: []
    }),
    (error: unknown) => error instanceof PromptServiceError && error.code === "PROMPT_VALIDATION_ERROR"
  );

  const created = createPrompt(db, "project-a", {
    project: "project-a",
    name: "Required",
    body: "Olá {{name}}",
    variables: [{ name: "name", required: true }]
  });

  assert.throws(
    () => renderPrompt(db, "project-a", created.id, { variables: {} }),
    /Required prompt variable is missing/
  );
  assert.throws(
    () => renderPrompt(db, "project-a", created.id, { variables: { name: 42 } }),
    /Prompt variable values must be strings/
  );
});

test("Prompt Studio prevents cross-project reads and writes", (t) => {
  const db = createTestDatabase();
  t.after(() => db.close());

  const created = createPrompt(db, "project-a", {
    project: "project-a",
    name: "Private",
    body: "Conteúdo fixo",
    variables: []
  });

  assert.throws(
    () => getPrompt(db, "project-b", created.id),
    (error: unknown) => error instanceof PromptServiceError && error.status === 404
  );
  assert.throws(
    () => addPromptVersion(db, "project-b", created.id, { body: "Tentativa", variables: [] }),
    (error: unknown) => error instanceof PromptServiceError && error.status === 404
  );
});
