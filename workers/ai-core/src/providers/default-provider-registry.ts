import { MockProvider } from "./mock.provider.js";
import { ProviderRegistry } from "./provider-registry.js";

/** Composição padrão local: somente MockProvider fica registrado e habilitado. */
export function createDefaultProviderRegistry(): ProviderRegistry {
  const mock = new MockProvider();
  return new ProviderRegistry([{ provider: mock, models: ["schr-mock-v1"] }], "schr-mock-v1");
}
