import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalE5EmbeddingProvider } from "../src/knowledge/local-e5-embedding-provider.js";

test("Local E5 adapter uses local-only runtime and passage/query prefixes", async () => {
  const seen: string[][] = [];
  const env = {
    allowRemoteModels: true,
    allowLocalModels: false,
    localModelPath: ""
  };
  const provider = new LocalE5EmbeddingProvider({
    modelsPath: "/models",
    modelVersion: "test-revision-sha",
    runtimeLoader: async () => ({
      env,
      pipeline: async (_task, model, options) => {
        assert.equal(model, "intfloat/multilingual-e5-small");
        assert.deepEqual(options, { device: "cpu", dtype: "fp32" });
        return async (texts, pipelineOptions) => {
          seen.push(texts);
          assert.deepEqual(pipelineOptions, { pooling: "mean", normalize: true });
          const vectors = texts.map((_, index) => {
            const values = new Array<number>(384).fill(0);
            values[index] = 1;
            return values;
          });
          return { dims: [texts.length, 384], data: vectors.flat() };
        };
      }
    })
  });

  const passages = await provider.embed(["Documento técnico"]);
  const queries = await provider.embedQuery(["Como funciona?"]);

  assert.equal(env.allowRemoteModels, false);
  assert.equal(env.allowLocalModels, true);
  assert.equal(env.localModelPath, "/models/");
  assert.deepEqual(seen, [["passage: Documento técnico"], ["query: Como funciona?"]]);
  assert.equal(passages.model.semantic, true);
  assert.equal(passages.model.simulated, false);
  assert.equal(passages.model.modelVersion, "test-revision-sha");
  assert.equal(passages.vectors[0]?.length, 384);
  assert.equal(queries.vectors[0]?.length, 384);
});

test("Local E5 adapter rejects malformed inputs and invalid tensor shapes", async () => {
  const provider = new LocalE5EmbeddingProvider({
    modelsPath: "/models",
    modelVersion: "test",
    runtimeLoader: async () => ({
      env: { allowRemoteModels: false, allowLocalModels: true, localModelPath: "/models/" },
      pipeline: async () => async () => ({ dims: [1, 3], data: [1, 2, 3] })
    })
  });

  await assert.rejects(() => provider.embed([]), /1-128 texts/);
  await assert.rejects(() => provider.embed(["   "]), /non-empty/);
  await assert.rejects(() => provider.embed(["x"]), /INVALID_OUTPUT_SHAPE/);
});
