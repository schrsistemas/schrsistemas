# Schr AI Core — contratos HTTP 0.1

Base local: http://127.0.0.1:8788

## Autenticação
Todos os endpoints exceto GET /health exigem X-API-Key.

## GET /health
Público. Retorna status, serviço, versão, provedor e uptime.

## GET /v1/models
Autenticado. Lista mock habilitado e adaptador OpenAI desabilitado.

## POST /v1/chat/completions
Autenticado. Idempotency-Key opcional, 1-128 caracteres.

Request JSON: project obrigatório (2-64 caracteres); input obrigatório (1-12000); instructions opcional (até 4000); model opcional; max_output_tokens opcional (1-2048).

Resposta 200: id, status, provider, model, output, usage e duration_ms. O texto de saída identifica explicitamente a simulação.

## GET /v1/usage
Autenticado. Agrega chamadas e estimativas de tokens. Não é consumo faturável.

## GET /v1/requests/{id}
Autenticado. Retorna somente metadados operacionais, sem prompt nem resposta.

## Erros
JSON no formato {"error":{"code":"...","message":"...","request_id":"..."}}. Códigos: UNAUTHORIZED 401, NOT_FOUND 404, VALIDATION_ERROR 400, INVALID_JSON 400, PAYLOAD_TOO_LARGE 413, RATE_LIMITED 429, INVALID_IDEMPOTENCY_KEY 400.
