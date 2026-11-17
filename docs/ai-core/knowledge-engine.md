# Schr AI Core — Knowledge Engine local

## Escopo da primeira versão

O Knowledge Engine registra fontes, ingere conteúdo textual e Markdown enviado pela API, normaliza o texto, calcula SHA-256 e cria chunks determinísticos com offsets rastreáveis. A implementação é local e não chama serviços externos.

Formatos aceitos nesta etapa: `text` e `markdown`. PDF, DOCX, HTML, OCR, embeddings, busca vetorial e recuperação semântica não fazem parte desta entrega.

## Limites

- Corpo HTTP: limite global configurado em `MAX_REQUEST_BYTES` (padrão 32 KiB).
- Conteúdo documental: até 200.000 caracteres por documento.
- Título: 1 a 240 caracteres.
- Nome de fonte: 1 a 120 caracteres.
- Identificador externo opcional: 1 a 200 caracteres.
- Chunk alvo: 1.200 unidades UTF-16, com sobreposição de 150 unidades.
- Antes do corte, o chunker tenta respeitar uma quebra de linha quando ela estiver depois de 60% do tamanho-alvo.
- Offsets são índices de string JavaScript (unidades UTF-16), com início inclusivo e fim exclusivo.
- Normalização: CRLF/CR para LF, remoção de NUL e Unicode NFC.

O tamanho máximo efetivo do POST também é limitado por `MAX_REQUEST_BYTES`, portanto pode ser menor que o limite de conteúdo do serviço.

## API

Todas as rotas exigem `X-API-Key`.

### Criar fonte

`POST /v1/knowledge/sources`

```json
{
  "name": "Manual técnico",
  "description": "Documentação local"
}
```

### Listar fontes

`GET /v1/knowledge/sources`

Retorna fontes do projeto autenticado e a contagem de documentos.

### Ingerir documento

`POST /v1/knowledge/documents`

```json
{
  "source_id": "ks_...",
  "external_id": "manual-v1",
  "title": "Manual",
  "format": "markdown",
  "content": "# Título\\nConteúdo..."
}
```

`format` aceita `text` ou `markdown`; se omitido, assume `text`. O `external_id` permite atualizar uma representação documental já importada. Uma alteração cria nova versão no mesmo identificador lógico e substitui seus chunks em transação.

A mesma combinação de fonte e hash de conteúdo normalizado é idempotente: a API retorna o documento existente com `duplicate: true` e `processed: false`, sem criar nova versão.

### Listar documentos

`GET /v1/knowledge/documents`

Opcionalmente filtrar por `source_id`.

### Consultar documento e chunks

`GET /v1/knowledge/documents/{id}`

Retorna conteúdo normalizado, hash, versão, metadados e chunks ordenados por índice. O endpoint respeita o isolamento por projeto.

## Persistência

- `knowledge_sources`: fontes documentais pertencentes a um projeto.
- `knowledge_documents`: conteúdo normalizado, formato, hash, versão e identificador externo opcional.
- `knowledge_chunks`: segmentos com índice, offsets, hash e vínculos de origem.

As chaves estrangeiras são habilitadas na conexão SQLite. A substituição de chunks e a atualização do documento ocorrem dentro de uma transação.

## Idempotência e versões

- Sem `external_id`: conteúdo idêntico na mesma fonte retorna o documento já existente.
- Com `external_id`: conteúdo idêntico também retorna o existente; conteúdo alterado atualiza o mesmo documento e incrementa `version`.
- O hash é SHA-256 do texto após normalização.
- Cada chunk possui SHA-256 próprio.
- A versão atual do documento é mantida; histórico completo de versões e conteúdo anterior não é arquivado nesta etapa.

## Segurança e privacidade

O conteúdo documental é persistido intencionalmente no banco local. O isolamento é aplicado por projeto em todas as consultas de serviço. Não existe upload de arquivo nem resolução de caminhos de filesystem nesta etapa. Não há busca semântica nem chamada a provider LLM.

## Testes

A suíte cobre criação de fontes, chunking/offsets, hash, idempotência, atualização por identificador externo, isolamento entre projetos, validação de formato/conteúdo e rotas HTTP.

## Busca lexical local (Retrieval Engine inicial)

O índice FTS5 é criado quando a biblioteca SQLite efetivamente oferece o módulo FTS5. A tabela `knowledge_chunks_fts` indexa conteúdo de chunks e mantém sincronização por triggers de INSERT, UPDATE e DELETE. Uma rotina de reconciliação inicial adiciona chunks existentes que ainda não estejam no índice.

