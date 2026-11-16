# Schr AI Core — banco local 0.1

SQLite via better-sqlite3. Arquivo padrão: workers/ai-core/data/ai-core.sqlite (ignorado pelo Git).

## Tabelas
- projects: id, name, status, created_at.
- api_keys: id, project_id, key_hash, label, status, created_at.
- ai_requests: id, project_id, provider, model, status, input_tokens, output_tokens, total_tokens, duration_ms, idempotency_key, created_at.

## Privacidade e retenção
Não armazena prompts, instruções ou respostas. Guarda apenas metadados operacionais e estimativas de tokens. Não há backup automático. Para backup, parar serviço e copiar arquivo SQLite; para exclusão, parar serviço e remover arquivo e WAL/SHM.

## Limitação de autorização
A autenticação inicial usa uma chave local, mas a autorização multi-projeto por chave ainda não está implementada. O serviço é exclusivamente local e não deve ser publicado como multi-tenant até que a autorização de projeto seja vinculada à chave autenticada.
