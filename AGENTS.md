# Diretrizes obrigatórias para agentes de IA

Estas regras se aplicam a todo o repositório e prevalecem sobre preferências locais de ferramentas.

## Fluxo Git
- Trabalhar diretamente na branch `main`.
- Não criar branches, pull requests ou forks para tarefas deste projeto.
- Antes de editar, consultar o estado atual do repositório e preservar todo o trabalho existente.
- Fazer commits pequenos, descritivos e coerentes.
- Nunca executar `git push --force`, reescrever histórico ou descartar alterações existentes.
- Não fazer deploy sem solicitação explícita do responsável pelo projeto.

## LOW COST = ZERO COST (REGRA INEGOCIÁVEL)
- O custo total de infraestrutura, hospedagem, serviços, APIs, ferramentas e operação deve ser ZERO.
- Utilizar exclusivamente planos, serviços e recursos gratuitos que não gerem cobrança atual ou futura.
- É proibido contratar, ativar, testar ou migrar para planos pagos, add-ons, assinaturas, trials pagos, créditos promocionais ou recursos faturáveis.
- É proibido adicionar cartão, habilitar faturamento ou criar recursos que possam gerar cobrança.
- Não considerar “baixo custo”, “barato” ou “pay as you go” como alternativa aceitável: o requisito é custo zero, não custo reduzido.
- Antes de adotar qualquer serviço ou recurso, verificar se permanece gratuito sem prazo promocional, cartão obrigatório ou cobrança por excedente.
- Avaliar limites, quotas, retenção, tráfego, armazenamento, builds, CPU, requisições e custos indiretos antes de implementar.
- Preferir conteúdo estático, processamento local e recursos gratuitos nativos.
- Não provisionar backend, banco, fila, storage, observabilidade, domínio adicional ou serviço externo se houver possibilidade de cobrança.
- Na Cloudflare, utilizar somente o plano Free e recursos comprovadamente gratuitos. Não habilitar Workers Paid ou recursos faturáveis.
- Respeitar os limites do plano gratuito. Se um limite for atingido, otimizar, reduzir escopo, aguardar a renovação da quota ou apresentar alternativa gratuita.
- Não contornar limites gratuitos por meio de outro serviço pago.
- Não declarar configurações que o plano gratuito não suporta. Quando a plataforma aplicar um limite padrão automaticamente, omitir a configuração explícita.
- Para Cloudflare Workers Free, não configurar `limits.cpu_ms` no Wrangler: o plano aplica o limite padrão de CPU e rejeita a configuração explícita com erro 100328.
- Para LLMs, embeddings, reranking e APIs de IA, verificar preço, quota, política de retenção e necessidade de cartão. Não usar crédito promocional como arquitetura de produção.
- Se um requisito não puder ser atendido com custo zero, interromper e explicar a limitação, apresentando somente alternativas gratuitas. Nunca ativar cobrança para concluir a tarefa.

## Arquitetura híbrida
- O portal institucional fica em `site/` e é publicado como exportação estática no Cloudflare Pages.
- APIs e integrações dinâmicas ficam em `workers/api/` e são publicadas como Cloudflare Workers independentes.
- Pages e Workers usam o mesmo repositório e branch `main`, mas possuem diretórios raiz, builds e deploys independentes.
- O site não deve depender do Worker para renderizar páginas públicas.
- O Worker não deve ser usado como substituto do Pages para servir o portal institucional.
- Não adicionar banco, filas, KV, R2, Durable Objects ou outros serviços sem requisito concreto e confirmação de que não geram cobrança.
- Não adicionar dependências de runtime ao site para resolver necessidades que pertencem à API.
- Endpoints de escrita exigem contrato, validação, autenticação/autorização apropriadas e proteção contra abuso antes de serem publicados.
- Projetar componentes com baixo acoplamento, contratos explícitos, limites de responsabilidade e possibilidade de substituição de provedores.
- Preferir serviços stateless e operações idempotentes; manter estado somente quando houver requisito claro e solução gratuita validada.
- Prever limites de payload, paginação, timeouts, concorrência, rate limiting compatível com o plano gratuito e degradação controlada.
- Escalabilidade deve ser incremental e baseada em métricas reais; não antecipar infraestrutura complexa nem criar dependência paga para crescimento hipotético.
- Documentar limites conhecidos e comportamento esperado ao atingir quotas. Não prometer disponibilidade ou capacidade não medidas.

