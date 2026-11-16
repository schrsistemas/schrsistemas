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
