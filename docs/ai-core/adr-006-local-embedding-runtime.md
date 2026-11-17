# ADR-006 — Runtime local de embeddings semânticos

- **Status:** Proposta técnica para prova de conceito
- **Etapa:** 6 — Local Embedding Provider
- **Data:** 2026-11-16

## Contexto

O AI Core possui o contrato `EmbeddingProvider`, persistência SQLite e um `MockEmbeddingProvider`. O mock é hash-derived, declara `simulated=true` e `semantic=false`; portanto, não pode sustentar recuperação semântica.

A etapa precisa introduzir embeddings reais sem API remota, sem cobrança e sem tornar o runtime local obrigatório para iniciar o servidor.

## Candidato selecionado para PoC

**Modelo:** `intfloat/multilingual-e5-small`

- Modelo multilíngue com suporte declarado a 94 idiomas.
- Licença declarada pelo repositório oficial: MIT.
- O repositório oficial publica pesos ONNX; o arquivo `onnx/model.onnx` está listado com aproximadamente 470 MB.
- O tokenizer ONNX publicado inclui `tokenizer.json`, listado com aproximadamente 17,1 MB.
- Fonte oficial: https://huggingface.co/intfloat/multilingual-e5-small
- Artefato ONNX: https://huggingface.co/intfloat/multilingual-e5-small/blob/main/onnx/model.onnx

A referência `main` é mutável. Uma implementação deverá fixar um commit imutável e registrar hashes SHA-256 dos arquivos utilizados. Não baixar artefatos a partir de `main` em produção.

## Runtime candidato

**ONNX Runtime para Node.js, CPU**, encapsulado por um adaptador `EmbeddingProvider`.

A documentação oficial lista suporte CPU pré-compilado para Windows x64/arm64, Linux x64/arm64 e macOS x64/arm64, e compatibilidade com Node.js 16+ (recomendado Node 20+). O projeto exige Node.js 22.13+, portanto a versão de Node não é o bloqueio conhecido.

- Documentação: https://onnxruntime.ai/docs/get-started/with-javascript/node.html
- Binding: https://github.com/microsoft/onnxruntime/tree/main/js/node

A biblioteca `@huggingface/transformers` é uma alternativa de maior nível para tokenização e execução ONNX em JavaScript. Antes de escolhê-la, comparar dependências transitivas, tamanho instalado, suporte ao carregamento exclusivamente local e controle sobre a versão dos artefatos.

## Decisões de arquitetura

1. O provider real será opt-in por configuração explícita; o default do AI Core continuará sendo o mock.
2. O modelo e tokenizer deverão existir em diretório local configurado. Inicialização não fará download.
3. O adaptador deverá validar presença, integridade, dimensão e saída numérica dos artefatos.
4. O runtime deverá ser lazy-loaded: ausência de modelo não pode impedir o servidor de iniciar quando o provider real não foi selecionado.
5. O descriptor deverá informar `simulated=false` e `semantic=true` somente após execução real validada.
6. O mesmo provider/model/model_version deverá ser usado para indexação de documentos e embedding da consulta.
7. A implementação deverá aplicar as convenções E5 para prefixar entradas de consulta e passagens/documentos conforme a model card. Não tratar texto cru de consulta e texto de documento como equivalentes sem validar o contrato do modelo.
8. Vetores mock existentes nunca poderão participar de busca semântica.
9. Nenhuma chamada a serviço remoto de inferência será adicionada.
10. A busca vetorial inicial poderá calcular cosine similarity em processo, com filtros por projeto, modelo, versão, dimensão e `semantic=true`; limites e paginação serão obrigatórios.

## Riscos e verificações pendentes

- **Memória:** o arquivo ONNX tem cerca de 470 MB; isso não representa o pico total de RAM. Pesos carregados, tokenizer, buffers e tensores aumentam o consumo.
- **CPU/latência:** não há benchmark medido neste repositório. Não publicar estimativas de latência ou RAM antes de executar em hardware-alvo.
- **Tokenização:** verificar os inputs exigidos pelo grafo ONNX, tipos, padding, truncamento e pooling. A saída do Transformer não é automaticamente um embedding de sentença; pooling e normalização precisam seguir a model card.
- **Licenças:** confirmar licença e avisos de cada dependência/runtime e manter atribuição do modelo MIT.
- **Empacotamento:** não adicionar pesos ao Git. Documentar instalação local e checksum.
- **Portabilidade:** testar pelo menos Windows x64 e Linux x64 antes de declarar suporte geral.

## Plano de prova de conceito

1. Fixar uma revisão do modelo e registrar hashes dos arquivos ONNX/tokenizer/config.
2. Validar licença e dependências do runtime escolhido.
3. Implementar um script isolado de smoke test, fora do caminho padrão do servidor.
4. Executar embeddings em português para textos semanticamente próximos e não relacionados.
5. Validar dimensão, finitude, norma, determinismo aproximado e similaridade cosseno.
6. Medir tempo de carregamento, latência por lote e memória em hardware identificado.
7. Só então integrar o provider ao contrato existente e criar testes automatizados com artefatos pequenos/fixtures, mantendo o teste de modelo real como opt-in.

## Critérios de aceite

- Sem rede durante a inferência depois da instalação local dos artefatos.
- Sem download automático durante instalação ou inicialização.
- Saída real validada com dimensão e pooling documentados.
- Provider identificado inequivocamente como semântico e não simulado.
- Isolamento por projeto e separação rígida de vetores mock.
- Testes de contrato, integração e falhas de artefato.
- Benchmark reproduzível com hardware, versão do runtime e revisão do modelo.
- CI padrão continua sem baixar o modelo de centenas de MB.

## Estado

Esta ADR seleciona um candidato para PoC; **não declara o provider real implementado nem validado**. A implementação depende da prova local de tokenização, pooling, inferência, licença e consumo de recursos.
