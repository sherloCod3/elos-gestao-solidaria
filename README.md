# Elos — Gestão Solidária

MVP do **Desafio 3 — Tecnologia para o Impacto Social**, construído para demonstrar uma operação de doações com controle de estoque e rastreabilidade de entregas.

O projeto usa **Node.js + SQLite nativo** e uma interface web renderizada no servidor com **HTML e CSS próprios**. Não há dependências externas de frontend ou backend.

> **Dados fictícios.** Todos os nomes, doadores, famílias e movimentos do seed são inventados. Não use dados pessoais reais.

---

## 1. Problema

Organizações que recebem doações por WhatsApp, telefone ou papel frequentemente não têm uma visão confiável de:

- quanto entrou;
- quanto está disponível;
- o que está próximo do vencimento;
- para quem foi entregue;
- qual foi a origem de cada saída.

O MVP resolve o núcleo desse problema: **registrar a doação, validar a entrada, controlar o saldo por movimentos, registrar a entrega e acompanhar o histórico**.

---

## 2. O que está implementado

- Cadastro de recursos (bens), doadores e famílias por código.
- Doações com múltiplos itens, validade opcional e status.
- Validação da doação pela coordenação, com entrada automática no estoque.
- Entregas com múltiplos itens e conferência de saldo na confirmação.
- Saída automática de estoque na confirmação da entrega.
- Cancelamentos com movimento compensatório.
- Ajustes manuais de estoque com motivo obrigatório.
- Dashboard com estoque baixo, validade próxima, pendências e movimentos recentes.
- Listas com filtros, detalhes e histórico de eventos.
- Perfil de demonstração para alternar entre coordenação e voluntariado, sem autenticação real.
- Testes automatizados de regras de negócio e rotas HTTP.

---

## 3. Requisitos

- **Node.js 22.5 ou superior** (o projeto usa `node:sqlite` e `node:test`).
- Nenhum `npm install` é necessário.
- Git é opcional para executar, mas recomendado para versionar.

Verificação rápida:

```bash
node --version
node -e "require('node:sqlite'); console.log('node:sqlite ok')"
```

---

## 4. Como executar

Na raiz do projeto:

```bash
node server.js
```

Abra:

```text
http://127.0.0.1:3000
```

O servidor cria automaticamente o banco em `data/kodie.sqlite` e dois usuários de demonstração:

- **Coordenação Demo** — pode validar doações, cancelar e ajustar estoque.
- **Voluntário Demo** — pode cadastrar e consultar, mas não validar, cancelar ou ajustar.

Para outro host/porta:

```bash
PORT=8080 HOST=0.0.0.0 node server.js
```

> Para demonstração local, mantenha `HOST=127.0.0.1`. A aplicação não tem autenticação real.

---

## 5. Dados de demonstração

Com o banco vazio:

```bash
node scripts/seed.js
```

O seed cria:

- 4 recursos: arroz, feijão, cobertor e leite;
- 2 doadores fictícios;
- 3 famílias (`F-001`, `F-002`, `F-003`);
- 1 doação validada com entrada no estoque;
- 1 doação pendente;
- 1 entrega confirmada;
- 1 entrega pendente;
- 1 ajuste de inventário.

O seed é idempotente por verificação de recursos existentes. Para reiniciar a demonstração:

```bash
rm -f data/kodie.sqlite data/kodie.sqlite-shm data/kodie.sqlite-wal
node server.js
node scripts/seed.js
```

**Atenção:** o comando acima apaga o banco local. Use apenas em ambiente de demonstração.

---

## 6. Testes

```bash
node --test --test-reporter=spec
```

Ou:

```bash
node --test
```

A suíte cobre:

- schema e CA-15 (recurso do tipo `servico`);
- validação de campos;
- código único de família;
- criação de doação sem movimentar estoque;
- validação com entrada exata;
- entrega com saída exata;
- bloqueio de entrega acima do saldo;
- cancelamento com movimento compensatório;
- bloqueio de cancelamento de doação já distribuída;
- ajuste com permissão de coordenação;
- dashboard coerente com o ledger;
- persistência após reabrir o banco;
- rotas HTTP e perfil de voluntário.

---

## 7. Estrutura

```text
.
├── server.js              # servidor HTTP e rotas
├── db.js                  # conexão SQLite, schema e transações
├── schema.sql             # tabelas, constraints e índices
├── lib/
│   ├── constants.js       # status, papéis, unidades
│   ├── date.js            # datas ISO, formatação pt-BR
│   ├── errors.js          # erros de validação e domínio
│   ├── history.js         # registro de eventos
│   ├── http.js            # helpers HTTP
│   ├── ledger.js          # saldo e movimentos
│   ├── repo.js            # consultas de leitura
│   ├── services.js        # casos de uso e workflow
│   ├── text.js            # escape e formatação
│   └── validation.js      # validação de formulários
├── views/                 # HTML renderizado no servidor
├── public/
│   ├── styles.css         # identidade visual
│   └── app.js             # melhorias progressivas
├── scripts/
│   └── seed.js            # dados fictícios
├── tests/
│   ├── foundation.test.js # regras de negócio
│   └── http.test.js       # rotas e formulários
├── data/                  # banco em runtime; não versionado
├── docs/                  # entregáveis acadêmicos
└── planning/              # memória de engenharia
```

