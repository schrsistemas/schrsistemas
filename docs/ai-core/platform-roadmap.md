# Schr AI Platform — Roadmap de evolução

**Versão:** 0.1  
**Status:** evolução incremental; estados de implementação e validação são indicados por etapa.  
**Escopo:** evolução local-first do Schr AI Core, sem dependência de curso, material pago ou provedor comercial.

## 1. Visão do produto

O Schr AI deve ser um ecossistema próprio de inteligência artificial, composto por um núcleo estável e módulos independentes. O núcleo fornece identidade de requisição, autenticação, políticas, contratos, persistência operacional e observabilidade. Os módulos especializados fornecem capacidades de linguagem, conhecimento, recuperação, agentes e avaliação.

A matriz de tecnologias que orienta a visão é: LLM, PLN, Transformers, Prompt Engineering, agentes, orquestração, RAG, embeddings, bancos vetoriais, multimodalidade, avaliação, mitigação de alucinações, governança e MLOps. Esses termos são direcionadores de produto, não requisitos para reproduzir um curso.

## 2. Princípios não negociáveis

1. **Custo zero obrigatório:** nenhuma funcionalidade essencial pode exigir API paga, assinatura ou infraestrutura paga.
2. **Local-first:** preferir execução local e persistência local.
3. **Mock explícito:** mocks servem para contratos, testes e desenvolvimento; nunca devem ser apresentados como inferência real.
4. **Provedores desacoplados:** nenhum módulo pode depender diretamente de um fabricante.
5. **OpenAI desabilitado:** o adaptador existente permanece desabilitado e não realiza chamadas externas.
6. **Evolução incremental:** cada módulo tem contrato, testes, documentação e critérios de aceitação.
7. **Sem deploy automático:** este roadmap não autoriza publicação, alteração de DNS, Cloudflare, Workers ou produção.
8. **Sem segredos no repositório:** chaves e credenciais não entram em commits, exemplos reais ou logs.
9. **Sem expansão prematura:** não adicionar dependências pesadas antes de validar necessidade, licença, compatibilidade e custo operacional.

## 3. Estado conhecido do núcleo

A implementação inicial em `workers/ai-core` já contém:

- servidor HTTP nativo em Node.js/TypeScript;
- contrato `LlmProvider`;
- `MockProvider` funcional;
- adaptador OpenAI bloqueado;
- SQLite via `better-sqlite3`;
- projetos, hashes de API keys e metadados de requisições;
- autenticação `X-API-Key`;
- validação de entrada, limite de corpo, rate limit em memória e idempotência;
- endpoints de health, modelos, chat completions, uso e consulta de requisição;
- testes e workflow de validação.

Limitações registradas na arquitetura atual: um projeto por instância; rate limit volátil em memória; ausência de RAG, embeddings, agentes, streaming e tool calling; ausência de backup automático. O servidor atualmente instancia o MockProvider diretamente no fluxo de chat. A evolução deve primeiro eliminar esse acoplamento sem quebrar o comportamento existente.

## 4. Arquitetura-alvo

Separar o produto em camadas com dependências apontando para contratos internos:

```text
Aplicações clientes
       |
API / Gateway (auth, validação, limites, idempotência)
       |
Application Core (casos de uso, políticas, tracing)
       |
Contratos internos
  |       |        |        |         |
LLM    Prompts   Knowledge Agents   Evaluation
  |       |        |        |         |
Providers / Adapters / Local runtimes
       |
Persistência e infraestrutura local
(SQLite, arquivos, índice de busca, métricas)
```

### Módulos de produto

| Módulo | Responsabilidade | Estado |
|---|---|---|
| Core Gateway | API, autenticação, políticas e ciclo de requisição | Parcialmente implementado |
| LLM Runtime | Seleção e execução por contrato de provider | Registry implementado; CI verde |
| Prompt Studio | Templates, variáveis, versões e composição de prompts | Implementação inicial; CI aprovado |
| NLP Engine | Normalização, classificação e utilitários de texto | Planejado |
| Knowledge Engine | Fontes, documentos, metadados e ciclo de ingestão | Implementação inicial; CI aprovado |
| Retrieval/RAG Engine | Chunking, indexação, recuperação e contexto com fontes | Busca lexical FTS5 inicial; CI pendente |
| Embedding Runtime | Contrato de embeddings e adaptadores locais/mock | Planejado |
| Agent Runtime | Execução controlada de planos e ferramentas | Planejado |
| Tool Registry | Registro, schemas, permissões e execução de ferramentas | Planejado |
| Evaluation Engine | Datasets, avaliações, regressão e evidências | Planejado |
| Governance | Auditoria, políticas, retenção e proveniência | Planejado |
| Multimodal Gateway | Contratos de entrada/saída para texto, imagem e áudio | Planejado |
| Observability/MLOps | Logs estruturados, métricas, health e testes | Inicial; ampliar gradualmente |

