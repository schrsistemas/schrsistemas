import type { LlmProvider } from "../types.js";

export interface RegisteredModel {
  id: string;
  provider: string;
  enabled: true;
}

interface Registration {
  provider: LlmProvider;
  models: readonly string[];
}

export interface ProviderSelection {
  provider: LlmProvider;
  modelId: string;
}

/** Registry explícito: somente providers/modelos registrados podem ser executados. */
export class ProviderRegistry {
  private readonly models = new Map<string, Registration>();
  private readonly defaultModelId: string;

  constructor(registrations: readonly Registration[], defaultModelId: string) {
    if (registrations.length === 0) throw new Error("PROVIDER_REGISTRY_REQUIRES_AT_LEAST_ONE_MODEL");
    for (const registration of registrations) {
      if (registration.models.length === 0) throw new Error("PROVIDER_REGISTRATION_REQUIRES_MODELS");
      for (const modelId of registration.models) {
        if (!/^[a-z0-9._-]{1,80}$/i.test(modelId)) throw new Error("INVALID_REGISTERED_MODEL_ID");
        if (this.models.has(modelId)) throw new Error("DUPLICATE_REGISTERED_MODEL: " + modelId);
        this.models.set(modelId, registration);
      }
    }
    if (!this.models.has(defaultModelId)) throw new Error("DEFAULT_MODEL_NOT_REGISTERED");
    this.defaultModelId = defaultModelId;
  }

  resolve(requestedModel?: string): ProviderSelection | null {
    const modelId = requestedModel ?? this.defaultModelId;
    const registration = this.models.get(modelId);
    return registration ? { provider: registration.provider, modelId } : null;
  }

  listModels(): RegisteredModel[] {
    return [...this.models.entries()]
      .map(([id, registration]) => ({ id, provider: registration.provider.name, enabled: true as const }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }
}
