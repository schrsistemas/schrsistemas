# Schr AI Core — banco local 0.2

SQLite via better-sqlite3. Arquivo padrão: workers/ai-core/data/ai-core.sqlite (ignorado pelo Git).

## Tabelas
- projects: id, name, status, created_at.
- api_keys: id, project_id, key_hash, label, status, created_at.
- ai_requests: metadados operacionais de execução, estimativas de tokens, duração e idempotência; sem prompt/resposta.
- prompt_templates: templates nomeados por projeto, descrição, status e timestamps.
- prompt_template_versions: versões imutáveis de cada template, corpo, variáveis declaradas em JSON e timestamp.

## Migrações
As tabelas são criadas com `CREATE TABLE IF NOT EXISTS` durante a inicialização. A criação das tabelas de Prompt Studio não apaga nem reescreve dados anteriores.

## Privacidade e retenção
Prompts de chat, instruções e respostas não são armazenados em ai_requests. O Prompt Studio persiste explicitamente os corpos dos templates e suas variáveis porque essa é a finalidade do recurso. O render endpoint retorna o texto renderizado, mas não o grava como histórico. Não há backup automático. Para backup, parar serviço e copiar arquivo SQLite; para exclusão, parar serviço e remover arquivo e WAL/SHM.

## Limitação de autorização
A autenticação inicial usa uma chave local e o escopo de projeto é conferido nas operações. O modelo avançado de múltiplas chaves e múltiplos projetos ainda requer revisão antes de qualquer exposição pública. O serviço permanece local.
