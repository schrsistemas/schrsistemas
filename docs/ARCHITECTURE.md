# Arquitetura — Portal Schr Sistemas

## Objetivo

Manter um portal institucional híbrido: apresentação da marca Schr Sistemas e portfólio/currículo profissional de Daniel Schroeder.

## Princípios

1. Custo operacional adicional zero sempre que possível.
2. Conteúdo público estático por padrão.
3. Preservar o histórico e os arquivos existentes do repositório.
4. Trabalhar diretamente na branch `main`.
5. Evitar backend e banco de dados enquanto não houver requisito real.
6. Não publicar informações confidenciais de clientes ou sistemas privados.

## Componentes

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| UI | Next.js App Router + TypeScript | Rotas e renderização estática |
| Componentes | Material UI 9 | Base de componentes e integração CSS |
| Estilos | CSS responsivo próprio | Identidade visual light |
| Repositório | GitHub | Versionamento e histórico |
| Build | Next.js static export | Geração dos arquivos HTML/CSS/JS |
| Hosting | Cloudflare Pages | Distribuição do site |
| DNS/CDN | Cloudflare | DNS, TLS e rede de distribuição |
| Registro | Hostinger | Registro e renovação do domínio |

## Rotas públicas

- `/`: landing page institucional.
- `/sobre/`: marca e trajetória profissional.
- `/projetos/`: produtos e iniciativas.
- `/curriculo/`: resumo profissional e competências.
- `/contato/`: canais de contato.

## Estratégia de renderização

O site usa `output: "export"` e `trailingSlash: true`. O comando `next build` produz a pasta `site/out`, que pode ser servida como conteúdo estático.

Não há banco de dados, servidor de aplicação, API ou função paga na primeira versão. Os contatos usam links diretos de e-mail, WhatsApp, LinkedIn e GitHub.

## Evolução planejada

Adicionar recursos dinâmicos apenas quando houver necessidade:
- formulário com envio real: avaliar Worker e serviço de e-mail gratuito;
- conteúdo editorial: avaliar arquivos Markdown estáticos;
- painel de atualização: avaliar CMS gratuito antes de criar backend próprio;
- métricas: priorizar analytics com plano gratuito e política de privacidade adequada.

## Segurança e privacidade

- Nunca versionar tokens, chaves, senhas ou arquivos de ambiente.
- Não expor dados de clientes, capturas internas ou credenciais.
- O contato por e-mail deve permanecer no provedor atual.
- Alterações DNS devem preservar MX, SPF, DKIM e DMARC.
