# Schr AI Core — contratos HTTP 0.2

Base local: http://127.0.0.1:8788

## Autenticação
Todos os endpoints exceto GET /health exigem X-API-Key.

## GET /health
Público. Retorna status, serviço, versão, indicação de registry e uptime.

## GET /v1/models
Autenticado. Retorna `data` com somente os modelos registrados e habilitados na instância e `disabled` com adaptadores reservados indisponíveis.

Na composição padrão, `schr-mock-v1` é o único modelo habilitado. OpenAI permanece desabilitado pela política de custo zero.

## POST /v1/chat/completions
Autenticado. Idempotency-Key opcional, 1-128 caracteres.

Request JSON: project obrigatório (2-64 caracteres); input obrigatório (1-12000); instructions opcional (até 4000); model opcional; max_output_tokens opcional (1-2048).

Quando model é omitido, o registry seleciona o modelo padrão local. Quando informado, deve corresponder a um modelo registrado e habilitado. Modelo desconhecido retorna `MODEL_NOT_AVAILABLE` (400).

Resposta 200: id, status, provider, model, output, usage e duration_ms. O texto de saída do MockProvider identifica explicitamente a simulação.

## GET /v1/usage
Autenticado. Agrega chamadas e estimativas de tokens. Não é consumo faturável.

## GET /v1/requests/{id}
Autenticado. Retorna somente metadados operacionais, sem prompt nem resposta.

## Erros
JSON no formato `{"error":{"code":"...","message":"...","request_id":"..."}}`. Códigos: UNAUTHORIZED 401, NOT_FOUND 404, VALIDATION_ERROR 400, INVALID_JSON 400, PAYLOAD_TOO_LARGE 413, RATE_LIMITED 429, INVALID_IDEMPOTENCY_KEY 400, MODEL_NOT_AVAILABLE 400.

## Prompt Studio

Todos os endpoints abaixo exigem X-API-Key e operam somente no projeto associado à chave autenticada.

### POST /v1/prompts
Cria um template e sua primeira versão (version 1).

Request JSON:
```json
{
  "project": "pescaradar",
  "name": "Atendimento",
  "description": "Prompt de atendimento",
  "body": "Olá {{customer}}, seu assunto é {{topic}}.",
  "variables": [
    {"name":"customer","required":true},
    {"name":"topic","required":true}
  ]
}
```

Regras: nome 1-120 caracteres; descrição até 500; corpo 1-20.000 caracteres; até 50 variáveis. Variáveis usam `{{nome}}`, devem ser declaradas, únicas e efetivamente utilizadas. Nomes começam com letra e aceitam letras, números e underscore.

### GET /v1/prompts
Lista templates do projeto autenticado, sem retornar o conteúdo de cada versão.

### GET /v1/prompts/{id}
Retorna metadados e versões do template, da mais recente para a mais antiga.

### POST /v1/prompts/{id}/versions
Cria uma nova versão imutável. Recebe `body` e `variables` com as mesmas regras de criação. A numeração é sequencial por template.

### POST /v1/prompts/{id}/render
Renderiza localmente uma versão sem chamar qualquer LLM.

Request JSON:
```json
{
  "version": 1,
  "variables": {"customer":"Ana","topic":"pedido"}
}
```

O campo version é opcional; quando omitido, utiliza a versão mais recente. Valores de variáveis devem ser strings. Variáveis obrigatórias devem ser fornecidas e variáveis desconhecidas são rejeitadas. A resposta contém template_id, version_id, version e output.

Erros específicos: PROMPT_VALIDATION_ERROR 400, PROMPT_NOT_FOUND 404, PROMPT_VERSION_NOT_FOUND 404, PROJECT_FORBIDDEN 403, PROMPT_INTERNAL_ERROR 500. Conteúdo de templates é persistido intencionalmente; prompts enviados ao endpoint de chat continuam sem persistência de conteúdo.

## Knowledge Engine

Todos os endpoints exigem `X-API-Key` e respeitam o projeto associado à chave.

### POST /v1/knowledge/sources
Cria uma fonte documental. Request: `{"name":"Manual técnico","description":"Opcional"}`. Nome de 1-120 caracteres; descrição opcional de até 500.

### GET /v1/knowledge/sources
Lista fontes do projeto e a contagem de documentos.

### POST /v1/knowledge/documents
Ingere texto ou Markdown. Request:
```json
{
  "source_id": "ks_...",
  "external_id": "manual-v1",
  "title": "Manual",
  "format": "markdown",
  "content": "# Título\\nConteúdo"
}
```
`format` aceita `text` ou `markdown` (padrão `text`). Conteúdo de 1 a 200.000 caracteres, sujeito também ao limite de corpo HTTP configurado. SHA-256 é calculado após normalização. Chunks têm alvo de 1.200 unidades UTF-16 e sobreposição de 150.

