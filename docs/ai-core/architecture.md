# Schr AI Core — arquitetura 0.2

## Estado
Gateway local em evolução. MockProvider habilitado por meio de um registry injetável. Adaptador OpenAI presente, mas bloqueado e não registrado. Não publicado e não conectado ao Worker existente.

## Componentes
- HTTP server: Node.js nativo.
- `ProviderRegistry`: registro explícito de modelos/providers habilitados, seleção do modelo padrão e resolução por ID.
- `createDefaultProviderRegistry`: composição local que registra exclusivamente `schr-mock-v1`.
- `MockProvider`: saída determinística e estimativa local de tokens.
- `OpenAIProvider`: adaptador reservado; sempre rejeita execução e não realiza HTTP.
- SQLite local: projetos, hashes de chaves e métricas operacionais.

## Composição e extensão
`createAiCoreServer` aceita opcionalmente um `ProviderRegistry`. Isso permite injetar implementações em testes e composições locais futuras sem instanciar providers dentro do handler HTTP. Sem injeção, utiliza a composição padrão com somente MockProvider.

O registry não descobre providers automaticamente: um provider só pode ser selecionado se for explicitamente registrado. IDs desconhecidos retornam `MODEL_NOT_AVAILABLE`.

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
