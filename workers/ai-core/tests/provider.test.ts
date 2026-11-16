import { test } from "node:test";
import assert from "node:assert/strict";
import { MockProvider } from "../src/providers/mock.provider.js";
import { OpenAIProvider } from "../src/providers/openai.provider.js";
import { ProviderRegistry } from "../src/providers/provider-registry.js";

test("mock provider returns simulated output and consistent token estimates", async () => {
  const provider = new MockProvider();
  const result = await provider.generate({ project: "local", input: "Hello" });
  assert.match(result.output, /MOCK PROVIDER/);
  assert.equal(result.usage.total_tokens, result.usage.input_tokens + result.usage.output_tokens);
});

test("OpenAI adapter is disabled", async () => {
  const provider = new OpenAIProvider();
  assert.equal(provider.enabled, false);
  await assert.rejects(
    provider.generate({ project: "local", input: "must not be sent" }),
    /OPENAI_PROVIDER_DISABLED_BY_ZERO_COST_POLICY/
  );
});

test("provider registry resolves its default and lists enabled models", () => {
  const provider = new MockProvider();
  const registry = new ProviderRegistry([{ provider, models: ["schr-mock-v1"] }], "schr-mock-v1");
  assert.equal(registry.resolve()?.provider, provider);
  assert.equal(registry.resolve()?.modelId, "schr-mock-v1");
  assert.deepEqual(registry.listModels(), [{ id: "schr-mock-v1", provider: "mock", enabled: true }]);
});

test("provider registry rejects unknown models and invalid defaults", () => {
  const provider = new MockProvider();
  const registry = new ProviderRegistry([{ provider, models: ["schr-mock-v1"] }], "schr-mock-v1");
  assert.equal(registry.resolve("unknown-model"), null);
  assert.throws(
    () => new ProviderRegistry([{ provider, models: ["schr-mock-v1"] }], "missing"),
    /DEFAULT_MODEL_NOT_REGISTERED/
  );
});
