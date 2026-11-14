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
- Se um requisito não puder ser atendido com custo zero, interromper a implementação e explicar a limitação, apresentando somente alternativas gratuitas. Nunca ativar cobrança para concluir a tarefa.

## Arquitetura híbrida
- O portal institucional fica em `site/` e é publicado como exportação estática no Cloudflare Pages.
- APIs e integrações dinâmicas ficam em `workers/api/` e são publicadas como Cloudflare Workers independentes.
- Pages e Workers usam o mesmo repositório e branch `main`, mas possuem diretórios raiz, builds e deploys independentes.
- O site não deve depender do Worker para renderizar páginas públicas.
- O Worker não deve ser usado como substituto do Pages para servir o portal institucional.
- Não adicionar banco, filas, KV, R2, Durable Objects ou outros serviços sem requisito concreto e confirmação de que não geram cobrança.
- Não adicionar dependências de runtime ao site para resolver necessidades que pertencem à API.
- Endpoints de escrita exigem contrato, validação, autenticação/autorização apropriadas e proteção contra abuso antes de serem publicados.

## Qualidade
- TypeScript em modo estrito.
- Acessibilidade: HTML semântico, foco visível, contraste e navegação por teclado.
- Responsividade mobile-first.
- SEO técnico: metadata, sitemap, robots e Open Graph.
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
