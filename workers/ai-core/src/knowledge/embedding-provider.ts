import { createHash } from "node:crypto";

export interface EmbeddingModelDescriptor {
  provider: string;
  model: string;
  modelVersion: string;
  dimensions: number;
  simulated: boolean;
  semantic: boolean;
}

export interface EmbeddingResult {
  model: EmbeddingModelDescriptor;
  vectors: number[][];
}

export interface EmbeddingProvider {
  readonly descriptor: EmbeddingModelDescriptor;
  embed(texts: string[]): Promise<EmbeddingResult>;
}

/**
 * Deterministic contract-test provider. Its hash-derived vectors are synthetic:
 * they do not encode language meaning and must never be used for semantic search.
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly descriptor: EmbeddingModelDescriptor = {
    provider: "mock",
    model: "schr-mock-embedding-v1",
    modelVersion: "1",
    dimensions: 32,
    simulated: true,
    semantic: false
  };

  async embed(texts: string[]): Promise<EmbeddingResult> {
    if (!Array.isArray(texts) || texts.length < 1 || texts.length > 128) {
      throw new Error("EMBEDDING_INPUT_LIMIT: expected 1-128 texts.");
    }
    if (texts.some((text) => typeof text !== "string" || text.length < 1 || text.length > 12000)) {
      throw new Error("EMBEDDING_INPUT_INVALID: each text must contain 1-12000 characters.");
    }
    const vectors = texts.map((text) => {
      const values: number[] = [];
      let counter = 0;
      while (values.length < this.descriptor.dimensions) {
        const digest = createHash("sha256").update(text, "utf8").update(":" + counter).digest();
        for (const byte of digest) {
          if (values.length === this.descriptor.dimensions) break;
          values.push((byte / 127.5) - 1);
        }
        counter += 1;
      }
      const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
      return values.map((value) => Number((value / norm).toFixed(8)));
    });
    return { model: this.descriptor, vectors };
  }
}