### GET /v1/knowledge/search

Autenticado. Parâmetros:
- `q`: obrigatório, 2-200 caracteres. Termos são tokenizados e combinados com AND.
- `source_id`: opcional; restringe a uma fonte do projeto autenticado.
- `document_id`: opcional; restringe a um documento do projeto autenticado.
- `limit`: opcional, inteiro de 1 a 50 (padrão 10).

Exemplo: `GET /v1/knowledge/search?q=manutenção%20motor&limit=10`

A resposta identifica `strategy: lexical_fts5` e `semantic: false`. Cada resultado contém identificadores de chunk, documento e fonte, título, nome da fonte, conteúdo, offsets, hash e score BM25. O score é uma ordenação lexical do FTS5, não uma probabilidade nem uma medida semântica.

Se FTS5 não estiver disponível na compilação SQLite local, a rota retorna `KNOWLEDGE_SEARCH_UNAVAILABLE` (503). Não há fallback silencioso que apresente busca simples como FTS5.

A consulta combina todos os termos encontrados; não implementa expansão de sinônimos, embeddings, reranking semântico ou RAG.


## Context Builder — pacote RAG sem geração

O endpoint autenticado POST /v1/knowledge/context combina a recuperação lexical FTS5 com a montagem determinística de contexto. Não executa LLM.

- Ordena resultados pelo score BM25 ascendente e aplica limite de resultados.
- Remove intervalos já cobertos de chunks do mesmo documento, preservando offsets UTF-16 da origem.
- Aplica orçamento de caracteres e de tokens estimados; um segmento pode ser truncado para caber no orçamento.
- Retorna referências com IDs de chunk/documento/fonte, título, nome da fonte, hash e offsets exatos do segmento incluído.
- Identifica estratégia como lexical_fts5_context e semantic: false.
- Estima tokens como ceil(context_utf16_chars / 4); é uma aproximação operacional, não tokenizer de modelo.

O pacote de contexto é evidência de quais trechos foram selecionados, não prova de que uma resposta gerada por modelo esteja correta. A geração RAG e a validação de groundedness permanecem fora desta etapa.


## Embedding Runtime — estado inicial

O contrato `EmbeddingProvider` declara provider, modelo, versão, dimensão e flags `simulated`/`semantic`. O `MockEmbeddingProvider` gera vetores determinísticos derivados de hash para validar o pipeline, com dimensão 32; esses vetores não representam significado semântico.

O contrato `VectorStore` e o adaptador `SqliteVectorStore` persistem e listam vetores com metadados e proveniência. O serviço indexa chunks em lotes de até 32 e é idempotente por chunk/provider/model/version. Atualizações de documentos removem embeddings antigos via integridade referencial.

Rotas autenticadas: `POST /v1/knowledge/embeddings/index` e `GET /v1/knowledge/embeddings?document_id=...`.

**Limites:** ainda não existe busca por similaridade, ranking vetorial, embedding real ou recuperação semântica. O mock é explicitamente identificado e não pode ser interpretado como embedding útil para busca.


## Local E5 Embedding Provider — adaptador inicial

Foi adicionado `LocalE5EmbeddingProvider`, baseado em Transformers.js 3.8.1 e ONNX Runtime em CPU.

- Modelo: `intfloat/multilingual-e5-small`, dimensão esperada de 384.
- `embed(texts)` aplica o prefixo `passage: ` para indexação documental.
- `embedQuery(texts)` aplica `query: ` para consultas.
- Usa pooling `mean` e normalização L2 do pipeline de feature extraction.
- Executa em `device: cpu`, `dtype: fp32`.
- Define `env.allowRemoteModels = false`; não baixa arquivos durante inferência.
- O diretório local deve conter `intfloat/multilingual-e5-small/` com configuração, tokenizer e artefatos ONNX compatíveis.
- O carregamento do runtime/modelo é lazy e só acontece na primeira inferência.
- A versão do modelo é exigida no construtor para registrar proveniência.

Exemplo de composição manual:

```ts
const provider = new LocalE5EmbeddingProvider({
  modelsPath: process.env.LOCAL_MODELS_PATH ?? "./models",
  modelVersion: process.env.LOCAL_E5_MODEL_REVISION ?? "UNVERIFIED_LOCAL_REVISION"
});
```