## 5. Contratos de domínio propostos

Os contratos abaixo são objetivos arquiteturais; não devem ser tratados como código já existente.

- `LlmProvider`: gerar texto a partir de uma entrada normalizada e retornar saída, modelo, uso e metadados do provider.
- `EmbeddingProvider`: transformar textos em vetores; declarar dimensão, modelo e proveniência.
- `VectorStore`: inserir, remover e consultar vetores com filtros e metadados.
- `DocumentParser`: extrair conteúdo e metadados de formatos suportados.
- `Chunker`: dividir conteúdo em segmentos rastreáveis à origem.
- `Retriever`: recuperar trechos relevantes e devolver pontuação, origem e estratégia usada.
- `PromptRepository`: armazenar templates versionados e recuperar uma versão imutável.
- `Tool`: declarar nome, descrição, schema de entrada, política de autorização e executor.
- `AgentRuntime`: executar etapas limitadas, com orçamento de passos, timeout e trilha de auditoria.
- `Evaluator`: executar critérios reproduzíveis sobre datasets e resultados.
- `AuditSink`: registrar eventos de governança sem armazenar conteúdo sensível por padrão.

Todos os contratos devem definir erros tipados, limites, cancelamento quando aplicável e metadados de rastreabilidade. Dados de prompt e resposta não devem ser persistidos por padrão.

## 6. Estratégia de armazenamento e busca

Manter SQLite como persistência operacional inicial. Separar claramente:

- metadados e configurações;
- documentos e referências a arquivos;
- chunks e metadados de origem;
- índices de recuperação;
- vetores e metadados do modelo de embedding;
- eventos de execução e auditoria.

Não assumir que SQLite puro fornece busca vetorial. A primeira entrega de Knowledge/RAG pode oferecer busca textual local (por exemplo, FTS5, após validar suporte na compilação SQLite utilizada). Busca vetorial real exige um backend vetorial compatível ou extensão local validada. Não rotular busca lexical como busca semântica.

Embeddings mock podem validar contratos e fluxo, mas não devem ser usados para alegar qualidade semântica. Um adaptador de embeddings local só será escolhido após avaliar tamanho do modelo, licença, CPU/RAM, compatibilidade Node, download necessário e operação offline.

## 7. Roadmap de implementação

### Etapa 0 — Fundação e desacoplamento do Core
- Injetar provider no caso de uso de chat, em vez de instanciá-lo dentro do handler HTTP.
- Criar composição explícita de dependências.
- Padronizar erros, IDs de correlação e metadados de execução.
- Preservar endpoints e formato de resposta existentes.
- Cobrir seleção de provider e falhas com testes.

**Aceitação:** testes existentes passam; Mock continua sendo o único provider ativo; OpenAI segue bloqueado e sem HTTP externo.

### Etapa 1 — Prompt Studio
- Criar templates com identificador, nome, descrição, versão e status.
- Suportar variáveis declaradas e validação de variáveis obrigatórias.
- Separar system/instructions, contexto e input do usuário.
- Permitir composição determinística e renderização local.
- Persistir versões imutáveis no SQLite.
- Criar testes de renderização, validação e versionamento.

**Aceitação:** criar, consultar, versionar e renderizar prompts sem chamada a LLM.

### Etapa 2 — Knowledge Engine e ingestão local
- Registrar fontes e documentos.
- Implementar pipeline de parsing por adaptadores.
- Normalizar texto e metadados.
- Dividir documentos em chunks com referência à origem e posição.
- Controlar hash, versão e reprocessamento idempotente.
- Começar por formatos simples e bibliotecas open source avaliadas.

**Aceitação:** ingestão repetível, rastreável e testada; nenhum serviço remoto obrigatório.

### Etapa 3 — Retrieval e RAG
- Disponibilizar busca lexical local primeiro.
- Definir interfaces de embeddings e VectorStore.
- Adicionar backend vetorial somente após avaliação técnica.
- Recuperar trechos com identificadores de fonte.
- Montar contexto com limites explícitos.
- Devolver fontes utilizadas junto da resposta.
- Avaliar recuperação separadamente da geração.

**Aceitação:** demonstrar quais fontes sustentam cada trecho recuperado; busca lexical e vetorial são identificadas corretamente.

