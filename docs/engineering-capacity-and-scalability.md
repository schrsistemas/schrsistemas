# Capacidade, escalabilidade e custo previsível

Padrão obrigatório para o portal institucional e a API da Schr Sistemas. O estudo de caso de origem é o esgotamento de quota diária de gravações KV no PescaRadar (14/11/2026).

## Regras

1. **Custo zero:** somente recursos comprovadamente gratuitos, sem trial, cartão, créditos promocionais, excedentes faturáveis ou billing. Se o requisito não couber no plano gratuito, interromper e propor alternativa gratuita.
2. **Inventário de limites:** registrar quotas, CPU, memória, armazenamento, builds, requisições, concorrência, payload, retenção, limites de domínio e condições do plano antes de adotar um serviço.
3. **Dimensionamento:** estimar consumo por usuário, conta, endpoint, evento, frequência, integração, pico e retry. Não usar somente quantidade de usuários como métrica de capacidade.
4. **Arquitetura:** separar estado, histórico, cache, fila e auditoria. Evitar estado persistente desnecessário, operações redundantes e documentos crescentes regravados a cada evento.
5. **Resiliência:** tratar 429, throttling, timeout e indisponibilidade; usar rate limit, backpressure, idempotência e retry limitado com backoff/jitter. Evitar tempestade de retries e perda silenciosa.
6. **Isolamento:** impedir que um cliente/tenant consuma toda a capacidade compartilhada. Aplicar autorização e quotas por contexto.
7. **Observabilidade:** medir consumo, latência, erros, backlog e saturação por fluxo, sem registrar segredos ou dados pessoais desnecessários. Criar limiares de alerta abaixo do teto.
8. **Testes:** contar operações por cenário e testar concorrência, pico, burst, 429, recuperação e integridade em ambiente isolado. Nunca executar teste de escrita de carga na produção.
9. **Migrações:** mapear compatibilidade, backup, rollback, retenção, exportação e exclusão antes de trocar banco, storage ou fornecedor.
10. **Evidência:** distinguir capacidade teórica, estimativa, teste executado e capacidade observada. Não prometer suporte a determinado número de usuários sem evidência reproduzível.

## Aplicação à arquitetura atual

- O portal estático em Cloudflare Pages deve continuar independente da API para renderizar conteúdo público.
- O Worker API deve manter endpoints pequenos, contratos explícitos, limites de payload, validação e timeouts.
- Não adicionar KV, D1, R2, Durable Objects, filas ou serviços externos por antecipação. Cada binding deve ter requisito, limite, custo e comportamento de falha documentados.
- Se um endpoint passar a escrever dados, definir autenticação/autorização, idempotência, rate limit, quota por usuário e política de retenção antes da publicação.
- Verificar limites e condições atuais do plano Cloudflare Free; não assumir que quotas são ilimitadas ou permanentes.

## Checklist antes de considerar uma entrega pronta

- [ ] Quotas e limites dos serviços usados estão documentados.
- [ ] Custo total permanece R$ 0.
- [ ] Operações por usuário/evento e cenários de pico foram estimados.
- [ ] Estado, cache, histórico e filas têm responsabilidades separadas.
- [ ] 429, timeout, retry e falhas parciais têm comportamento definido.
- [ ] Isolamento e limites por cliente foram avaliados.
- [ ] Testes relevantes foram executados em ambiente isolado.
- [ ] Backup, rollback, retenção e exclusão estão documentados quando há persistência.
- [ ] Nenhuma capacidade é declarada sem evidência.

Este documento não afirma que todos os controles já estão implementados; o inventário técnico deve marcar o que está presente, ausente e não verificado.