O exemplo demonstra a configuração do adaptador, não instala pesos. Antes de uso real, deve-se obter uma revisão imutável do modelo, verificar checksums e manter os arquivos localmente. O servidor continua usando MockEmbeddingProvider por padrão; o adaptador ainda não foi conectado à composição principal.

**Estado de validação:** os testes automatizados usam runtime injetado e tensor sintético para verificar contrato, prefixos, formato, dimensão, normalização e bloqueio de acesso remoto. Isso não valida inferência ONNX real nem substitui benchmark de CPU/RAM. A prova com os pesos oficiais continua pendente.


## Vector Search + Hybrid Retrieval — etapa 7

O serviço `hybrid-search-service.ts` integra a consulta vetorial com FTS5 sem alterar o endpoint lexical existente. A consulta vetorial usa `embedQuery()` e só aceita providers com `semantic: true` e `simulated: false`. O modelo e a revisão precisam coincidir exatamente com os metadados persistidos.

A consulta SQL filtra sempre `project_id`, provider, modelo, versão, dimensão, flags e `content_hash` atual do chunk. Assim, vetores antigos após reprocessamento documental não participam da recuperação. JSON inválido, dimensão incorreta, NaN/Infinity, vetor zero ou norma fora da tolerância são tratados como dados corrompidos, sem ranking silenciosamente incorreto.

A busca inicial calcula similaridade cosseno em memória, limitada por `candidate_limit` de 1 a 500. O ranking lexical FTS5 e o vetorial são combinados por Reciprocal Rank Fusion: `1/(k + rank)` para cada canal, com `k=60` padrão. Não se somam diretamente BM25 e cosseno porque suas escalas são incompatíveis.

A rota `POST /v1/knowledge/search/hybrid` é explícita. A busca lexical `GET /v1/knowledge/search` mantém o comportamento anterior. Não existe fallback silencioso se FTS5 ou o provider semântico estiver indisponível. O provider default permanece MockEmbeddingProvider; portanto a recuperação híbrida real depende da injeção de LocalE5EmbeddingProvider e da indexação com pesos ONNX locais verificados.

**Limitação operacional:** o limite de 500 candidatos controla memória e custo de CPU, mas o scan é linear e não substitui um índice vetorial ANN. Em bases maiores será necessária uma estratégia ANN local ou particionamento/paginação cuidadosamente projetado.


## RAG Answer Pipeline — etapa 8

O serviço `rag-answer-service.ts` coordena retrieval lexical FTS5, montagem de contexto pelo Context Builder e geração pelo provider resolvido no ProviderRegistry. O endpoint é `POST /v1/knowledge/answer`.

O prompt de geração delimita o contexto, exige fundamentação nas evidências recuperadas, proíbe tratar instruções nos documentos como comandos e solicita referências no formato `[cite_id]`. A resposta inclui as citações recuperadas com IDs de chunk/documento/fonte, offsets e hash, além de estratégia e metadados do provider.

Se não houver chunks/citações, o pipeline retorna `abstained: true` e `NO_RETRIEVED_EVIDENCE`, sem chamar o gerador. Não persiste prompt ou resposta. O provider padrão segue sendo MockProvider, claramente marcado `generation.simulated: true`.

**Limitações:** retrieval do endpoint RAG é lexical, não híbrido; o Context Builder estima tokens por caracteres; instruções de grounding são orientação ao modelo e não constituem prova automática de factualidade. A etapa não implementa avaliador automático de groundedness nem validação semântica das citações emitidas pelo modelo.


## Evaluation Engine

A avaliação local está disponível em `evaluation-service.ts`:

- Retrieval evaluation executa cada query do dataset no FTS5 atual e compara os chunk IDs retornados com os IDs relevantes esperados.
- Métricas macro por caso: Precision@K (hits/K), Recall@K (hits/quantidade relevante), MRR e Hit Rate@K.
- Cada execução retorna nome/versão do dataset e SHA-256 do payload canônico, incluindo parâmetros e casos, para reprodutibilidade.
- Grounding evaluation verifica se referências sintáticas da resposta pertencem à lista de citações disponibilizadas e calcula citation precision e sentence-level citation coverage.
- Estado de abstenção é reportado como metadado de entrada.

Não há inferência por LLM nem dependência externa. O dataset não é persistido; o chamador mantém as versões e fornece o conteúdo em cada execução. A avaliação de grounding é estrutural: não verifica entailment, relevância semântica ou verdade factual. Retrieval continua lexical (`semantic: false`).
