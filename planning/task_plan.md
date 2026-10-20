# Plano de Tarefas — KODIE

## Objetivo

Construir um MVP funcional de **doações, estoque e entregas** para o Desafio 3 — Tecnologia para o Impacto Social, com fluxo ponta a ponta, dados fictícios e validação real. A v2, com solicitações e triagem, fica preparada no modelo, mas fora do escopo da entrega atual.

## Status atual

- **Fase 0 — Entendimento:** concluída.
- **Fase 1 — Definição do problema e escopo:** concluída e aprovada.
- **Fase 2 — Verificação de ferramentas e arquitetura:** concluída e aprovada.
- **Fase 3 — Implementação incremental da v1:** concluída.
- **Fase 4 — Validação e evidências:** concluída.
- **Fase 5 — Entrega acadêmica e apresentação:** pendente.
- **Fase 6 — Evolução para v2:** planejada, não iniciada.

## Fases

### Fase 0 — Entendimento

- [x] Ler o enunciado e identificar as etapas obrigatórias.
- [x] Confirmar que a documentação deve ser em pt-BR.
- [x] Confirmar que o baixo código está no trabalho agêntico, não em uma plataforma nomeada.
- [x] Definir que o MVP precisa ser demonstrável e validado.

### Fase 1 — Problema e escopo

- [x] Comparar ideias de problema.
- [x] Escolher doações → estoque → entregas para a v1.
- [x] Definir solicitações → triagem → atendimento como v2.
- [x] Documentar escopo, telas, campos, modelo, workflow, critérios de aceitação e testes em `docs/01-problema-e-escopo.md`.
- [x] Obter aprovação do usuário.

### Fase 2 — Ferramentas e arquitetura

- [x] Verificar Node.js, `node:sqlite`, `node:http`, `node:test` e Git.
- [x] Verificar ausência de npm/npx/pnpm/yarn/bun/pip/Docker/Podman.
- [x] Analisar o Impeccable como referência de design, sem instalação.
- [x] Comparar alternativas de stack.
- [x] Documentar a arquitetura em `docs/02-ferramentas-e-arquitetura.md`.
- [x] Obter aprovação do usuário para construir o app com fluxo agêntico.

### Fase 3 — Implementação incremental

- [x] Inicializar Git e estrutura do projeto.
- [x] Criar schema SQLite, constraints e índices.
- [x] Implementar conexão, transações e bootstrap de usuários.
- [x] Implementar validação, ledger de movimentos e histórico.
- [x] Implementar serviços de cadastro e workflow.
- [x] Implementar servidor HTTP e rotas.
- [x] Implementar dashboard, cadastros, doações, entregas, estoque e histórico.
- [x] Implementar CSS responsivo e melhorias progressivas em JavaScript.
- [x] Criar seed fictício.
- [x] Criar README em pt-BR.

### Fase 4 — Validação e evidências

- [x] Testar regras de negócio com `node:test`.
- [x] Testar rotas e formulários HTTP.
- [x] Validar persistência após reabrir o banco.
- [x] Validar bloqueio de saldo insuficiente.
- [x] Validar movimentos compensatórios.
- [x] Validar permissões de coordenação versus voluntariado.
- [x] Preencher a matriz T-01 a T-13 em `docs/01-problema-e-escopo.md`.
- [x] Registrar 25 testes aprovados.
- [ ] Capturar screenshots/gravação de tela para a apresentação.
- [ ] Exportar uma amostra fictícia do banco, se necessário.

### Fase 5 — Entrega acadêmica

- [ ] Revisar a documentação final.
- [ ] Montar a apresentação de 5–7 minutos.
- [ ] Ensaiar o roteiro de demonstração.
- [ ] Registrar limitações e próximos passos.
- [ ] Publicar o repositório ou entregar o pacote final.

### Fase 6 — Evolução para v2

- [ ] Modelar `solicitacao` e `solicitacao_item`.
- [ ] Definir prioridade, prazo e triagem.
- [ ] Vincular `entrega.solicitacao_id`.
- [ ] Implementar atendimento e atraso.
- [ ] Avaliar serviços, reservas e agenda.
- [ ] Criar dashboard de solicitações.

## Decisões

| Data | Decisão | Motivo |
|---|---|---|
| 19/10/2026 | v1 = doações, estoque e entregas; v2 = solicitações e triagem | Mantém a v1 entregável e abre evolução natural |
| 19/10/2026 | `recurso` genérico com `bem` e `servico` | Evita reescrita na v2; UI da v1 só usa `bem` |
| 19/10/2026 | Saldo derivado de `movimento_recurso` | Auditoria e consistência; sem saldo editável |
| 19/10/2026 | `entrega.solicitacao_id` anulável | Prepara v2 sem criar tabela fora de escopo |
| 19/10/2026 | Famílias apenas por código `F-000` | Reduz PII e facilita LGPD |
| 19/10/2026 | Sem doações financeiras na v1 | Modelo próprio de fundos e recibos fica para depois |
| 19/10/2026 | Node.js + `node:sqlite` + HTML/CSS/JS renderizado no servidor | Funciona sem npm/pip/Docker no ambiente |
| 19/10/2026 | Quantidades inteiras na v1 | Evita erro de ponto flutuante no ledger |
| 19/10/2026 | Perfil de demonstração sem autenticação real | Permite testar permissões sem ampliar escopo |
| 19/10/2026 | Impeccable como referência, não dependência | Não há npx/npm; princípios aplicados manualmente |

## Próxima ação

Preparar a **Fase 5**: revisar a documentação, capturar as evidências visuais e montar a apresentação de 5–7 minutos com o roteiro de demonstração.