---

## 8. Modelo de dados

O saldo **não** é um campo editável. Ele é calculado a partir de `movimento_recurso`:

```text
saldo = entradas + ajustes de entrada - saídas - ajustes de saída
```

Entidades principais:

- `recurso` — bem ou serviço; a v1 opera apenas bens.
- `doador` — pessoa ou organização doadora.
- `doacao` / `doacao_item` — doação e seus itens.
- `familia` — identificada por código (`F-000`), sem dados pessoais.
- `entrega` / `entrega_item` — entrega e seus itens.
- `movimento_recurso` — fonte da verdade do estoque.
- `usuario` — ator responsável.
- `historico_evento` — trilha append-only de eventos.

`entrega.solicitacao_id` existe como coluna anulável para a v2.

---

## 9. Workflow

### Doação

```text
Recebida → Disponível → Cancelada
Recebida → Cancelada
```

- A doação nasce como `Recebida`.
- A coordenação valida e o status vira `Disponível`.
- A validação gera um movimento `entrada` por item.
- Cancelar antes da validação não movimenta estoque.
- Cancelar depois da validação gera `saida` compensatória, se houver saldo.
- Se o estoque já foi distribuído e não há saldo para reverter, o cancelamento é bloqueado.

### Entrega

```text
Registrada → Entregue → Cancelada
Registrada → Cancelada
```

- A entrega nasce como `Registrada`.
- A confirmação valida o saldo de todos os itens.
- Se houver saldo, gera `saida` por item e muda para `Entregue`.
- Se faltar saldo, bloqueia a operação e mantém o status.
- Cancelar uma entrega confirmada gera `entrada` compensatória.

### Ajuste

- Exige coordenação.
- Exige motivo entre 5 e 300 caracteres.
- Gera `ajuste_entrada` ou `ajuste_saida`.
- Saídas não podem deixar o saldo negativo.

---

## 10. Roteiro de demonstração (5–7 minutos)

1. Abrir o dashboard e mostrar os indicadores e o saldo por recurso.
2. Mostrar um recurso com estoque baixo e seu mínimo.
3. Registrar uma doação com dois itens.
4. Mostrar que o status é `Recebida` e que o estoque ainda não mudou.
5. Validar a doação e mostrar a entrada no estoque e o histórico.
6. Abrir uma família e registrar uma entrega.
7. Tentar confirmar uma entrega acima do saldo e mostrar o bloqueio.
8. Confirmar uma entrega válida e mostrar a saída no estoque.
9. Mostrar o histórico e o dashboard atualizados.
10. Explicar a preparação para a v2: solicitações, triagem, prioridade e atendimento.

---

## 11. Limitações conhecidas

- **Sem autenticação real.** O seletor “Atuando como” é um perfil de demonstração. As permissões são verificadas no servidor, mas não há login.
- **Quantidades inteiras.** A v1 não aceita frações; isso evita erro de ponto flutuante no ledger. Frações podem ser adicionadas depois com unidades-base.
- **Sem controle de lote/FEFO.** O alerta de validade é aproximado e usa a validade do item da doação.
- **Sem notificações externas.** Alertas aparecem apenas no dashboard.
- **SQLite local.** Adequado para demonstração e equipe pequena; não é uma configuração de alta concorrência.
- **Sem doações financeiras.** Dinheiro exige um modelo próprio de fundos, recibos e conciliação.
- **Sem aplicativo nativo.** A interface é web e responsiva.
- **Uma unidade por recurso.** Não há conversão entre kg, g, L e mL.
- **A v2 não está implementada.** O modelo foi preparado para evoluir sem reescrever a v1.

---

## 12. LGPD e segurança

- Famílias são identificadas apenas por código.
- O seed usa dados fictícios.
- Consultas SQL são parametrizadas.
- Conteúdo dinâmico é escapado no HTML.
- Respostas HTML usam CSP restritiva, `nosniff`, `DENY` e `Referrer-Policy`.
- Não há coleta de dados pessoais sensíveis.
- Para uso real, seria necessário: autenticação, autorização por perfil, proteção CSRF, HTTPS, política de retenção e revisão de LGPD.

---

## 13. Próximos passos — v2

- `solicitacao` e `solicitacao_item`.
- Regra de prioridade e prazo.
- Atribuição de responsável.
- Status de atendimento e atraso.
- Vínculo `entrega.solicitacao_id`.
- Serviços com reserva, consumo e capacidade de agenda.
- Dashboard de solicitações.

A v2 deve ser construída somente depois que a v1 estiver validada e com evidências coletadas.

---

## 14. Documentação

- `docs/01-problema-e-escopo.md` — problema, escopo, telas, campos, modelo, workflow, critérios de aceitação e estratégia de teste.
- `docs/02-ferramentas-e-arquitetura.md` — verificação do ambiente, alternativas e arquitetura escolhida.
- `docs/03-validacao-e-evidencias.md` — testes executados, evidências e limitações da v1.
- `planning/task_plan.md` — fases e próximas ações.
- `planning/findings.md` — decisões e achados.
- `planning/progress.md` — log de progresso e testes.
