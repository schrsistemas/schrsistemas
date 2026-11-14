# Site institucional — Schr Sistemas

Aplicação Next.js do portal `https://schrsistemas.com`. O site é independente da API e publicado como conteúdo estático no Cloudflare Pages.

## Requisitos

- Node.js 22
- npm 10 ou superior

## Desenvolvimento local

Na raiz do repositório:

```bash
cd site
npm install
npm run dev
```

Acesse http://localhost:3000.

## Validação e build

```bash
npm run lint
npm run build
```

O build de produção gera a exportação estática em `site/out`.

## Hospedagem — Cloudflare Pages

Configuração do projeto Pages:

- Tipo: Pages
- Repositório: `schrsistemas/schrsistemas`
- Production branch: `main`
- Root directory: `site`
- Framework preset: Next.js (Static HTML Export)
- Build command: `npm run build`
- Build output directory: `out`
- Node.js: 22

O Pages publica o site institucional. A API dinâmica é um projeto separado em `workers/api/`, com seu próprio build e deploy. Não configure `npx wrangler deploy` no projeto Pages.

## Limitações intencionais da exportação estática

Não utilizar sem revisão arquitetural:
- Route Handlers que dependam de runtime;
- Server Actions;
- middleware/proxy dinâmico;
- autenticação com sessão no servidor;
- acesso a banco de dados em tempo de requisição;
- otimização de imagem do servidor Next.js.

Esses requisitos pertencem à API Worker, salvo decisão arquitetural documentada.

## Conteúdo

- `app/`: rotas, layout, metadata, sitemap e manifesto.
- `components/`: cabeçalho e rodapé compartilhados.
- `app/globals.css`: identidade visual responsiva.
- `next.config.ts`: configuração de exportação estática.
