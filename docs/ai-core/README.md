# Schr AI Core

Gateway local de IA da Schr Sistemas. Custo zero: somente MockProvider ativo.

## Requisitos
Node.js >= 22.13, npm e suporte nativo ao better-sqlite3.

## Instalação
1. Entrar em workers/ai-core.
2. Executar npm install.
3. Copiar .env.example para .env.
4. Definir AI_CORE_API_KEY com chave aleatória local de no mínimo 16 caracteres.
5. Executar npm run dev.

Servidor: http://127.0.0.1:8788

## Verificação
- npm test
- npm run check
- npm run build

## Teste rápido
GET /health
POST /v1/chat/completions com X-API-Key e JSON {"project":"pescaradar","input":"Teste do gateway"}.

## Política de custo
LLM_PROVIDER aceita somente mock. OpenAIProvider sempre rejeita execução e não realiza chamadas externas. Não inserir chave OpenAI, não habilitar cobrança e não fazer deploy.