### Etapa 4 — Agent Runtime e Tool Registry
- Definir ferramentas com JSON Schema ou contrato equivalente.
- Aplicar allowlist por projeto.
- Limitar passos, tempo, tamanho de entrada/saída e orçamento.
- Exigir autorização explícita para ferramentas com efeitos externos.
- Registrar plano, chamadas, resultados e falhas.
- Começar com ferramentas locais sem efeitos destrutivos.

**Aceitação:** agente não consegue invocar ferramenta não registrada ou exceder limites; execução reproduzível com MockProvider.

### Etapa 5 — NLP e multimodal
- Criar serviços de normalização e classificação com contratos próprios.
- Definir payloads multimodais sem acoplar ao provider.
- Tratar imagem e áudio como capacidades opcionais.
- Implementar somente adaptadores locais que tenham dependências e requisitos de hardware documentados.
- Manter mocks apenas para teste de contrato.

**Aceitação:** capacidades indisponíveis são informadas como não suportadas; mocks nunca são apresentados como processamento real.

### Etapa 6 — Evaluation, Governance e MLOps
- Criar datasets versionados de avaliação.
- Medir latência, taxa de erro, custo externo (zero por política), uso estimado e qualidade.
- Criar avaliações de groundedness e cobertura de fontes para RAG.
- Registrar versão de prompt, provider, modelo e fontes sem armazenar conteúdo sensível por padrão.
- Ampliar CI com testes de regressão e análise de dependências.
- Documentar backup, restauração e migrações.

**Aceitação:** resultados reproduzíveis, métricas com definição explícita e trilha de proveniência.

## 8. Critérios transversais de qualidade

Cada módulo novo deve entregar:

1. objetivo e limites documentados;
2. contrato tipado;
3. implementação real ou mock explicitamente identificado;
4. persistência e migração reversível quando necessária;
5. testes unitários e de integração;
6. validação de entradas e limites de recursos;
7. logs sem segredos ou conteúdo sensível por padrão;
8. documentação de instalação e uso;
9. avaliação de dependências, licença e custo;
10. nenhum deploy ou alteração de produção.

## 9. Decisões que exigem validação antes de implementação

- Suporte de FTS5 na versão efetiva de SQLite fornecida pelo `better-sqlite3`.
- Backend vetorial local mais adequado e sua licença.
- Runtime local de embeddings compatível com o hardware-alvo.
- Bibliotecas de parsing de PDF, DOCX e outros formatos.
- Modelo de isolamento multi-projeto e migração do modelo atual single-project.
- Estratégia de backup, restauração e criptografia de dados locais.

Não assumir disponibilidade de GPU. A primeira versão deve funcionar em CPU quando tecnicamente viável e documentar limitações de desempenho.

## 10. Próxima entrega técnica

A próxima implementação deve ser a **Etapa 0 — desacoplamento do LLM Runtime**. Ela reduz o acoplamento do handler HTTP ao MockProvider e estabelece o padrão de composição que será reutilizado pelos módulos seguintes.

Não iniciar simultaneamente Prompt Studio, RAG e agentes. Primeiro estabilizar o ponto de extensão do provider e garantir regressão zero.

## 10.1. Progresso da Etapa 0 — Provider Registry

A primeira etapa de desacoplamento foi implementada na branch de evolução:

- Criado `ProviderRegistry` com registro explícito de modelos e providers.
- Criada composição padrão local que registra somente `schr-mock-v1`.
- `createAiCoreServer` aceita registry injetável, removendo a instanciação direta do MockProvider dentro do handler.
- `GET /v1/models` passa a listar os modelos habilitados e mantém OpenAI separado como adaptador desabilitado.
- `POST /v1/chat/completions` usa o modelo padrão quando omitido e rejeita modelos não registrados com `MODEL_NOT_AVAILABLE`.
- Adicionados testes unitários para resolução do registry e testes HTTP para modelo desconhecido e catálogo de modelos.
- Atualizada a documentação dos contratos e da arquitetura.

**Validação concluída:** GitHub Actions run 43978776858 executou com sucesso `npm install`, `npm run check`, `npm test` e `npm run build`. A Etapa 0 está validada pelo CI.

## 10.2. Progresso da Etapa 1 — Prompt Studio

Implementação inicial registrada na branch de evolução:

- Persistência SQLite para templates e versões imutáveis.
- Criação de template com versão inicial.
- Criação de versões sequenciais sem sobrescrever versões anteriores.
- Listagem e consulta de templates por projeto.
- Declaração e validação de variáveis `{{nome}}`.
- Renderização determinística sem chamada a LLM.
- Rejeição de variáveis ausentes, desconhecidas ou não textuais.
- Testes unitários de criação, versionamento, renderização e isolamento por projeto.
- Teste HTTP de criação e renderização.
- Documentação dos endpoints, persistência e exemplos.

