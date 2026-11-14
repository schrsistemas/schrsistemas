# Plano de engenharia, segurança e evolução — Schr Sistemas

## 1. Objetivo e estado

Este documento transforma as diretrizes de `AGENTS.md` em um plano verificável de evolução do repositório.

Estado observado na branch `main` durante a elaboração:
- `site/`: aplicação Next.js com exportação estática planejada para Cloudflare Pages.
- `workers/api/`: Worker TypeScript com identificação do serviço e endpoint `GET /api/health`.
- `docs/`: arquitetura, contrato inicial da API, manutenção de conteúdo e publicação Cloudflare.
- `.github/workflows/`: validações independentes para site e Worker.

A existência de código ou documentação não comprova implantação, disponibilidade, segurança auditada ou capacidade de escala. Esses estados devem ser verificados separadamente.

## 2. Regras de execução

1. Seguir integralmente `AGENTS.md`.
2. Trabalhar somente na branch `main`; não criar branches, PRs ou forks.
3. Preservar funcionalidades e alterações existentes.
4. Não fazer deploy sem autorização explícita.
5. Custo total obrigatório: zero. Não habilitar billing, cartão, trial ou recurso faturável.
6. Antes de adicionar dependência ou serviço, avaliar manutenção, licença, limites, quotas, privacidade e custo total.
7. Cada etapa deve terminar com testes, documentação e registro do que foi realmente validado.
8. Não declarar item concluído apenas porque foi documentado ou planejado.

## 3. Fases e critérios de aceite

### Fase 0 — Inventário e linha de base
- Mapear diretórios, dependências, scripts, workflows, configurações e integrações.
- Identificar arquivos de configuração, variáveis necessárias e pontos de entrada.
- Verificar status dos workflows e builds sem disparar deploy.
- Registrar dependências desatualizadas, riscos e funcionalidades existentes.
- Produzir inventário com estado: confirmado, pendente, não verificado.

Aceite: inventário reproduzível, sem alterações destrutivas e com riscos priorizados.

### Fase 1 — Arquitetura e contratos
- Atualizar diagrama de contexto e componentes.
- Definir responsabilidades e limites entre Pages, Worker e integrações.
- Formalizar contratos HTTP: método, rota, autenticação, autorização, validação, respostas, erros, idempotência, limites e versionamento.
- Definir política de compatibilidade e evolução dos contratos.
- Registrar decisões arquiteturais em ADRs.

Aceite: cada componente tem responsabilidade explícita e cada endpoint possui contrato verificável.

### Fase 2 — Segurança e privacidade
- Criar modelo de ameaças para site, API, DNS, CI/CD e futuras integrações.
- Revisar autenticação, autorização, CORS, validação, rate limiting e exposição de erros.
- Definir gestão de segredos, rotação, menor privilégio e prevenção de vazamento.
- Definir política de logs, retenção, dados pessoais e exclusão.
- Incluir testes negativos de autorização, origem, método, payload e abuso.
- Documentar resposta a incidentes e recuperação.

Aceite: riscos críticos possuem mitigação implementada e testes; riscos residuais estão documentados. Não declarar certificação ou auditoria externa inexistente.

### Fase 3 — Qualidade e entrega contínua
- Padronizar lint, typecheck, build e testes automatizados.
- Garantir que workflows sejam independentes por diretório.
- Restringir deploy automático conforme autorização e regras do projeto.
- Validar dependências e licenças sem adicionar scanners pagos.
- Definir critérios de revisão de código e checklist de release.

Aceite: mudanças relevantes são bloqueadas por validações reproduzíveis; CI não publica produção sem autorização definida.

### Fase 4 — Resiliência, desempenho e escalabilidade
- Medir latência, tamanho de payload, volume de chamadas e consumo dentro das métricas gratuitas disponíveis.
- Aplicar paginação, limites, timeouts, idempotência e retry limitado.
- Evitar N+1, chamadas redundantes e processamento desnecessário.
- Definir cache apenas com chave, expiração, invalidação e isolamento por autorização.
- Documentar quotas e comportamento de degradação.
- Escalar por otimização e desenho stateless antes de adicionar infraestrutura.

