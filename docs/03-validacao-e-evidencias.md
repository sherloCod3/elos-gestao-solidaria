# Etapa 4 — Validação e Evidências

**Projeto:** Desafio 3 — Tecnologia para o Impacto Social  
**MVP:** Doações, estoque e entregas  
**Data da validação:** 19/10/2026  
**Status:** v1 implementada e validada

---

## 1. Objetivo

Registrar as verificações executadas na v1, separando:

- o que foi testado automaticamente;
- o que foi verificado na interface;
- o que ainda depende de evidência visual ou de decisão humana;
- os limites conhecidos da entrega.

Este documento complementa `docs/01-problema-e-escopo.md`, que contém o escopo aprovado, a matriz T-01..T-13 e os critérios de aceitação.

---

## 2. Ambiente de validação

| Item | Resultado |
|---|---|
| Node.js | v26.8.1 |
| Banco | SQLite nativo (`node:sqlite`) |
| Testes | `node:test` |
| Servidor | `node:http` |
| Dependências externas | Nenhuma |
| Sistema | Linux |
| Dados | Fictícios, sem PII |

---

## 3. Comandos executados

```bash
node --test --test-reporter=spec
node scripts/seed.js
node server.js
curl http://127.0.0.1:3000/health
```

Resultado do `/health`:

```json
{"ok":true,"service":"elos-mvp","users":2}
```

---

## 4. Resultado dos testes automatizados

**25 testes aprovados, 0 falhas.**

| Área | Testes | Resultado |
|---|---|---|
| Schema e CA-15 | recurso `servico` aceito | Aprovado |
| Validação de cadastro | nome, unidade, tipo | Aprovado |
| Doação | multi-item, sem item, data futura, quantidade zero | Aprovado |
| Validação de doação | status e entrada de estoque | Aprovado |
| Entrega | confirmação e saída de estoque | Aprovado |
| Saldo | bloqueio de entrega acima do disponível | Aprovado |
| Cancelamento | doação e entrega com movimento compensatório | Aprovado |
| Permissões | coordenação x voluntariado | Aprovado |
| Ajuste | entrada, saída e saldo insuficiente | Aprovado |
| Dashboard | estoque baixo, validade próxima e ledger | Aprovado |
| Persistência | reabertura do banco | Aprovado |
| HTTP | formulários, redirecionamentos, 422 e 409 | Aprovado |
| Segurança básica | CSP, `nosniff`, `DENY`, escape e SQL parametrizado | Aprovado |

Comando:

```text
ℹ tests 25
ℹ pass 25
ℹ fail 0
ℹ duration_ms 480.628945
```

---

## 5. Matriz de aceitação

A matriz completa está em `docs/01-problema-e-escopo.md`, seção 12.3. Todos os critérios CA-01..CA-16 foram marcados como **Concluído**, com a evidência correspondente.

Resumo:

| Critério | Evidência |
|---|---|
| CA-01 recurso válido | cadastro e edição via UI; teste HTTP |
| CA-02 recurso inválido | HTTP 422 com erro de campo |
| CA-03 doação com dois itens | teste de fluxo multi-item |
| CA-04 validação gera entrada | saldo 20 e 5; movimentos `entrada` |
| CA-05 entrega acima do saldo | HTTP 409; status permanece `Registrada` |
| CA-06 entrega válida gera saída | saldo 20 → 18 |
| CA-07 estoque baixo | dashboard e tela de estoque |
| CA-08 validade em 7 dias | dashboard `expiring` |
| CA-09 código de família único | `ValidationFailure` em `codigo` |
| CA-10 histórico | eventos de criação, status e cancelamento |
| CA-11 cancelamento com compensação | movimento `saida`/`entrada` |
| CA-12 persistência | banco reaberto mantém saldo |
| CA-13 data/quantidade inválidas | erros de campo |
| CA-14 dashboard coerente | saldo espelha o ledger |
| CA-15 `servico` no schema | teste direto no SQLite |
| CA-16 fluxo ponta a ponta | teste multi-item + histórico |

---

## 6. Verificação na interface

Foram verificados por navegador:

- dashboard com indicadores, atenção e saldo;
- cadastro de recurso;
- formulário de doação com linhas dinâmicas;
- criação da doação #3;
- validação da doação #3;
- confirmação de que a entrada apareceu no estoque e no histórico;
- navegação lateral e troca de perfil de demonstração;
- ausência de erros de JavaScript no console (apenas aviso de CSP do Electron, resolvido com o cabeçalho CSP da aplicação).

O screenshot automatizado não pôde ser gerado porque o ambiente não mantém uma janela de desktop visível. A árvore de acessibilidade e o HTML renderizado foram usados como evidência.

---

## 7. Evidências disponíveis

- `tests/foundation.test.js` — 15 testes de regras de negócio.
- `tests/http.test.js` — 10 testes de rotas e formulários.
- `docs/01-problema-e-escopo.md` — matriz T-01..T-13 e CA-01..CA-16.
- `planning/progress.md` — log da sessão e problemas encontrados.
- `README.md` — instruções de execução e roteiro de demonstração.
- `data/kodie.sqlite` — banco local de demonstração (não versionado).

---

## 8. Limitações e pendências

- Não há autenticação real; o perfil “Atuando como” é uma simulação.
- Não há proteção CSRF; a aplicação é local e sem login.
- Quantidades são inteiras na v1.
- Não há lote/FEFO; o alerta de validade é aproximado.
- Não há notificações externas.
- SQLite é adequado à demonstração, não a alta concorrência.
- A v2 (solicitações e triagem) não foi implementada.
- A gravação de vídeo e os screenshots da interface ainda precisam ser produzidos para a apresentação.

---

## 9. Conclusão

A v1 está funcional, testada e reproduzível no ambiente disponível. O fluxo principal — **recurso → doação → validação → estoque → família → entrega → histórico** — foi exercitado de ponta a ponta, incluindo bloqueios de saldo, permissões e movimentos compensatórios.

A próxima etapa é a entrega acadêmica: preparar a apresentação de 5–7 minutos, registrar evidências visuais e explicar a evolução planejada para a v2.
