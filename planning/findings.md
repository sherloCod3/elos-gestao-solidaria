# Achados e Decisões — KODIE

## Contexto

- Projeto do Desafio 3 — Tecnologia para o Impacto Social, organização KODIE.
- O problema é hipotético e a entrega precisa ser um MVP funcional, demonstrável e validado.
- A documentação do projeto é em pt-BR.
- O diretório passou a ser um repositório Git em 19/10/2026.
- O usuário aprovou explicitamente a interpretação code-first/agêntica: **“a custom app built through an agentic workflow is acceptable.”**

## Requisitos

- Etapas obrigatórias: problema, escopo, ferramentas, implementação, validação e entrega acadêmica.
- Não implementar antes da aprovação.
- Não inventar dados, resultados ou integrações.
- Não afirmar que algo funciona sem testar.
- CSS/HTML próprios são permitidos; o baixo código está no trabalho agêntico.
- Usar dados fictícios e proteger dados pessoais/LGPD.
- Priorizar o fluxo ponta a ponta: registrar → armazenar → workflow → visualizar.

## Decisões

| Data | Decisão | Evidência/Motivo |
|---|---|---|
| 19/10/2026 | v1 = doações, estoque e entregas | Escopo aprovado em `docs/01` |
| 19/10/2026 | v2 = solicitações, triagem e atendimento | Evolução natural, fora da v1 |
| 19/10/2026 | `recurso` aceita `bem` e `servico`; UI da v1 só `bem` | CA-15 e preparação para v2 |
| 19/10/2026 | Saldo derivado de `movimento_recurso` | Fonte da verdade auditável |
| 19/10/2026 | `entrega_item` adicionado ao schema | Necessário para entregas multi-item; lacuna identificada no documento aprovado |
| 19/10/2026 | Famílias apenas por código `F-000` | Minimização de PII |
| 19/10/2026 | Sem doações financeiras na v1 | Exige modelo próprio de fundos |
| 19/10/2026 | Node.js + `node:sqlite` + servidor HTTP nativo | Ambiente sem npm/pip/Docker |
| 19/10/2026 | HTML/CSS/JS renderizados no servidor | Controle visual e ausência de build |
| 19/10/2026 | Quantidades inteiras na v1 | Consistência do ledger |
| 19/10/2026 | Perfil de demonstração via cookie, sem login | Testar permissões sem expandir escopo |
| 19/10/2026 | Impeccable como referência | Sem instalação possível; princípios aplicados manualmente |
| 19/10/2026 | Planejamento em três arquivos | Padrão definido para continuidade |

## Achados técnicos

- Node.js v26.8.1 disponível; `node:sqlite`, `node:http` e `node:test` funcionam.
- npm, npx, pnpm, yarn, bun, pip, Docker e Podman não estão disponíveis.
- `node:sqlite` exige Node 22.5+; o projeto declara essa versão mínima.
- SQLite com WAL, `foreign_keys = ON` e `busy_timeout` funciona para o MVP.
- O saldo pode ser calculado por `SUM(CASE ...)` sem campo materializado.
- Transações com `BEGIN IMMEDIATE` permitem validar doação, confirmar entrega, cancelar e ajustar com atomicidade.
- Movimentos compensatórios preservam a trilha e evitam exclusão de histórico.
- O bloqueio de cancelamento de doação já distribuída é necessário para impedir saldo negativo.
- O alerta de validade é aproximado: usa a validade do item da doação e não controla lote/FEFO.
- O servidor foi validado com testes HTTP e com uma submissão real pelo navegador.
- A captura de tela não funcionou no ambiente por falta de desktop visível; a árvore de acessibilidade foi usada.

## Ambiente

| Ferramenta | Situação |
|---|---|
| Node.js | v26.8.1 |
| `node:sqlite` | Funcional |
| `node:http` | Funcional |
| `node:test` | Funcional |
| Git | 2.55.0 |
| SQLite CLI | Disponível |
| Python | 3.14.7 |
| Rust/Cargo | 1.98.1 |
| Navegador | Disponível para testes de interface |
| npm/npx/pnpm/yarn/bun | Ausentes |
| pip | Ausente |
| Docker/Podman | Ausentes |

## Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Sem autenticação real | Perfil pode ser trocado sem login | Documentado como demonstração; permissões verificadas no servidor |
| Quantidades inteiras | Não cobre frações | Documentado; evolução com unidade-base |
| Sem lote/FEFO | Validade aproximada | Alerta por item de doação; v2 pode evoluir |
| SQLite local | Baixa concorrência | Adequado ao MVP; migração futura se necessário |
| Sem CSRF | Formulários protegidos apenas por SameSite | Documentado; produção exige token e HTTPS |
| Dados de seed | Podem poluir a demonstração | Reset documentado no README |
| Prazo do curso desconhecido | Risco de entrega | Priorizar Fase 5 e evidências visuais |

## Questões abertas

- Qual é a data limite da entrega?
- A instituição exige uma plataforma low-code nomeada ou aceita o fluxo agêntico?
- Será necessário exportar o banco ou apenas demonstrar a aplicação?
- A apresentação precisa de screenshots ou basta a demonstração ao vivo?
- A v2 será entregue no mesmo ciclo ou apenas como proposta?

## Fontes

- `docs/01-problema-e-escopo.md`
- `docs/02-ferramentas-e-arquitetura.md`
- `README.md`
- `schema.sql`
- `tests/foundation.test.js`
- `tests/http.test.js`
