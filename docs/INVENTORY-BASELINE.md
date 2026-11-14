# Inventário técnico e linha de base — Schr Sistemas

**Data da verificação:** 2026-11-14  
**Branch examinada:** `main`  
**Repositório:** `schrsistemas/schrsistemas`  
**Escopo:** inspeção de arquivos e metadados públicos do GitHub. Não houve execução local dos projetos, acesso ao painel Cloudflare ou deploy.

## 1. Estrutura confirmada

| Caminho | Conteúdo | Estado |
|---|---|---|
| `site/` | Next.js App Router, TypeScript, Material UI e exportação estática | Confirmado por arquivos |
| `workers/api/` | Worker TypeScript com Wrangler | Confirmado por arquivos |
| `docs/` | Arquitetura, contrato API, publicação, manutenção e roadmap | Confirmado por arquivos |
| `.github/workflows/site-check.yml` | Lint, build estático e verificação de arquivos exportados | Confirmado |
| `.github/workflows/worker-api-check.yml` | TypeScript check da API | Confirmado |
| `AGENTS.md` | Regras de branch, custo zero, arquitetura, segurança, qualidade e IA | Confirmado |

## 2. Dependências e comandos identificados

### Site

Arquivo: `site/package.json`

- Next.js: `16.4.6`
- React e React DOM: `^19.2.0`
- Material UI: `9.5.0`
- TypeScript: `^5.9.3`
- ESLint: `^9.39.0`

Scripts:
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

Observação: o inventário do diretório `site/` não encontrou `package-lock.json`. O workflow usa `npm install`, portanto a resolução transitiva de dependências não está travada por lockfile neste diretório. Isso reduz a reprodutibilidade entre execuções. Correção recomendada: gerar e versionar lockfile com a versão de Node/npm definida pelo projeto e, então, trocar instalação do CI para `npm ci`.

### API Worker

Arquivo: `workers/api/package.json`

Scripts:
- `npm run dev`
- `npm run check` — `tsc --noEmit`
- `npm run deploy` — `wrangler deploy`

Dependências de desenvolvimento declaradas:
- TypeScript: `^5.9.3`
- Wrangler: `^4.68.0`

O diretório possui `wrangler.jsonc`, `tsconfig.json`, `src/index.ts` e README. O inventário confirma que o workflow valida tipos, mas não executa testes unitários ou de integração. A API também não declara script de testes.

## 3. Funcionalidade observada na API

Arquivo: `workers/api/src/index.ts`

- `GET /`: identificação do serviço.
- `GET /api/health`: resposta de saúde com serviço e versão.
- `OPTIONS`: tratamento de preflight CORS.
- Rotas não reconhecidas: HTTP 404.
- Método diferente de GET em `/api/health`: HTTP 405.
- Allowlist CORS observada: domínio raiz, www e localhost:3000.

Limites atuais:
- Não há autenticação nem autorização implementadas.
- Não há persistência.
- Não há endpoints de escrita.
- Não há rate limiting implementado no código inspecionado.
- O endpoint health é informativo e não deve ser tratado como monitoramento profundo de dependências.

A API atual é uma base mínima, não uma plataforma pronta para receber operações privadas ou dados sensíveis.

## 4. Workflows e resultados públicos observados

### Worker API quality

Execuções consultadas:
- Run `43580596821`: concluída com sucesso.
- Run `43580581576`: concluída com sucesso.
- Run `43580356182`: concluída com sucesso.
- Run `43561243031`: concluída com sucesso.
- Run `43561217717`: concluída com sucesso.
- Run `43561193729`: concluída com sucesso.

Essas execuções validam o TypeScript conforme o workflow atual. Não comprovam deploy, testes de comportamento ou funcionamento no domínio público.

### Site quality

Execução consultada:
- Run `43561181991`: falhou.
- Checkout: sucesso.
- Setup Node.js: sucesso.
- Instalação de dependências: sucesso.
- Lint: sucesso.
- Build estático: falha.
- Verificação dos arquivos exportados: ignorada por causa da falha anterior.

Outras execuções anteriores do workflow também aparecem como falha. A mensagem detalhada do build não ficou disponível no endpoint de consulta usado nesta inspeção. Portanto, a causa raiz está **não verificada** e não deve ser presumida.

Link para inspeção humana: https://github.com/schrsistemas/schrsistemas/actions/runs/43561181991

## 5. Riscos e pendências priorizados

| ID | Prioridade | Achado | Ação necessária |
|---|---|---|---|
| INV-001 | P0 | Build estático do site falhou no CI | Obter log completo e corrigir causa raiz |
| INV-002 | P0 | Site sem `package-lock.json` visível | Gerar lockfile reproduzível e adotar `npm ci` |
| INV-003 | P0 antes de endpoints privados | API não possui autenticação/autorização | Definir modelo de identidade antes de criar rotas privadas |
| INV-004 | P1 | API sem testes automatizados de comportamento | Adicionar testes para rotas, métodos, CORS e erros |
| INV-005 | P1 | Workflow API executa somente typecheck | Incluir testes e validações estáticas apropriadas |
| INV-006 | P1 | Workflow Site falha no build | Bloquear evolução de publicação até build verde |
| INV-007 | P1 | CI não comprova deploy Cloudflare | Validar separadamente no painel, sem publicar nesta etapa |
| INV-008 | P2 | Sem baseline de desempenho/cotas documentada | Medir após estabilizar build e contratos |

## 6. Estado de implantação

| Componente | Estado |
|---|---|
| Código no GitHub | Confirmado |
| CI do Worker | Typecheck passou nas execuções listadas |
| CI do site | Build falhou na execução inspecionada |
| Cloudflare Pages | Não verificado nesta inspeção |
| Cloudflare Worker publicado | Não verificado nesta inspeção |
| Domínio e DNS | Não alterados nesta etapa |
| Deploy nesta etapa | Não realizado |

## 7. Próximos passos

1. Corrigir o build estático do site com base no log completo, sem adivinhar a causa.
2. Adicionar lockfile e instalação determinística.
3. Criar testes automatizados da API e validar CORS/métodos/respostas.
4. Atualizar contrato da API para refletir exatamente o comportamento testado.
5. Reavaliar a Fase 0 após os testes verdes e avançar para modelo de ameaças.

## 8. Critério de atualização

Atualizar este inventário sempre que uma pendência for resolvida, preservando o histórico do achado, evidência, commit e resultado dos testes. Um estado só muda para concluído quando houver evidência reproduzível.