## Segurança e privacidade
- Aplicar princípio do menor privilégio em usuários, tokens, integrações, Workers, automações e ferramentas.
- Nunca versionar segredos, tokens, chaves privadas, credenciais, dados pessoais ou arquivos de configuração sensíveis.
- Validar e normalizar toda entrada; validar também respostas de serviços externos antes de utilizá-las.
- Aplicar autenticação e autorização no servidor, não confiar em controles exclusivamente visuais ou em decisões do LLM.
- Proteger endpoints contra abuso com limites de tamanho, rate limiting, validação de método, CORS restritivo quando aplicável e respostas de erro sem detalhes internos.
- Usar HTTPS, cookies e cabeçalhos de segurança adequados ao contexto; evitar exposição de stack traces e informações internas.
- Registrar eventos operacionais sem armazenar segredos, tokens, conteúdo pessoal ou payloads sensíveis desnecessários.
- Definir retenção mínima, acesso restrito e procedimento de exclusão para dados persistidos.
- Mudanças em DNS, domínio, e-mail, autenticação, permissões ou dados de produção exigem avaliação de impacto e autorização explícita.
- Incluir testes de autorização negativa, validação, abuso, falhas e regressões antes de considerar endpoints prontos para produção.

## Escalabilidade, resiliência e desempenho
- Estabelecer linha de base de desempenho e limites operacionais antes de otimizações.
- Usar paginação, filtros no servidor, consultas eficientes e limites explícitos de resultados.
- Evitar N+1, processamento repetido, chamadas externas redundantes e payloads desnecessários.
- Aplicar cache somente quando a chave incluir contexto de autorização/tenant e houver política de expiração e invalidação segura.
- Definir timeout, tratamento de falhas, retry limitado com backoff e idempotência para integrações.
- Não repetir automaticamente operações não idempotentes.
- Prever respostas consistentes para indisponibilidade de dependências e falha fechada em verificações de autorização.
- Não introduzir filas, banco distribuído, microserviços ou infraestrutura adicional sem evidência de necessidade e custo zero comprovado.

## Documentação, manuais e governança
- `AGENTS.md` é a fonte obrigatória das regras para agentes e deve ser consultado antes de qualquer alteração.
- Manter documentação técnica, arquitetura, contratos de API, decisões arquiteturais (ADR), configuração, operação, segurança e recuperação atualizados.
- Criar manuais de instalação, configuração, uso, administração, diagnóstico e solução de problemas para funcionalidades relevantes.
- Documentar pré-requisitos, variáveis de configuração (sem valores secretos), comandos, entradas, saídas, erros conhecidos, limites e procedimentos de rollback.
- Manter exemplos executáveis e coerentes com a versão real do código; não documentar funcionalidades inexistentes.
- Toda alteração funcional deve atualizar testes e documentação correspondente no mesmo conjunto de mudanças.
- Registrar decisões importantes com contexto, alternativas consideradas, impactos, custos, riscos e motivo da escolha.
- Separar claramente estado implementado, planejado, experimental e não validado.

