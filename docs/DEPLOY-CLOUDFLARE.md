# Publicação Cloudflare — Pages + Workers

A arquitetura utiliza dois projetos Cloudflare independentes no mesmo repositório GitHub. O registro do domínio permanece na Hostinger. Não executar deploy nem alterar DNS sem autorização explícita.

## 1. Repositório

- GitHub: `schrsistemas/schrsistemas`
- Branch de produção: `main`
- Não criar branches, PRs ou forks para este projeto.

## 2. Projeto institucional — Cloudflare Pages

Criar um projeto Pages conectado ao Git:

| Campo | Valor |
|---|---|
| Produto | Pages |
| Repositório | `schrsistemas/schrsistemas` |
| Production branch | `main` |
| Root directory | `site` |
| Framework preset | Next.js (Static HTML Export) |
| Build command | `npm run build` |
| Build output directory | `out` |
| Node.js | `22` |

O Pages não deve usar `npx wrangler deploy`. O comando gera `site/out`, que é o diretório publicado pelo Pages.

Validar primeiro a URL `*.pages.dev`. Só depois iniciar a conexão de domínio personalizado.

## 3. Projeto de API — Cloudflare Workers Builds

Criar ou configurar um Worker separado conectado ao mesmo repositório Git:

| Campo | Valor |
|---|---|
| Produto | Workers |
| Repositório | `schrsistemas/schrsistemas` |
| Production branch | `main` |
| Root directory | `workers/api` |
| Build command | `npm run check` |
| Deploy command | `npm run deploy` |

O projeto contém `workers/api/wrangler.jsonc`, que define o nome `schrsistemas-api` e o entrypoint `src/index.ts`. O script de deploy chama `wrangler deploy`.

A implantação deve ser habilitada somente depois da validação do build e da confirmação do responsável. A URL `workers.dev` será fornecida pelo Cloudflare após o primeiro deploy; não presumir o subdomínio.

## 4. Independência dos projetos

- Pages publica somente `site/out`.
- Workers publica somente `workers/api`.
- Cada projeto tem root directory e pipeline próprios.
- Não configurar o mesmo diretório raiz para os dois projetos.
- Não configurar o comando Wrangler no projeto Pages.
- O site institucional deve continuar funcional mesmo se a API estiver indisponível.

## 5. Endpoints iniciais

- `GET /`: identificação do Worker.
- `GET /api/health`: health check.
- `OPTIONS /api/*`: preflight CORS.

Contrato detalhado: [API-CONTRACT.md](./API-CONTRACT.md).

## 6. Custo e limites

A arquitetura inicial não provisiona banco, filas, storage ou serviços pagos. O Pages serve conteúdo estático; a API usa o plano gratuito de Workers enquanto estiver dentro dos limites publicados pela Cloudflare.

Antes de ampliar o uso, conferir:
- limites diários de requisições e CPU do Workers Free;
- limites de build e arquivos do Pages;
- limites e cobrança de qualquer binding ou serviço adicional.

Referências oficiais:
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/

Os limites e condições comerciais podem mudar. Não habilitar recursos pagos nem ultrapassar quotas sem autorização.

## 7. Domínio e e-mail

O domínio `schrsistemas.com` permanece registrado na Hostinger. A conexão dos domínios ao Pages/Workers é uma etapa separada.

Antes de qualquer troca de nameservers:
1. Exportar ou registrar todos os registros DNS atuais.
2. Identificar o provedor de e-mail efetivamente utilizado.
3. Copiar MX, SPF, DKIM, DMARC e registros de verificação.
4. Copiar demais registros de serviços existentes.
5. Conferir todos os registros importados na Cloudflare.
6. Só então solicitar autorização para mudar nameservers.

Não remover nem substituir registros de e-mail. Não alterar DNS ou nameservers sem autorização explícita.

## 8. Checklist de validação

### Pages
- [ ] Build concluído.
- [ ] URL `pages.dev` abre corretamente.
- [ ] Rotas Sobre, Projetos, Currículo e Contato funcionam.
- [ ] Sitemap e robots acessíveis.
- [ ] Manifesto PWA acessível.

### Workers
- [ ] TypeScript check concluído.
- [ ] Deploy confirmado no painel.
- [ ] `GET /api/health` retorna HTTP 200.
- [ ] Origem permitida recebe CORS.
- [ ] Origem não permitida não recebe permissão CORS.

### Domínio e e-mail
- [ ] Domínio personalizado conectado após revisão DNS.
- [ ] HTTPS válido.
- [ ] E-mail envia e recebe.
- [ ] MX, SPF, DKIM e DMARC preservados.

## Estado de implantação

A estrutura e os arquivos de configuração são versionados no GitHub. Criar projetos no painel, autorizar integração GitHub, executar deploy e configurar DNS são ações externas que devem ser confirmadas separadamente. Nenhuma dessas ações é considerada concluída apenas por existir configuração no repositório.
