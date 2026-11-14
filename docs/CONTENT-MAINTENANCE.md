# Manutenção do conteúdo público

## Princípios editoriais

- Não publicar nomes de clientes, dados operacionais ou informações protegidas por contrato.
- Não afirmar que um produto está em produção quando estiver em desenvolvimento.
- Não inventar métricas, resultados, certificações ou períodos de experiência.
- Manter a distinção entre experiência profissional, projetos autorais e laboratórios.
- Atualizar o status dos projetos quando houver mudança verificável.

## Onde alterar

| Conteúdo | Arquivo |
|---|---|
| Landing page | `site/app/page.tsx` |
| Sobre | `site/app/sobre/page.tsx` |
| Projetos | `site/app/projetos/page.tsx` |
| Currículo | `site/app/curriculo/page.tsx` |
| Contato | `site/app/contato/page.tsx` |
| Navegação | `site/components/site-header.tsx` |
| Rodapé | `site/components/site-footer.tsx` |
| Estilo global | `site/app/globals.css` |
| SEO global | `site/app/layout.tsx` |

## Publicação

1. Fazer alterações diretamente na branch `main`.
2. Executar `cd site && npm install`.
3. Executar `npm run lint`.
4. Executar `npm run build`.
5. Conferir o resultado em `site/out`.
6. Commitar alterações com mensagem objetiva.
7. A integração Cloudflare Pages publicará após o push, quando estiver configurada.

## Dados de contato

Os canais públicos atualmente definidos são e-mail, WhatsApp, LinkedIn e GitHub. Alterar os links somente após confirmação do responsável.
