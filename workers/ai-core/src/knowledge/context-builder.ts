import { KnowledgeServiceError } from "./knowledge-service.js";

export interface ContextChunk {
  chunk_id: string;
  document_id: string;
  source_id: string;
  document_title: string;
  source_name: string;
  chunk_index: number;
  content: string;
  start_offset: number;
  end_offset: number;
  content_hash: string;
  score: number;
}

export interface ContextBuilderOptions {
  maxContextTokens?: number;
  maxContextChars?: number;
}

export interface ContextCitation {
  id: string;
  chunk_id: string;
  document_id: string;
  source_id: string;
  document_title: string;
  source_name: string;
  chunk_index: number;
  start_offset: number;
  end_offset: number;
  content_hash: string;
}

interface ContextSegment {
  chunk: ContextChunk;
  start: number;
  end: number;
  content: string;
}

function invalid(message: string): never {
  throw new KnowledgeServiceError("KNOWLEDGE_CONTEXT_VALIDATION_ERROR", 400, message);
}

function subtractCoveredRanges(start: number, end: number, covered: Array<{ start: number; end: number }>) {
  let remaining = [{ start, end }];
  for (const range of covered) {
    const next: Array<{ start: number; end: number }> = [];
    for (const part of remaining) {
      if (range.end <= part.start || range.start >= part.end) {
        next.push(part);
        continue;
      }
      if (range.start > part.start) next.push({ start: part.start, end: range.start });
      if (range.end < part.end) next.push({ start: range.end, end: part.end });
    }
    remaining = next;
    if (remaining.length === 0) break;
  }
  return remaining;
}

function validateChunks(chunks: ContextChunk[]): void {
  for (const chunk of chunks) {
    if (
      typeof chunk.content !== "string" ||
      !Number.isInteger(chunk.start_offset) ||
      !Number.isInteger(chunk.end_offset) ||
      chunk.start_offset < 0 ||
      chunk.end_offset < chunk.start_offset ||
      chunk.end_offset - chunk.start_offset !== chunk.content.length ||
      !Number.isFinite(chunk.score)
    ) {
      invalid("Retrieved chunks contain invalid content, offsets or score.");
    }
  }
}

/**
 * Builds a deterministic, source-grounded context pack. Token counts are a
 * character-based estimate (ceil(rendered UTF-16 length / 4)), not tokenizer output.
 */
export function buildKnowledgeContext(
  query: string,
  chunks: ContextChunk[],
  options: ContextBuilderOptions = {}
) {
  if (typeof query !== "string" || query.trim().length < 1 || query.length > 200) {
    return invalid("query must contain 1-200 characters.");
  }
  const maxContextTokens = options.maxContextTokens ?? 2000;
  const maxContextChars = options.maxContextChars ?? 8000;
  if (!Number.isInteger(maxContextTokens) || maxContextTokens < 1 || maxContextTokens > 8000) {
    return invalid("max_context_tokens must be an integer from 1 to 8000.");
  }
  if (!Number.isInteger(maxContextChars) || maxContextChars < 1 || maxContextChars > 32000) {
    return invalid("max_context_chars must be an integer from 1 to 32000.");
  }
  validateChunks(chunks);

  const ranked = [...chunks].sort((a, b) =>
    a.score - b.score ||
    a.document_id.localeCompare(b.document_id) ||
    a.start_offset - b.start_offset ||
    a.chunk_index - b.chunk_index
  );
  const coveredByDocument = new Map<string, Array<{ start: number; end: number }>>();
  const selected: ContextSegment[] = [];
  const citations: ContextCitation[] = [];
  const maxRenderedChars = Math.min(maxContextChars, maxContextTokens * 4);
  let context = "";
  let truncated = false;

  for (const chunk of ranked) {
    const covered = coveredByDocument.get(chunk.document_id) ?? [];
    const ranges = subtractCoveredRanges(chunk.start_offset, chunk.end_offset, covered);
    for (const range of ranges) {
      if (context.length >= maxRenderedChars) {
        truncated = true;
        break;
      }
      const header = (context.length === 0 ? "" : "\n\n") +
        "[" + chunk.chunk_id + "] " + chunk.source_name + " / " + chunk.document_title +
        " (chunk " + chunk.chunk_index + ", offsets " + range.start + "-" + range.end + ")\n";
      const remaining = maxRenderedChars - context.length - header.length;
      if (remaining <= 0) {
        truncated = true;
        break;
      }
      const original = chunk.content.slice(range.start - chunk.start_offset, range.end - chunk.start_offset);
      const piece = original.slice(0, remaining);
      if (piece.length === 0) {
        truncated = true;
        break;
      }
      const end = range.start + piece.length;
      context += header + piece;
      const segment = { chunk, start: range.start, end, content: piece };
      selected.push(segment);
      citations.push({
        id: "cite_" + chunk.chunk_id + "_" + range.start,
        chunk_id: chunk.chunk_id,
        document_id: chunk.document_id,
        source_id: chunk.source_id,
        document_title: chunk.document_title,
        source_name: chunk.source_name,
        chunk_index: chunk.chunk_index,
        start_offset: range.start,
        end_offset: end,
        content_hash: chunk.content_hash
      });
      covered.push({ start: range.start, end });
      covered.sort((a, b) => a.start - b.start || a.end - b.end);
      coveredByDocument.set(chunk.document_id, covered);
      if (piece.length < original.length) {
        truncated = true;
        break;
      }
    }
    if (truncated) break;
  }

  const tokenEstimate = Math.ceil(context.length / 4);
  return {
    query: query.trim(),
    strategy: "lexical_fts5_context",
    semantic: false,
    token_estimate: tokenEstimate,
    token_estimate_method: "ceil(context_utf16_chars / 4)",
    context_chars: context.length,
    max_context_tokens: maxContextTokens,
    max_context_chars: maxContextChars,
    truncated,
    selected_chunks: selected.map(({ chunk, start, end, content }) => ({
      chunk_id: chunk.chunk_id,
      document_id: chunk.document_id,
      source_id: chunk.source_id,
      chunk_index: chunk.chunk_index,
      start_offset: start,
      end_offset: end,
      content,
      content_hash: chunk.content_hash,
      score: chunk.score
    })),
    citations,
    context
  };
}
