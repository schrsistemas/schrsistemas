# SCHR AI CORE — Platform Blueprint

**Status:** proposta arquitetural inicial  
**Baseline:** Schr AI Core 0.1.x  
**Policy:** local-first, zero-cost, mock-first, sem deploy

## 1. Visão do produto

O Schr AI Core deve ser o núcleo próprio de inteligência artificial da Schr Sistemas: uma plataforma modular para processamento de linguagem, gerenciamento de prompts, execução de modelos, recuperação de conhecimento, agentes, avaliação e operações.

O produto não deve ser acoplado a um fabricante de modelos. Cada capacidade deve ser acessada por contratos internos e implementações substituíveis.

## 2. Estado verificado da baseline

A implementação atualmente existente contém:

- Gateway HTTP em Node.js nativo e TypeScript.
- Contrato `LlmProvider` e `MockProvider`.
- Adaptador `OpenAIProvider` deliberadamente desabilitado.
- SQLite local com projetos, hashes de API keys e metadados de requisições.
- Autenticação `X-API-Key`, rate limit em memória e idempotência.
- Endpoints de health, models, chat completions, usage e consulta de requisição.
- Testes de validação, provider e servidor.

Limitações documentadas ou observadas na baseline:

- O gateway executa diretamente o MockProvider; ainda não existe seleção por registry.
- Não existem módulos de prompts, PLN, embeddings, RAG, agentes, tools, multimodalidade ou avaliação.
- O rate limit é em memória.
- A autorização por projeto precisa ser fortalecida antes de qualquer exposição externa.
- O MockProvider produz texto explicitamente simulado; não é um modelo de linguagem.
- As contagens de tokens do mock são estimativas locais, não métricas reais de inferência.

## 3. Princípios arquiteturais

1. **Local-first:** o modo padrão funciona sem serviços externos.
2. **Zero-cost:** nenhuma funcionalidade obrigatória depende de API paga, assinatura ou infraestrutura paga.
3. **Mock-first:** toda integração ainda indisponível deve possuir mock honesto e identificável.
4. **Provider-agnostic:** domínio não importa SDK de fornecedor.
5. **Contracts-first:** módulos comunicam-se por interfaces e DTOs versionados.
6. **Incremental:** cada módulo deve ser útil, testável e entregável isoladamente.
7. **Privacy-by-design:** prompts e documentos não são persistidos sem política explícita de retenção.
8. **Observable:** operações têm correlation/request ID, status, duração e métricas claramente classificadas.
9. **No false capability:** simulação, estimativa e resultado real devem ser distinguidos na API e na interface.
10. **No production changes:** blueprint e implementação local não autorizam deploy, DNS ou alterações em Workers existentes.

## 4. Domínios da plataforma

### 4.1 Core Gateway

Responsável por HTTP, autenticação, autorização, limites, idempotência, roteamento e contratos públicos.

### 4.2 Model Runtime

Contratos independentes para geração de texto, embeddings e capacidades multimodais.

Contratos conceituais:

- `LlmProvider.generate(request)`
- `EmbeddingProvider.embed(request)`
- `MultimodalProvider` com capacidades explicitamente declaradas.
- `ProviderRegistry.resolve(capability, providerId?)`

O registry deve rejeitar capacidades não suportadas. Não deve encaminhar silenciosamente para um provedor externo.

### 4.3 Prompt Management

Responsável por templates, variáveis, composição, versionamento, validação, publicação e histórico.

Entidades conceituais:

- Prompt
- PromptVersion
- PromptVariable
- PromptExecution
- PromptEvaluation

Uma versão publicada deve ser imutável. Alterações geram nova versão.

### 4.4 NLP Pipeline

Pipeline desacoplado para normalização, segmentação, detecção de idioma, extração e classificação. Cada etapa deve declarar se é regra determinística, biblioteca local ou modelo.

### 4.5 Knowledge / RAG

Pipeline de ingestão, extração, chunking, indexação, recuperação, montagem de contexto e referências às fontes.

O primeiro incremento pode oferecer busca lexical local usando recursos disponíveis no SQLite, se confirmados no ambiente. Busca vetorial deve entrar por contrato de índice, após prova de compatibilidade de uma implementação local gratuita. Não assumir que SQLite puro oferece busca vetorial.

Entidades conceituais:

- KnowledgeCollection
- Document
- DocumentVersion
- Chunk
- Embedding
- RetrievalRun
- SourceReference

### 4.6 Agent Runtime

Execução controlada de tarefas compostas por etapas. Tools são registradas em allowlist, com schema de entrada/saída, timeout, limite de iterações e política de aprovação. Nenhum agente recebe execução irrestrita de shell, filesystem ou rede.

### 4.7 Evaluation & Governance

Conjuntos de avaliação, casos de teste, métricas, evidências, proveniência, políticas e auditoria. Resultados devem registrar modelo/provedor, versão do prompt, fontes recuperadas e método de avaliação quando aplicável.

### 4.8 Multimodal

Contratos de entrada/saída para texto, imagem e áudio. O módulo só anuncia uma capacidade como habilitada quando existe implementação funcional local. Caso contrário, retorna capacidade indisponível ou mock explicitamente simulado.

### 4.9 Operations / MLOps

Configuração por ambiente, migrações, health checks, logs estruturados sem conteúdo sensível, métricas, CI, testes de regressão e exportação/importação de dados locais.

## 5. Estrutura de diretórios alvo

A estrutura abaixo é uma direção evolutiva, não uma ordem para mover tudo de uma vez:

```text
workers/ai-core/
  src/
    core/
      contracts/
      errors/
      registry/
    gateway/
      routes/
      middleware/
    providers/
      mock/
      local/
      external-disabled/
    prompts/
      domain/
      services/
      repositories/
    nlp/
      pipeline/
      processors/
    embeddings/
      contracts/
      providers/
    knowledge/
      ingestion/
      chunking/
      indexing/
      retrieval/
      citations/
    agents/
      runtime/
      planning/
      tools/
      policies/
    evaluation/
      datasets/
      metrics/
      runners/
    multimodal/
      image/
      audio/
    observability/
    persistence/
      migrations/
  tests/
    unit/
    integration/
    contract/
    fixtures/
docs/ai-core/
  README.md
  architecture.md
  platform-blueprint.md
  modules/
```

Não realizar reorganização física antes de existirem testes de regressão e necessidade concreta.

## 6. Roadmap recomendado

### Etapa 0 — Estabilização do Core

- Corrigir e testar autorização por projeto vinculada à API key.
- Introduzir migrações versionadas do SQLite.
- Criar camada repository para retirar SQL das rotas.
- Introduzir ProviderRegistry mantendo somente MockProvider ativo.
- Formalizar envelopes de erro e contratos versionados.
- Adicionar testes para idempotência, limites, isolamento entre projetos e falhas de persistência.

**Critério de saída:** baseline reproduzível, testes verdes e isolamento de projetos comprovado.

### Etapa 1 — Prompt Engineering

- CRUD de prompts e versões.
- Renderização de variáveis com validação estrita.
- Preview local sem inferência.
- Publicação imutável de versões.
- Testes de regressão de templates.

**Critério de saída:** criar, versionar, validar e renderizar prompts pela API sem provedor externo.

### Etapa 2 — NLP local

- Pipeline de processadores plugáveis.
- Normalização e segmentação determinísticas.
- Interfaces para idioma, classificação e extração.
- Fixtures e testes com exemplos em português.

**Critério de saída:** pipeline local reproduzível, com proveniência do processador utilizado.

### Etapa 3 — Knowledge e RAG

- Ingestão de texto e formatos documentais selecionados.
- Versionamento de documentos.
- Chunking configurável.
- Busca lexical local inicial.
- Contrato de embeddings e índice vetorial.
- Recuperação com referências de origem.
- Resposta fundamentada, com fontes e indicação de contexto insuficiente.

**Critério de saída:** recuperar trechos de documentos locais e retornar referências verificáveis. Busca vetorial só é considerada pronta após implementação e teste real.

### Etapa 4 — Embeddings e índice vetorial local

- Avaliar bibliotecas e modelos executáveis localmente, sem cobrança.
- Medir requisitos de CPU, RAM e armazenamento.
- Implementar adaptador somente após prova de conceito.
- Persistir versão do modelo e dimensão dos vetores.
- Testar similaridade, filtros e reindexação.

**Critério de saída:** indexação e consulta vetorial locais demonstradas em ambiente suportado.

### Etapa 5 — Agent Runtime

- Definição declarativa de tarefas e etapas.
- Registry de tools com allowlist.
- Schemas de entrada e saída.
- Timeouts, limites e cancelamento.
- Estado persistido e trilha de execução.
- Mock tools para testes.

**Critério de saída:** agente executa fluxo determinístico com tools autorizadas e limites verificáveis.

### Etapa 6 — Avaliação e Governança

- Dataset de avaliação local.
- Métricas determinísticas e avaliações humanas.
- Testes de regressão de prompts.
- Registro de proveniência e fontes.
- Políticas de retenção e auditoria.

**Critério de saída:** cada execução avaliada pode ser rastreada até prompt, configuração, provider e fontes.

### Etapa 7 — Multimodal

- Contratos de imagem e áudio.
- Validação de MIME, tamanho e armazenamento.
- Adaptadores locais quando viáveis.
- Capacidades mock explicitamente rotuladas.
- Testes de limites e formatos.

**Critério de saída:** capacidades habilitadas correspondem a processamento funcional, não apenas a contratos vazios.

### Etapa 8 — Operação e distribuição

- CI abrangendo todos os módulos.
- Migrações e backup/restore local.
- Observabilidade e diagnóstico.
- Empacotamento local.
- Hardening de autenticação, autorização e rate limit.
- Avaliação separada de qualquer futura publicação.

**Critério de saída:** instalação reproduzível e operação documentada. Deploy permanece fora do escopo até autorização específica.

## 7. Decisões técnicas que exigem prova antes de adoção

- Biblioteca local de embeddings e modelo compatível com hardware disponível.
- Banco/índice vetorial local e sua licença.
- Parseres de PDF, DOCX e outros formatos.
- Bibliotecas de PLN em português.
- Execução local de modelos generativos.
- Suporte a áudio e imagem em CPU.

Toda dependência deve ser avaliada por licença, manutenção, compatibilidade Node.js, tamanho, consumo de memória e custo operacional. Não introduzir dependência paga ou serviço remoto obrigatório.

## 8. Critérios globais de aceite

- `npm run check`, `npm test` e `npm run build` passam.
- Testes de integração cobrem contratos HTTP e persistência.
- Mock continua sendo o caminho padrão.
- OpenAI permanece desabilitado e sem chamadas de rede.
- Nenhuma chave ou conteúdo sensível aparece em logs.
- Toda capacidade mock é identificada como simulada.
- Toda capacidade não implementada é declarada como indisponível.
- Documentação descreve o comportamento realmente testado.
- Nenhum deploy ou alteração de infraestrutura ocorre nesta trilha.

## 9. Próxima implementação recomendada

Começar pela **Etapa 0 — Estabilização do Core**. Antes de adicionar RAG ou agentes, é necessário consolidar isolamento por projeto, migrações, repositórios e registry de providers. Isso reduz o risco de multiplicar módulos sobre uma base com autorização e persistência ainda limitadas.