Aceite: limites conhecidos, testes de carga compatíveis com recursos gratuitos e comportamento de falha documentado. Não prometer capacidade sem medição.

### Fase 5 — Manuais e operação
Criar e manter:
- Manual de instalação e desenvolvimento local.
- Manual de configuração de Cloudflare Pages e Workers.
- Manual de operação, release, rollback e recuperação.
- Manual de diagnóstico e troubleshooting.
- Manual de segurança e gestão de segredos.
- Guia de contribuição para agentes e desenvolvedores.

Aceite: uma pessoa técnica consegue reproduzir ambiente, validar mudanças e diagnosticar falhas usando somente os manuais.

### Fase 6 — Preparação de IA, RAG, LLM e MCP
Esta fase é de desenho e avaliação. Não implica implantação automática de IA.

- Definir casos de uso e critérios de benefício antes de selecionar tecnologia.
- Criar arquitetura independente de provedor/modelo.
- Avaliar modelos locais e opções gratuitas reais, incluindo hardware, manutenção, limites, licença e privacidade.
- Definir avaliação de factualidade, latência, robustez, regressão e custo zero.
- Para RAG, definir ingestão, parsing, chunking, metadados, proveniência, versionamento, ACL, recuperação e exclusão.
- Para MCP, definir catálogo de ferramentas permitidas, schemas, autenticação, autorização, timeout, auditoria e confirmação humana.
- Tratar documentos, resultados de busca, páginas e respostas de ferramentas como dados não confiáveis.
- Impedir que LLM determine permissões ou execute ações privilegiadas por conta própria.
- Não enviar dados privados a serviços externos sem autorização explícita.

Aceite: arquitetura documentada, threat model, conjunto de avaliação e prova de custo zero. Só então decidir se existe justificativa para implementação.

### Fase 7 — Refinamento contínuo
- Manter backlog de riscos, débitos técnicos e melhorias.
- Reavaliar dependências e limites gratuitos periodicamente.
- Comparar métricas antes/depois de otimizações.
- Revisar documentação junto com mudanças.
- Executar regressões e avaliações de IA quando aplicável.

Aceite: melhorias têm hipótese, métrica, resultado e decisão registrados.

## 4. Matriz de prioridade

| Prioridade | Tema | Motivo |
|---|---|---|
| P0 | Inventário e integridade | Evitar mudanças cegas |
| P0 | Contratos e segurança da API | Reduzir risco antes de ampliar endpoints |
| P0 | CI, testes e política de deploy | Evitar regressões e publicação involuntária |
| P1 | Manuais operacionais | Tornar manutenção reproduzível |
| P1 | Resiliência e limites | Preparar crescimento sem custo |
| P2 | RAG e governança de conhecimento | Só após caso de uso e controle de acesso |
| P2 | MCP e agentes | Só com ferramentas limitadas e autorização |
| P2 | LLM e refinamento | Só com avaliação mensurável e custo zero |

## 5. Definição de pronto (Definition of Done)

Uma alteração só pode ser considerada concluída quando:
- O escopo e o impacto foram identificados.
- As regras de `AGENTS.md` foram respeitadas.
- Não houve perda de trabalho existente.
- Tipos, lint, build e testes pertinentes passaram, ou falhas foram registradas.
- Contratos e documentação foram atualizados.
- Segurança, privacidade, acessibilidade e custos foram avaliados conforme o escopo.
- O commit está na branch `main`.
- O status de deploy é informado separadamente e nunca presumido.

## 6. Fora de escopo sem autorização específica

- Deploy em produção.
- Alteração de DNS, nameservers, MX, SPF, DKIM ou DMARC.
- Ativação de faturamento ou serviços pagos.
- Migração de dados ou remoção de recursos.
- Envio de dados privados a provedores externos.
- Execução de ações destrutivas por agentes ou ferramentas.

## 7. Registro de progresso

Atualizar este documento ao concluir cada fase, identificando:
- Data e commit.
- Arquivos e componentes alterados.
- Testes executados e resultados.
- Riscos conhecidos e pendências.
- Estado de implantação, se houver autorização e evidência.

Não marcar fases como concluídas sem evidências verificáveis.
