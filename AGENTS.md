# Diretrizes obrigatórias para agentes de IA

Estas regras se aplicam a todo o repositório e prevalecem sobre preferências locais de ferramentas.

## Fluxo Git
- Trabalhar diretamente na branch `main`.
- Não criar branches, pull requests ou forks para tarefas deste projeto.
- Antes de editar, consultar o estado atual do repositório e preservar todo o trabalho existente.
- Fazer commits pequenos, descritivos e coerentes.
- Nunca executar `git push --force`, reescrever histórico ou descartar alterações existentes.
- Não fazer deploy sem solicitação explícita do responsável pelo projeto.

## Custo zero como requisito
- Priorizar serviços, bibliotecas e planos gratuitos.
- Não contratar serviços, habilitar planos pagos ou criar recursos que possam gerar cobrança.
- Antes de adicionar qualquer serviço externo, documentar alternativa gratuita e limites do plano.
- Não introduzir banco de dados, backend ou processamento remoto quando conteúdo estático resolver o requisito.
- Não depender de trial, crédito promocional ou serviço que exija cartão para manter o site no ar.
- Antes de habilitar produtos adicionais da Cloudflare, conferir limites e cobrança do plano Free.

## Arquitetura híbrida
- O portal institucional fica em `site/` e é publicado como exportação estática no Cloudflare Pages.
- APIs e integrações dinâmicas ficam em `workers/api/` e são publicadas como Cloudflare Workers independentes.
- Pages e Workers usam o mesmo repositório e branch `main`, mas possuem diretórios raiz, builds e deploys independentes.
- O site não deve depender do Worker para renderizar páginas públicas.
- O Worker não deve ser usado como substituto do Pages para servir o portal institucional.
- Não adicionar banco, filas, KV, R2, Durable Objects ou outros serviços sem requisito concreto, análise de limites/custos e autorização.
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
