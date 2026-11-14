# Schr Sistemas API Worker

Worker HTTP independente do site institucional. O portal continua estático no Cloudflare Pages; este serviço atende endpoints dinâmicos e futuras integrações.

## Requisitos

- Node.js 22
- npm 10 ou superior
- Conta Cloudflare no plano gratuito
- Repositório GitHub `schrsistemas/schrsistemas`

## Desenvolvimento local

A partir da raiz do repositório:

```bash
cd workers/api
npm install
npm run dev
```

O Wrangler inicia o Worker localmente. Verifique:

```text
GET http://localhost:8787/api/health
```

## Validação

```bash
npm run check
```

## Deploy por Workers Builds

Configuração do projeto existente no painel Cloudflare Workers Builds:

| Campo | Valor |
|---|---|
| Worker | `schrsistemas` |
| Repositório | `schrsistemas/schrsistemas` |
| Production branch | `main` |
| Root directory | `workers/api` |
| Build command | `npm run check` |
| Deploy command | `npm run deploy` |
| Include paths | `workers/api/**` |

O comando de deploy executa `wrangler deploy` usando o arquivo `wrangler.jsonc`.

## Plano Cloudflare Free — regra de CPU

- Não declarar a propriedade `limits.cpu_ms` no `wrangler.jsonc`.
- O plano Free aplica o limite padrão de CPU automaticamente.
- Declarar explicitamente CPU gera erro Cloudflare `100328` (“CPU limits are not supported for the Free plan”).
- Não contratar Workers Paid para contornar essa restrição.
- Se o processamento ultrapassar o limite gratuito, otimizar o código ou dividir/reduzir o trabalho.

## Endpoints iniciais

| Método | Rota | Uso |
|---|---|---|
| GET | `/` | Identificação do serviço |
| GET | `/api/health` | Verificação de disponibilidade |
| OPTIONS | `/api/*` | Preflight CORS |

A API retorna JSON. CORS permite inicialmente os domínios institucionais e localhost para desenvolvimento. Ao definir o endereço de produção ou um domínio adicional, atualizar a allowlist em `src/index.ts`.

## Regras

- Não adicionar banco, fila, armazenamento ou serviço pago sem requisito e análise de custo.
- Não armazenar segredos no Git; usar secrets do Cloudflare quando uma integração exigir credenciais.
- Validar autenticação, autorização, limites e contratos antes de criar endpoints de escrita.
- Manter o Worker independente do build do site.
- Não executar deploy sem solicitação explícita.
