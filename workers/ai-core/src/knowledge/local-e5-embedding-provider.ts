import { access } from "node:fs/promises";
import { resolve } from "node:path";
import type { EmbeddingProvider, EmbeddingResult } from "./embedding-provider.js";

type FeatureExtractionTensor = {
  data: ArrayLike<number>;
  dims: number[];
};

type FeatureExtractor = (
  texts: string[],
  options: { pooling: "mean"; normalize: true }
) => Promise<FeatureExtractionTensor>;

type TransformersRuntime = {
  env: {
    allowRemoteModels: boolean;
    allowLocalModels: boolean;
    localModelPath: string;
  };
  pipeline: (
    task: "feature-extraction",
    model: string,
    options: { device: "cpu"; dtype: "fp32" }
  ) => Promise<FeatureExtractor>;
};

export interface LocalE5EmbeddingProviderOptions {
  /** Diretório raiz contendo intfloat/multilingual-e5-small/. */
  modelsPath: string;
  /** Identificador do modelo sob modelsPath. */
  modelId?: string;
  /** Revisão imutável ou identificador local do pacote de pesos. */
  modelVersion: string;
  /** Permite injetar o runtime em testes sem carregar ONNX. */
  runtimeLoader?: () => Promise<TransformersRuntime>;
}

/**
 * Embeddings reais E5 executados localmente pelo Transformers.js/ONNX Runtime.
 *
 * Não baixa modelos. O carregamento só ocorre na primeira chamada a embed().
 * O método embed() recebe textos de documentos e aplica o prefixo "passage:".
 * Para consultas, use embedQuery(), que aplica "query:".
 */
export class LocalE5EmbeddingProvider implements EmbeddingProvider {
  readonly descriptor = {
    provider: "transformers-js-onnx",
    model: "intfloat/multilingual-e5-small",
    modelVersion: "",
    dimensions: 384,
    simulated: false,
    semantic: true
  } as const;

  private readonly modelsPath: string;
  private readonly modelId: string;
  private readonly modelVersion: string;
  private readonly runtimeLoader: () => Promise<TransformersRuntime>;
  private extractorPromise: Promise<FeatureExtractor> | null = null;

  constructor(options: LocalE5EmbeddingProviderOptions) {
    if (!options.modelsPath.trim()) {
      throw new Error("LOCAL_E5_MODELS_PATH_REQUIRED");
    }
    if (!options.modelVersion.trim()) {
      throw new Error("LOCAL_E5_MODEL_VERSION_REQUIRED");
    }
    this.modelsPath = resolve(options.modelsPath);
    this.modelId = options.modelId ?? "intfloat/multilingual-e5-small";
    this.modelVersion = options.modelVersion;
    this.runtimeLoader = options.runtimeLoader ?? (async () => {
      const runtime = await import("@huggingface/transformers");
      return runtime as unknown as TransformersRuntime;
    });
    Object.defineProperty(this.descriptor, "modelVersion", {
      value: this.modelVersion,
      enumerable: true
    });
  }

  async embed(texts: string[]): Promise<EmbeddingResult> {
    return this.embedWithPrefix(texts, "passage: ");
  }

  async embedQuery(texts: string[]): Promise<EmbeddingResult> {
    return this.embedWithPrefix(texts, "query: ");
  }

  private async embedWithPrefix(texts: string[], prefix: string): Promise<EmbeddingResult> {
    if (!Array.isArray(texts) || texts.length < 1 || texts.length > 128) {
      throw new Error("EMBEDDING_INPUT_LIMIT: expected 1-128 texts.");
    }
    if (texts.some((text) => typeof text !== "string" || text.trim().length === 0 || text.length > 12000)) {
      throw new Error("EMBEDDING_INPUT_INVALID: each text must contain 1-12000 non-empty characters.");
    }

    const extractor = await this.getExtractor();
    const output = await extractor(texts.map((text) => prefix + text), {
      pooling: "mean",
      normalize: true
    });

    const [batchSize, dimensions] = output.dims;
    if (batchSize !== texts.length || dimensions !== this.descriptor.dimensions) {
      throw new Error("LOCAL_E5_INVALID_OUTPUT_SHAPE");
    }
    if (output.data.length !== texts.length * this.descriptor.dimensions) {
      throw new Error("LOCAL_E5_INVALID_OUTPUT_LENGTH");
    }

    const vectors: number[][] = [];
    for (let row = 0; row < texts.length; row += 1) {
      const start = row * this.descriptor.dimensions;
      const vector = Array.from(
        { length: this.descriptor.dimensions },
        (_, column) => Number(output.data[start + column])
      );
      if (vector.some((value) => !Number.isFinite(value))) {
        throw new Error("LOCAL_E5_NON_FINITE_VECTOR");
      }
      const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
      if (!Number.isFinite(norm) || Math.abs(norm - 1) > 0.02) {
        throw new Error("LOCAL_E5_VECTOR_NOT_NORMALIZED");
      }
      vectors.push(vector);
    }

    return {
      model: {
        provider: this.descriptor.provider,
        model: this.descriptor.model,
        modelVersion: this.modelVersion,
        dimensions: this.descriptor.dimensions,
        simulated: false,
        semantic: true
      },
      vectors
    };
  }

  private async getExtractor(): Promise<FeatureExtractor> {
    if (!this.extractorPromise) {
      this.extractorPromise = this.loadExtractor();
    }
    try {
      return await this.extractorPromise;
    } catch (error) {
      this.extractorPromise = null;
      throw error;
    }
  }

  private async loadExtractor(): Promise<FeatureExtractor> {
    const modelDirectory = resolve(this.modelsPath, this.modelId);
    try {
      await access(modelDirectory);
    } catch {
      throw new Error("LOCAL_E5_MODEL_NOT_FOUND: expected local model directory at " + modelDirectory);
    }

    const runtime = await this.runtimeLoader();
    runtime.env.allowLocalModels = true;
    runtime.env.allowRemoteModels = false;
    runtime.env.localModelPath = this.modelsPath.endsWith("/") ? this.modelsPath : this.modelsPath + "/";
    return runtime.pipeline("feature-extraction", this.modelId, {
      device: "cpu",
      dtype: "fp32"
    });
  }
}
