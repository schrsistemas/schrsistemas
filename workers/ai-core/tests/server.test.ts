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

  const usage = await fetch(base + "/v1/usage", {headers:{"x-api-key":apiKey}});
  assert.equal(usage.status, 200);
  const totals = await usage.json() as {data:{requests:number}};
  assert.equal(totals.data.requests, 1);
});
