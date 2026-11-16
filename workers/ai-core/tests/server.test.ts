import {test} from "node:test";
import assert from "node:assert/strict";
import {openDatabase} from "../src/database.js";
import {createAiCoreServer} from "../src/server.js";

test("HTTP gateway enforces auth, project scope and returns mock completion", async (t) => {
  const apiKey = "test-api-key-with-at-least-16-chars";
  const db = openDatabase(":memory:", "pescaradar", "PescaRadar", apiKey);
  const server = createAiCoreServer({
    db,
    maxRequestBytes: 32768,
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 20
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = "http://127.0.0.1:" + address.port;

  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    db.close();
  });

  const health = await fetch(base + "/health");
  assert.equal(health.status, 200);

  const unauthorized = await fetch(base + "/v1/models");
  assert.equal(unauthorized.status, 401);

  const forbidden = await fetch(base + "/v1/chat/completions", {
    method: "POST",
    headers: {"content-type":"application/json","x-api-key":apiKey},
    body: JSON.stringify({project:"truco",input:"teste"})
  });
  assert.equal(forbidden.status, 403);

  const response = await fetch(base + "/v1/chat/completions", {
    method: "POST",
    headers: {"content-type":"application/json","x-api-key":apiKey,"idempotency-key":"integration-test-1"},
    body: JSON.stringify({project:"pescaradar",input:"Teste de integração"})
  });
  assert.equal(response.status, 200);
  const result = await response.json() as {provider:string;output:string;usage:{total_tokens:number}};
  assert.equal(result.provider, "mock");
  assert.match(result.output, /MOCK PROVIDER/);
  assert.ok(result.usage.total_tokens > 0);

  const unsupportedModel = await fetch(base + "/v1/chat/completions", {
    method: "POST",
    headers: {"content-type":"application/json","x-api-key":apiKey},
    body: JSON.stringify({project:"pescaradar",model:"unknown-model",input:"não deve executar"})
  });
  assert.equal(unsupportedModel.status, 400);
  const unsupportedBody = await unsupportedModel.json() as {error:{code:string}};
  assert.equal(unsupportedBody.error.code, "MODEL_NOT_AVAILABLE");

  const models = await fetch(base + "/v1/models", {headers:{"x-api-key":apiKey}});
  assert.equal(models.status, 200);
  const modelList = await models.json() as {data:Array<{id:string;enabled:boolean}>;disabled:Array<{provider:string;enabled:boolean}>};
  assert.deepEqual(modelList.data.map((model) => model.id), ["schr-mock-v1"]);
  assert.equal(modelList.disabled.find((model) => model.provider === "openai")?.enabled, false);

  const promptCreated = await fetch(base + "/v1/prompts", {
    method: "POST",
    headers: {"content-type":"application/json","x-api-key":apiKey},
    body: JSON.stringify({
      project: "pescaradar",
      name: "Resposta de suporte",
      body: "Olá {{customer}}, seu protocolo é {{protocol}}.",
      variables: [{name:"customer",required:true},{name:"protocol",required:true}]
    })
  });
  assert.equal(promptCreated.status, 201);
  const promptPayload = await promptCreated.json() as {data:{id:string;version:{version:number}}};
  assert.equal(promptPayload.data.version.version, 1);

  const promptRendered = await fetch(base + "/v1/prompts/" + promptPayload.data.id + "/render", {
    method: "POST",
    headers: {"content-type":"application/json","x-api-key":apiKey},
    body: JSON.stringify({variables:{customer:"Daniel",protocol:"ABC-123"}})
  });
  assert.equal(promptRendered.status, 200);
  const renderedPayload = await promptRendered.json() as {data:{output:string}};
  assert.equal(renderedPayload.data.output, "Olá Daniel, seu protocolo é ABC-123.");

  const knowledgeSourceResponse = await fetch(base + "/v1/knowledge/sources", {
    method: "POST",
    headers: {"content-type":"application/json","x-api-key":apiKey},
    body: JSON.stringify({name:"Base documental"})
  });
  assert.equal(knowledgeSourceResponse.status, 201);
  const sourcePayload = await knowledgeSourceResponse.json() as {data:{id:string}};
  const knowledgeDocumentResponse = await fetch(base + "/v1/knowledge/documents", {
    method: "POST",
    headers: {"content-type":"application/json","x-api-key":apiKey},
    body: JSON.stringify({
      source_id: sourcePayload.data.id,
      title: "Guia local",
      format: "markdown",
      content: "# Guia\\nConteúdo de teste"
    })
  });
  assert.equal(knowledgeDocumentResponse.status, 201);
  const documentPayload = await knowledgeDocumentResponse.json() as {data:{id:string;chunk_count:number}};
  assert.equal(documentPayload.data.chunk_count, 1);
  const knowledgeDetail = await fetch(base + "/v1/knowledge/documents/" + documentPayload.data.id, {
    headers: {"x-api-key":apiKey}
  });
  assert.equal(knowledgeDetail.status, 200);
  const knowledgeDetailPayload = await knowledgeDetail.json() as {data:{content:string;chunks:Array<{content:string}>}};
  assert.equal(knowledgeDetailPayload.data.content, "# Guia\\nConteúdo de teste");
  assert.equal(knowledgeDetailPayload.data.chunks[0]?.content, "# Guia\\nConteúdo de teste");

  const knowledgeSearch = await fetch(base + "/v1/knowledge/search?q=Conte%C3%BAdo%20teste", {
    headers: {"x-api-key":apiKey}
  });
  assert.equal(knowledgeSearch.status, 200);
  const searchPayload = await knowledgeSearch.json() as {
    data: {strategy:string;semantic:boolean;count:number;results:Array<{document_id:string;source_id:string;content:string}>}
  };
  assert.equal(searchPayload.data.strategy, "lexical_fts5");
  assert.equal(searchPayload.data.semantic, false);
  assert.equal(searchPayload.data.count, 1);
  assert.equal(searchPayload.data.results[0]?.document_id, documentPayload.data.id);
  assert.equal(searchPayload.data.results[0]?.source_id, sourcePayload.data.id);
  assert.match(searchPayload.data.results[0]?.content ?? "", /Conteúdo de teste/);

  const usage = await fetch(base + "/v1/usage", {headers:{"x-api-key":apiKey}});
  assert.equal(usage.status, 200);
  const totals = await usage.json() as {data:{requests:number}};
  assert.equal(totals.data.requests, 1);
});
