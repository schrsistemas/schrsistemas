import { createServer } from "node:http";
import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import type Database from "better-sqlite3";
import { loadConfig } from "./config.js";
import { openDatabase } from "./database.js";
import { createDefaultProviderRegistry } from "./providers/default-provider-registry.js";
import type { ProviderRegistry } from "./providers/provider-registry.js";
import { validateChatRequest } from "./validation.js";
import type { ChatRequest } from "./types.js";
import {
  createKnowledgeSource,
  getKnowledgeDocument,
  ingestKnowledgeDocument,
  KnowledgeServiceError,
  listKnowledgeDocuments,
  listKnowledgeSources
} from "./knowledge/knowledge-service.js";
import { searchKnowledge } from "./knowledge/knowledge-search-service.js";
import { buildKnowledgeContext } from "./knowledge/context-builder.js";
import {
  addPromptVersion,
  createPrompt,
  getPrompt,
  listPrompts,
  PromptServiceError,
  renderPrompt
} from "./prompts/prompt-service.js";

interface Dependencies {
  db: Database.Database;
  maxRequestBytes: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  /** Registry injetável para composição local e testes. */
  providerRegistry?: ProviderRegistry;
}

interface AuthenticatedProject { id: string; }

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const startedAt = Date.now();

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer"
  });
  res.end(JSON.stringify(body));
}