**Validação concluída:** GitHub Actions run 43979233682 executou com sucesso `npm install`, `npm run check`, `npm test` e `npm run build`. A implementação inicial do Prompt Studio está validada pelo CI.

## 10.3. Próxima entrega técnica — Knowledge Engine

Depois do CI verde do Prompt Studio, iniciar ingestão local de documentos:
- registro de fontes e documentos;
- extração de texto por adaptadores;
- normalização e metadados de origem;
- chunking rastreável;
- hash de conteúdo e reprocessamento idempotente.

Começar por texto simples e Markdown. Avaliar PDF/DOCX e dependências separadamente antes de adicioná-las. Ainda não implementar embeddings ou busca vetorial nesta etapa.

## 11. Fora do escopo deste roadmap

- Comprar ou reproduzir curso.
- Exigir material acadêmico.
- Ativar OpenAI ou qualquer API paga.
- Fazer deploy.
- Alterar DNS, Cloudflare Pages ou Workers existentes.
- Construir funcionalidades multimodais artificiais sem runtime real.
- Chamar busca lexical de busca vetorial.
- Tratar saída mock como resposta de IA real.
\n\n## 10.4. Progresso da Etapa 2 — Knowledge Engine\n\nImplementação inicial adicionada à branch `feature/schr-ai-platform-roadmap`:\n- `knowledge_sources`, `knowledge_documents` e `knowledge_chunks` no SQLite.\n- Serviço local para criação/listagem de fontes, ingestão e consulta de documentos.\n- Suporte inicial a texto simples e Markdown enviados no JSON.\n- Normalização de quebras de linha, remoção de NUL e normalização Unicode NFC.\n- Hash SHA-256 do conteúdo normalizado e dos chunks.\n- Chunking de 1.200 unidades UTF-16 com overlap de 150 e offsets rastreáveis.\n- Idempotência para conteúdo repetido e atualização/versionamento por `external_id`.\n- Rotas HTTP autenticadas e isolamento por projeto.\n- Testes de serviço e integração HTTP.\n\n**Validação concluída:** GitHub Actions run 43980568753 executou `npm install`, `npm run check`, `npm test` e `npm run build` com sucesso.\n
## 10.5. Progresso da Etapa 3 — Retrieval Engine

Implementação inicial de recuperação lexical local:
- Índice SQLite FTS5 sobre o conteúdo dos chunks.
- Triggers de INSERT, UPDATE e DELETE para manter o índice sincronizado.
- Reconciliação de chunks já persistidos na inicialização.
- Endpoint autenticado `GET /v1/knowledge/search`.
- Consulta AND de termos, limite configurável e filtros por fonte/documento.
- Ranking BM25 e retorno de chunk, documento, fonte, conteúdo, offsets e hash.
- Resposta identifica explicitamente `strategy: lexical_fts5` e `semantic: false`.
- Se FTS5 não estiver disponível na build SQLite local, a API retorna 503 tipado; não mascara a indisponibilidade como busca semântica ou FTS.

**Limites:** sem embeddings, sinônimos, reranking semântico, VectorStore ou geração RAG nesta etapa.

**Validação concluída:** GitHub Actions run 43982241753 executou com sucesso npm install, npm run check, npm test e npm run build.


## 10.6. Progresso da Etapa 4 — RAG Context Builder

Implementação inicial na branch de evolução:
- Serviço knowledge/context-builder.ts desacoplado de providers.
- Seleção determinística por score BM25 ascendente.
- Deduplicação de intervalos sobrepostos por documento, mantendo offsets UTF-16.
- Orçamento configurável de caracteres e tokens estimados, com indicador truncated.
- Citações vinculadas a chunk, documento, fonte, hash e offsets do trecho efetivamente incluído.
- Endpoint autenticado POST /v1/knowledge/context, que executa retrieval lexical e monta pacote de contexto sem invocar LLM.
- Testes unitários de ranking, sobreposição, orçamento, contexto vazio, offsets e validação; teste HTTP integrado.

Limites: estimativa de tokens por ceil(chars / 4), não tokenizer real; estratégia permanece lexical (semantic: false); nenhuma geração RAG ou alegação de groundedness foi implementada.

Validação concluída: GitHub Actions run 43983137586 executou com sucesso npm install, npm run check, npm test e npm run build.