Conteúdo idêntico normalizado na mesma fonte é idempotente. Com `external_id`, conteúdo alterado atualiza o documento lógico e incrementa sua versão, substituindo chunks em transação.

### GET /v1/knowledge/documents
Lista documentos; aceita filtro opcional `source_id`.

### GET /v1/knowledge/documents/{id}
Retorna metadados, conteúdo normalizado e chunks com offsets e hashes.

Erros específicos: KNOWLEDGE_VALIDATION_ERROR 400, KNOWLEDGE_SOURCE_NOT_FOUND 404, KNOWLEDGE_DOCUMENT_NOT_FOUND 404, KNOWLEDGE_INTERNAL_ERROR 500.

Esta etapa não implementa PDF/DOCX, embeddings, busca vetorial ou RAG.

## Retrieval Engine — busca lexical

### GET /v1/knowledge/search
Autenticado. Parâmetros de query string:
- `q`: obrigatório, 2-200 caracteres; termos combinados por AND.
- `source_id`: filtro opcional por fonte do projeto.
- `document_id`: filtro opcional por documento do projeto.
- `limit`: inteiro opcional de 1 a 50; padrão 10.

A resposta retorna `strategy: "lexical_fts5"`, `semantic: false` e resultados com chunk_id, document_id, source_id, título, fonte, conteúdo, offsets, hash e score BM25.

Erros: KNOWLEDGE_SEARCH_VALIDATION_ERROR 400; KNOWLEDGE_SEARCH_UNAVAILABLE 503 quando FTS5 não estiver disponível; KNOWLEDGE_SOURCE_NOT_FOUND 404; KNOWLEDGE_DOCUMENT_NOT_FOUND 404.

A busca é lexical, com índice SQLite FTS5. Não é busca vetorial ou semântica.


## RAG Context Builder — pacote de contexto local

### POST /v1/knowledge/context
Autenticado. Executa a busca lexical FTS5 e monta um pacote de contexto rastreável, sem chamar LLM ou provider.

Request JSON:
```json
{
  "query": "manutenção preventiva",
  "source_id": "ks_...",
  "document_id": "kd_...",
  "limit": 10,
  "max_context_tokens": 2000,
  "max_context_chars": 8000
}
```

query é obrigatório (2-200 caracteres); filtros são opcionais; limit aceita 1-50 (padrão 10); max_context_tokens aceita 1-8000 (padrão 2000); max_context_chars aceita 1-32000 (padrão 8000). A rota retorna retrieval e context. O pacote contém selected_chunks, citations, context, truncated, limites e estimativa de tokens. Cada citação referencia chunk, documento, fonte, hash e offsets UTF-16 do segmento efetivamente incluído.

A estimativa é determinística: ceil(context_utf16_chars / 4). Não é contagem exata de tokenizer. Trechos sobrepostos do mesmo documento são subtraídos por intervalos de origem; a seleção respeita o menor score BM25 primeiro. Quando o orçamento termina no meio de um trecho, o segmento é truncado e truncated: true. Contexto vazio é permitido quando a busca não encontra resultados.

Erros adicionais: KNOWLEDGE_CONTEXT_VALIDATION_ERROR 400. A busca continua sendo lexical (semantic: false); esta rota não gera resposta nem afirma groundedness de uma LLM.


## Embedding Runtime — indexação local

### POST /v1/knowledge/embeddings/index
Autenticado. Request: `{"document_id":"kd_..."}`. Gera e persiste um vetor por chunk do documento com o provider de embeddings configurado na instância. A composição padrão utiliza `MockEmbeddingProvider`, identificado como `provider: mock`, `model: schr-mock-embedding-v1`, `simulated: true` e `semantic: false`. Retorna o modelo, versão, dimensão e quantidade de chunks indexados.

### GET /v1/knowledge/embeddings?document_id=kd_...
Autenticado. Lista embeddings persistidos para o documento do projeto autenticado, incluindo metadados de modelo, hash do chunk, dimensão e vetor numérico.

O mock é hash-derived e determinístico, apenas para testar contrato e persistência. Não codifica significado linguístico e não pode ser usado para recuperação semântica ou avaliação de relevância. O armazenamento SQLite não executa busca vetorial nesta etapa.

Erros adicionais: EMBEDDING_VALIDATION_ERROR 400, EMBEDDING_DOCUMENT_EMPTY 400, EMBEDDING_PROVIDER_INVALID_OUTPUT 502, KNOWLEDGE_DOCUMENT_NOT_FOUND 404.