function sendPromptError(res: ServerResponse, error: unknown, id: string): void {
  if (error instanceof PromptServiceError) {
    send(res, error.status, { error: { code: error.code, message: error.message, request_id: id } });
    return;
  }
  if (error instanceof SyntaxError) {
    send(res, 400, { error: { code: "INVALID_JSON", message: "Body must be valid JSON.", request_id: id } });
    return;
  }
  if (error instanceof RangeError) {
    send(res, 413, { error: { code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds configured limit.", request_id: id } });
    return;
  }
  send(res, 500, { error: { code: "PROMPT_INTERNAL_ERROR", message: "Prompt operation failed.", request_id: id } });
}

function sendKnowledgeError(res: ServerResponse, error: unknown, id: string): void {
  if (error instanceof KnowledgeServiceError) {
    send(res, error.status, { error: { code: error.code, message: error.message, request_id: id } });
    return;
  }
  if (error instanceof SyntaxError) {
    send(res, 400, { error: { code: "INVALID_JSON", message: "Body must be valid JSON.", request_id: id } });
    return;
  }
  if (error instanceof RangeError) {
    send(res, 413, { error: { code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds configured limit.", request_id: id } });
    return;
  }
  send(res, 500, { error: { code: "KNOWLEDGE_INTERNAL_ERROR", message: "Knowledge operation failed.", request_id: id } });
}

function requestId(): string {
  return "req_" + randomUUID().replaceAll("-", "");
}

function authenticate(req: IncomingMessage, db: Database.Database): AuthenticatedProject | null {
  const supplied = req.headers["x-api-key"];
  if (typeof supplied !== "string") return null;
  const hash = createHash("sha256").update(supplied).digest("hex");
  const row = db.prepare(
    "SELECT project_id, key_hash FROM api_keys WHERE key_hash = ? AND status = 'active'"
  ).get(hash) as { project_id: string; key_hash: string } | undefined;
  if (!row) return null;
  const expected = Buffer.from(row.key_hash, "hex");
  const actual = Buffer.from(hash, "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return { id: row.project_id };
}

function checkRateLimit(keyHash: string, deps: Dependencies): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(keyHash);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(keyHash, { count: 1, resetAt: now + deps.rateLimitWindowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (bucket.count >= deps.rateLimitMaxRequests) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count += 1;
  return { allowed: true, retryAfter: 0 };
}

async function readJson(req: IncomingMessage, maxBytes: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += part.length;
    if (size > maxBytes) throw new RangeError("REQUEST_TOO_LARGE");
    chunks.push(part);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new SyntaxError("INVALID_JSON");
  }
}

export function createAiCoreServer(deps: Dependencies) {
  const providers = deps.providerRegistry ?? createDefaultProviderRegistry();

  return createServer(async (req, res) => {
    const id = requestId();
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/health") {
      send(res, 200, {
        status: "ok",
        service: "schr-ai-core",
        version: "0.2.0",
        provider: "registry",
        uptime_ms: Date.now() - startedAt
      });
      return;
    }

    const auth = authenticate(req, deps.db);
    if (!auth) {
      send(res, 401, { error: { code: "UNAUTHORIZED", message: "Valid X-API-Key header required.", request_id: id } });
      return;
    }

    const keyHash = createHash("sha256").update(String(req.headers["x-api-key"])).digest("hex");

    if (req.method === "GET" && url.pathname === "/v1/models") {
      send(res, 200, {
        data: providers.listModels(),
        disabled: [{ id: "openai-adapter", provider: "openai", enabled: false, reason: "Disabled by zero-cost policy" }]
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/usage") {
      const row = deps.db.prepare(
        "SELECT COUNT(*) AS requests, COALESCE(SUM(input_tokens),0) AS input_tokens, COALESCE(SUM(output_tokens),0) AS output_tokens, COALESCE(SUM(total_tokens),0) AS total_tokens FROM ai_requests WHERE project_id = ? AND status = 'completed'"
      ).get(auth.id) as { requests: number; input_tokens: number; output_tokens: number; total_tokens: number };
      send(res, 200, { data: row, note: "Mock token counts are estimates, not billable provider usage." });
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/prompts") {
      send(res, 200, { data: listPrompts(deps.db, auth.id) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/prompts") {
      try {
        const body = await readJson(req, deps.maxRequestBytes);
        send(res, 201, { data: createPrompt(deps.db, auth.id, body) });
      } catch (error) {
        sendPromptError(res, error, id);
      }
      return;
    }

    const promptVersionMatch = url.pathname.match(/^\/v1\/prompts\/([a-zA-Z0-9_-]+)\/versions$/);
    if (req.method === "POST" && promptVersionMatch) {
      try {
        const body = await readJson(req, deps.maxRequestBytes);
        send(res, 201, { data: addPromptVersion(deps.db, auth.id, promptVersionMatch[1] ?? "", body) });
      } catch (error) {
        sendPromptError(res, error, id);
      }
      return;
    }

    const promptRenderMatch = url.pathname.match(/^\/v1\/prompts\/([a-zA-Z0-9_-]+)\/render$/);
    if (req.method === "POST" && promptRenderMatch) {
      try {
        const body = await readJson(req, deps.maxRequestBytes);
        send(res, 200, { data: renderPrompt(deps.db, auth.id, promptRenderMatch[1] ?? "", body) });
      } catch (error) {
        sendPromptError(res, error, id);
      }
      return;
    }

    const promptMatch = url.pathname.match(/^\/v1\/prompts\/([a-zA-Z0-9_-]+)$/);
    if (req.method === "GET" && promptMatch) {
      try {
        send(res, 200, { data: getPrompt(deps.db, auth.id, promptMatch[1] ?? "") });
      } catch (error) {
        sendPromptError(res, error, id);
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/knowledge/search") {
      try {
        const rawLimit = url.searchParams.get("limit");
        const limit = rawLimit === null ? 10 : Number(rawLimit);
        const sourceId = url.searchParams.get("source_id");
        const documentId = url.searchParams.get("document_id");
        const data = searchKnowledge(deps.db, auth.id, url.searchParams.get("q"), {
          ...(sourceId ? { sourceId } : {}),
          ...(documentId ? { documentId } : {}),
          limit
        });
        send(res, 200, { data });
      } catch (error) {
        sendKnowledgeError(res, error, id);
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/knowledge/context") {
      try {
        const raw = await readJson(req, deps.maxRequestBytes);
        if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
          throw new KnowledgeServiceError("KNOWLEDGE_CONTEXT_VALIDATION_ERROR", 400, "Request body must be a JSON object.");
        }
        const body = raw as Record<string, unknown>;
        const sourceId = body.source_id;
        const documentId = body.document_id;
        const limit = body.limit ?? 10;
        const maxContextTokens = body.max_context_tokens ?? 2000;
        const maxContextChars = body.max_context_chars ?? 8000;
        if (sourceId !== undefined && (typeof sourceId !== "string" || sourceId.length === 0)) {
          throw new KnowledgeServiceError("KNOWLEDGE_CONTEXT_VALIDATION_ERROR", 400, "source_id must be a non-empty string.");
        }
        if (documentId !== undefined && (typeof documentId !== "string" || documentId.length === 0)) {
          throw new KnowledgeServiceError("KNOWLEDGE_CONTEXT_VALIDATION_ERROR", 400, "document_id must be a non-empty string.");
        }
        if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 50) {
          throw new KnowledgeServiceError("KNOWLEDGE_CONTEXT_VALIDATION_ERROR", 400, "limit must be an integer from 1 to 50.");
        }
        const retrieval = searchKnowledge(deps.db, auth.id, body.query, {
          ...(typeof sourceId === "string" ? { sourceId } : {}),
          ...(typeof documentId === "string" ? { documentId } : {}),
          limit: limit as number
        });
        const context = buildKnowledgeContext(
          typeof body.query === "string" ? body.query : "",
          retrieval.results as Parameters<typeof buildKnowledgeContext>[1],
          {
            maxContextTokens: maxContextTokens as number,
            maxContextChars: maxContextChars as number
          }
        );
        send(res, 200, { data: { retrieval, context } });
      } catch (error) {
        sendKnowledgeError(res, error, id);
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/knowledge/sources") {
      send(res, 200, { data: listKnowledgeSources(deps.db, auth.id) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/knowledge/sources") {
      try {
        const body = await readJson(req, deps.maxRequestBytes);
        send(res, 201, { data: createKnowledgeSource(deps.db, auth.id, body) });
      } catch (error) {
        sendKnowledgeError(res, error, id);
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/knowledge/documents") {
      const sourceId = url.searchParams.get("source_id") ?? undefined;
      try {
        send(res, 200, { data: listKnowledgeDocuments(deps.db, auth.id, sourceId) });
      } catch (error) {
        sendKnowledgeError(res, error, id);
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/knowledge/documents") {
      try {
        const body = await readJson(req, deps.maxRequestBytes);
        send(res, 201, { data: ingestKnowledgeDocument(deps.db, auth.id, body) });
      } catch (error) {
        sendKnowledgeError(res, error, id);
      }
      return;
    }

    const knowledgeDocumentMatch = url.pathname.match(/^\/v1\/knowledge\/documents\/([a-zA-Z0-9_-]+)$/);
    if (req.method === "GET" && knowledgeDocumentMatch) {
      try {
        send(res, 200, { data: getKnowledgeDocument(deps.db, auth.id, knowledgeDocumentMatch[1] ?? "") });
      } catch (error) {
        sendKnowledgeError(res, error, id);
      }
      return;
    }

    if (req.method === "GET" && /^\/v1\/requests\/[a-zA-Z0-9_-]+$/.test(url.pathname)) {
      const requestKey = url.pathname.split("/").pop() ?? "";
      const row = deps.db.prepare(
        "SELECT id, project_id, provider, model, status, input_tokens, output_tokens, total_tokens, duration_ms, created_at FROM ai_requests WHERE id = ? AND project_id = ?"
      ).get(requestKey, auth.id);
      if (!row) {
        send(res, 404, { error: { code: "REQUEST_NOT_FOUND", message: "Request not found.", request_id: id } });
        return;
      }
      send(res, 200, { data: row });
      return;
    }

    if (req.method !== "POST" || url.pathname !== "/v1/chat/completions") {
      send(res, 404, { error: { code: "NOT_FOUND", message: "Endpoint not found.", request_id: id } });
      return;
    }

    const rate = checkRateLimit(keyHash, deps);
    if (!rate.allowed) {
      res.setHeader("retry-after", String(rate.retryAfter));
      send(res, 429, { error: { code: "RATE_LIMITED", message: "Rate limit exceeded.", request_id: id } });
      return;
    }

    const idem = req.headers["idempotency-key"];
    if (Array.isArray(idem) || (idem !== undefined && (idem.length < 1 || idem.length > 128))) {
      send(res, 400, { error: { code: "INVALID_IDEMPOTENCY_KEY", message: "Idempotency-Key must contain 1-128 characters.", request_id: id } });
      return;
    }

    let input: ChatRequest;
    try {
      input = validateChatRequest(await readJson(req, deps.maxRequestBytes));
    } catch (error) {
      const tooLarge = error instanceof RangeError;
      const invalidJson = error instanceof SyntaxError;
      send(res, tooLarge ? 413 : 400, {
        error: {
          code: tooLarge ? "PAYLOAD_TOO_LARGE" : invalidJson ? "INVALID_JSON" : "VALIDATION_ERROR",
          message: tooLarge ? "Request body exceeds configured limit." : invalidJson ? "Body must be valid JSON." : error instanceof Error ? error.message : "Invalid request.",
          request_id: id
        }
      });
      return;
    }

    if (input.project !== auth.id) {
      send(res, 403, { error: { code: "PROJECT_FORBIDDEN", message: "API key is not authorized for this project.", request_id: id } });
      return;
    }

    const selection = providers.resolve(input.model);
    if (!selection) {
      send(res, 400, {
        error: {
          code: "MODEL_NOT_AVAILABLE",
          message: "Requested model is not registered or enabled for this instance.",
          request_id: id
        }
      });
      return;
    }

    if (idem) {
      const previous = deps.db.prepare(
        "SELECT id, provider, model, status, input_tokens, output_tokens, total_tokens FROM ai_requests WHERE project_id = ? AND idempotency_key = ?"
      ).get(auth.id, idem);
      if (previous) {
        send(res, 200, { data: { ...previous, replayed: true } });
        return;
      }
    }

    const started = Date.now();
    try {
      const result = await selection.provider.generate({ ...input, model: selection.modelId });
      const duration = Date.now() - started;
      deps.db.prepare(
        "INSERT INTO ai_requests(id,project_id,provider,model,status,input_tokens,output_tokens,total_tokens,duration_ms,idempotency_key) VALUES(?,?,? ,?,'completed',?,?,?,?,?)"
      ).run(id, auth.id, selection.provider.name, result.model, result.usage.input_tokens, result.usage.output_tokens,
        result.usage.total_tokens, duration, idem ?? null);

      send(res, 200, {
        id,
        status: "completed",
        provider: selection.provider.name,
        model: result.model,
        output: result.output,
        usage: result.usage,
        duration_ms: duration
      });
    } catch {
      send(res, 502, { error: { code: "PROVIDER_ERROR", message: "Configured provider failed.", request_id: id } });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = loadConfig();
  const db = openDatabase(config.databasePath, config.projectId, config.projectName, config.apiKey);
  const server = createAiCoreServer({
    db,
    maxRequestBytes: config.maxRequestBytes,
    rateLimitWindowMs: config.rateLimitWindowMs,
    rateLimitMaxRequests: config.rateLimitMaxRequests
  });
  server.listen(config.port, config.host, () => {
    process.stdout.write("Schr AI Core listening on http://" + config.host + ":" + config.port + "\n");
  });
  const shutdown = () => server.close(() => { db.close(); process.exit(0); });
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
