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

## Arquitetura do portal
- O portal institucional deve permanecer estático sempre que possível.
- Next.js com App Router e exportação estática em `site/out`.
- Hospedagem inicial: Cloudflare Pages, build na branch `main`.
- Não ativar recursos Next.js incompatíveis com exportação estática sem revisar a arquitetura.
- Não armazenar segredos, tokens, credenciais ou dados privados no repositório.

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

## Escopo inicial
- O diretório `site/` contém a aplicação web.
- O diretório `docs/` contém documentação operacional e arquitetural.
- Não mover, apagar ou reestruturar os arquivos existentes sem necessidade comprovada.
