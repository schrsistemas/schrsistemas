# Publicação na Cloudflare Pages

Este procedimento prepara a hospedagem sem transferir o registro do domínio da Hostinger.

## 1. Pré-requisitos

- Acesso ao GitHub com permissão no repositório `schrsistemas/schrsistemas`.
- Conta Cloudflare.
- Domínio `schrsistemas.com` registrado na Hostinger.
- Confirmação do provedor atual de e-mail antes de qualquer alteração DNS.

## 2. Importar o repositório para Cloudflare Pages

No painel Cloudflare:

1. Abrir **Workers & Pages**.
2. Selecionar **Create application** e depois **Pages**.
3. Escolher **Connect to Git**.
4. Autorizar o GitHub e selecionar `schrsistemas/schrsistemas`.
5. Configurar:

| Campo | Valor |
|---|---|
| Production branch | `main` |
| Root directory | `site` |
| Framework preset | Next.js (Static HTML Export) |
| Build command | `npm run build` |
| Build output directory | `out` |
| Node.js | `22` |

6. Salvar e iniciar o primeiro build.
7. Validar a URL temporária `*.pages.dev` antes de vincular o domínio próprio.

Cada commit na branch `main` iniciará um novo build e publicação conforme a integração do Pages.

## 3. Vincular domínio próprio

No projeto Pages:

1. Abrir **Custom domains**.
2. Adicionar `schrsistemas.com`.
3. Seguir a validação apresentada pela Cloudflare.
4. Adicionar também `www.schrsistemas.com`, se desejar.
5. Definir o domínio principal e configurar redirecionamento de `www` para o domínio raiz (ou o inverso) usando regra de redirecionamento.

Não criar registros DNS manualmente com valores presumidos. Utilizar exatamente os destinos apresentados no painel Cloudflare Pages.

## 4. DNS e preservação do e-mail

O domínio permanece registrado na Hostinger. A Cloudflare pode assumir o DNS autoritativo por meio da troca de nameservers, mas isso é uma etapa separada da criação do site.

Antes de trocar nameservers:

1. Exportar ou registrar todos os registros DNS atuais.
2. Identificar o provedor de e-mail efetivamente utilizado.
3. Copiar os registros MX.
4. Copiar os registros TXT de SPF e verificações de domínio.
5. Copiar os seletores DKIM e o registro DMARC.
6. Copiar quaisquer registros de serviços existentes (por exemplo, autodiscover, webmail ou validações).
7. Conferir os registros importados no painel Cloudflare.
8. Só então alterar os nameservers na Hostinger para os dois nameservers exatos fornecidos pela Cloudflare.

**Não remover nem substituir registros de e-mail.** A opção de proxy deve ficar desativada (DNS only) nos registros MX e nos nomes de host usados pelo provedor de e-mail.

Se houver dúvida sobre um registro, não fazer a troca até confirmar sua finalidade com o provedor atual.

## 5. SSL/TLS

Após a ativação do domínio na Cloudflare:

- utilizar certificado gerenciado pela Cloudflare;
- preferir modo **Full (strict)** quando o destino de origem suportar certificado válido;
- habilitar redirecionamento HTTPS;
- testar domínio raiz e `www`;
- validar ausência de conteúdo misto.

Como Pages é hospedagem gerenciada, seguir o modo SSL recomendado no painel para o domínio conectado.

## 6. Checklist pós-publicação

- [ ] URL `pages.dev` abre corretamente.
- [ ] Domínio raiz abre em HTTPS.
- [ ] `www` redireciona para o domínio principal.
- [ ] Rotas Sobre, Projetos, Currículo e Contato funcionam.
- [ ] `/sitemap.xml` responde.
- [ ] `/robots.txt` responde.
- [ ] Manifesto PWA está acessível.
- [ ] Teste em celular e desktop concluído.
- [ ] E-mail continua enviando e recebendo.
- [ ] Registros MX, SPF, DKIM e DMARC continuam presentes.

## Estado atual

A configuração de aplicação e os arquivos de build estão no repositório. A criação do projeto Pages, a autorização GitHub/Cloudflare, a validação de domínio e a troca de nameservers exigem acesso aos respectivos painéis e ainda precisam ser executadas.

## 7. Limites relevantes do plano gratuito

Conforme a documentação oficial consultada em novembro de 2026:

- Até 500 builds por mês.
- Um build simultâneo por conta.
- Até 100 domínios personalizados por projeto.
- Até 20.000 arquivos por site.
- Tamanho máximo de 25 MiB por arquivo.
- Requisições a arquivos estáticos são gratuitas e ilimitadas.

O portal institucional, sem Functions, banco de dados ou processamento por requisição, foi dimensionado para permanecer dentro desse modelo. Limites e condições comerciais podem mudar; revisar a página oficial antes de ampliar a infraestrutura.

Referências:
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/functions/pricing/