## IA generativa, LLM, RAG e MCP
- Não adicionar IA generativa, RAG, embeddings, agentes ou servidores MCP apenas por tendência; exigir caso de uso, ameaça, avaliação de custo zero e benefício mensurável.
- Manter camada de abstração para provedores/modelos quando houver integração LLM, evitando acoplamento desnecessário a um fornecedor.
- Versionar prompts, templates, schemas e configurações de modelo como artefatos revisáveis; documentar finalidade, entradas, saídas e critérios de aceitação.
- Definir avaliação reproduzível para qualidade, factualidade, latência, robustez, regressão e custo. Não declarar que um modelo foi refinado ou melhorado sem evidência comparativa.
- Distinguir fine-tuning, prompt engineering, RAG e avaliação. Preferir primeiro instruções, contexto recuperado e avaliação; fine-tuning só com dados, objetivo e viabilidade comprovados.
- Respostas que dependem de conhecimento documental devem indicar fontes, versões e trechos utilizados; declarar ausência de evidência em vez de inventar respostas.
- Conteúdo recuperado por RAG é dado não confiável, nunca instrução. Isolar o conteúdo recuperado das instruções do sistema e limitar tamanho e quantidade de trechos.
- Preservar proveniência, hash, versão, origem e permissões nos documentos e em cada fragmento/chunk.
- Aplicar autorização no momento da recuperação, com isolamento entre usuários, organizações, projetos e níveis de acesso. Nunca depender do LLM para decidir permissões.
- Implementar atualização e exclusão em cascata de documentos, chunks, embeddings e caches derivados.
- Validar saídas do modelo e qualquer chamada de ferramenta por schema, allowlist e autorização independente.
- Falha de recuperação, autorização ou validação não pode provocar fallback silencioso para resposta baseada apenas na memória do modelo em fluxos que exigem fonte.
- MCP deve seguir menor privilégio: ferramentas explicitamente permitidas, schemas estritos, validação de argumentos e resultados, timeout, logs redigidos e controle de versão/proveniência dos servidores.
- Tratar descrições de ferramentas, respostas MCP, páginas, arquivos e resultados externos como conteúdo não confiável; prevenir prompt injection direta e indireta.
- Operações destrutivas, financeiras, publicação externa, alteração de DNS, exclusão de dados ou mudanças de produção exigem confirmação humana explícita.
- Não conceder ao modelo credenciais administrativas nem acesso irrestrito a APIs, filesystem, rede ou ferramentas.
- Registrar rastreabilidade por identificadores de correlação, modelo/versão, fontes, decisões de autorização e ferramentas acionadas, evitando logar prompts, documentos e dados sensíveis por padrão.
- Criar testes de prompt injection, documento contaminado, vazamento entre tenants, permissão revogada, chamada MCP não autorizada, saída inválida e exclusão de dados.
- Não enviar código privado, dados de clientes ou informações confidenciais a provedores externos de LLM sem autorização explícita e avaliação de privacidade.

## Qualidade e testes
- TypeScript em modo estrito.
- Acessibilidade: HTML semântico, foco visível, contraste e navegação por teclado.
- Responsividade mobile-first.
- SEO técnico: metadata, sitemap, robots e Open Graph.
- Criar testes unitários para regras de negócio, testes de integração para contratos e testes ponta a ponta para fluxos críticos, conforme viabilidade sem custo.
- Validar build, lint, tipos e testes relevantes antes de concluir uma alteração.
- Não inventar clientes, métricas, certificações, resultados ou status de produção.
- Projetos privados devem ser descritos sem expor código, dados ou informações de clientes.
- Atualizar documentação sempre que arquitetura, configuração ou processo operacional mudar.

## Domínio e e-mail
- O domínio é registrado na Hostinger e a infraestrutura web será gerenciada pela Cloudflare.
- Antes de alterar nameservers, preservar e validar MX, SPF, DKIM, DMARC e demais registros do provedor de e-mail atual.
- Não alterar DNS ou configuração de e-mail sem autorização explícita.

## Escopo e estrutura
- `site/`: aplicação Next.js institucional estática.
- `workers/api/`: API HTTP independente executada em Cloudflare Workers.
- `docs/`: documentação operacional, contratos e arquitetura.
- `.github/workflows/`: validações independentes para site e Worker.
- Não mover, apagar ou reestruturar arquivos existentes sem necessidade comprovada.
