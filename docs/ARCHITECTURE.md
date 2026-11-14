# Arquitetura — Portal Schr Sistemas

## Objetivo

Manter a presença digital da Schr Sistemas com separação clara entre o portal institucional e os serviços dinâmicos. O posicionamento combina a marca Schr Sistemas e o portfólio/currículo profissional.

## Princípios

1. Custo operacional adicional zero sempre que possível.
2. Conteúdo público institucional estático por padrão.
3. APIs e integrações executadas separadamente do site.
4. Preservar histórico e arquivos existentes do repositório.
5. Trabalhar diretamente na branch `main`.
6. Não criar backend ou banco de dados sem requisito real.
7. Não publicar informações confidenciais de clientes ou sistemas privados.

## Visão geral

```text
GitHub: schrsistemas/schrsistemas (main)
  |
  +-- site/ -----------------> Cloudflare Pages
  |                            Site institucional estático
  |
  +-- workers/api/ ----------> Cloudflare Workers
                               API HTTP e integrações
```

Pages e Workers usam o mesmo repositório, mas cada projeto Cloudflare tem diretório raiz, comando de build, comando de deploy e ciclo de publicação independentes.

## Componentes

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| UI institucional | Next.js App Router + TypeScript | Rotas e renderização estática |
| Componentes | Material UI 9 | Base de componentes |
| Estilos | CSS responsivo próprio | Identidade visual light |
| Repositório | GitHub | Versionamento na branch main |
| Build do site | Next.js static export | Geração de HTML/CSS/JS |
| Hosting do site | Cloudflare Pages | Distribuição institucional |
| API | TypeScript + Cloudflare Workers | Endpoints HTTP e integrações |
| Runtime API | Workers Free | Execução serverless |
| DNS/CDN | Cloudflare | DNS, TLS e distribuição, após configuração validada |
| Registro | Hostinger | Registro e renovação do domínio |

## Estrutura

- `site/`: aplicação institucional Next.js.
- `workers/api/`: Worker independente.
- `docs/API-CONTRACT.md`: contrato inicial da API.
- `docs/DEPLOY-CLOUDFLARE.md`: configuração operacional de Pages e Workers.
- `.github/workflows/site-check.yml`: lint e build do site.
- `.github/workflows/worker-api-check.yml`: verificação TypeScript da API.

## Site institucional

O Next.js usa `output: "export"` e `trailingSlash: true`. O comando `npm run build` produz `site/out`, publicado no Cloudflare Pages.

Rotas públicas:
- `/`: landing page.
- `/sobre/`: marca e trajetória.
- `/projetos/`: produtos e iniciativas.
- `/curriculo/`: competências e resumo profissional.
- `/contato/`: canais de contato.

O site não depende do Worker para servir suas páginas. Assim, o portal permanece disponível como conteúdo estático mesmo que a API esteja temporariamente indisponível.

## API Worker

O Worker em `workers/api/` atende endpoints dinâmicos. A primeira versão contém:
- `GET /`: identificação do serviço.
- `GET /api/health`: verificação de disponibilidade.
- `OPTIONS /api/*`: preflight CORS.

CORS permite inicialmente o domínio raiz, `www` e localhost para desenvolvimento. Atualizar a allowlist quando os domínios de produção estiverem confirmados.

Não há banco de dados, armazenamento ou credenciais na primeira versão. Adicionar serviços Cloudflare como D1, KV, R2, Queues ou Durable Objects somente quando um caso de uso justificar e após avaliar os limites gratuitos.

## Fluxo de CI/CD

- Commit em arquivos `site/**`: valida lint e build do site.
- Commit em `workers/api/**`: valida TypeScript da API.
- Cloudflare Pages: root `site`, build `npm run build`, output `out`.
- Cloudflare Workers Builds: root `workers/api`, build `npm run check`, deploy `npm run deploy`.
- Ambos usam a branch `main`. Não criar branches ou PRs para este projeto.
- CI do GitHub valida código; não substitui a confirmação de deploy no painel Cloudflare.

## Evolução planejada

- Formulário com envio real: implementar endpoint Worker com validação, proteção contra abuso e provedor gratuito escolhido após análise.
- Webhooks: documentar autenticação, assinatura, idempotência, retries e limites antes de ativar.
- Persistência: avaliar primeiro se é realmente necessária; comparar D1/KV/R2 e limites gratuitos.
- Conteúdo editorial: priorizar arquivos Markdown estáticos.
- Painel administrativo: avaliar custo e superfície de ataque antes de criar.

## Segurança e privacidade

- Nunca versionar tokens, chaves, senhas ou arquivos de ambiente.
- Não expor dados de clientes, capturas internas ou credenciais.
- Validar origem CORS, entrada, método e autorização em cada endpoint.
- CORS não substitui autenticação.
- O contato por e-mail deve permanecer no provedor atual.
- Alterações DNS devem preservar MX, SPF, DKIM e DMARC.
