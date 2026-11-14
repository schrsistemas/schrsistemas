# Site institucional — Schr Sistemas

Aplicação Next.js do portal `https://schrsistemas.com`.

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

## Hospedagem

O projeto foi configurado com `output: "export"` para Cloudflare Pages.

Configuração recomendada no painel Cloudflare:

- Tipo: Pages
- Repositório: `schrsistemas/schrsistemas`
- Production branch: `main`
- Root directory: `site`
- Framework preset: Next.js (Static HTML Export)
- Build command: `npm run build`
- Build output directory: `out`
- Node.js: 22

O deploy é acionado automaticamente por novos commits na branch `main`. Não é necessário Worker ou banco de dados para a versão inicial.

## Limitações intencionais da exportação estática

Não utilizar sem revisão arquitetural:
- Route Handlers que dependam de runtime;
- Server Actions;
- middleware/proxy dinâmico;
- autenticação com sessão no servidor;
- acesso a banco de dados em tempo de requisição;
- otimização de imagem do servidor Next.js.

Para formulários, APIs ou conteúdo dinâmico futuro, avaliar Cloudflare Workers e serviços gratuitos antes de adicionar infraestrutura.

## Conteúdo

- `app/`: rotas, layout, metadata, sitemap e manifesto.
- `components/`: cabeçalho e rodapé compartilhados.
- `app/globals.css`: identidade visual responsiva.
- `next.config.ts`: configuração de exportação estática.
