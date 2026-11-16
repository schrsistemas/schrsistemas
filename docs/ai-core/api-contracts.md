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
