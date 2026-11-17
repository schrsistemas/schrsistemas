# Schr AI Core — banco local 0.2

SQLite via better-sqlite3. Arquivo padrão: workers/ai-core/data/ai-core.sqlite (ignorado pelo Git).

## Tabelas
- projects: id, name, status, created_at.
- api_keys: id, project_id, key_hash, label, status, created_at.
- ai_requests: metadados operacionais de execução, estimativas de tokens, duração e idempotência; sem prompt/resposta.
- prompt_templates: templates nomeados por projeto, descrição, status e timestamps.
- prompt_template_versions: versões imutáveis de cada template, corpo, variáveis declaradas em JSON e timestamp.
- knowledge_sources: fontes documentais isoladas por projeto.
- knowledge_documents: texto normalizado, formato, SHA-256, versão e identificador externo opcional.
- knowledge_chunks: segmentos com índice, offsets UTF-16, hash e vínculos de origem.
- knowledge_chunks_fts: índice lexical FTS5 de chunks, com sincronização por triggers; criado apenas quando FTS5 está disponível no SQLite local.

## Migrações
As tabelas são criadas com `CREATE TABLE IF NOT EXISTS` durante a inicialização. A criação das tabelas de Prompt Studio e Knowledge Engine não apaga nem reescreve dados anteriores.

## Privacidade e retenção
Prompts de chat, instruções e respostas não são armazenados em ai_requests. O Prompt Studio persiste explicitamente os corpos dos templates e suas variáveis porque essa é a finalidade do recurso. O Knowledge Engine persiste intencionalmente documentos ingeridos e seus chunks. O render endpoint retorna o texto renderizado, mas não o grava como histórico. Não há backup automático. Para backup, parar serviço e copiar arquivo SQLite; para exclusão, parar serviço e remover arquivo e WAL/SHM.

## Limitação de autorização
A autenticação inicial usa uma chave local e o escopo de projeto é conferido nas operações. O modelo avançado de múltiplas chaves e múltiplos projetos ainda requer revisão antes de qualquer exposição pública. O serviço permanece local.

- knowledge_embeddings: vetores por chunk, projeto, fonte/documento, hash de conteúdo, provider/modelo/versão, dimensão, flags simulated/semantic e JSON do vetor. Chaves únicas por chunk/provider/model/version; índices são removidos por cascata quando o chunk/documento é removido.

A tabela de embeddings é criada de forma aditiva com `CREATE TABLE IF NOT EXISTS`; não altera documentos ou chunks existentes. Vetores armazenados pelo MockEmbeddingProvider são sintéticos e marcados `simulated=1`, `semantic=0`.
