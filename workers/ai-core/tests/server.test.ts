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

  const knowledgeSearch = await fetch(base + "/v1/knowledge/search?q=teste", {
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
  const knowledgeContext = await fetch(base + "/v1/knowledge/context", {
    method: "POST",
    headers: {"content-type":"application/json","x-api-key":apiKey},
    body: JSON.stringify({query:"teste",limit:5,max_context_tokens:500,max_context_chars:2000})
  });
  assert.equal(knowledgeContext.status, 200);
  const contextPayload = await knowledgeContext.json() as {
    data: {
      retrieval: {strategy:string;semantic:boolean};
      context: {strategy:string;semantic:boolean;context:string;token_estimate:number;citations:Array<{chunk_id:string;document_id:string;source_id:string;start_offset:number;end_offset:number}>}
    }
  };
  assert.equal(contextPayload.data.retrieval.strategy, "lexical_fts5");
  assert.equal(contextPayload.data.context.strategy, "lexical_fts5_context");
  assert.equal(contextPayload.data.context.semantic, false);
  assert.match(contextPayload.data.context.context, /Conteúdo de teste/);
  assert.equal(contextPayload.data.context.citations[0]?.document_id, documentPayload.data.id);
  assert.equal(contextPayload.data.context.citations[0]?.source_id, sourcePayload.data.id);
  assert.ok(contextPayload.data.context.token_estimate > 0);
  const ragAnswer = await fetch(base + "/v1/knowledge/answer", {
    method: "POST",
    headers: {"content-type":"application/json","x-api-key":apiKey},
    body: JSON.stringify({query:"teste"})
  });
  assert.equal(ragAnswer.status, 200);
  const ragPayload = await ragAnswer.json() as {
    data: {
      answer:string;
      abstained:boolean;
      retrieval:{strategy:string;semantic:boolean};
      context:{citations:Array<{document_id:string;source_id:string}>};
      generation:{provider:string;model:string;simulated:boolean}|null;
    }
  };
  assert.equal(ragPayload.data.abstained, false);
  assert.equal(ragPayload.data.retrieval.strategy, "lexical_fts5");
  assert.equal(ragPayload.data.retrieval.semantic, false);
  assert.equal(ragPayload.data.context.citations[0]?.document_id, documentPayload.data.id);
  assert.equal(ragPayload.data.context.citations[0]?.source_id, sourcePayload.data.id);
  assert.equal(ragPayload.data.generation?.provider, "mock");
  assert.equal(ragPayload.data.generation?.simulated, true);
  assert.match(ragPayload.data.answer, /MOCK PROVIDER/);

  const ragNoEvidence = await fetch(base + "/v1/knowledge/answer", {
    method: "POST",
    headers: {"content-type":"application/json","x-api-key":apiKey},
    body: JSON.stringify({query:"pergunta sem correspondência"})
  });
  assert.equal(ragNoEvidence.status, 200);
  const noEvidencePayload = await ragNoEvidence.json() as {
    data:{abstained:boolean;abstention_reason:string;generation:null;context:{citations:unknown[]}}
  };
  assert.equal(noEvidencePayload.data.abstained, true);
  assert.equal(noEvidencePayload.data.abstention_reason, "NO_RETRIEVED_EVIDENCE");
  assert.equal(noEvidencePayload.data.generation, null);
  assert.equal(noEvidencePayload.data.context.citations.length, 0);

  const retrievalEvaluation = await fetch(base + "/v1/evaluations/retrieval", {
    method: "POST",
    headers: {"content-type":"application/json","x-api-key":apiKey},
    body: JSON.stringify({
      dataset_name:"http-smoke",
      dataset_version:"1.0",
      top_k:5,
      cases:[{
        id:"known-document",
        query:"teste",
        expected_chunk_ids:[contextPayload.data.context.citations[0]?.chunk_id]
      }]
    })
  });
  assert.equal(retrievalEvaluation.status, 200);
  const evaluationPayload = await retrievalEvaluation.json() as {
    data:{dataset:{name:string;version:string;sha256:string};metrics:{precision_at_k:number;recall_at_k:number;mrr:number;hit_rate_at_k:number};retrieval:{semantic:boolean}}
  };
  assert.equal(evaluationPayload.data.dataset.name, "http-smoke");
  assert.equal(evaluationPayload.data.dataset.version, "1.0");
  assert.match(evaluationPayload.data.dataset.sha256, /^[a-f0-9]{64}$/);
  assert.equal(evaluationPayload.data.metrics.recall_at_k, 1);
  assert.equal(evaluationPayload.data.metrics.mrr, 1);
  assert.equal(evaluationPayload.data.retrieval.semantic, false);

  const groundingEvaluation = await fetch(base + "/v1/evaluations/grounding", {
    method: "POST",
    headers: {"content-type":"application/json","x-api-key":apiKey},
    body: JSON.stringify({
      answer:"Resposta sustentada [cite_valid]. Outra afirmação [cite_invalid].",
      available_citation_ids:["cite_valid"],
      abstained:false
    })
  });
  assert.equal(groundingEvaluation.status, 200);
  const groundingPayload = await groundingEvaluation.json() as {
    data:{metrics:{citation_precision:number;citation_coverage:number;invalid_citation_count:number};invalid_citation_ids:string[]}
  };
  assert.equal(groundingPayload.data.metrics.citation_precision, 0.5);
  assert.equal(groundingPayload.data.metrics.citation_coverage, 0.5);
  assert.equal(groundingPayload.data.metrics.invalid_citation_count, 1);
  assert.deepEqual(groundingPayload.data.invalid_citation_ids, ["cite_invalid"]);

  const embeddingIndex = await fetch(base + "/v1/knowledge/embeddings/index", {
    method: "POST",
    headers: {"content-type":"application/json","x-api-key":apiKey},
    body: JSON.stringify({document_id:documentPayload.data.id})
  });
  assert.equal(embeddingIndex.status, 200);
  const embeddingIndexPayload = await embeddingIndex.json() as {
    data: {provider:string;model:string;dimensions:number;simulated:boolean;semantic:boolean;indexed_chunks:number}
  };
  assert.equal(embeddingIndexPayload.data.provider, "mock");
  assert.equal(embeddingIndexPayload.data.model, "schr-mock-embedding-v1");
  assert.equal(embeddingIndexPayload.data.dimensions, 32);
  assert.equal(embeddingIndexPayload.data.simulated, true);
  assert.equal(embeddingIndexPayload.data.semantic, false);
  assert.equal(embeddingIndexPayload.data.indexed_chunks, 1);

  const storedEmbeddings = await fetch(base + "/v1/knowledge/embeddings?document_id=" + documentPayload.data.id, {
    headers: {"x-api-key":apiKey}
  });
  assert.equal(storedEmbeddings.status, 200);
  const storedEmbeddingPayload = await storedEmbeddings.json() as {
    data: Array<{chunk_id:string;vector:number[];simulated:boolean;semantic:boolean;dimensions:number}>
  };
  assert.equal(storedEmbeddingPayload.data.length, 1);
  assert.equal(storedEmbeddingPayload.data[0]?.vector.length, 32);
  assert.equal(storedEmbeddingPayload.data[0]?.simulated, true);
  assert.equal(storedEmbeddingPayload.data[0]?.semantic, false);
  assert.equal(storedEmbeddingPayload.data[0]?.dimensions, 32);



  const hybridWithoutRealProvider = await fetch(base + "/v1/knowledge/search/hybrid", {
    method: "POST",
    headers: {"content-type":"application/json","x-api-key":apiKey},
    body: JSON.stringify({query:"teste"})
  });
  assert.equal(hybridWithoutRealProvider.status, 503);
  const hybridUnavailablePayload = await hybridWithoutRealProvider.json() as {error:{code:string}};
  assert.equal(hybridUnavailablePayload.error.code, "SEMANTIC_PROVIDER_UNAVAILABLE");

  const usage = await fetch(base + "/v1/usage", {headers:{"x-api-key":apiKey}});
  assert.equal(usage.status, 200);
  const totals = await usage.json() as {data:{requests:number}};
  assert.equal(totals.data.requests, 1);
});
