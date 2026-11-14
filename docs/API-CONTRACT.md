# Contrato inicial da API — Schr Sistemas

## Base URL

A URL será fornecida pelo Cloudflare após a criação do Worker, normalmente no formato `https://schrsistemas-api.<subdominio>.workers.dev`. Não assumir nem publicar uma URL antes da implantação.

## Endpoints

### GET /api/health

Verifica a disponibilidade do Worker.

Resposta HTTP 200:

```json
{
  "status": "ok",
  "service": "schrsistemas-api",
  "version": "1.0.0"
}
```

Cabeçalhos:
- `Content-Type: application/json; charset=utf-8`
- `Cache-Control: no-store`
- `X-Content-Type-Options: nosniff`

### GET /

Retorna identificação do serviço e rota de saúde.

### OPTIONS /api/*

Atende preflight CORS. A allowlist inicial contempla `https://schrsistemas.com`, `https://www.schrsistemas.com` e `http://localhost:3000`.

## Erros

- HTTP 403: origem não permitida em preflight.
- HTTP 404: rota inexistente.
- HTTP 405: método não permitido para rota conhecida.

## Evolução do contrato

Todo endpoint novo deve documentar método, caminho, autenticação, autorização, parâmetros, esquema de entrada, respostas, erros, idempotência e limites operacionais. Endpoints de escrita não devem ser criados sem validação de identidade e autorização.
