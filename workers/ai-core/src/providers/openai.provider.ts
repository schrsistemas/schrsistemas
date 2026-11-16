import type { ChatRequest,LlmProvider,ProviderResult } from "../types.js";
/** Adaptador reservado. A chamada externa é bloqueada pela política obrigatória de custo zero. */
export class OpenAIProvider implements LlmProvider { readonly name="openai"; readonly enabled=false; async generate(_input:ChatRequest):Promise<ProviderResult> { throw new Error("OPENAI_PROVIDER_DISABLED_BY_ZERO_COST_POLICY"); } }