## 10.7. Progresso da Etapa 5 — Embedding Runtime inicial

Implementação na branch de evolução:
- Contrato `EmbeddingProvider` com provider, modelo, versão, dimensão e flags de simulação/semântica.
- `MockEmbeddingProvider` determinístico hash-derived, dimensão 32, marcado `simulated: true` e `semantic: false`.
- Contrato `VectorStore` e adaptador SQLite para persistência e listagem de vetores.
- Tabela `knowledge_embeddings`, com hash do chunk, proveniência, metadados do modelo e vetor serializado.
- Serviço de indexação em lotes de até 32 chunks, idempotente por chunk/provider/model/version.
- Atualização de documentos remove vetores anteriores por cascata.
- Endpoints autenticados para indexação e consulta dos vetores de um documento.
- Testes unitários de determinismo, normalização, dimensão, idempotência, isolamento e cascata; teste HTTP integrado.

**Limites:** os vetores mock não codificam semântica. Não existe similaridade vetorial, busca semântica ou modelo local real nesta entrega. Um runtime real exige avaliação separada de modelo, licença, dependências, memória, CPU e operação offline.

**Validação concluída:** GitHub Actions run 43984309560 executou com sucesso npm install, npm run check, npm test e npm run build.


## Etapa 7 — Vector Search + Hybrid Retrieval

Implementação inicial adiciona `hybrid-search-service.ts` e `POST /v1/knowledge/search/hybrid` sem alterar a busca lexical padrão.

- Consulta via `embedQuery()`, com provider semântico real obrigatório.
- Filtro estrito por projeto, provider, modelo, revisão, dimensão e flags `semantic=true` / `simulated=false`.
- Embeddings com `content_hash` divergente do chunk atual são ignorados.
- Similaridade cosseno validada sobre vetores finitos, não nulos e normalizados.
- Scan in-process limitado a 500 candidatos.
- Fusão lexical/vetorial por Reciprocal Rank Fusion (RRF), sem somar escalas BM25 e cosine.
- Sem fallback silencioso; endpoint lexical existente permanece inalterado.
- MockEmbeddingProvider continua default e é recusado no caminho semântico.

**Limitações:** o adaptador Local E5 ainda não foi testado com pesos ONNX reais; não há ANN; a busca vetorial é linear e limitada. A etapa não ativa provider local automaticamente e não altera a política de custo zero.


## Etapa 8 — RAG Pipeline inicial

Implementação inicial adiciona `rag-answer-service.ts` e o endpoint autenticado `POST /v1/knowledge/answer`.

- Pipeline: busca lexical FTS5 -> Context Builder com orçamento -> geração pelo provider resolvido no ProviderRegistry.
- Seleção de modelo opcional; modelos desconhecidos são rejeitados.
- Prompt de sistema delimita evidências, instrui não inventar fatos e exige referências `[cite_id]`.
- Conteúdo documental é tratado como dado não confiável, não como instrução.
- Resposta carrega estratégia de retrieval, indicador semântico, citações com proveniência/offset/hash, truncamento e metadados de geração.
- Sem evidências: abstenção determinística e não invoca o provider.
- Prompts/respostas não são persistidos.
- Testes unitários para evidência, citações, abstenção e limites; teste HTTP integrado.

**Limites:** retrieval RAG é lexical (`semantic: false`), não híbrido. O provider padrão é MockProvider e a resposta é marcada como simulada. Instruções de grounding não garantem correção; avaliação automática de groundedness, checagem de citações geradas e inferência local real continuam pendentes.


## Etapa 9 — Evaluation Engine inicial

Implementação inicial adiciona `evaluation-service.ts` e dois endpoints autenticados:

- `POST /v1/evaluations/retrieval`: executa datasets versionados no índice FTS5; retorna hash SHA-256 do dataset, Precision@K, Recall@K, MRR, Hit Rate@K e detalhes por caso.
- `POST /v1/evaluations/grounding`: valida associação sintática de citações, calcula citation precision e cobertura de sentenças, identifica IDs inválidos e reporta estado de abstenção.
- Datasets são versionados pelo consumidor via nome/versão e identificados por hash; não são persistidos no SQLite.
- Sem provider LLM, API paga ou chamada externa.
- Testes unitários de métricas, determinismo, dados inválidos e citações; testes HTTP dos dois endpoints.

**Limites:** avaliação de retrieval cobre FTS5 lexical apenas. Avaliação de grounding é estrutural/sintática, não prova entailment ou factualidade. Abstenção é reportada como metadado fornecido, não julgada semanticamente. O dataset usa chunk IDs da revisão atual do documento.
