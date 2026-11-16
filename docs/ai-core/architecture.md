# Schr AI Core — arquitetura 0.1

## Estado
Protótipo local. MockProvider habilitado. Adaptador OpenAI presente, mas bloqueado. Não publicado e não conectado ao Worker existente.

## Componentes
- HTTP server: Node.js nativo.
- Contrato LlmProvider substituível.
- MockProvider: saída determinística e estimativa local de tokens.
- OpenAIProvider: adaptador reservado; sempre rejeita execução e não realiza HTTP.
- SQLite local: projetos, hashes de chaves e métricas operacionais.

## Limites
- Um projeto local configurado na inicialização.
- Autenticação por X-API-Key.
- Rate limit em memória por chave; reiniciar processo zera janela.
- Corpo padrão máximo 32 KiB.
- Entrada até 12.000 caracteres; instruções até 4.000.
- Sem RAG, embeddings, agentes, streaming ou chamadas de ferramentas.
- SQLite local sem backup automático ou replicação.

## Segurança
- Chave armazenada somente como SHA-256.
- Sem logs de prompts, respostas ou segredos.
- Bind padrão em 127.0.0.1.
- OpenAI bloqueado no código, independente de variáveis de ambiente.
- Não expor diretamente à internet sem TLS, rate limit distribuído, isolamento e testes adicionais.
