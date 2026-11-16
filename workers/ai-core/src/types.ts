export interface ChatRequest { project: string; model?: string; instructions?: string; input: string; max_output_tokens?: number; }
export interface TokenUsage { input_tokens: number; output_tokens: number; total_tokens: number; }
export interface ProviderResult { output: string; model: string; usage: TokenUsage; }
export interface LlmProvider { readonly name: string; generate(input: ChatRequest): Promise<ProviderResult>; }
