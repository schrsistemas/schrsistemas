# Daniel Schroeder — Schr Sistemas

**Analista Desenvolvedor | Engenharia de Software | ERP | Integrações | Automação**

Desenvolvimento e evolução de sistemas empresariais, integrações fiscais e soluções digitais. Atuação prática em ambientes de produção, com foco em confiabilidade, diagnóstico técnico e resolução de problemas de negócio.

🌐 **Portal:** https://schrsistemas.com  
🔌 **API:** https://api.schrsistemas.com  
💻 **Código-fonte da plataforma:** [schrsistemas-platform](https://github.com/schrsistemas/schrsistemas-platform)

---

## Áreas de atuação

- Sistemas ERP, automação comercial e aplicações desktop.
- Integrações fiscais brasileiras: NF-e, NFC-e e CT-e.
- APIs REST, integração entre serviços e automação de processos.
- Banco de dados, modelagem SQL, manutenção e migração.
- Aplicações web, PWA e soluções mobile.
- IoT, sensores, telemetria e comunicação com dispositivos.

## Stack técnica

| Área | Tecnologias |
|---|---|
| Desktop / ERP | Delphi, FireDAC |
| Bancos de dados | Firebird, SQL |
| Backend | Node.js, TypeScript, PHP, Python |
| Web | React, Next.js, Vue |
| Mobile | Java / Android |
| Cloud e APIs | Cloudflare Workers, Cloudflare Pages, REST |
| IoT e hardware | ESP32, Arduino, sensores |

## Projetos e portfólio

Os projetos e iniciativas públicas são apresentados no portal institucional:

**https://schrsistemas.com/projetos/**

O portfólio é atualizado conforme os projetos atingem estágios adequados para divulgação. Sistemas de clientes e projetos privados não são expostos por razões de confidencialidade.

## Arquitetura da plataforma

O código-fonte e a documentação técnica estão centralizados no repositório privado:

[**schrsistemas-platform**](https://github.com/schrsistemas/schrsistemas-platform)

Estrutura principal:

- `site/` — portal institucional Next.js, exportado como site estático.
- `workers/api/` — API HTTP publicada no Cloudflare Workers.
- `workers/ai-core/` — núcleo de serviços e experimentação com IA.
- `docs/` — arquitetura, contratos, inventário e procedimentos operacionais.
- `.github/workflows/` — validações automatizadas por componente.

Site e API possuem pipelines independentes. Alterações no site não devem publicar a API, e alterações exclusivas na API não devem publicar o site.

## Princípios de engenharia

- Preservar a estabilidade de sistemas legados em produção.
- Evoluir arquitetura de forma incremental e verificável.
- Separar responsabilidades entre interface, API, persistência e integrações.
- Automatizar validações e documentar decisões técnicas.
- Priorizar soluções sustentáveis, observáveis e com custo operacional previsível.

## Contato

- **E-mail:** schrsistemas@gmail.com
- **LinkedIn:** https://www.linkedin.com/in/schrsistemas/
- **Portal:** https://schrsistemas.com

---

*Este README é o perfil público e o ponto de entrada do portfólio. O código-fonte completo permanece no repositório privado da plataforma.*
