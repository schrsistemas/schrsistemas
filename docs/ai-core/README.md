# Schr AI Core

Núcleo local-first de IA da Schr Sistemas. Política de custo zero: somente MockProvider ativo; adaptadores externos permanecem desabilitados.

## Requisitos
Node.js >= 22.13, npm e suporte nativo ao better-sqlite3.

## Instalação
1. Entrar em workers/ai-core.
2. Executar npm install.
3. Copiar .env.example para .env.
4. Definir AI_CORE_API_KEY com chave local de no mínimo 16 caracteres.
5. Executar npm run dev.

Servidor: http://127.0.0.1:8788

## Verificação
- npm test
- npm run check
- npm run build

## Capacidades disponíveis
- Gateway HTTP autenticado.
- Registry de providers e modelos; somente schr-mock-v1 é habilitado por padrão.
- Prompt Studio local: criação de templates, versionamento imutável, listagem, consulta e renderização de variáveis sem chamar LLM.
- SQLite local para dados operacionais e templates.

## Endpoints principais
- GET /health
- GET /v1/models
- POST /v1/chat/completions
- GET /v1/usage
- GET /v1/requests/{id}
- POST /v1/prompts
- GET /v1/prompts
- GET /v1/prompts/{id}
- POST /v1/prompts/{id}/versions
- POST /v1/prompts/{id}/render

Todos os endpoints exceto /health exigem X-API-Key.

## Exemplo: criar e renderizar prompt

Criar template:

```json
{
  "project": "pescaradar",
  "name": "Atendimento",
  "body": "Olá {{customer}}, seu assunto é {{topic}}.",
  "variables": [
    {"name": "customer", "required": true},
    {"name": "topic", "required": true}
  ]
}
```

Renderizar:

```json
{
  "variables": {
    "customer": "Ana",
    "topic": "pedido"
  }
}
```

## Política de custo
LLM_PROVIDER aceita somente mock. OpenAIProvider sempre rejeita execução e não realiza chamadas externas. Não inserir chave OpenAI, não habilitar cobrança e não fazer deploy.
